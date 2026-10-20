---
title: "Every authorization is an instance of a permission category"
date: "2026-06-13"
tags: ["authorization", "cost"]
---
Same agent. Same tool. Same permission. A support agent with refund
access approves a twenty-dollar refund, which is exactly what it is
there for.

The same agent, the same `refund_customer()` call, approves a
fifty-thousand-dollar refund to an account with no purchase history.

Nothing about the tool changed. Everything about the situation did.

## The question a permission answers

Tool permissions answer one narrow question, and they answer it
perfectly:

> Can this agent call this function, ever?

Yes or no, decided once at setup, and then forgotten. That question
fits a build step that shells out to a compiler. Anything that moves
money, sends mail, or deletes things needs a different question.

The question an operator actually needs answered is different:

> Should *this specific invocation*, of this function, with *these
> arguments*, against *this resource*, happen *now*?

Most governance frameworks answer the first one. They treat the agent
as an employee with a job description, and a vague job description
turns into hundreds of decisions that nobody reviewed individually. A
job description is a category. The decisions are instances.

| | Permission | Authorization |
|---|---|---|
| What it is | A named category of actions the agent may take | One invocation, with a decision attached |
| Created when | A role is defined, or a key is issued | The agent calls the tool |
| Ends when | Someone edits the role definition or revokes the key | The call returns allow, block, or require_approval |
| Keyed on | Agent identity and tool name | Payload, target resource, live counters |
| Question it answers | Can this agent call this function, ever | Should this invocation happen now, against this resource |
| Reading it later tells you | What kind of action is permitted | What happened on one call |

```
  the same agent, the same call, the same permission

  ┌────────────────────┐      ┌──────────────────────────────────┐
  │ category check     │      │ instance check                   │
  ├────────────────────┤      ├──────────────────────────────────┤
  │ tool in the role?  │      │ tool in the role? ──►            │
  │                    │      │ allow                            │
  │ (once, at setup)   │      │   │                              │
  │                    │      │   ├ amount within                │
  │                    │      │   │ the ceiling?                 │
  │                    │      │   ├ target eligible              │
  │                    │      │   │ right now?                   │
  │                    │      │   ├ under the repeat             │
  │                    │      │   │ ceiling?                     │
  │                    │      │   ▼                              │
  │                    │      │ allow │ require_approval │ block │
  │                    │      │ (once, per call)                 │
  └────────────────────┘      └──────────────────────────────────┘
```

## Three dimensions a category check holds constant

A permission holds three things steady that a real decision cannot hold
steady.

| Dimension | What the category assumes | What the invocation carries |
|---|---|---|
| Magnitude | One ceiling for every refund | The amount on this call |
| Target identity | "a customer" | This account, and its state right now |
| Accumulation | Nothing carries across calls | What already happened in the window |

A permission to refund ten dollars covers a different action than one
to refund a thousand, and a threshold that does not vary by amount is
no policy on the dimension that matters most.

Eligibility is the same story. An account in a dispute, or one already
over its limit this month, is a different question from whether the
role table allows refunds at all. Answering it takes a read of the
account, and the role table cannot supply one.

Accumulation is the dimension teams miss most often, because it does
not feel like a permissions problem. Twenty refunds of ten dollars is
two hundred, which may be unremarkable. Forty refunds of fifty reads
as a fraud pattern. A per-call check is blind to that by construction,
and only an aggregate sees it. It looks like a rate limiting problem,
so teams hand it to the platform team, and the gap stays open.

## What the gate can actually decide

```python
def authorize_instance(request, constraints):
    failures = []

    if not constraints.magnitude.allows(request.amount):
        failures.append(f"amount {request.amount} outside tier ceiling")

    if not constraints.eligibility.allows(request.account_id):
        failures.append("account not eligible for this action")

    recent = constraints.recent_count(
        request.account_id, window=timedelta(days=7)
    )
    if recent >= constraints.repeat_ceiling:
        failures.append(f"{recent} refunds in 7d exceeds ceiling {constraints.repeat_ceiling}")

    if failures:
        return Decision("block", failures)

    if request.amount > constraints.auto_allow_ceiling:
        return Decision("require_approval", route_to=constraints.risk_owner)

    return Decision("allow")
```

Note what this function leaves where it found it. Whether the refund
is a good idea stays with the agent, and the model still reasons about
whether the customer deserves the money. What the gate decides is
whether *this particular action*, with these particular arguments,
becomes real, and who reviews it when the answer is not a simple yes.

Teams get that division wrong in both directions. Some put business
judgment in the gate and end up with a rule engine pretending to be a
policy. Others put nothing in the gate and end up with an agent holding
a credit card and a system prompt.

Because the decision is made against the instance, the card that
reaches a human is specific: it carries the exact payload, the exact
threshold that fired, and the amount that tripped it. A queue reviewing
those cards reviews decisions that are already specific, which is what
makes one shared queue workable at all. The reviewer does not have to
reconstruct the context, because the context is the thing the gate
already resolved.

## The case the role table structurally cannot see

Agent A can read customer records and delegate tasks. Agent B can apply
small credits.

Agent A reads a record containing a card number, summarises it, and
delegates the task to Agent B. The summary contains the card number.

Agent B's scope never evaluated that data. Every layer of the system
said yes: A was allowed to read, A was allowed to delegate, B was
allowed to apply credits. The combination moved a card number into a
context that had no reason to see it.

