---
title: "Six enforcement paths, six declared defaults"
date: "2026-07-20"
tags: ["reliability", "authorization"]
---
Fail-closed is a one-sentence rule: when the rule cannot be evaluated,
refuse. Every enforcement system claims it.

The sentence is easy to state and easy to get wrong. Every one of the
leaks below is an optimization someone added later to stop a refusal
from being annoying.

Each one lives somewhere other than the refusal itself, and each one
defaults to allow.

| # | Where the decision lives | The optimization | Correct default |
|---|---|---|---|
| 1 | Rule lookup | A missing rule returns allow | Block |
| 2 | Payload reconstruction | Reconstruct throws, read the client digest | Block, typed code |
| 3 | Policy snapshot cache | A warm cache is never re-read from source | Reconcile or block |
| 4 | Dependency failure | One shared `except` returns allow | Block on enforcement paths |
| 5 | Enforcer migration | An exception falls back to the legacy enforcer | Hard error with an alert |
| 6 | Approval consumption | The check and the consume are separate writes | One atomic update |

The six are independent. Passing any one of them says nothing about
the other five, which is why a per-path guarantee is the only kind
worth making.

```
  SDK                  Gate                                 Store
  │                    │                                    │
  │ POST /check        │                                    │
  ├───────────────────►│          1 tool_block        ─────►│
  │                    │          2 rate_limit        ─────►│
  │                    │        3 budget_cache        ─────►│
  │                    │         4 Lua RESERVE        ─────►│
  │◄── execution_id ───┤                                    │
  │                    │ allow | block | require_approval   │
  │                    │                                    │
  │ POST /execute      │      digest recompute        ─────►│
  │                    │        atomic consume        ─────►│
  │                    │                                    │
  │ POST /track        │           Lua CONSUME        ─────►│
  │                    │         outbox INSERT        ─────►│
```

Each arrow is a dependency with its own outage. A refusal on one of
them is a decision nobody made, because nothing in the code ever said
what to do when the dependency was gone.

## 1. The missing rule

```python
rule = snapshot.rules.get(tool_identity)
if rule is None:
    return allow()          # ← "no policy means no restriction"
```

This reads as a sensible default and it is the most common one. The
argument for it is continuity: the agent was working yesterday, adding
an unlisted tool should not take it down.

The argument against it is that authorization is a positive grant, and a
missing rule supplies none of it. The two look identical at the
call site and mean opposite things. A tool that nobody has written a
rule for is exactly the tool nobody has looked at: new integration,
new version, new capability. Defaulting to allow means the governance
surface only covers what somebody remembered to extend it to.

There is a version of this that is defensible: an explicit wildcard
entry with an expiry. That is a decision somebody made and it shows up
in the audit. A missing key is a decision nobody made.

## 2. The recomputation you cannot do

The digest check from the approval flow fails open more often than you
would expect. It proves the payload about to run is the payload a
human saw, and reconstructing the payload can throw.

```python
try:
    live = reconstruct_material_fields(request)
except ReconstructError:
    live = request.digest_supplied_by_sdk    # ← trust the client
```

The fallback looks defensive. It defeats the entire verification
boundary: the client is now asserting the property the server was
supposed to establish. If the server cannot prove the action is the one
that was approved, the correct behaviour is a refusal, because "I could
not check" and "it checked out" must not produce the same outcome.

## 3. Configuration drift between cache and source

```python
cached = cache.get("policy:snapshot")
if cached is None:
    cached = load_from_source()
    cache.set("policy:snapshot", cached)
    return evaluate(cached, request)
return evaluate(cached, request)      # ← never checked against source again
```

Once the cache is warm, the source of truth stops participating. Now
publish a policy revision: the source has the new rules, every worker
still runs on the warm cache, and the enforcement in your cluster
disagrees with the policy in your repository. Two agents using different
keys produce different answers for the same action, one that hit the
cache after the revision and one before.

This one is worse than a bug because it is invisible in testing and
correct on the developer's machine. Whatever the cache returns, the
resolution rule has to be explicit: a revision invalidates dependent
state, and a conflicting value between cache and source is an error,
not something to reconcile by picking whichever is convenient.

