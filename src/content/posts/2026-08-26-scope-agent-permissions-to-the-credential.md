---
title: "Scope an agent's permissions to the credential it holds"
date: "2026-08-26"
tags: ["authorization", "security"]
---
Three agents, one platform. The support agent reads the CRM, opens
tickets, and refunds up to fifty dollars. The coding agent reads the
repository and opens branches but must never deploy. The research agent
searches the web and reads documents and must never send an outbound
email.

Give all three the same tool list and trust the model to sort it out.
That is how agent fleets lose control, and it stays the path of least
resistance in every framework: one registration function, one tool
list, done.

## The three approaches that all end in the same place

Three ways to decide what an agent may call. All three are in use today
and all three reach the same failure by different routes.

| Approach | How it fails | Why it survives anyway |
|---|---|---|
| Give every agent every tool | The model sorts it out, most of the time. The failure is rare enough to survive a quarter and expensive enough to end one. | Nothing breaks on the day you ship it, and the dashboard stays quiet. |
| Branch on agent name in the application code | Every new agent adds a branch, every new tool means auditing every branch, and the first agent that reaches a tool through a second code path gets it. | The code reads clearly, so branches accumulate without anyone asking where policy belongs. |
| A separate deployment per agent | N deployments, N pipelines, N environment variable sets that drift, and a release cadence set by the slowest one. | Policy is genuinely separated, which is the one property worth paying for. |

The branching version, spelled out:

```python
if agent.name == "support":
    if tool == "refund_customer" and args["amount"] <= 50:
        return run(tool, args)
    return refuse("needs a human")
if agent.name == "research":
    if tool in NETWORK_ONLY:
        return run(tool, args)
    return refuse()
```

It works, and it decays in a specific, predictable way. The conditions
live in application code, where they are reviewed like business logic,
tested like business logic, and deployed like business logic. That
review checks correctness, not completeness. The second code path was
never in the branch.

The separate-deployment version decays too, and it takes the separation
with it. Teams that try it consolidate back, usually within two
quarters.

## The thing that actually travels

The reason the branching version decays is that the policy is attached
to the *code path*, and code paths multiply. Attach it to something
that does not multiply.

A credential does not multiply. An agent that holds a key holds a
scope, and that scope does not change when the agent's code changes,
when a second code path appears, when a framework upgrade reshuffles
how tools are invoked, or when the same agent runs in a different
process.

```python
@dataclass(frozen=True)
class Principal:
    org_id: str
    api_key_id: str          # ← the scope travels with this

def resolve_policy(principal: Principal) -> PolicySnapshot:
    # Most specific wins, and a miss is a miss.
    return policy_store.most_specific(
        key_id=principal.api_key_id,
        workflow_id=principal.workflow_id,     # if one is bound
        org_id=principal.org_id,
    )
```

The order is the design. A policy attached to this key wins; failing
that, one attached to this workflow; failing that, the org-wide policy.
Nothing about the agent's own code enters the lookup at all.

The fallback matters as much as the specificity. A key with no policy of
its own inherits the one that governs the org, which is exactly what you
want when an operator scopes one key tighter: the other keys keep
resolving to what they resolved to before, because the more specific rule
is what changed and the less specific ones are still there beneath it.
The scope of a deployment is the shape of the rule table, not a set of
special cases in a resolver.

```
  agent process
  ┌──────────────────────────────────┐
  │ decides to call refund_order     │
  └───────────────┬──────────────────┘
                  │ X-API-Key + tool + args
                  ▼
  ┌──────────────────────────────────┐
  │ policy_store.most_specific       │
  │   1. key_id      (api_key_id)    │
  │   2. workflow_id (if bound)      │
  │   3. org_id                      │
  └───────────────┬──────────────────┘
                  │ PolicySnapshot
                  ▼
  ┌──────────────────────────────────┐
  │ mint execution_id (server)       │
  │ bind org_id + api_key_id         │
  └───────────────┬──────────────────┘
                  │ execution_id
                  ▼
  ┌──────────────────────────────────┐
  │ tool runs, then settles          │
  │ binding compared again,          │
  │ atomically, at CONSUME           │
  └───────────────┬──────────────────┘
                  │
                  └─ mismatch: does not settle
```

Two agents on one runtime, two keys, two snapshots. The support agent
resolves against the policy written for its key. Policy writes are not
reachable from the credential the agent authenticates with, so no change
to the agent's own code can produce a rule.

That last clause is the property worth naming: **the agent cannot widen
its own scope by editing itself.** In the branching design it can. Add a
path, skip the `if`, call the tool. Here the policy lookup happens before
the agent's decision has any input into it, and the agent has no API for
changing a policy.

And the scope is re-checked at consumption, not only resolved up front.
The execution is minted server-side and bound to the organization and API
key that authorized it; at consumption time that binding is compared
again, atomically, so a replay of an approved action under a different
principal does not settle. One layer says what the credential may do; the
second says this particular execution belongs to this particular
credential.

## Why the credential beats the environment

The comparison is with putting the scope in an environment variable read
by the application, which is the common half-measure:

