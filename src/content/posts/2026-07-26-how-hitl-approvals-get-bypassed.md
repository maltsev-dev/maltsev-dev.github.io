---
title: "How human-in-the-loop approvals get bypassed on agents"
date: "2026-07-26"
tags: ["architecture", "authorization"]
---
A team ships a human-in-the-loop approval step. The tests pass, the demo
works, the security review signs off. Two weeks later a refund goes out
that nobody approved, and the question is how a call reached an effect
that was supposed to be gated.

Nobody bypassed the check. The check was never on the path the call
took.

## The shape of the bug

Human-in-the-loop in agent frameworks is usually implemented as a
*position in the execution graph*. The framework interrupts, surfaces a
card, waits for a resume signal, and continues. That is a good design
for what it is.

A position in a graph covers the paths that traverse that position. The
rest of the system gets no coverage from it.

An agent runtime is a graph plus a set of mechanisms that reach the same
tools without going through the graph's interrupts: a retry wrapper, a
subagent delegation, a direct function call inside your own code, a
second entry point, a background job that resumes a workflow. Each of
those is a legitimate feature. Each one is a route around the
interrupt.

```
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │    retry     │  │   subagent   │  │ direct call  │  │  alternate   │
   │   wrapper    │  │  delegation  │  │ in your code │  │   dispatch   │
   └───────┬──────┘  └───────┬──────┘  └───────┬──────┘  └───────┬──────┘
           │                 │                 │                 │
           ┴─────────────────┼────────┬────────┼─────────────────┴
                                      │
                                      ▼
                     ┌─────────────────────────────────┐
                     │ HITL interrupt (one graph node) │
                     └────────────────┬────────────────┘
                                      │
               ┬──────────────────────┼──────────────────────┬
  ┌────────────────────────┐                    ┌────────────────────────┐
  │  gate inside the call  │                    │  effect: refund        │
  │  decide -> invoke      │                    │  the tool call itself  │
  │  (in the client)       │                    │                        │
  └────────────┬───────────┘                    └────────────┬───────────┘
               │                                             │
               ┴─────────────────────────────────────────────┴
     every route guarded                            one route guarded
```

So the first question is which routes exist and which of them go
through the interrupt. The approval logic is usually correct; the
coverage is what fails.

## Six ways through

| Bypass class | What the agent does | What the gate lets through | The check that catches it |
|---|---|---|---|
| **1. Alternate dispatch path** | Reaches the tool through a second interface the middleware was never attached to | The same behaviour, gated on only one of two routes | Canary over the full route list, re-run on every framework upgrade |
| **2. Retry wrapper** | A retry or timeout wrapper re-invokes the tool *below* the middleware layer | A second invocation of an already-approved action | Make the tool fail once, then succeed. Two effects with one approval is the bug |
| **3. Subagent delegation** | Spawns a child agent with a subset of the tools, and the child carries no middleware | The same effect, under a new principal | Give a child a tool the parent is gated on and confirm the child cannot reach it |
| **4. Direct call in your own code** | A handler, post-processing step or retry in your application calls the tool function itself | The effect, with the framework entirely out of the loop | Grep the application for direct imports of tool functions outside the agent |
| **5. Approval replay** | Presents a resume token or "continue" signal that is bound to nothing specific | A second execution of an already-approved payload | Digest the payload fields, store the digest with the approval, recompute and compare on resume |
| **6. State that outlives the graph** | The process restarts mid-approval and the runtime trusts an "already approved" flag | A resume that skips re-interrupting | Interrupt a workflow, restart the process, resume, and confirm the approval is re-consulted |

**1. The alternate dispatch path.** The tool is reachable through a
mechanism that does not include the middleware. In practice this is
often a second tool interface: a direct-call helper, a streaming variant
of the same tool, an MCP client registered separately from the
framework's MCP integration. Two ways to reach the same behaviour, one
gated.

**2. The retry wrapper.** A framework retry or timeout wrapper re-invokes
the tool *below* the middleware layer, because the wrapper's job is to
recover from tool failures and it wraps the tool, not the graph. The
first attempt was interrupted and approved. The retry is a fresh
invocation that never passes the interrupt again. If the first attempt's
effect was ambiguous, you now have two paths with one approval.

