---
title: "An approval is durable security state"
date: "2026-08-08"
tags: ["authorization", "reliability"]
---
The sequence is short. An agent submits an action for approval. The
operator approves it. The agent crashes. A new instance starts and
retries the action.

Where does the approval live?

If the answer is "in the running process", then nowhere. The new instance
cannot know that a human already made a decision, and it has three
options. All three are wrong.

| Option | What it does | What it costs |
|---|---|---|
| Ask again | The operator sees a second card for an action a human already judged. | They approve or deny based on a guess about what they saw last time. |
| Re-authorize silently | The workflow resumes as though approval happened. | This is the one that ends in an incident report. |
| Lose the relationship | The approval exists somewhere, the execution happens somewhere else. | The audit trail holds an approval with no execution and an execution with no approval. |

Those are three symptoms of one mistake: security state was stored as
session state.

## What the record has to contain

An approval is a fact about one decision, made once, by an identified
person, about an identified action, valid for a bounded period of time.
Every one of those clauses needs a column:

```sql
CREATE TABLE approvals (
    id                  uuid PRIMARY KEY,
    organization_id     uuid NOT NULL,
    workflow_id         uuid,
    workflow_name       text NOT NULL,
    execution_id        uuid NOT NULL,
    action              text NOT NULL,    -- what is being asked for
    action_params       jsonb,
    action_tool_name    text,
    action_digest       text,             -- binds to the exact payload
    tool_digest         text,
    api_key_id          uuid,
    rule_id             uuid,
    status              text NOT NULL,    -- PENDING|APPROVED|DENIED|EXPIRED|CONSUMED|REVOKED
    risk_level          text NOT NULL,
    confirmation_method text,
    decided_by          uuid,             -- the human, not the agent
    decided_by_kind     text,             -- user | system_expiry
    decision_note       text,
    requested_at        timestamptz NOT NULL,
    decided_at          timestamptz,
    expires_at          timestamptz NOT NULL,
    consumed_at         timestamptz
);
```

| Clause in the definition | Columns that carry it | What goes wrong without them |
|---|---|---|
| One decision, made once | `id`, `requested_at`, `decided_at` | You cannot tell how many times the same question was put to a human. |
| By an identified person | `decided_by`, `decided_by_kind` | `decided_by` has to hold the human's identity. The agent's identity is the one attribution that carries no accountability. |
| About an identified action | `execution_id`, `action`, `action_digest` | Without the digest the row records that *something* was approved, which is the same "we have logs" problem described in [the audit trail article](/blog/2026-09-25-audit-trail-for-ai-agent-tool-calls/). |
| Valid for a bounded period | `expires_at` | The approval outlives the world the human was looking at when they decided. |

`status` is one column here on purpose. The tempting split, a `decided`
boolean plus a separate `consumed` flag, produces combinations you should
never have to query for, including "decided but not decided".

One structural detail decides this rather than merely tending to it. A
partial unique index on `execution_id` where `status = 'PENDING'` makes it
impossible for one execution to have two open cards. The database enforces
that, so no second code path can forget the check.

## Transitions have to be single statements

```sql
UPDATE approvals
   SET status = 'CONSUMED', consumed_at = now()
 WHERE id              = :id
   AND organization_id = :org
   AND execution_id    = :execution
   AND status          = 'APPROVED'
   AND consumed_at IS NULL
   AND expires_at      > now()
   AND action_digest   = :live_digest
RETURNING id;
```

One statement, seven preconditions. Zero rows returned means refuse. This
is the same shape as the consumption check in
[binding an approval to its payload](/blog/2026-08-01-human-approval-is-not-authorization/),
and it exists for the same reason: a load-then-write lets two workers both
see `approved` and both execute.

The rule generalises to every transition on this record. Approving is a
conditional update from `PENDING`. Denying is a conditional update from
`PENDING`. Nothing reads status and then writes it back.

Expiry and consumption cannot collide, because their predicates address
disjoint status sets. The consume predicate requires `status = 'APPROVED'`.
The expiry path targets `status = 'PENDING'`, so there is no window in
which both can win. A row that is still
pending past its expiry is not consumable, because the consume predicate
carries `expires_at > now()` in the same statement. Nothing can rewrite a
consumed row as expired, because the expiry update's own predicate excludes
it.

```
        ┌──────────┐
        │ PENDING  │─── deny ─────► DENIED
        └────┬─────┘
             │ approve
             ▼
        ┌──────────┐
        │ APPROVED │─── consume ──► CONSUMED (terminal)
        └──────────┘

   sweeper: PENDING + expires_at < now() ────► EXPIRED

   consume predicate:  status = 'APPROVED'
   expiry predicate:   status = 'PENDING'
```

## Recovery asks about the grants you hold

Most implementations stop short here. On reconnect, the agent
asks for its pending approvals and gets a list. Then it has no way to
distinguish "never asked" from "asked and denied", so it asks again. The
operator gets a second card for a decision they already made, and the loop
continues until somebody reads the logs.

