---
title: "Authority is durable, and evidence expires on its own clock"
date: "2026-09-07"
tags: ["authorization", "compliance"]
---
An agent is authorized to issue refunds up to five hundred dollars. The
permission is valid, and the agent uses it correctly.

Yesterday, the refund policy was updated to cap refunds at two hundred.
The agent has no way to know that, because it was not told. It holds a
permission, and the permission has not changed.

It issues a four-hundred-dollar refund.

Nothing about the agent's behaviour was wrong against its permission
set. Its evidence was stale, and this failure lives in the gap between
those two facts.

## One decision that is actually two

Most governance treats authority as a single fact established at grant
time. Permission: yes or no. Evidence: assumed valid. The grant is the
answer and it is durable.

Those are two facts with two different lifetimes.

| | Authority to act | Authority of the evidence |
|---|---|---|
| What it is | This agent may issue refunds, up to a limit | The policy in force and the hash of its rule text, the account's current state, whether an exception window is still open, whether rate-limit headroom remains |
| Created when | Someone edits a role definition or issues a key | Whenever one of those underlying facts moves, which is constantly |
| Ends when | The role definition is edited or the key is revoked | At the next read |
| Read from | The role table | The systems that currently hold truth |

A grant that captures the first without the second is a snapshot of a
policy that no longer exists. And the second changes far more often
than the first, which is the assumption the design bakes in.

```
  authority (durable)                     evidence (re-read on every call)
  ───────────────────                     ───────────────────────────────
  ┌───────────────────────┐               ┌───────────────────────┐
  │ grant: refund ≤ 500   │ on every call │ policy hash  9f2c…    │
  │ 09:00                 │──────────────►│ account state         │
  │                       │               │ exception window      │
  │ still valid           │               │ rate-limit headroom   │
  │ 14:00                 │               │ budget reservation    │
  └───────────┴───────────┘               └───────────┴───────────┘
              │                                       │
              │ grant says: this agent MAY            │ evidence says: THIS
              │ refund                                │ call MAY refund
              └───────────────────┬───────────────────┘
                                  ▼
                ┌───────────────────────────────────┐
                │ decision recorded with the hash   │
                │ that produced it                  │
                └───────────────────────────────────┘
```

The concrete list of things that move under a standing permission:

| Evidence | Changes when | Nobody tells the agent |
|---|---|---|
| Policy hash | The policy is edited | ✓ |
| Account state | A customer is flagged, closed, restricted | ✓ |
| Exception window | A temporary override expires | ✓ |
| Budget reservation | The budget is consumed by another workflow | ✓ |
| Budget headroom | A concurrent workflow reserves against it | ✓ |

Four of those five change routinely. A system that reads them at grant
time and never again is stale within minutes.

## Recompute at the moment of use

The fix is unglamorous. Evaluate the evidence when the action runs.

```python
def authorize_at_use(principal, request, live_state):
    """live_state is read now, from the systems that currently hold truth."""
    snapshot = policy_store.fetch(principal.org_id, principal.key_id)
    decision = evaluate(request, snapshot, live_state)
    record_decision(principal, request, snapshot.policy_hash, decision)
    return decision
```

The important part is where `live_state` comes from. This function
reads it from the systems that currently hold truth. A caller that
assembles the state and hands it over can assemble stale state, and
freshness then becomes an assumption at every call site that no single
place owns.

The audit records the hash of the rule text that produced each
decision. That is what turns "the policy said so" into "`sha256:9f2c…`
said so, at 14:03, for this payload", the sentence a compliance
reviewer needs, and it stays answerable after the policy has moved on.

## The cheap version, and what it costs you

Re-evaluating on every call is correct and nobody does it, because
every call now reads the policy store and the account state. Two
optimizations are available, with different properties.

**A change signal.** If the policy store exposes an identifier that
moves when the policy moves, you can skip the read when it has not. A
monotonic counter is the usual one. A hash of the rule text is the
stronger of the two, because it is derived from the rules themselves. A
counter has to be bumped by hand, and a forgotten bump is a silent
skip:

```python
def policy_changed_since(principal, seen_hash: str) -> bool:
    return policy_store.policy_hash(principal.org_id) != seen_hash
```

This turns a full re-evaluation into a string comparison on the hot
path. It is a genuinely good optimization and it has a precondition that
people skip: the signal must exist and must be derived from the rules.
Many policy stores are documents without either, and retrofitting them
is real work. If you do not have it, the honest position is that you
re-read every time.

**A short TTL on the grant.** Cap how long a standing grant can be used
without re-derivation. This bounds the window in which stale evidence
can be acted on, at the cost of a re-derivation every TTL.

Use both, for different reasons.

