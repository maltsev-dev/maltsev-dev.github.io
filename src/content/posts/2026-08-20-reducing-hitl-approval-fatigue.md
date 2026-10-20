---
title: "Reducing approval fatigue without removing the control"
date: "2026-08-20"
tags: ["operations", "authorization"]
---
A team wants an agent that issues refunds. Security is nervous. There
are exactly two options on the table, and both are bad:

- **No tool.** The agent cannot issue refunds. Adoption stalls, and three
  months later somebody proposes giving it the tool "just for the demo".
- **Tool, no oversight.** It runs. Trust erodes over about six weeks, and
  the trust does not come back after you add oversight, because the
  failure was cumulative and the recovery has to be too.

Everything useful sits between those, and teams rarely reach for it
because the middle is genuinely hard to operate.

## What actually breaks

Approvers do approve things they should not. That happens. The failure
that matters is quieter: approving becomes a gesture.

An approver handling two hundred cards a day is clearing a queue. Two
hundred separate reviews is not what a day of that looks like. The
behaviour under load is predictable: read the title, look at the amount,
click approve. And because the queue is the same every day, that
behaviour is invisible. Every individual action looks considered, and
the aggregate looks fine.

The consequence is that the control is present and inert. It produces
audit records and no protection, which is worse than no control at all,
because the audit records will later be cited as evidence that a
decision was made.

This is why making the approval stricter cannot fix it. Strictness
produces more cards, and more cards produce faster clicking. The card
count decides whether the control works. The ceremony around each card
does not.

## The design that works: a ladder with rungs

Governance for an agent should be a path from approval to autonomy, with
evidence supporting each step along it. A wall with one door has the
same two failure modes, at a larger scale.

The mechanism is three bands, and the boundaries between them are the
whole design:

```python
def authorize(action: Action, policy: Policy) -> Decision:
    if action.risk_score >= policy.block_threshold:
        return Decision("block")

    if action.risk_score >= policy.approval_threshold:
        return Decision(
            "require_approval",
            route_to=policy.risk_owner_for(action.category),
            show=policy.detail_fields_for(action),
        )

    return Decision("allow")
```

```
  action + its instance attributes (amount, destination, reversibility)
                    │
                    ▼
  ┌─────────────────┬────────────────┐
  │ risk_score >= block_threshold    │─── yes ───►┌───────┐
  └─────────────────┬────────────────┘            │ block │
                    │ no                          └───────┘
                    ▼
  ┌─────────────────┬────────────────┐
  │ risk_score >= approval_threshold │─── yes ───►┌──────────────────┐
  └─────────────────┬────────────────┘            │ require_approval │
                    │ no                          │ route_to=owner   │
                    ▼                             └──────────────────┘
                    ┌───────┐
                    │ allow │
                    └───────┘
```

| Band | Condition | Decision | Who sees it |
|---|---|---|---|
| Block | `risk_score >= block_threshold` | `block` | Nobody. The refusal is what gets recorded. |
| Approve | `risk_score >= approval_threshold` and below `block_threshold` | `require_approval`, `route_to=policy.risk_owner_for(action.category)` | The risk owner, shown `policy.detail_fields_for(action)`. |
| Allow | `risk_score` below `approval_threshold` | `allow` | Nobody. |

The shape above is illustrative. `risk_score`, `risk_owner_for` and
`detail_fields_for` are yours to define. What you put in each band
decides whether the ladder works or just describes one.

The bands need to be argued for. Two choices separate a working ladder
from a decorative one.

**Classify by the instance, not the category.** Classifying by tool name
puts a $4 refund and a $4,000 refund in the same band. Classifying by the
action's own attributes puts them where they belong. The attributes that
carry the difference: amount, destination, reversibility, and whether
the target is external. The categories are what you assign. The instance
attributes are what you decide on, and they are also where
[instance-level authorization](/blog/2026-06-13-permissions-are-categories-authorizations-are-instances/)
comes from.

**Route to an owner.** An approval that lands in a shared inbox is an
approval that gets cleared by whoever is least busy. Routing to the
owner of the affected system means the person who can actually tell
whether the refund is wrong is the person who sees it.

## Each rung has to be earned

The failure that produces most security theatre is the team that ships
everything gated and then relaxes it on a schedule. Three weeks of
approval cards, nothing bad happened, auto-allow everything.