Recovery is keyed by the approvals themselves. You ask about the grants
you hold, and the server tells you what became of each one.

```sql
SELECT id, status, expires_at, action_digest, decided_by, decided_at
  FROM approvals
 WHERE organization_id = :org
   AND id = ANY(:approval_ids);
```

Nothing in that query filters by status, so denied, expired and consumed
all come back. That is the entire point. A recovery surface that hides
negative answers forces the agent to infer state from absence, and
inference is precisely what durable state was supposed to eliminate.

A retried workflow that finds `denied` can end the run and report the
refusal to the user, which is the correct behaviour. The same workflow
that found nothing would re-ask, and it would keep re-asking forever,
because nothing in the protocol tells it the difference.

## Expiry belongs to the durable lifecycle

Two properties make expiry safe to run out of band.

It is idempotent and restartable. The sweeper is a query plus a
conditional update, both of which can be re-run after a crash without
consequence. The database is the source of truth; the sweeper is a
convenience.

Consumption is terminal. An approval that was consumed does not
become expired because time passed. The sweeper's predicate excludes
`consumed`, and the consumption predicate excludes anything past its
expiry. Each transition only moves the row forward.

If the sweeper never runs, whether from a crash, a disable, or a store
outage, the row does not become valid. It stops being usable on its
`expires_at` regardless, because every read path checks the timestamp
too. The sweeper keeps the table tidy. Expiry enforcement lives in the
predicate on the consume. That ordering matters: a mechanism that enforces
safety should not depend on a background job being healthy.

## What to actually check

| Check | How to run it | What a pass looks like |
|---|---|---|
| Crash between approval and execution | Approve, kill the process, reconnect. | The new instance sees `APPROVED` and consumes it without re-asking. |
| Denial is durable | Deny, crash, reconnect. | `DENIED` comes back and the agent does not re-request. |
| Expiry is enforced at the consume | Let an approval sit past `expires_at`, then try to consume it. | The statement refuses, both with and without the expiry worker running. |
| Consumed is not overwritten | Run the expiry sweep against a consumed row. | Nothing changes. |
| One open card per execution | Try to create a second `PENDING` row for the same execution ID. | The unique index rejects it. |
| Cross-agent recovery | Query recovery using another agent's execution ID. | Only the holding agent's approvals come back. |

## Limitations worth stating

Recovery still requires the agent to re-present the payload. The server
holds the digest, but it recomputes from the live request at execution, so
an agent that reconnects with a reconstructed payload that differs from the
original gets a refusal, and the refusal is loud. That is the right
default, and it does mean a resumed workflow cannot repair its own
arguments. It has to re-derive them identically or start over.

The recovery query is bounded by your retention window. If approvals are
purged after thirty days and a workflow is suspended for longer, it
reconnects and finds nothing, which is indistinguishable from "never
asked". Long-running autonomous systems and short retention need a
different answer, and there is no way around the tension.

The denial loop is the one that reaches a human: an agent whose denial
is not durable will re-ask
the same human repeatedly, and the result is approval fatigue that
teaches people to click without reading. If you route approvals to
people, make negative decisions durable before you add volume.

Durable state makes the decision recoverable and attributable. Whether
the record deserves trust is a separate question, and a separate
guarantee: the record has to be written atomically with the decision it
describes. [The audit trail article](/blog/2026-09-25-audit-trail-for-ai-agent-tool-calls/)
covers that one.

## FAQ

### Do we need this if our workflow runs in a single long-lived process?

Only until the process restarts, crashes, or a deploy replaces it. All
three happen in normal operation. A single-process design defers the
problem, and the failure shows up at the worst moment because restarts
cluster around deploys.

### How long should an approval stay valid?

Long enough for the human to actually look, short enough that the world
has not changed underneath it. Minutes for anything with a price or a
destination. Five minutes is a reasonable default for a rule that
requires a person. The lifetime is one of three coordinates the approval
binds to, alongside the action and the context.

### Should denied approvals be kept forever?

No, but they have to outlive the workflow that asked. A denials table
with the same retention as the operational log is usually fine. The cost
is storage, and the benefit is being able to answer "why does this
workflow keep asking" without archaeology.

### What if the operator approves after the agent gave up?

The approval lands on a row whose execution has moved on. It is a real
decision about a real payload and it belongs in the audit, but nothing
executes it. The operator interface has to say so, instead of showing a
pending card that will never resolve.

## Where this runs

NullRun stores approvals as durable rows with the decision, the
approver, the expiry, the consumption state, and the digest that binds
them to the action. Moving from approved to consumed is one conditional
update that verifies the row is approved, unexpired, unconsumed, and
bound to the same execution, key and payload in the same statement. A
failed condition changes nothing, and a retry cannot race another
execution into the same grant.

Recovery asks the server, not the agent's memory. You hand it the approval
ids you hold and it answers with the true current state of each one, every
status included. That is what stops a resumed instance from
reconstructing a decision from the absence of one.

The [API reference](https://nullrun.io/docs/api) has the recovery endpoints and the
[security documentation](https://nullrun.io/security) the retention story.