## 4. Dependency failure, where not every path means the same thing

```python
try:
    decision = enforce(request)
except DependencyError:
    return allow()      # "keep the agent running"
```

A database being unreachable does not automatically justify skipping an
enforcement check. The paths carry different semantics, and flattening
them is where the outage becomes an incident.

| Path | Dependency down | Correct default |
|---|---|---|
| Tool-pattern block | policy store unreachable | Block |
| Rate limit | counter store unreachable | Block |
| Budget reservation | counter store unreachable | Block |
| Payload reconstruction | digest source unreachable | Block, typed refusal |
| Non-sensitive telemetry | analytics unreachable | Allow, drop |

The asymmetry is real and it has a reason: every row above the last one
decides whether money moves. A telemetry write failing changes nothing
about that, and blocking on it turns a reporting problem into an outage.
A missing budget check is a different thing entirely.

So fail-open is sometimes correct, as an explicit, named, tested
property of an observability path. It is never correct as an accidental
property of an enforcement path. The distinction only survives if it is
written down per path, because in a shared `except` block there is no
way for a reader to tell which kind you are in.

One detail makes the distinction enforceable. Each refusal above
carries its own typed code. `TOOL_BLOCKED`, `RATE_LIMIT_EXCEEDED`,
`BUDGET_CACHE_EXCEEDED` and `APPROVAL_DIGEST_RECOMPUTE_FAILED` are four
different answers to four different outages, which means a dashboard
reading an error code knows whether it is looking at a rule firing or a
dependency being down.

## 5. The legacy path that became the default

```python
try:
    return new_enforcer().evaluate(request)
except Exception:
    return old_enforcer().evaluate(request)   # ← kept for compatibility
```

The fallback starts as a migration aid and ends as the production path,
because the new path fails at exactly the moment it is needed. That is
the moment you are least able to be reading code.

The older implementation is weaker in a way that is easy to miss: it
probably has a broader wildcard, a simpler matching routine, no
material-field binding. It is a separate policy with its own default, and
it is reachable exactly when you are least likely to notice.

Enforcement needs one production path. If a migration requires two, the
old one should be a hard error with an alert, so the exception is visible
instead of silent.

## 6. The retry that races the consumption

```python
grant = load(approval_id)             # ← state == "approved"
if grant.digest == live_digest:
    run(payload)
    mark_consumed(approval_id)        # ← someone else can be here too
```

The network times out, the caller cannot tell whether the tool ran, it
retries. If consumption is a separate write, the retry can execute the
same approved action a second time. The enforcement was correct both
times. That is the problem: each individual attempt passed every check.

The fix is the single-statement conditional update described in
[human approval is not authorization](/blog/2026-08-01-human-approval-is-not-authorization/):
the first request consumes the grant and every later attempt gets an
explicit replay rejection. Until consumption is atomic with the check,
"fail-closed" has a duplicate-side-effect hole in the middle of it.

## What all six have in common

Someone tried to make an error less visible. Every one of them is a
local, reasonable decision made by a competent engineer under time
pressure, and every one of them converts an unanswerable question into a
default the system then treats as authoritative. There is no diff to
point at and no commit to blame. The code looks defensive.

## The structural antidote

A default has to be written down where it applies. For each failure
class, four things:

1. **A deliberate default**, written where it applies.
2. **A distinct error code.** If a policy store failure and a policy
   denial return the same code, nobody downstream can tell an outage from
   a rule, and your dashboard shows a spike in denials that is really a
   spike in outages.
3. **A regression test** that exercises the failure, with the dependency
   actually unavailable. A fail-closed test that runs against a healthy
   mock has tested nothing.
4. **A written reason** for why that path is allowed to degrade. The
   table above is where that reason goes. Without it, the next reviewer
   cannot tell a decision from an oversight.

The strongest form of this relies on no test at all. If the reservation
and the cap comparison happen **inside a single script evaluated
atomically on the data store itself**, there is no window in which the
cap is read and then the write fails. The failure mode is unreachable,
because it would require the store to apply half a script. A process
that crashes mid-decision leaves the previous state, and the previous
state is a counter that has not been incremented.