| | Policy in env var | Policy in application branches | Policy on the key |
|---|---|---|---|
| Survives a new code path | No | No | Yes |
| Agent can modify it | Yes | Yes | No |
| Same behaviour in dev and prod | Only if you keep them in sync | Only if you keep them in sync | Yes |
| Reviewable in one place | No | No | Yes |
| Cost of adding an agent | Edit code, deploy | New branch, deploy | Mint a key |

The dev/prod row is the one that surprises people. If the scope lives in
the runtime configuration, then a staging agent with a broader scope is
a configuration mistake waiting for a release. If it lives on the
credential, the staging key carries the staging scope and the
production key carries the production scope, and there is no version of
the application where that is wrong.

## What this boundary does not cover

These gaps decide whether the design is load-bearing.

| Gap | What it means | Where the control belongs |
|---|---|---|
| The credential is now the perimeter | Anything that can read the agent's environment can escalate. If your runtime injects all keys into every container's environment, an agent that can read its own env, which is trivially possible in most sandboxes, can find a broader key and use it. | Each agent's process is scoped to its own credential. The design only works under that condition. |
| It says nothing about what the tool can do | The agent's scope stops at the tool boundary. A read-only agent calling a tool that has write access to a shared database is scoped at the agent and unrestricted at the tool. | A per-tool credential. The tool server holds a role scoped to exactly what that one tool needs. |
| It does not compose with delegation | A principal being authorized is an execution, not an agent. Carrying a key from one agent to another is key distribution. Data the first agent read can reach a tool the first agent was never allowed to call. | The action-level check on the receiving side. Scoping credentials does nothing about the composition. |
| Rotation is an operational problem you now own | Scopes on credentials means changing a scope means rotating keys, and rotation during a long-running workflow needs the old grant to stay valid until the workflow finishes. | A rotation runbook. It is a real piece of work and it is not free. |

## What to actually check

1. **Key with no policy of its own.** Call the gateway with a key that
   has no key-scoped rule. Confirm it resolves to the governing policy
   rather than to an implicit default, and confirm that tightening a
   different key's policy did not change this one's decisions.
2. **Scope escalation attempt.** Have the agent construct a direct call
   to a tool outside its key's scope. Confirm the refusal comes from the
   gateway, not from application code.
3. **Replay under another principal.** Take an execution authorized by
   one key and present it under another. Confirm the binding compare
   rejects it at consumption time.
4. **Same code, different keys.** Run two agents through the identical
   code path with different keys. Confirm different decisions.
5. **Environment parity.** Deploy the same build to staging with a
   staging-scoped key. Confirm the staging agent cannot reach production
   tools.
6. **Rotation under load.** Rotate a key while a workflow is in flight.
   Confirm the in-flight workflow completes and new calls use the new
   scope.

## Limitations worth stating

The hard part of this design is key distribution, not the policy lookup.
Every agent in every environment needs a distinct minted credential,
which is real operational work that teams underestimate and then route
around by handing agents a shared key. A shared key is the branching
design again, with worse ergonomics.

It also assumes the runtime can keep credentials separated, which is
true for a container per agent and false for a single process hosting
many agents. If you need many agents in one process, you are back to
needing a per-agent principal the process can hold separately. That means
a brokered token in place of an API key, and a different amount of work.

And the guarantee is about the agent→tool edge only. It is a real
guarantee, and it is narrower than "the agent is safe." What happens
inside a tool after it is called is not something this design sees.

## FAQ

### Should the policy be on the key or looked up per agent?

On the key, or on whatever credential the request is authenticated
with. "Per agent" usually means "resolved by something the agent
runtime controls", which is the problem.

### What about the user's permissions when a human triggers an agent?

Now you have two principals. The usual resolution is that the execution
is the principal and the human is the context. The agent acting on
behalf of a user runs with the agent's scope, and the human's identity
travels as context for audit and for approval routing. The alternative,
letting the user's permissions widen the agent's, means a support agent
run by an admin can do things the support agent cannot. Decide which one
you want explicitly, because the default tends to be whichever is
simpler to implement.

### We already have RBAC in our platform. Isn't that the same?

For human users it is. Agent scopes attach to non-human principals, the
acting identity is an execution rather than a user, and per-instance
decisions, meaning this amount, this recipient, right now, are not
expressible in an RBAC table at all. RBAC answers whether the role
permits the operation. It does not answer whether this particular
invocation should happen, and that is the gap
[instance-level authorization](/blog/2026-06-13-permissions-are-categories-authorizations-are-instances/)
is about.

### Does every agent need its own key?

Every distinct scope needs its own key. Several agents can share a scope
and a key if they genuinely have identical permissions, but then they
are one principal for audit purposes. That is usually fine, and worth
knowing before an incident review asks.

## Where this runs

NullRun resolves the policy against the authenticated principal. Two
agents on the same runtime carry different keys and therefore resolve
different policy snapshots. The resolution is one lookup, key then
workflow then org, with no chain of conditionals in the agent's own
code. Scoping a policy to one key does not disturb the rest of the org:
the other keys keep resolving to the policy beneath it.

Because the scope travels with the credential, the same build in local
development, staging and production resolves against whatever scope the
present key carries. The audit ties each action to the key that produced
it, which is what makes the scope inspectable after the fact and not
only at configuration time. The execution itself is server-minted and
bound to the organization and key, and that binding is re-compared
atomically when the execution settles. The request and response shapes
are in the [API reference](https://nullrun.io/docs/api).
