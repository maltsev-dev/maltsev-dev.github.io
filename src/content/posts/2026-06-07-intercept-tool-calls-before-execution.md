---
title: "Intercepting tool calls without patching framework internals"
date: "2026-06-07"
tags: ["architecture", "authorization"]
---
The request that shows up repeatedly in agent framework issue trackers is
a developer who wants to inspect and block a tool call *before* it
executes, and who wants to get there without monkey-patching the
framework's internal dispatch method.

The reluctance is correct. Internal patching works today and breaks on a
minor version. People reach for it anyway because the alternative is not
on the table.

## Four places you can intercept, ranked by how well they hold

| Position | How it works | What it cannot see or enforce |
|---|---|---|
| 1. Patch the framework's internal dispatch | Wrap the framework's dispatch method | A rename, a second dispatch route, a retry wrapper re-entering below the patch, a subagent path that never reaches the method |
| 2. Wrap the tool function | Subclass the tool, or wrap its callable | A framework that calls the tool through a different mechanism, and any second reference to the same function obtained elsewhere |
| 3. Add a middleware node in the agent graph | A node in the graph, not a property of the tool | Any route around the node, and routing around a node is something frameworks do for legitimate reasons |
| 4. Own the path out | One client is the only way out, and the check lives in that client | Nothing. There is one route, and it is the one being checked |

Options 1, 2 and 3 all intercept a call. Option 4 makes a different
architectural claim, and it is the only one whose coverage does not
depend on enumerating paths. The first three all announce their own
failure at runtime, in production.

```
        model                          agent process
  ┌─────────────┐              ┌─────────────────────────┐
  │ decides     │              │ GatedToolClient         │
  │ the call    │──arguments──▶│ holds no credential     │
  └─────────────┘              └───────────┬─────────────┘
                                           │ POST /check
                                           │ tool identity
                                           │ final arguments
                                           ▼
                               ┌───────────┴─────────────┐
                               │ NullRun gate            │
                               │ allow                   │
                               │ require_approval        │
                               │ block                   │
                               └───────────┬─────────────┘
                                           │ allow only
                                           ▼
                               ┌───────────┴─────────────┐
                               │ the tool effect         │
                               └─────────────────────────┘
```

## Why "before execution" is the whole point

The timing is not a detail. A check that runs after the tool has taken
effect is an observability feature wearing an enforcement feature's
clothes, and the difference is visible in every downstream fact.

| When the check runs | What a refusal accomplishes | What the record holds |
|---|---|---|
| Before the model decides, which is plan-time filtering | Nothing yet, because the arguments do not exist | A rule about intent |
| After the arguments exist, before the effect | The agent routes around it and the action never happens | A decision |
| After the effect | You can refuse to report the action | A breach that already happened |

The window people confuse with this one is *before the model decides*,
which is too early. The model has not settled on arguments yet, so there
is nothing concrete to evaluate, and every rule written there is a rule
about intent.

The enforcement point is narrow and specific: after the arguments exist,
before the effect. In most systems that window is a single function
call.

## The property that makes it hold

Option 4 survives for one reason, which is worth stating as a design rule:

> If the agent cannot reach an external system except through one client,
> then enforcement is one place, and it cannot be bypassed by taking a
> different code path.

That is the whole argument. It does not require you to enumerate every
route, because there is one route.

```python
class GatedToolClient:
    """The only object in the agent process that holds an external credential."""

    def __init__(self, gate: GateClient, principal: Principal):
        self._gate = gate
        self._principal = principal

    async def call(self, identity: ToolIdentity, args: dict) -> ToolResult:
        decision = await self._gate.decide(
            principal=self._principal, tool=identity, args=args
        )
        if decision.outcome == "require_approval":
            decision = await self._await_approval(decision)
        if decision.outcome == "block":
            raise Refused(decision.code, decision.reasons)

        result = await self._transport.invoke(identity, args)   # ← the effect
        await self._gate.report_result(decision.execution_id, result)
        return result
```

The agent receives `GatedToolClient`. It never receives a database
client, an HTTP session, or a credential. Everything with a consequence
behind it lives behind `call`.

The order of the checks inside that call is load-bearing, because every
one of them reads state that the previous one changed.

| Step | Check | Reads | Outcome |
|---|---|---|---|
| 1 | Tool policy | Tool identity, org policy | allow, block, or approval |
| 2 | Rate limit | Org and api key window | block |
| 3 | Budget cache | Cached spend for the period | Early reject, nothing reserved |
| 4 | Reservation | The period counter, atomically | Reject the call |
| 5 | Approval | Execution id and action digest | require_approval |
| 6 | The effect | The final arguments | Reached only after allow |
| 7 | Consume | Actual cost against reserved plus ε | Reject on overage, never re-reserve |

## The hole that invalidates all four options

If the agent has a shell, a code interpreter, or any tool that executes
arbitrary code, the tool-level gate is one layer inside the boundary.
The Python tool runs `requests.post(...)` inside the process, and that
call does not pass through your gated client. Same for a bash tool, a
filesystem tool plus a network-capable runtime, or a browser tool that
can navigate to a payment page.

This is not a small edge case. Code execution is one of the most common
capabilities granted to coding agents, and it is the standard answer when
the agent has to do something nobody anticipated. It arrives one
requirement at a time.