Two smaller properties of the same kind matter as much. A presence bit
distinguishes *no policy configured* from *policy unreadable*, so the
pass-through case is gated on a bit that fails closed and an unreadable
policy can never collapse into a permissive zero. And a boot guard that
refuses to start when an enforcement-bypass flag is set in production
removes the class entirely. Nobody has to remember not to set it.

The useful thing you can build on top of that is a test that enumerates
your failure paths and asserts the default on each one. It runs in CI,
it fails when someone adds an `except: allow`, and it turns "we are
fail-closed" from a claim in a design doc into something a release
depends on.

## What to actually check

- Block the policy store mid-request. Confirm a refusal, and confirm the
  error code is not the same as a policy denial.
- Delete an unlisted tool's rule at runtime. Confirm the call blocks.
- Make the server unable to reconstruct a payload. Confirm it refuses.
- Publish a policy revision and hit a worker with a warm cache.
  Confirm the answer changes.
- Fire a retry at an in-flight approval from a second worker. Confirm one
  duplicate rejection, not two executions.
- Make the reservation succeed and the settlement unreachable. Confirm the
  call never proceeds on an unreserved budget.

## Limitations worth stating

Fail-closed everywhere is an availability incident waiting for a bad
week. If every dependency blocks on failure, one database blip takes out
every agent in the fleet, and the operational response to that is to turn
fail-open on, which is how a deliberate control becomes an accidental
one in practice.

The honest version is per-path, declared, and tested, and it accepts
that some paths are deliberately available-through-outage. The
guarantee you can make is about the enforcement paths specifically: no
policy, no reconstruction, no counter means no execution.

One more limit: fail-closed has no answer for *slowness*. A dependency
that takes nine seconds before timing out does not produce a
correctness error, it produces a queue, and a queue is its own kind of
implicit policy. Timeouts have to be set deliberately for the same
reason the defaults have to be.

## FAQ

### Would a single global kill switch be simpler?

A global flag is useful for an operator. It is dangerous as an
implementation, because it does not say *which* paths it covers, and the
next thing someone adds is a check that skips enforcement when the flag
is off. A switch you cannot enumerate the scope of is indistinguishable
from the six leaks above.

### Should a policy store outage block everything?

Only if everything depends on it. If some decisions are cached and
versioned, those can proceed against the cached snapshot. Enforcement
still ran there, against a policy the system can name and version. The
dangerous version is "we could not reach the store, so we skipped the
check", which is indistinguishable from having no policy at all.

### How do we test this without taking the system down?

Make the dependency injectable and fail it in the test, not in
production. Every path gets a test that asserts the decision and the
error code. Run them in CI so the answer is known before a deploy, not
discovered during an incident.

### Does fail-closed mean the agent stops, or that the call fails?

The call fails. That distinction matters operationally: a refused call
is a decision the agent can see and route around, whereas a stopped
worker is an outage. The refusal should be typed and named so the agent
can distinguish "this is refused, try something else" from "the system
is unavailable, stop and retry later".

## Where this runs

NullRun's enforcement path refuses when the runtime cannot reach what it
needs, and the reservation that decides it runs as one Lua script on the
data store, so the cap comparison and the counter write cannot come
apart. An unreachable counter store is a `402 REDIS_UNAVAILABLE`, never
a zero. An absent budget policy is separated from an unreadable one by a
presence bit that fails closed, so the two can never collapse into the
same answer.

The refusal is typed: `TOOL_BLOCKED`, `RATE_LIMIT_EXCEEDED`,
`BUDGET_CACHE_EXCEEDED`, `APPROVAL_DIGEST_RECOMPUTE_FAILED` are four
different codes for four different reasons, and the decision is written
to the audit trail, because a refusal is evidence that a control fired.
The two documented enforcement-bypass environment variables are refused
at boot when the process is running in production, so they cannot be
switched on where it counts.

The regression checks pin the exact expressions that must be present, so
a deletion or a rewrite of `redis.call` into a client-side read fails
the build. That is a narrower claim than a behavioural test and worth
stating precisely: a text pin proves the code contains the shape, and no
more. The primary guarantee is carried by the script itself.

The wire contract these refusals travel over is in the
[API reference](https://nullrun.io/docs/api).
