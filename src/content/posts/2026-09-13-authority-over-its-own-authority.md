---
title: "Agents cannot widen their own authority"
date: "2026-09-13"
tags: ["authorization", "security"]
---
There is a question most governance frameworks never ask, because it
does not come up until an agent can write code, configure integrations
or modify its own workflows:

> Can the agent change the boundaries of what it is allowed to do?

Concretely: can it acquire a new tool, escalate its own access, decide
that a threshold no longer applies, or promote a recurring exception into
the new default?

If the answer is yes, every other question you have answered is void.
"What can it access?" and "what requires approval?" stop being facts
about the system and become facts about the agent's current mood. The
boundary moves whenever the agent finds it inconvenient.

Most agents are not designed to handle this, because we assume the
boundary is fixed. That assumption holds for an agent that only reads
and calls. It stops holding the moment the agent can write.

## Four escalations that read as routine work

| Escalation | What the agent does | Why it looks unremarkable |
|---|---|---|
| Acquire a new tool | Asked to "make the release process work", it adds a deploy tool because deploy is what the release process needs | The integration is easy and the governance is not. Nothing about the change is wrong in isolation |
| Escalate its own access | Obtains a credential with wider scope because that is what credential flows look like inside an organization | The agent needed a credential to do the thing, and the wider one was available |
| Decide a threshold no longer applies | Concludes that an approval limit of five hundred does not apply to an unusual case | The limit is, of course, still applicable |
| Promote an exception | Reads a pattern behind a one-time approval and writes it into the policy as a default | From that point on the control is gone and the audit trail looks like a policy someone approved |

The last one is the most interesting, because the agent is doing exactly
what a well-behaved process should do: generalizing from evidence. The
failure is that the authority to generalize was never separated from the
authority to act.

## Why the usual defenses leak

| The defense | Where it applies | How it fails |
|---|---|---|
| "The agent is instructed not to escalate" | Prompt text | Probabilistic, lost under compaction, not guaranteed across a model upgrade, and defeated by indirect injection, where the instruction to escalate arrives in a document the agent reads as data |
| "Give it an admin key" | Deployment convenience | It inverts the design. The credential becomes the boundary, and the boundary is held by the party you are constraining. Anything the agent can read, its environment, a config file, another service's secret, is a path to the whole scope |
| "Policy changes go through code review" | The PR queue | An authorization change looks like a configuration diff. A PR that raises a threshold from 500 to 5000, or adds a tool to an allowlist, or relaxes a required approval, is a small readable diff in a file reviewers scan constantly. It looks like the other forty diffs that week |
| "Keep policy in a file in the repo" | Repository layout | Fine, as long as the agent cannot write to the repo in a way that takes effect without review. In a system where the agent opens pull requests, the boundary is only as strong as the reviewers' ability to recognize an authorization change in an unfamiliar diff |

In the review case, nobody reading that PR is looking for an escalation,
which is how it gets through.

## The requirement: reachability and credentials

No interface that mutates policy, and no credential the policy layer
would accept for such a write. The boundary has to be unreachable by
the agent, and that is a property of reachability and of credentials,
not of which process the code happens to run in.

```python
CAPABILITY_CLASSES = {
    "read_business_data",
    "propose_action",
    "call_external_api",
    "mutate_boundary",        # ← never exposed to an agent principal
}

def exposed_tools(principal: Principal, registry: ToolRegistry) -> list[str]:
    return [
        t.name for t in registry.all()
        if t.capability in CAPABILITY_CLASSES
        and principal.is_allowed(t.identity)
        and t.capability != "mutate_boundary"      # unconditional
    ]
```

The last condition makes this a property of the exposure path, rather
than a policy an operator might configure or a default a later change to
the policy could flip. No configuration hands an agent principal a
boundary-mutating tool, because the write interface authenticates against
something the agent process does not hold.