No permission was violated here, which is exactly why every role table
reports clean. This is the composition problem: individual actions
authorized, composed outcome not authorized. General composition
detection is hard, and the useful question is how to catch a bad
sequence without flagging every legitimate one. A rule that flags any
sequence of N actions is too coarse, and a rule that names the exact bad
sequence is too rigid to maintain.

The partial mitigations that do work are aggregates (repeated calls,
cumulative volume, chain depth), and they are covered in
[the stopping boundary article](/blog/2026-07-14-agent-loops-need-an-external-stopping-boundary/).
A general composition check is a different thing, and most systems lack
one.

## The cost nobody puts in the estimate

Per-instance authorization costs more than per-category authorization,
and compute is a small part of it.

**Latency at the gate.** The check above reads an account and a recent
count. That is two reads that were not there before, on the path
between "the agent decided" and "the tool ran". In an interactive
workflow it is invisible; in a batch of forty thousand actions it is a
throughput number somebody has to own.

**False refusals move work to humans.** This is the one that gets
underestimated and then causes the whole control to be quietly relaxed.
A genuine customer with a legitimate large claim hits the ceiling and
gets refused. The agent cannot proceed. A person has to handle it. Do
that often enough and the team asks for the ceiling to be raised, and
then raised again, until the ceiling is above the largest thing anyone
can imagine doing. The control is still present. It is no longer doing
anything.

**Someone has to choose the thresholds.** There is no default. Every
number in that function is a business decision that has to be made
explicitly, reviewed, and revisited. Most of them will be wrong at
first. This is real work that appears in no architecture diagram.

**The data can be wrong in the permissive direction.** Every check here
consults a source that can be stale, incomplete, or wrong.
Instance-level checks do not make the underlying data more accurate.
They make the system more dependent on it.

## What to actually check

| Check | How to run it | What confirms it |
|---|---|---|
| Magnitude split | Same account, same key, same tool: one refund at the ceiling and one just over | The first is allowed or routed, the second is not |
| Eligibility | Restrict an account and call | The gate reads current state, not a cached snapshot |
| Accumulation | Six refunds of ten dollars where the ceiling is five per week | Every individual call passes and the sixth does not |
| The card's payload | Trigger an approval | The card shows the exact payload and the exact threshold that fired |
| Stale data | Serve an old account state | The decision reflects what was actually read, which is often the finding |
| Cost | Measure added latency on a realistic batch | The number is in the design document, not in the post-mortem |

## Limitations worth stating

The gate can only decide with the context it can reach in the time
available. Some questions genuinely require a human and a full
investigation, and the honest answer for those is approval. The design's
quality is bounded by how well you separate "the gate can know" from
"the gate must ask".

Threshold tuning is an ongoing operational commitment, not a
configuration step. Thresholds that were sensible at launch are wrong
eighteen months later in both directions, and nobody is watching them by
default.

Most importantly: this closes the gap between a category check and an
instance check. The gap between an instance check and a composed-outcome
check stays open, and this should not be sold as if it closes both.

## FAQ

### How is this different from RBAC?

The difference is the object being evaluated. RBAC answers whether a
role permits an operation. This evaluates an invocation: specific
arguments, specific resource, specific moment. You can express "support
may refund up to fifty dollars" in an RBAC table. You cannot express
"support may refund up to fifty dollars except for this account, this
week, having already refunded three times" without leaving the role
model behind.

### Should the thresholds live in code or in a policy store?

In a policy store, with the code reading them. Thresholds that require a
deploy to change will not be changed often enough, and the times they do
get changed will be during an incident.

### What if the account system is slow or down?

You have hit the dependency-failure question from
[fail-closed](/blog/2026-07-20-fail-closed-is-not-a-single-switch/). A live
eligibility read in the enforcement path means an unreachable account
store either refuses every action or opens a hole. Decide that
deliberately, per path, and know which one you chose.

### Does per-instance authorization make the agent slower to build?

It makes it faster to change. The expensive part of agent systems is the
first policy, and then every policy revision afterwards. An
instance-level model lets you revise thresholds without touching agent
code, which is where revisions otherwise end up.

### Can we start with category checks and add instance checks later?

Yes, and be explicit that the design is incomplete at this stage.
Record which actions currently pass on a category check alone.
That list is your actual exposure, and it is far more useful than a
statement that the system has permissions.

## Where this runs

NullRun evaluates the action. The permission says where to start, and
the decision covers this one call. A single call is constrained along
the following lines, and all of them resolve at the moment the tool is
about to run, against live counters. A stored verdict never enters the
decision.

| Constraint | Resolved against |
|---|---|
| Period budget | The counter bound to the current period |
| Per-key rate limit | The live rate counters for that key |
| Tool pattern | The registered tool patterns |
| Tool identity | The tool's resolved identity |
| Money-amount threshold | The amount on this invocation |
| Named argument fields | The tool's own argument bag |

The model keeps doing the reasoning. It still decides that a refund
makes sense. What it does not get to decide alone is whether *this*
amount, for *this* argument set, at *this* moment, is allowed to become a
real side effect. When the answer is not a simple yes, the card a human
sees carries the payload that was actually evaluated and the threshold
that actually fired, so the reviewer is reading one decision. A category
would give the reviewer nothing to read. The same distinction is
written up in the
[API reference](https://nullrun.io/docs/api).
