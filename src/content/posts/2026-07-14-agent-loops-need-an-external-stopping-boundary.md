---
title: "The iteration cap lives inside the agent, and that is the problem"
date: "2026-07-14"
tags: ["reliability", "cost"]
---
A tool starts returning poor results. The agent notices, retries, gets
poor results again, retries. Four hundred calls later it either trips a
provider rate limit or exhausts the budget.

The dashboard showed nothing wrong the entire time. The first signal is
the invoice.

## Why the cap in the agent loop does not hold

The obvious fix goes in the loop you already control:

```python
for step in range(MAX_STEPS):      # 25
    result = call_tool(...)
    if done(result):
        return result
```

It is correct on the day you write it, and it has four structural
problems that show up over the following months.

| Problem | What it is | What it costs |
|---|---|---|
| It lives inside the agent | Expressed in whatever units the framework uses: steps, turns, messages, tokens. Two agents in the same company enforce different numbers against the same downstream service. | It is code, and code gets refactored. The cap sits three files from whatever feature the next engineer is adding, and nobody re-reads it. |
| It does not compose | Twenty workers each capped at twenty-five steps make five hundred calls. The cap is per agent. | The failure is aggregate, so a limit that reads as generous in every single process is fatal in the fleet. |
| It has no idea what anything costs | A loop of cheap lookups and a loop of large-context summarisation hit the same step cap. | They differ by an order of magnitude in money. The cap that matters asks what the calling cost and what it was going toward. |
| It cannot see a sick downstream | The agent's retry loop is a response to bad results, and it cannot tell "the tool is genuinely returning this" from "the tool is timing out and the framework is retrying underneath me". | One worker's bad hour is invisible to the other nineteen, so every worker discovers the outage independently and concurrently. |

## What a stopping boundary has to be

What you want is a limit that no code path inside the agent can
accidentally remove. The limit then lives in a component the agent cannot
edit, and the decision happens before the call rather than after the
failure.

Four independent signals, each failing differently, so you want all of
them. The sketches below are a design you implement against your own
agent; what matters is that each of the four is evaluated somewhere the
agent cannot edit.

```
  agent process                the agent can edit this
  ┌────────────────────────────────────────┐
  │  tool call:  name, args                │
  └───────────────────┬────────────────────┘
                      │  every check below runs
                      │  before anything executes
                      ▼
  ┌───────────────────┴────────────────────┐
  │  external boundary                     │
  │                                        │
  │    1  tool_block            hard       │
  │    2  rate_limit            hard       │
  │    3  reserved aggregate    in-flight  │
  │    4  budget projection     reserved   │
  │    5  loop_check            heuristic  │
  │    6  chain_depth           bound      │
  └───────────────────┬────────────────────┘
                      ▼  allow │ block │ require_approval
                      │
                      ▼
  ┌───────────────────┴────────────────────┐
  │  shared state, one store               │
  │  cb:{service}:{tool}   breaker         │
  │  workflow_id            lifecycle      │
  │  rate                   shared bucket  │
  └────────────────────────────────────────┘
```

### 1. Rate

A per-minute cap on calls. The cheapest of the four and the one that
protects the downstream service. It answers "is this call allowed right
now", and it is the only one of the four that a runaway loop trips
within seconds.

### 2. Budget projection

The projected total, including what is already in flight. The reasoning
is in
[an agent budget is a permission](/blog/2026-06-26-agent-budget-is-a-permission-not-a-limit/);
the loop-relevant part is that a fast loop spends fast, and a settled
counter is always behind by exactly the amount that matters.

### 3. Reserved aggregate

Independent of both of the above: what is currently in flight across all
workers. A burst of slow calls can breach the downstream service while
every individual worker's rate looks fine and the settled budget has not
moved at all.

### 4. Behavioural

A signal computed from the recent pattern of calls, not from any single
call. This is the one that actually catches the loop.

## Catching a loop without flagging polling

The naive version counts calls per tool per window and refuses when the
count crosses a threshold. It works, and it produces false positives on
every legitimately repetitive workflow you have. A monitoring agent that
polls every thirty seconds looks exactly like a stuck agent until you
tune the window past the poll interval, and then you catch nothing.