**3. Subagent delegation.** The parent has the middleware. The child
agent, spawned with a subset of the tools, often does not. The child's
tool call is a new action by a new principal, and it reaches the same
effect. If the middleware was attached to the parent agent's graph and
not to the tool, the child's call is ungated.

**4. The direct call in your own code.** The most common one and the
least obvious, because it is not in the agent framework at all. Some
handler, some post-processing step, some retry in your application calls
the tool function directly:

```python
result = refund_customer(customer="A", amount=200)   # ← no middleware here
```

Your approval middleware is not involved because your own code is not
going through the framework. Nothing warned you, because the framework
cannot see a function you called yourself.

**5. Approval replay.** The resume mechanism accepts a token or a signal
that means "continue". If that signal is not bound to the specific action
and the specific payload, it can be replayed by a stuck workflow, a
retried job, a duplicate delivery, or an operator's tooling. This is the
class covered in detail in
[human approval is not authorization](/blog/2026-08-01-human-approval-is-not-authorization/),
and it is worth re-reading because the two failures compose: a bypassed
route and a replayed grant are much worse together than either is alone.

**6. The state that outlives the graph.** The workflow is interrupted,
the process restarts, and on resume the runtime sees a workflow that was
"already approved" and continues without re-interrupting. Whether it
re-reads the approval or trusts a flag in the workflow state is the
difference between a correct resume and a bypass. The answer belongs in
durable state that a new instance can query, not in the graph's memory.

## Why this survives review

Every one of these is invisible to the tests people write, because the
tests drive the agent the way the agent is meant to be driven. The demo
path goes through the middleware. The test that exercises the happy path
covers exactly one route: the one the demo used.

The reason it also survives a code review is that the check is there. It
is correct, and it is in the right place. What is missing is a claim
about *completeness*, that this is the only place the check needs to be.

| Surface | What it inspects | What it structurally cannot see |
|---|---|---|
| The happy-path test | The one route the demo used | Every other route in the runtime |
| Code review | The routes that exist in the diff | A route that could exist. That is the completeness claim, and review does not make it. |
| An approval rule or deny-list | The call it is attached to | Any call that reaches the tool from somewhere else |

That is why the fix is architectural. Adding one more check to the code
does not reach it.

## Make it a property of the effect

The way to make this class of bug go away is to put the approval on the
thing being approved.

> If the tool cannot take effect without passing the approval check,
> then no route to it bypasses the check. The check sits on the effect,
> so it sits on no route in particular.

Concretely: the approval is consulted inside the call that performs the
effect. A middleware decides whether to let that call happen; an
effect-side check makes the decision inside it. In a design where the
agent holds a client rather than credentials, and that client asks
before it acts, every route converges on the same question. The retry
wrapper still reaches the client. The subagent still reaches the client.
Your own direct call still reaches the client.

```python
async def call(self, identity, args):
    decision = await self._gate.decide(principal, identity, args)
    if decision.outcome == "require_approval":
        decision = await self._await_approval(decision)   # bound to args
    if decision.outcome == "block":
        raise Refused(decision.code, decision.reasons)
    return await self._transport.invoke(identity, args)
```

Whether the check lives in the process, in a gateway, or in the tool
server, the property is the same: it is downstream of every route and
upstream of every effect.

## The test that actually finds these

The hard part of testing this is that you are looking for the absence of
something. The technique that works is a **canary tool**: register a
tool that policy *always denies*, then drive the agent through every
route you can find and assert that every one is refused.

```python
CANARY = ToolSpec(
    name="__canary_should_never_run__",
    deny=Policy("deny: this tool exists so we can prove it is unreachable"),
)

async def test_every_route_is_gated(agent):
    for route in enumerate_routes(agent):        # see below
        with pytest.raises(Refused):
            await route.invoke(CANARY.name, {})
```

Where `enumerate_routes` is the part that needs work. It is the set of
ways the framework can reach a tool: the normal tool-call path, the
retry path, the parallel branch, the subagent path, the
resume-after-interrupt path, plus your own call sites if your own code
can call tools. You enumerate them once, from the framework's
documentation and your own grep, and you re-enumerate them when the
framework version changes, because the routes are a property of the
version.