With a shell, the enforcement boundary moves up to the **environment**.
Network egress policy, filesystem namespace, and a credential broker are
the perimeter. A tool-level gate is a second layer inside it. Design the
tool-level gate because it is where your action-level semantics live,
but do not count on it for the paths a subprocess creates.

"Owning the path out" is a boundary only while the agent genuinely holds
nothing else. A second credential in the environment undoes it entirely,
which is why [scoping the credential](/blog/2026-08-26-scope-agent-permissions-to-the-credential/)
is the other half of this design.

## If you must patch the framework anyway

Sometimes you have no choice: the framework invokes tools through an
internal you cannot wrap. Two things make it less fragile.

**Patch the narrowest thing that works.** If the tool callable can be
wrapped, wrap it. Reach for the framework's dispatch only when wrapping
is genuinely unavailable.

**Assert coverage at runtime, not at build time.** A static check tells
you which call sites are patched. It cannot tell you which route the
framework will take at runtime in the next version. A runtime assertion
can:

```python
def _assert_gate_coverage():
    """Fail loudly if a tool was reached without passing the gate."""
    unmediated = registry.tools_not_seen_through_gate()
    if unmediated:
        raise RuntimeError(f"tools reachable outside the gate: {unmediated}")
```

The gap between what your tests cover and what the framework might do is
the reason this is worth automating. A silent coverage regression happens
on a version bump and gets discovered in production. The runtime assertion
turns it into a startup failure you find in CI.

## What to actually check

Each of these turns a claim about coverage into something you can run.

| Check | What it proves |
|---|---|
| Register a tool policy always blocks, then drive every documented invocation path: direct call, retry, parallel branch, subagent, resume after compaction | One denial on every route |
| Enumerate the environment and every mounted secret | The agent holds a gate client, not a database password |
| If a shell tool is present, confirm what the egress boundary actually is | The tool gate is treated as a layer, not the perimeter |
| Assert the check runs with final arguments and before the effect | A test that only asserts the refusal message proves neither |
| Confirm the check runs on the retry path | The node was not skipped on the path frameworks most often add |

## Limitations worth stating

The single-client architecture has a cost that lands on latency and on
architecture purity. Every side effect, including ones you do not care
about, goes through a network hop to the gate. Teams that have built
this successfully tend to make the gate cheap and cache aggressively.
Teams that have not tend to exclude read-only calls and then discover
that "read-only" was a claim about a tool that changed.

Owning the path out is also a real constraint on how you build. The
agent's tools are defined by your client, and the framework's decorator
stops being how a tool arrives here. Every developer who wants to add a
tool has to add it through your interface. That friction is the mechanism
by which coverage stays high, and it is also why teams quietly route
around it.

Patching internals is not always avoidable, and when it is not, you have
accepted a maintenance obligation with a version-bump trigger. That is a
legitimate choice for a bounded project and a poor one for
infrastructure. The difference is whether somebody owns the trigger.

The runtime assertion only covers tools you know about. A tool registered
by a plugin after your scan has run is not in the registry the assertion
consults.

## FAQ

### Do we still need middleware if we have a runtime gate?

For the actions, the gate covers them, and the middleware becomes a
second opinion that costs latency and adds a second place to forget a
node. Middleware earns its place for the things a gate is not for:
visibility, progress events, and anything the application genuinely needs
to know about a call it is making.

### How do we handle tools that call other tools?

The composed call is a second effect and gets its own decision. This is
where per-action checks compose cleanly and per-path checks do not. A
tool that invokes a subtool through your client is covered
automatically, and one that does not is a gap worth auditing.

### What if the framework serialises arguments in a way we cannot inspect?

It should not, but some do: opaque blobs, base64 wrappers, stringified
JSON. That is a genuine blocker for action-level enforcement, and the
options are: work at the tool boundary instead of the argument boundary,
push the canonicalisation into the client that builds the payload, or
treat that tool as uninspectable and gate it as a whole.

### Is wrapping the tool callable really enough?

It is enough for every path that reaches that callable. A second
reference to the same behaviour obtained another way, an HTTP call to
the same service or a direct database write, sits outside it. "One
client" beats "wrapped callable" because it is checkable: you can assert
the absence of raw credentials.

### Does this work with MCP?

It does, and MCP makes the seam argument stronger. A crossing is
discovered at the moment it is used, so nothing is covered merely by
having been imported. The requirement is the same: the MCP client holds
the connection, the agent holds neither the connection nor a credential.

## Where this runs

NullRun is a separate process the agent reaches over the network, with
the check happening between the arguments existing and the effect
happening. The agent process holds exactly one credential, and it is
NullRun's own. The downstream provider's key never reaches the agent.
That is what makes exactly one path capable of producing an external
effect, and that path is gated.

When the gateway cannot be reached, the SDK's tool-policy gate refuses
and lets the call fail. That is what keeps the architecture honest. A
boundary has to refuse when its dependency is unavailable. A control that
can be skipped in that situation is a setting. The startup capability
probe is a diagnostic: it reports configuration problems without changing
which checks run.

The [API reference](https://nullrun.io/docs/api) has the wire shapes, and
[worked examples](https://nullrun.io/docs/examples) has the call sequences.