That reasoning is weak for a specific reason: nothing bad happened is
also what happens when nobody was looking. The evidence question is not
"did anything bad happen" but "was anyone in a position to notice if it
had".

A relaxation should be backed by evidence of this shape:

| Evidence | What you are reading | What thin evidence looks like |
|---|---|---|
| **Volume and shape.** How many actions ran, at what distribution of risk. | Whether the band has enough traffic to mean anything. | Ten approvals does not support a tier. |
| **Incident and near-miss counts.** Including near-misses, which is the only honest signal available. | Whether the band has ever been wrong. | An incident count with no near-miss capture is an empty signal. |
| **Reviewer engagement.** The proportion of approvals that came back modified or rejected. | Whether anyone is still reading. | A 2% rejection rate means the rule is nearly dead and the near-misses are going unread too. |
| **A version bump.** Every relaxation is a new policy version with a new digest. | Whether the change is attributable later. | Without it, a refund executed under last month's rules is indistinguishable from one under today's. |

The version bump is the one teams skip and the one auditors do not. A
control you tuned away on day forty is only defensible if you can say
what was in force on the day of the incident.

## Measuring whether the approval is real

You cannot tell whether HITL is working from the count of approvals. The
counts go up and everyone feels better while the control gets weaker.

What predicts a real approval is the distribution of reviewer behaviour.
A genuine review has a latency distribution with a tail, where some
approvals take thirty seconds because something looks off. A rubber
stamp has a spike at the floor.

Three numbers carry that signal:

| Number | Healthy shape | What you are actually looking for |
|---|---|---|
| **Time to decision, distributed.** Not the mean. | A distribution with a tail. | A spike at the floor. If 95% of approvals complete in under three seconds, there is no review happening, whatever the average says. |
| **Modification rate.** What share of approvals came back changed or rejected. | A share that moves with reviewer attention. | Near zero over a long period is a finding, not a success. |
| **Cards per reviewer per day.** | Below roughly a hundred. | Above roughly a hundred, approval degrades to a click. This is the number that should drive how much you automate, and it is usually the one nobody measures. |

## The failure nobody expects: routing under the ceiling

Tiering creates an incentive, and the incentive is predictable.

When a request sits just above the auto-allow ceiling it generates a
human card. When it sits just below, it runs unattended. Every engineer
in the team learns this boundary within a week. From that week on,
requests get reframed: split into two smaller ones, phrased as a routine
category, batched, or routed through the tool that has a more generous
ceiling.

The split is the dangerous one, because each individual action is now
under the ceiling and genuinely fine. A $4,800 refund becomes two $2,300
refunds. The aggregate is wrong and no single action is, which means this
is a [composition](/blog/2026-10-07-four-valid-permissions-one-unacceptable-chain/)
problem that the tier boundary made worse.

Three mitigations, in order of how much they help:

- **Make the band narrow relative to the request distribution.** A wide
  approval band around a tight auto-allow ceiling maximises the number of
  requests that can be reframed into it.
- **Aggregate the split explicitly.** A per-execution cumulative counter
  on the same risk dimension means two sub-ceiling actions in one
  workflow are evaluated against each other.
- **Watch the boundary in the metrics.** A spike in actions at 95% of
  the ceiling is the signal, and it is visible weeks before anyone
  complains.

## The homogeneous queue case

There is one legitimate way to handle a genuinely homogeneous queue:
make the card cheaper to read. Approving all of them is the thing you
were trying to avoid.

If 400 cards a day are all "restock item X to par level Y at store Z",
the count is not the problem. The card is. It shows the model's
reasoning instead of the decision. Compress the card to the fields that
vary: what changed, from what to what, and who is affected. Drop the
transcript, the diff, and the chain-of-thought, which is where the 400
cards' worth of reading time actually goes.

That is a real improvement and it is bounded. Once the cards are as small
as they can be, the answer is a wider auto-allow band, backed by the
evidence that supports it.

## What to actually check

| Check | How to pull it | What a finding looks like |
|---|---|---|
| **Latency distribution.** | Pull time-to-decision for the last month. | A spike at the floor. Check the percentile shape, not the average. |
| **Modification rate.** | What share of approvals came back changed. | Near zero is a problem. |
| **Boundary clustering.** | Histogram action amounts against the auto-allow ceiling. | A cluster just below it, which is the routing signal. |
| **Split detection.** | Take a week of actions, group by execution, and check for runs of sub-ceiling actions with a shared counterparty. | Those runs are the splits. |
| **Relaxation provenance.** | Confirm every band change produced a version bump. | A refund from six weeks ago that is not attributable to the version in force then. |