This test is worth more than most of what a security test suite for an
agent contains, because it converts "we believe the approval is
enforced" into "these six specific routes were checked this week, and
here is what would have failed if any of them had been open."

## What to actually check

| Check | How to run it | What a failure looks like |
|---|---|---|
| **Canary on every route.** | The test above, run over the full route list, on every framework upgrade. | A route you have not enumerated is a route you have not tested. |
| **The retry path specifically.** | The most commonly missed route, and an easy one to test. Make the tool fail on the first attempt and succeed on the second, then count how many approvals happened. | Two effects with one approval. |
| **The subagent path.** | Give a child agent a tool the parent is gated on. | The child reaches it, which means the gate was on the parent. |
| **Your own call sites.** | Grep the application for direct imports of tool functions, outside the agent. | Any hit is a route that never touches the framework. |
| **Resume after restart.** | Interrupt a workflow, restart the process, resume. | The approval is inferred from a flag, with no re-consult of durable state. |

## Limitations worth stating

Route enumeration is manual, and it is complete only with respect to the
framework version you read the documentation for. A framework that adds a
new invocation mechanism in a minor release introduces a route your
canary has never heard of, and it is not in your list until somebody
reads the release notes. The canary converts a silent regression into a
loud one only if the route is in the list. The list needs an owner and a
trigger, not a best effort.

The canary is also a test, not a control. It proves that the routes you
knew about were closed at the moment it ran. It does not prevent a new
route from opening, and it does not run in production unless you make it.
The stronger guarantee is the architectural one. The check is on the
effect, so a new route that reaches the effect passes the check. The
canary is how you verify the architecture has not quietly regressed back
to a path-based check.

And there is one route no test can close: a tool that takes effect
somewhere the framework does not route through at all. A shell, a code
interpreter, a database the agent can reach directly. Those are not
paths the canary enumerates, because they are not tool invocations. That
boundary is environmental, and the article on
[intercepting tool calls](/blog/2026-06-07-intercept-tool-calls-before-execution/)
covers where it actually lives.

## FAQ

### Is framework-provided HITL enough?

It is enough for the path it is on, and frameworks generally make that
path reliable. The gap is coverage: the interrupt is one position, and
the runtime has more than one way to reach a tool. If you only ever
invoke tools through the framework's normal tool-call path, you are
fine. The moment you add a retry, a subagent, or a direct call in your
own code, you have routes the interrupt does not cover.

### Should we forbid retries on gated tools?

That removes one route and leaves the rest, and retries exist for good
reasons. A tool timing out is normal. The better fix is to make the
retry itself consult the gate, so a retry of a gated action requires the
same approval as the original. That puts the property on the effect and
leaves the mechanism alone.

### How do we bind a resume to a specific action?

Digest the material fields of the payload, store that digest with the
approval, and on resume recompute the digest from the live action and
compare. If the workflow comes back with different arguments, it is a
different action and needs its own approval. The detail is in
[human approval is not authorization](/blog/2026-08-01-human-approval-is-not-authorization/).

### Our framework doesn't even support subagents. Do we still have this problem?

You have versions of it. Every framework eventually grows a retry path, a
resume path, and some form of parallel branch, and they usually arrive
without anyone revisiting the approval logic. The question is whether you
would notice when they appear.

## Where this runs

NullRun sits at the effect. The approval is a durable record that a
separate process consults between the arguments existing and the effect
happening, so any route that reaches a gated effect (retry, subagent,
direct call, resume) converges on the same check. The check sits where
the effect is. Where the call was scheduled makes no difference to it.

The approval is consumed by a single conditional update, which is what
makes a retry of an already-executed action fail deterministically rather
than running again on the strength of a flag someone set. And the
recovery query returns denied and expired approvals along with pending
ones, so a resumed workflow can tell "already consumed" apart from "never
decided" instead of inferring it from silence. The [integration
docs](https://nullrun.io/docs) cover wiring the gate into the tool path.