| | Change signal | TTL on the grant |
|---|---|---|
| What it bounds | The staleness window, bounded by propagation delay | The staleness window, bounded by the TTL |
| Precision | Exact, when the signal is trustworthy | Coarse, whatever the signal says |
| Precondition | The store exposes a value derived from the rules | Nothing |
| When it fails | The store serves a stale document and the hash agrees with itself | The TTL is set longer than your risk tolerance |
| Cost on the hot path | One identifier read | Nothing until the TTL lapses |

## The failure the recomputation does not fix

Recomputing against "live state" assumes the live state is live.

Most of the systems a policy consults are eventually consistent. The CRM
that knows a customer is restricted may not have processed the flag yet.
The ledger that tracks the monthly budget may be a replica behind the
primary. Re-reading a stale source with a fresh read call returns the
same stale answer, and the code has no way to tell the difference between
"nothing changed" and "my read did not see the change yet".

That is worth knowing before you rely on it, because it changes what the
guarantee is. Recomputation bounds staleness to the propagation delay of
the strongest source in the chain, and it cannot do better than its
weakest one. A policy that consults three systems has the freshness of
the slowest.

The second limit is that re-evaluation is a read, and the action follows
it. Between the read and the effect, the evidence can move. This is the
ordinary time-of-check-to-time-of-use problem, and for a permissions
check it is usually acceptable. You cannot make a payment and evaluate
its policy in one indivisible operation without holding a lock across a
network call. What you can do is make the window small, record the hash
you evaluated against, and prefer sources with explicit versions over
sources you have to infer freshness from.

## What to actually check

- **Policy change after grant.** Grant a refund permission, tighten the
  policy, then call. The call must be evaluated against the new rules.
- **Concurrent consumption.** Grant a permission with rate-limit
  headroom for one call, then make two. Exactly one gets the headroom.
- **Exception window expiry.** Open an override, let it expire, call.
  Confirm the override no longer applies without anything re-granting.
- **Missing change signal.** Disable the change-detection optimization
  and confirm the path still re-evaluates and does not skip.
- **TTL backstop.** Freeze the change signal at its current value and
  let the TTL lapse. The grant must still stop working.
- **Audit completeness.** Confirm the recorded policy hash is the one
  that actually produced the decision, not the one current at write
  time.

## Limitations worth stating

Re-evaluation puts live reads on the hot path, and live reads mean
dependencies. That is a direct interaction with
[fail-closed](/blog/2026-07-20-fail-closed-is-not-a-single-switch/). If the account
state store is unreachable, a fail-closed policy check refuses every
action, and if the team cannot tolerate that they will add a permissive
fallback. That is the leak, arriving through the most reasonable
possible route.

A change signal is only as trustworthy as its reads. If the policy
store is a cache that can serve a stale document, the hash it hands back
is the hash of the stale rules, and the comparison confidently agrees
with itself.

Re-evaluation makes the decision *current*. Whether it makes it *better*
is a separate question. The judgment, should this amount be permitted
for this account, is still a judgment, and freshness does not improve
it. A policy that is wrong will be wrong immediately and consistently
after this change, which is arguably worse than a policy that is right
and slowly goes stale.

## FAQ

### What does a short TTL bound, and what does it miss?

It bounds the damage, which is worth having. It does not tell you the
policy changed, so an agent with a one-hour TTL spends up to an hour
acting on a rule that was edited at 09:05. A risk tolerance of
"minutes, not an hour" needs the change signal as well.

### How do we handle policy edits that should not affect running work?

Sometimes a change genuinely should apply to in-flight executions. Make
that explicit. Leaving it emergent is how it goes wrong: either the grant pins the policy
hash it was issued under and only new grants see the change, or it does
not pin and every call sees the change. Both are defensible. Leaving the
choice unmade is the current default, and that is the one option worth
removing.

### Does this mean every action re-reads every dependency?

The change signal is for exactly that. The design is: cheap change
detection on the hot path, full re-evaluation when something moved.
Without one, the answer is yes, and you should size for that before you
ship it.

### What about actions with no meaningful state change?

Some do. A read-only action against an immutable record may not need
live evidence at all, and excluding those keeps the cost down. Be careful
with that exclusion though. "This tool is read-only" is a claim about
the tool, and it is a claim that can change, which is the
[schema drift problem](/blog/2026-09-01-mcp-tool-identity-not-tool-name/).

## Where this runs

NullRun recomputes evidence from live state on every gate decision,
carrying no snapshot forward from when the permission was granted. A
permission granted at nine in the morning has moved by two in the
afternoon whenever anything underneath it has changed: the policy, the
account state, the remaining budget.

Each enforced rule carries the hash of its exact rule text, so "which
policy was in force" is answerable from the audit long after the policy
itself has moved. Expiry closes the other gap: an approval card holds a
per-rule TTL, five minutes by default, so a decision nobody made promptly
simply stops being actionable, and the execution binding itself expires
after 24 hours. A stale grant therefore goes stale on two independent
grounds, which is the point of having both.

The [security documentation](https://nullrun.io/security) covers how the hash is computed
and where each decision records it.
