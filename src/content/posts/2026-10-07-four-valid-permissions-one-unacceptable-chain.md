---
title: "Four valid permissions and one chain nobody approved"
date: "2026-10-07"
tags: ["authorization", "security"]
---
An agent is permitted to do four things:

1. Read a customer record
2. Run a query
3. Create a CSV
4. Send an email with an attachment

Every step is in scope. The chain is a bulk data export to an external
recipient.

The agent executes them in order, because the task it was given was
"produce a customer report". The report is delivered. The agent reports
success.

Then an operator opens the dashboard and finds fourteen gigabytes of
customer PII in a publicly readable bucket. No single action was
unauthorized. The composition produced an outcome nobody intended and
no policy approved.

## The model that produces this failure

The mental model is: *if each step is allowed, the path is allowed.*

It is the model that IAM, RBAC and every table-driven permission system
teach, and it is correct for the problems they were built for. It breaks
because of a specific asymmetry. The number of paths through an agent's
action space is combinatorial, while the number of individual actions is
linear.

An agent optimising for task completion will combine permissions,
because the task requires it. It will not know that the combination is
the thing nobody agreed to.

A check that passes at the level of an individual action answers one
question and leaves a second open: *given that each of these actions is
permitted, is the composition of them permitted?*

That second question catches the exfiltration pattern, the runaway cost
pattern and the privilege-escalation pattern. None of them is visible at
the single-action level, and the single-action level is where these
systems operate.

## Why the four obvious approaches fail

Each of the four attacks the sequence. None of them attacks the
aggregate effect, which is the thing that actually became dangerous.

| Approach | Why it fails |
|---|---|
| Flag any sequence longer than N | Too coarse, and it fails immediately on legitimate work. A research agent that reads two hundred documents, summarises them and sends one email is doing exactly its job, and it looks identical to the attack from the inside. |
| Forbid this exact sequence | Too rigid in both directions. It does not generalise (the next variant uses a query instead of a CSV) and it is trivially defeated by inserting one harmless read between the steps. A composition check that a single extra action breaks is a per-action check with extra words. |
| Sum the permissions | Most real workflows both read and write, so "read access plus write access, therefore..." does not separate the malicious case from the ordinary one. It cannot be acted on without a false-positive rate that makes it useless. |
| Block egress | Sound in principle, and it depends on two things you may not have: an egress control at the destination, and a way to classify the destination as external. It also blocks the agent's primary job. |

## The structural framing that does work

A sequence is suspicious when its aggregate effect is one the individual
actions could not have produced. No individual tool call here wrote
fourteen gigabytes anywhere. The workflow did.

So track a running aggregate per execution and check it at each decision:

```python
@dataclass
class ExecutionAggregate:
    sensitive_records_read: int = 0
    bytes_staged: int = 0
    external_bytes_sent: int = 0
    destinations: set[str] = field(default_factory=set)
    cumulative_cost_cents: int = 0

def composition_check(agg: ExecutionAggregate, action: Action, policy: Policy) -> Decision:
    signals = []

    if agg.sensitive_records_read > 0 and action.destination_is_external:
        signals.append("sensitive_read_then_external_send")

    if agg.bytes_staged + action.estimated_bytes > policy.staging_ceiling:
        signals.append("staged_volume")

    if agg.external_bytes_sent + action.estimated_bytes > policy.egress_ceiling:
        signals.append("external_egress_volume")

    if signals:
        return Decision("block", signals)

    return Decision("allow")
```

Every permitted step feeds the same counter, and the counter is read at
the decision point. Reading it at the end is too late to block anything:

```
  step 1  read record ──┐
  step 2  run query   ──┤
  step 3  create CSV  ──┼──►  ExecutionAggregate
  step 4  send email  ──┘     sensitive_records_read
                              bytes_staged
                              external_bytes_sent
                              cumulative_cost_cents
                                         │
                                         ▼
                         composition_check(action, policy)
                                         │
                           ┌─────────────┴────┐
                           ▼                  ▼
                      ┌────┬────┐   ┌─────────┬──────────┐
                      │  allow  │   │ signals non-empty  │
                      └─────────┘   │       block        │
                                    └────────────────────┘
```

This is a **per-evaluation pattern**: it runs at the gate, it reads
what the run has accumulated so far, and it is what most practical
mitigations actually are. It is cheap, it composes with everything else at the gate,
and it catches the shape above without catching a long read-only
workflow.

The `sensitive_read_then_external_send` rule is the clearest example of
the framing working. Neither half is suspicious: reading sensitive data
is the agent's job, and sending email is a normal tool. In *this order*,
*in this execution*, they are the exfiltration signature.

## What exists and what is still open

The marketing version of this topic implies a general composition
check, and no such check exists.

**What exists:** per-evaluation patterns that catch some compositions,
and running aggregates that catch some cumulative effects. Together they
are a real improvement over per-action checks and they do stop the
fourteen-gigabyte case.

**Still open:** a general composition check. Nobody has one. The
interesting question, how do you detect the bad sequence without making
every legitimate sequence look bad, is genuinely open. A precise rule
that forbids this exact sequence is too rigid to maintain, and a loose
rule over sequences is too coarse to act on.

The limitations here are practical rather than theoretical, and a
design that claims coverage should be asked which of the three
composition types it actually detects:

| Composition | Detectable? | By what |
|---|---|---|
| Data exfiltration | Reliably | The aggregate is large and monotonic |
| Runaway cost | Reliably | The budget projection |
| Privilege escalation via chaining | Not reliably | The aggregate is small and the signal is structural |

Two of three are in good shape for a specific reason: their aggregates
are large and move in one direction. The third is the hard case, and it
is the one where a system is most likely to be over-confident.

## What to actually check

Five checks, each aimed at one specific way an aggregate gets evaded.

| Check | How to run it | What a pass looks like |
|---|---|---|
| Replay the chain | Run the four steps | The fourth is caught |
| Insert a harmless step | Put a read between the export and the send | The composition is still caught |
| Legitimate bulk work | Run a real reporting workflow: long, reads a lot, sends one summary | It completes. Precision is the entire game here, so this is the test that matters most |
| Slow accumulation | Read in small increments over many calls, under every per-call threshold | The aggregate catches it, or the gap is documented honestly |
| Subagent delegation | Have a parent read nothing and a child read everything | The child's aggregate is still evaluated |

## Limitations worth stating

The aggregate needs a definition of *execution*, and executions are
unbounded in length. A workflow that runs for six hours across a context
window, a compaction and a resumed instance has an aggregate whose
lifetime has to be defined somewhere, and every boundary you introduce is
a place the tracking resets.

The other four limits trade detection for something else. Each one is a
way the aggregate stops protecting you.

| Limit | What it costs you |
|---|---|
| **Subagents fragment it** | If the parent reads nothing and delegates to a child that reads everything, the child's aggregate starts empty. The composition spans two aggregates and neither one sees the whole shape. This is a real hole and the patterns above do not close it. |
| **Eviction is a security decision** | Aggregates held in memory cost something and something eventually discards them. Discarding an aggregate resets detection, which makes system memory pressure a control-plane input. Better said now than discovered in an incident. |
| **False positives kill these systems faster than false negatives** | A signal that fires on the nightly export every night is muted by the third day, and a muted signal protects nothing while continuing to consume attention. The precision requirement is the thing that determines whether the mitigation exists in six months. |
| **Thresholds are ceilings, and attackers know it** | Per-call limits and aggregate limits are both thresholds. A pattern that stays under them is indistinguishable from a slow legitimate workflow, which is the cost of getting precision right. There is no version of this that closes completely. |

## FAQ

### Should we just forbid agents from sending email to external addresses?

That is a real control and it is proportionate for some agents. It is
not a composition check, it has a real productivity cost, and it is one
rule in place of a general answer. It belongs in the same layer as
everything above, not instead of it.

### Can we detect the bad sequence with the model?

A model asked "is this sequence dangerous?" will produce confident,
fluent, occasionally wrong answers, and it will produce them differently
on two runs of the same input. It can be a useful signal to surface to a
human, and it is a poor basis for an automatic block on a path where
being wrong is expensive.

### How do we tune the ceilings without flagging everything?

By running the agent's real legitimate traffic against the rules before
enabling the block, and setting the ceiling above what legitimate work
actually reaches. It is empirical and it is per-workflow, which is
unsatisfying, but the alternative, guessing, produces a rule that fires
on the first real user.

### Does this matter if we already have budget limits?

For cost, yes you are covered. A budget projection is itself an
aggregate check, and it is the cleanest example of one working. For
exfiltration, no: reading data is free under every budget model, and the
counter never moves. The mechanism from
[the budget article](/blog/2026-06-26-agent-budget-is-a-permission-not-a-limit/)
generalises, but the signal does not.

### Is there a principled reason to think this is solvable?

Partially. Exfiltration and cost have monotonic aggregates, which is why
they are tractable. Privilege escalation does not have that property.
The signal is structural in kind, while the other two are volumetric,
and structural signals over sequences are where the field is genuinely
behind. Treating all three as one problem is how a system ends up
confident about the two it handles and vague about the one it does not.

## Where this runs

NullRun is a per-evaluation layer, and it is worth being precise about
which of the three composition types above it answers and why.

**Runaway cost is covered by exactly the mechanism this article
describes.** The budget counter is a running aggregate, period-bound and
org-scoped, checked at every decision. The amount is *reserved* before
the tool call. Measurement after the call would be too late. The reserve
and the cap comparison happen inside a single script on the data store,
so there is no window in which the counter is read, the agent issues
eleven more calls, and the write lands. It is monotonic, it moves in one
direction, and it is bounded. This is the clean instance of the pattern.

**Rate is the same shape at a finer grain.** A token bucket on
`(organization_id, api_key_id)` is an aggregate over a window, checked
per call.

**Exfiltration is a different question, and the aggregate has no answer
for it.** Reading data is free under a budget model, and the counter does
not move. That is precisely why the ceiling that stops a runaway does
not stop a fourteen-gigabyte export. The gate's answer to that case is
the per-evaluation one: the tool pattern, the money threshold and the
argument rules are each evaluated against the live action, and each
refusal is a typed decision with its own code in the audit trail. That is
the layer that holds, and it holds exactly.

The honest position is the partial one, and it is a useful one to design
around: use an aggregate where the effect is monotonic and the aggregate
wins, and use the per-action layer as the exactness backstop everywhere
else. The hard part of composition, catching a bad sequence without
flagging every legitimate one, is not something a gate answer can be
bought out of, and a design that implies otherwise is overselling. The
[integration docs](https://nullrun.io/docs) cover how a tool is put behind the per-call
decision.
