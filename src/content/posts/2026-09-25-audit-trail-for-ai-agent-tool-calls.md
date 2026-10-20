---
title: "How to build an audit trail for AI agent tool calls that survives an auditor"
date: "2026-09-25"
tags: ["audit", "compliance"]
---
Most agent audit logs are a table someone can `UPDATE`. That records
what the system believed at write time. A record of what happened is a
different artifact, and an auditor who works this out once will not take
the second one seriously.

Writing rows is the easy part. Making rows that survive a compromised
application and a compromised operator is the hard part.

## One row carries one event

The single most common mistake is one table that mixes what was
requested, what was allowed, what was spent, and who approved it.
Every writer then updates the row in place to reflect the latest state,
and the previous state is gone.

NULLRUN splits the audit surface into four tables that never overwrite
each other:

| Table | Answers |
|---|---|
| `audit_events` | What decision was taken, and why |
| `execution_records` | What was actually run |
| `cost_events` | What it cost |
| `approvals` | Who said yes |

The decisions are append-only and a correction is a new row, which is
the difference between a ledger and a mutable document, and why the hash
chain below is even possible.

## The execution ID must be minted by the server

Here is an attack that a self-reported ID makes trivial:

```python
# The bug.
gate.check(execution_id=client_supplied_id, ...)
```

A client that chooses its own execution ID controls the namespace it
writes into. It can reuse one ID across two unrelated calls so they
collapse into a single row, or collide with another org's ID so their
events attribute to the wrong party, or replay a known-approved action
under a fresh payload.

The fix is structural: the server mints the ID, binds it to the
identity that asked, and re-compares that binding at settlement.

1. Server generates a **UUIDv7**, time-ordered, so the ID itself
   carries a rough chronology and concurrent mints stay monotonic.
2. The server binds `org_id` + `api_key_id` to that ID, in the same
   atomic operation as the reservation.
3. At settlement, the org and key are **re-read and compared
   atomically**. A mismatch rejects the settlement.

Step 3 is the one that gets skipped. Binding on the way in and not
re-checking on the way out means an approved action can be replayed
with a different payload and nobody notices, because the binding check
already passed once.

## Refusals are evidence too

The instinct on a 402 budget rejection is to skip the write. Nothing
was spent, so there is nothing to record.

That loses the most useful signal in the system. A budget rejection *is*
the enforcement working. It is the event an operator needs when asking
"why did my agent stop making calls at 14:00", and the event a
compliance reviewer needs when asking whether a control actually fired.

So refusals are recorded on the same path as approvals. The rule is
"record what the gate decided, and the gate decides on every call".

Recording does not mean universal coverage. If your plan tiers
deliberately exclude audit logging, those calls produce no row at all,
and any claim you make about total coverage is false by construction.
Know which tiers are entitled before you answer that question.

## Tampering has to be detectable

Blocking `UPDATE` and `DELETE` is table grants, and table grants are one
`ALTER TABLE` away from gone. The durable defence is a hash chain: each
row commits to the hash of the row before it, so modifying any
historical row breaks every hash after it.

```
hash(n) = H(hash(n-1) || canonical_json(row n))
```

The property this buys: an attacker who edits row 40 has to recompute
row 40's hash *and* every hash after it, and the recomputation has to
land before anyone reads the chain.

Two details decide whether this is real:

- **Canonicalisation must be total.** The hash is computed over a
  canonical JSON serialisation, not over the storage row. If it hashes
  the raw row and Postgres normalises anything on write, the verifier
  disagrees with the writer and the chain reports false tampering.
- **The verifier must be exercised against known-bad input.** A chain
  check that has only ever seen a clean database will pass on a broken
  one. Test it with a deliberately tampered row, or you are testing
  that the code runs.

The two mechanisms cover different attackers, and only one of them is
load-bearing:

| Mechanism | Defends against | Fails when |
|---|---|---|
| Table grants blocking `UPDATE` and `DELETE` | An ordinary application bug writing to the wrong table | One `ALTER TABLE` from an operator or a compromised superuser |
| Hash chain over canonical JSON | An edit to a historical row, whoever made it | The verifier has only ever run against a clean database |

## Verify the write path

The outbox pattern keeps the audit trail from becoming the weakest
link:

```
gate decision → outbox row (transactional)
              → dispatcher drains
              → audit_events + hash chain
```

```
  gate decision
       │
       ▼
  ┌───────────────────────────────┐
  │ INSERT outbox                 │
  │ COMMIT                        │
  │ one transaction               │
  └───────────────────────────────┘
       │
       ▼
  ┌───────────────────────────────┐
  │ dispatcher                    │
  │ drain                         │
  │ async, retryable              │
  └───────────────────────────────┘
       │
       ▼
  ┌───────────────────────────────┐
  │ audit_events                  │
  │ + hash chain                  │
  └───────────────────────────────┘
```

The write and the enqueue happen in one transaction, so a decision can
never be made without a queued record, and a record can never be queued
without a decision. The drain is then free to be slow, retryable and
asynchronous.

This matters most where it looks least important: when Postgres is
unavailable at `/track`. The inference already happened and the cost is
already incurred, so failing the response teaches the caller nothing
and blocks a write that is already too late to prevent. Return 200,
keep the outbox row, retry. The alternative turns a database blip into
a client-visible error and loses the audit row in the process.

## What to actually check

An audit trail you have never verified is a claim, not a control.
Worth testing on a schedule:

| Check | A real pass | A vacuous pass |
|---|---|---|
| Does a rejection produce a row? | A 402 leaves a row you can query by `execution_id` | Only approvals produce rows, and the run was all-allow |
| Does the chain verify after a deliberate mutation? | The mutated copy reports the break, at the mutated row | The check ran against a clean copy |
| Does a cross-org write attempt leave anything readable behind? | The write is refused and a follow-up read returns nothing | The attempt used an org the reader already had access to |
| Does an outbox row survive a dispatcher restart? | The row drains after the restart | The dispatcher was never stopped |

The pattern across all four is the same.

## FAQ

### Do we need to log the prompts themselves?

No, and logging them is usually the wrong default. What a reviewer
needs is the decision context: which tool, which policy, which
outcome, which execution. The prompt body is the expensive and
sensitive part, and a hash or a length is usually sufficient to prove
a given call is the one under discussion.

### How long should audit records be retained?

Longer than the operational log, and set by policy. Disk pressure is a
poor reason to shorten it. Records that get deleted on a rotation
schedule are records that were not retained; decide the window
deliberately and write it down.

### Can we run our own audit store instead?

Yes, and that is a common and reasonable choice. The property to insist
on is append-only plus tamper detection. Where the rows live matters
much less than whether the trail can be rewritten after the fact.

## Where this runs

NullRun separates the four kinds of record into four tables, with no
shared `kind` column: `audit_events`, `execution_records`,
`cost_events` and `approvals`. The separation is what lets each of them
carry its own retention rule, its own immutability guarantee and its own
foreign keys without one writer's failure mode silently weakening
another's guarantee.

Refusals are recorded on the same path as lifecycle events, because a
refusal is evidence that a control fired. An audit trail with only the
allows in it cannot answer the question that matters after an incident,
which is what the system stopped.

The identity that ties the records together is server-minted and bound to
the organization and the API key at the moment it is created, so a
decision, the execution it authorised and the spend it produced are
joinable without trusting a client-supplied identifier. The
[integration docs](https://nullrun.io/docs) cover the write path.