The whole arrangement, with both sides of the boundary:

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│        agent process         │         │      authorization store     │
│                              │         │                              │
│   holds an agent-scope key   │         │    capabilities, thresholds  │
│ every call reads a decision  │◄───────►│                              │
│  refusals are typed answers  │         │     approvals, tool grants   │
│       write path: none       │         │  write path: operator only   │
└──────────────────────────────┘         └──────────────────────────────┘
```

So an agent learns its boundary by being refused, and every refusal is a
typed decision with a machine-readable code, recorded in the audit
trail. Writing the rules stays out of its reach.

## The hard part: indirect escalation

One fact undermines all of that. An agent with code
execution and network access can make an HTTP request to your admin API.
If it holds a credential that endpoint accepts, the gateway pattern has
not helped. You have built a wall with a door key taped to the outside.

The real requirement is therefore about what credentials exist in the
agent's process:

- The policy-admin API authenticates to something the agent does not
  hold.
- No broad-scoped credential is present in the agent's environment, its
  filesystem, or any config the agent can read.
- The tool surface the agent is given cannot itself write configuration
  that the runtime then trusts.

That third bullet is the one that catches teams. A tool that edits
config files, a tool that can deploy, a tool that updates a workflow
definition. Each one is an indirect path to the boundary, and each one is
usually added for a reason unrelated to security.

## What to actually check

- **Enumerate the agent's tool surface.** List every tool the agent can
  reach. Confirm none of them can write policy, and confirm the list is
  produced by an enforcement path. A list maintained by convention is a
  list that drifts.
- **Try the write.** From inside the agent's process, attempt to write
  policy through every reachable interface. All of them must fail with an
  authorization error, not a validation error.
- **Check the environment.** Dump the agent process's environment and
  mounted secrets. Confirm there is nothing that authenticates to an
  administrative surface.
- **Audit the tool list for indirect paths.** Any tool that edits config,
  deploys, or updates workflows is a boundary path. Confirm it is
  reviewed as one.
- **Watch for exception promotion.** Have the policy review surface
  reject a change that converts an exception into a default without a
  human decision attached to that specific change.
- **Confirm the escalation is visible.** Raise a limit through the admin
  interface and confirm it produces a distinct audit record that no
  ordinary policy edit produces.

## Limitations worth stating

This design does not stop an agent from *asking* for more authority. It
should not. An agent that can raise a well-argued request through a
human is a useful agent, and the human decision is a legitimate
governance event. What it stops is the agent widening its own scope
without one.

It also does not stop escalation by a human who approves a change they
did not recognize as one. That is the review problem above, and it is
mitigated by making authorization changes look different from ordinary
configuration in the review surface and the audit trail, not by pretending
the reviewer will catch it.

And a system with a rich tool surface will accumulate indirect paths over
time, one reasonable tool at a time. The check is therefore not a
one-off review, it is a recurring question about the whole surface, which
means someone has to own it, and "someone" is the part that quietly goes
missing.

Finally, none of this addresses what the agent does with authority it
legitimately has. A boundary the agent cannot widen is still a boundary
around actions nobody reviewed, which is the subject of
[instance-level authorization](/blog/2026-06-13-permissions-are-categories-authorizations-are-instances/).

## What to do, and what not to

### What not to

Do not put the boundary somewhere the agent can reach, even indirectly.
An agent told to "make the release process work" adds a deploy tool,
obtains a wider credential because that is what credential flows look
like inside an organization, decides that a five-hundred-dollar
approval limit does not apply to an unusual case, or reads a pattern
behind a one-time approval and writes it into the policy as a default.
All four read as routine work. The review case is the one that gets
through: a PR that raises a threshold from 500 to 5000, or adds a tool
to an allowlist, is a small readable diff among the other forty diffs
that week, and nobody reading it is looking for an escalation. The
control holds right up until the first agent that can write.

### What to do

Put the write interface where the agent's credential cannot reach it.
No configuration hands an agent principal a boundary-mutating tool, and
the write path authenticates against something the agent process does
not hold, so of the four capability classes the last one leaves the
exposure list unconditionally rather than by a policy an operator might
configure or a later change could flip. Hold the tool surface to the
same standard: no tool that edits config, deploys, or updates a workflow
definition, because each one is a path to the boundary. Version every
change as a hashed snapshot with a change history instead of editing in
place, and let the agent discover its boundary by being refused, with
each refusal a typed decision carrying a machine-readable code that
lands in the audit trail. The cost is a second trust domain to operate
and someone who owns a recurring review of the whole surface, because
indirect paths accumulate one reasonable tool at a time. What it buys
is checkable: from inside the agent's process, no reachable interface
accepts its credential for a policy write.

## FAQ

### Is this a real risk, or theoretical?

The mechanisms are real; the exploitation requires an agent that both
writes and has a path to write. That combination is an ordinary property
of the categories of agent in use today, and it is not exotic.
Coding agents, integration-configuring agents, and agents that manage
other agents all have it. The gap is that threat models for agents are
usually written around the agent's *mistakes*, not around its ability to
change the terms of its own operation.

### Should the agent be able to modify its own workflow definition?

It can propose one. A change to a workflow definition that changes what
actions are permitted is a policy change by another name and should go
through the same review and the same audit as any other policy change.

### How do we review for this without reading every diff?

Make authorization-affecting changes structurally different. A threshold,
a tool grant, a required approval, an environment. Those fields get
their own surface, their own review requirement, and their own audit
entry. The goal is that an escalation is not findable only by an attentive
reader of a diff nobody was looking for it in.

### Does putting the authorization layer outside the agent add latency?

One more hop on the hot path, in exchange for a boundary that sits
outside the thing being constrained. That trade is usually easy because
the hop can be cached per execution and the boundary is what you are
buying.

### What if the agent runs on the same host as the policy store?

Then the separation is nominal. "Separate process" has to mean separate
credentials and separate reachability, not merely a different PID in the
same trust domain.