The version that holds up adds exact-argument repetition, which is high
precision:

```python
def loop_check(window: "SlidingWindow", tool: ToolIdentity,
               args: dict) -> Optional[str]:
    key = args_fingerprint(args)

    if window.repeats(tool, key) >= EXACT_REPEAT_LIMIT:      # 5
        return f"same call repeated {EXACT_REPEAT_LIMIT}x in window"

    if window.calls(tool) >= CALL_LIMIT:                     # 40
        return f"call rate on {tool.name} exceeded"

    return None
```

Two different failures with two different thresholds:

| Signal | Threshold | What it means when it fires | False positives |
|---|---|---|---|
| Exact argument repetition | 5 in window | The loop. Identical arguments are almost never legitimate; agents do not usually call the same tool with byte-identical arguments forty times unless something is wrong. | Almost none. |
| Call count on one tool | 40 in window | Ambiguous. A high call count on the same tool is often legitimate, so it gets a much higher bar and a wider window. | Common, on anything legitimately repetitive. |

Both refusals are typed, and the type decides whether the surrounding
application does the right thing:

```python
class LoopDetected(Refusal):   code = "loop_repeated_call"
class RateExceeded(Refusal):    code = "rate_limit_exceeded"
class BudgetExceeded(Refusal):  code = "budget_exceeded"
class DepthExceeded(Refusal):   code = "chain_depth_exceeded"
```

The caller needs to distinguish "this workflow is going in circles, stop
it" from "the system is busy, back off" from "you are out of money".
Without distinct codes, the application guesses, and the guess it makes
under pressure is retry, which is the exact behaviour that produced the
loop.

## The breaker has to be one object

When a downstream starts failing, you want the failure observed once and
shared, not discovered by twenty workers in parallel.

```text
                      failure recorded
                              │
                              ▼
   ┌────────┐            ┌────┴───┐                  ┌───────────┐
   │ CLOSED │─ttl set───▶│  OPEN  │─acquire_probe───▶│ HALF_OPEN │
   └───┴────┘            └────┬───┘                  └─────┬─────┘
       ▲                      │                            │
       │ probe fails,         │   ttl expired              │  probe ok
       │ record_failure       │                            │
       └──────────────────────┴────────────────────────────┘
       ttl expired: back to CLOSED
       probe ok: success closes it
```

The three properties that make it useful:

| Property | What it is | What breaks without it |
|---|---|---|
| Shared state | The breaker lives in a store every worker reads. | A per-process breaker means each worker opens its own, and the aggregate load that caused the outage is unchanged. |
| An expiry, not a timer | Open does not mean permanently open. The TTL is what turns it into half-open. | Recovery needs a deploy. |
| Probe-limited half-open | Half-open admits one probe at a time. | Half-open with twenty workers all trying at once is a second thundering herd against a service that just came back. |

One thing to get right in the data model, because it will bite later:
do not collapse workflow lifecycle and breaker state into one field.
A workflow can be paused by an operator and simultaneously tripped. If
both concepts are forced into one status column, one transition silently
overwrites the other and you get a workflow that looks healthy while its
breaker is open, or one that looks dead while it is serving traffic.
Two state machines, two columns, and neither implicitly changes the
other.

## Depth and count are different bounds

A rate cap bounds how fast. A chain-depth cap bounds how *far*, meaning
how deep one line of reasoning can go before it has to come back with a
result. An agent that takes two steps and returns is cheap. An agent
that takes two hundred steps and returns has already burned the budget
you were trying to protect.

Surface it before it bites: an operator wants to see a workflow
approaching its depth limit, not discover it in the refusal log
afterwards. That signal belongs on the dashboard as a trajectory, tracked
continuously. An event read after the fact arrives too late to act on.

## What to actually check

1. **Retry storm.** Point the agent at a failing tool with a low cap. All
   workers must stop within the cap, not twenty-five steps each.
2. **Breaker is shared.** Open the breaker, then call from a second
   worker. It must be refused immediately without touching the
   downstream service.
3. **Recovery.** Let the TTL expire with the service healthy again.
   Half-open must admit exactly one probe, not twenty.