## Limitations worth stating

Risk tiers need data you usually do not have on day one. There is no
principled way to set the thresholds before you have traffic, and the
honest answer is that the first configuration is a guess that the metrics
then correct. Teams that want a principled first cut do not get one, and
the ones that claim otherwise are extrapolating from a demo.

Routing requires people with authority to be available at the hours the
agent runs. An agent that works at 3am and approves anything above a
threshold has an approval process that only exists during office hours.
Decide what happens at 3am explicitly, because discovering the default
later is how you find out.

The ladder also has to go down. Evidence changes: an incident, a new
tool, a vendor change. Tightening has to be as easy as relaxing, or the
system will only ever move toward autonomy because loosening is what
the tooling supports. A control you can only widen is not a control.

And the ceiling itself is a guess that gets adjusted. Every adjustment is
a security decision made by someone who is looking at a chart, and the
chart does not know what the requests were. That is a permanent weakness
of tiered designs and it is not fixable with a better thresholding
algorithm.

## FAQ

### Should high-risk actions ever be fully automated?

For a small number, yes: the ones where the automatic response is
obviously correct. A refund above $10,000 on an account flagged for fraud
is not a decision anyone wants a person making quickly at 3am. The tier
should be able to express "block" and "auto-allow" with no approval band
between them for genuinely binary cases.

### How do we start without historical data?

Gate everything, run for a period, and let the band boundaries fall out
of the observed distribution. The cost is that you pay full approval
overhead during the learning period, which is exactly the period where
teams are most tempted to shortcut it. Resist that at least once.

### Does batching approvals work?

Only where the batch is genuinely homogeneous. "Approve these forty
refunds" is a control only if all forty would have been individually
approved with no edits. When that holds, the batch approval is
functionally the auto-allow you were avoiding, with worse auditability
and a person attached to it.

### How do we stop engineers from gaming the tiers?

You cannot stop it with policy; you can only make it visible and make
the aggregate check catch it. The honest framing is that any threshold
you publish is a target, and the design assumption should be that people
will sit just below it. Which means aggregate checks matter more once
tiering exists.

### Is there a standard risk scoring approach?

Not one that transfers. The attributes that matter differ by action type.
Reversibility is decisive for a refund and irrelevant for a send. Any
single score is a compression that loses exactly the distinctions the
approver needed. Bands over per-category attributes beat one score across
categories.

## Where this runs

NullRun holds the bands as policy, with no branch of the same logic in
application code. The pieces that matter for this article are the ones
that make a card worth reading.

**Rules attach to the workflow.** A money-amount rule and a
tool-parameter rule are configuration, so a boundary moves without a
deploy and the change is a reviewable edit, with no release involved. Policy
resolution is most-specific-first: per calling key, then per workflow,
then org-wide. A policy can be scoped to one team without disturbing the
rest of the organisation.

**The card carries the reason.** An approval row records the rule that
fired, the risk level, the tool name and the action's own parameters.
That is the difference between a card an approver can act on and a card
they clear, and it is the single change with the largest effect on the
latency distribution above.

**Every decision is bound.** The approval binds to the action's digest,
which the server recomputes from the live payload at consumption time.
Change the amount between approval and execution and the approval is
refused with `APPROVAL_DIGEST_MISMATCH`; consume it twice and the second
attempt is refused with `APPROVAL_REPLAY_REJECTED`. The card is
therefore evidence of a decision about a specific action, not a gesture
that something happened.

**The approval expires on its own.** A per-rule TTL, five minutes by
default, is part of the consume predicate. No sweeper races it. A
decision nobody acted on stops being actionable without anyone having to
clean it up.

**Relaxations are attributable.** Every policy edit writes a new version
and a new hash, and refusals are recorded in the audit trail with the
policy hash in force when they ran. That is what answers "what did this
policy allow in March" without depending on anyone's memory of the March
configuration. It is the point about version bumps that teams skip.

The [integration docs](https://nullrun.io/docs) cover wiring the rules to your tools.