4. **False positives.** Run a polling workflow for longer than the loop
   window. It must complete.
5. **Error codes.** Assert the code. A loop refusal and a budget refusal
   must be distinguishable by the caller.
6. **Killing a workflow.** Pause it mid-run. The next tool call must be
   held, from any pod.

## Limitations worth stating

Loop detection is a heuristic and it trades precision for recall. Exact
argument repetition is high precision and misses loops that vary their
arguments slightly. A loop rephrasing its query each pass looks like
fresh work to a fingerprint, and it looks identical to a human. Call-count
thresholds catch those and cost you false positives on everything
legitimately repetitive. There is no threshold that removes the tradeoff,
only a place to put it, and you should put it where a false positive is
cheap.

Circuit breaker cardinality is a real operational cost. Keyed per service
per tool, a large tool surface means a lot of state and a lot of half-open
coordination. Keyed more coarsely, one noisy tool opens the breaker for
its whole service.

The depth cap is the coarsest of the four and the least specific. It
bounds reasoning depth without knowing what the depth is for, so a
legitimately long investigation and a stuck loop are the same event to
it. It is a backstop, not a signal, and it should be set loose enough
that it never fires on real work. Otherwise people tune it upward until
it is decorative.

These controls bound runaway behaviour. They do not stop a single call
that is wrong. A loop that completes cleanly and does the wrong thing
three times is not a loop problem.

## FAQ

### Should the loop cap be on steps, calls, tokens, or cost?

Cost and rate, because they are the two that map to something outside
your process. Steps and tokens are implementation details of a framework
and mean different things in the next one.

### What does the agent do when it is refused?

That is the caller's decision, which is why the refusal is typed. A loop
refusal should surface to the user or end the workflow. A rate refusal
should back off and retry. An agent that cannot tell them apart will
retry everything, and the retry is the problem.

### Do we need loop detection if we have rate limits?

Rate limits bound the blast radius. Loop detection identifies the loop
itself. An agent that retries at the same rate as a healthy one never
touches the cap and never gets stopped, and it still spends the budget.
The two catch different things.

### Should the limits be per agent or per service?

Per workflow for stopping a bad run, per credential for containing a
leaked key, and per downstream service for protecting the dependency. The
last one is the one teams forget, and it is the one that keeps the tool
up during somebody else's incident.

## Where this runs

NullRun is the external boundary, and the code sketches above are
something you build against it. The pieces worth naming are the ones
that live in the data store, in shared state that no worker process can
edit on its own.

| Piece | Keyed on | What that gives you |
|---|---|---|
| Rate | `(organization_id, api_key_id)` token bucket | Twenty workers share one bucket, so the twenty-worker burst cannot happen. Per process and per pod buckets both fail this. |
| Budget | Reserved before the call, not measured after it | The period counter is bound and shared, and the reserve and the cap comparison run inside a single script on the data store. There is no window in which the counter is read and the agent issues another eleven calls before the write lands. |
| Every refusal | A distinct typed code: `RATE_LIMIT_EXCEEDED`, `BUDGET_CACHE_EXCEEDED`, `CONSUME_OVERBUDGET` | The caller can back off on one and stop on another, instead of retrying everything under pressure. That distinction is the difference between a loop that terminates and a loop that spends. |
| Workflow lifecycle | External, authoritative state | Pausing or killing a workflow writes its lifecycle state, and the next call is held wherever it happens to be running. That is the difference between an operator stopping an autonomous system and an operator stopping their own pod. Lifecycle and breaker stay separate columns, so a paused workflow and a tripped dependency cannot overwrite one another. |
| Chain depth | A bound you can turn on | How far one line of reasoning may go before it has to come back with a result. |

Loop detection itself is a heuristic and it belongs in the agent's own
path. The argument-repeat fingerprint above is a good default, and the
limitations section is honest about where it trades recall for precision.
What the boundary gives you is that a loop which does get through still
hits a rate counter, a budget ceiling and a depth bound that it did not
write and cannot refactor away. The [integration docs](https://nullrun.io/docs) cover
putting the tools behind it.
