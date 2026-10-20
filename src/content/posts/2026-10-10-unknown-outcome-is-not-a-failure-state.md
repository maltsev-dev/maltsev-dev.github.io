---
title: "An unknown outcome is its own state"
date: "2026-10-10"
tags: ["reliability", "authorization"]
---
A process crashes mid-execution. The audit log shows the action was
authorized. The runtime logs show it was attempted. The downstream
system has no record at all.

Did it execute? The system does not know. The agent does not know. The
operator does not know.

A shared unknown is the hardest state for a distributed system to reason
about, and the difficulty comes from what the system does with it.

## Most failures have a signature

System failures are usually legible. It returned an error. It returned a
wrong value. It did not respond. Each of those has a handler, and the
handler is in the code because somebody wrote it after it happened once.

The signature that is hardest to handle is the one that is not there.
"Not sure whether it happened" is not an exception, not a status code,
and not an error condition. It is the absence of a condition, and code
written against present-or-absent error signals has no path for it.

## Three responses, and what each one produces

| Response | Caller behaviour | When the guess is wrong |
|---|---|---|
| Assume it succeeded | Does not retry | The action is silently lost. No refund, no record update, no alarm anywhere |
| Assume it failed | Retries | The action happens twice. Double charge, second email, a delete that errors confusingly or destroys something adjacent |
| Ask the downstream | Queries for a status | The honest answer is "I do not know", and that answer breaks the caller's loop |

Assuming success is the worst of the three, because the failure is
invisible in both directions: no error, no alert, no duplicate. Assuming
failure is loud, which is slightly better, and more expensive, since a
duplicate payment is a support ticket and a refund of your own money. A
loop cannot be resolved by a system that cannot see its own past.

For an action whose previous attempt is in an unknown state, the policy is
a fourth option:

> Refuse, because the status is unknown, and do not authorize a second
> attempt without operator intervention.

The first option produces duplicates the operator may never detect at
all. The second produces false refusals that an operator can resolve. The
third produces a clear failure that an operator can resolve.

## The fix is often the type system

Teams resist the third option because it feels like it needs new
infrastructure. It usually needs none. What it needs is for the unknown to
be *representable*.

```python
class Outcome(Enum):
    APPLIED     = "applied"
    NOT_APPLIED = "not_applied"
    UNKNOWN     = "unknown"      # ← the state whose absence causes the bug
```

If your state machine has only `applied` and `not_applied`, the code is
**forced** to pick one. The type will not let it return neither, so every
ambiguous path resolves in favour of whichever branch the author
happened to write first, and no code review catches it because nothing
looks wrong.

```python
def on_retry(execution_id: str, request: Request) -> Decision:
    prior = executions.load(execution_id)
    if prior is not None and prior.outcome is Outcome.UNKNOWN:
        raise UnresolvedPriorAttempt(execution_id)
    return authorize(request)
```

One enum member and one branch. Everything above it, the workflow, the
agent, the operator's tooling, now has to deal with a state that was
always real.

## Make the ambiguity disappear where you can

The better answer removes the ambiguity at the source, and the mechanism
is an idempotency key:

```python
key = hmac(org_secret, f"{principal.api_key_id}:{action_digest}")

client.post("/charges", json=payload, headers={"Idempotency-Key": key})
```

The detail that decides whether this works: **the key is derived from
the action and the identity, and it stays the same across attempts.** A
random UUID per attempt is a unique request ID, and it guarantees that
every retry looks like a new action. This is the most common
implementation mistake in the area, and it looks correct in the code
review because it does look like a key.

Once the downstream is idempotent, "did it happen?" becomes answerable by
retrying with the same key and reading back the stored result, which
collapses the unknown into a known state.

That is the right mechanism for a **settlement**, where the money is
already spent or already sent. A **grant** needs the opposite treatment,
because an authorization is a single-use capability: consuming it twice
is a second use of a thing that was issued once, and it deserves to be
refused. Grants get a single conditional update, then a distinct
replay-rejected answer. Two resources, two guarantees.

| Resource | On repeat | Why |
|---|---|---|
| An approval grant | Refuse, with a replay-rejected code | A grant is single-use; a second consumption is an attack, not a retry |
| A spend settlement | No-op, accepted, charged once | A retry must not double-charge |

The tell is which failure you are actually afraid of. If a duplicate is
dangerous, collapse it. If a duplicate *use* is dangerous, refuse it.

## Every edge gets its own answer

A retried call moves between four outcomes, and the system has to behave
differently on each:

```text
   ┌───────────────────┐
   │ never_attempted   │ nothing dispatched
   └─────────┴─────────┘
             │ agent dispatches
             ▼
   ┌───────────────────┐ crash, timeout, lost ack
   │ attempted_unknown │ no confirmation arrives
   └─────────┴─────────┘
             │ downstream reports
             ▼
     ┌───────────────┐
     │ downstream    │
     │ confirms      │
     └───────┴───────┘
             │
        ┌────┴───────────────────────────┐
        ▼                                ▼
  ┌─────┬───────────────┐     ┌──────────┬──────────┐
  │ confirmed_succeeded │     │ confirmed_failed    │
  └─────────────────────┘     └─────────────────────┘
```

| State | What the agent may do next |
|---|---|
| `never_attempted` | Authorize, dispatch, settle |
| `attempted_unknown` | Refuse the second attempt. Escalate to an operator, a reconciliation job, or an idempotent retry |
| `confirmed_failed` | Authorize a fresh attempt |
| `confirmed_succeeded` | Return the stored result and dispatch nothing |

The unknown edge is the one that collapses most often, because collapsing
it into one of the confirmed edges is locally reasonable and globally
unsafe.

The same reasoning shows up in smaller forms all over an enforcement
path, and in each case the system decides what an absent or unusable
signal means:

| Signal state | Gate behaviour | Why |
|---|---|---|
| Missing value | Fail closed, call refused | No data is not authorization |
| Stale value | Fail open, bounded by the time-to-live | Staleness is a fact about timing, not an absence of information |
| Audit drain crashed between two writes | Duplicate on the next run | Make the write idempotent, because the crash is real |

## What to actually check

1. **Crash between dispatch and acknowledgement.** Kill the process
   between sending the action and recording the outcome. Confirm the
   stored outcome is UNKNOWN and not silently guessed.
2. **Retry against an unknown.** Retry the action. Confirm it is refused
   with a distinct error, not executed and not silently dropped.
3. **Same idempotency key, same digest.** Send the same action twice with
   the same key. Confirm the downstream stores one result.
4. **Different payload, same key.** Change a material field and reuse the
   key. The digest changed, so this must be a different action and must
   not collapse into the stored result.
5. **Resolve an unknown.** Feed the operator path a genuine UNKNOWN. It
   must terminate in a decided state, not sit in a queue.

## Limitations worth stating

A large share of the APIs you actually need this for do not support
idempotency keys. Some payment providers support them only on some
endpoints. Several transactional email services do not offer them at
all. For those, the ambiguity is real and unresolvable by the mechanism
above, and the choice is duplicates or omissions.

That choice is a business decision. Sometimes it is made per operation.
Either way it belongs in writing. Inheriting it from whichever retry
helper the framework provided leaves it undefined. A read-only operation
is safe to
retry aggressively. A refund is not. A webhook delivery to an idempotent
consumer is fine. A webhook delivery to a naive one is not.

Detecting the effect after the fact is weaker than it looks. Querying
"did the charge appear?" depends on the downstream being consistent. If
it were consistent you would already have the answer and would not be in
this branch. The detection window is the window in which you are least
confident.

Operator-resolvable unknowns are an operational cost that does not show
up in the design. Every unresolved attempt is a human waiting, and under
a partial outage the count grows faster than the queue is worked. This
is where unknown-handling systems degrade: the first thing anyone
proposes under pressure is an auto-retry policy, which reintroduces the
duplicate.

And an agent blocked on unknown outcomes makes no progress. The workflow
needs an escalation path. Without one the safe behaviour becomes "the
agent stops", and stopping is exactly what fail-closed is supposed to
avoid.

## FAQ

### Isn't a timeout enough?

A timeout tells you that you did not get an answer in time. It does not
tell you that no answer is coming, which is the case that produces
duplicates. The difference matters at exactly the moment the system is
under stress, which is when retries are most likely.

### Should the retry be automatic if it is idempotent?

For a read, yes, without hesitation. For a write, only when the
downstream genuinely guarantees key-based collapse. Verify that with a
deliberate duplicate against the real provider, not against the
documentation, because the guarantee is often scoped to a window rather
than to the endpoint.

### What about actions with no external effect yet?

Those are the pleasant case: if the effect has not left the process, the
outcome is knowable and there is nothing to reconcile. The difficulty
scales with how far the effect travelled, and a tool that reaches a
payment provider has travelled about as far as effects travel.

### How long does an unknown stay unknown?

As long as the downstream cannot tell us. Give it a reconciliation
horizon: an operator callback, a nightly reconciliation against a
statement. Treat the unknown as decided once that lands. Without a
horizon it is permanent, and permanent unknowns accumulate into a queue
nobody works.

### Does this apply outside money?

Everywhere. Double-sending a message, double-creating a record,
double-posting a comment, double-inviting someone. The severity is lower
and the mechanism is identical.

## Where this runs

NullRun states both of those answers explicitly, and inherits neither. A
missing value in the budget check is fail-closed. A stale value is
fail-open with a time-to-live that bounds the open period. Both are
consequences of the same rule: the system decides what an absent or
unusable signal means, deliberately, and no default decides it for them.
The numbers are explicit. The execution binding that ties a server-minted
execution identity to its organization and API key is valid for 24 hours;
a budget reservation left idle is reclaimed after 300 seconds. Both
windows are constants in the source, not tuning knobs that drift.

The two replay behaviours above are the same rule applied to two
resources. An approval is a grant, so re-consuming it is refused with a
distinct replay-rejected code the agent reads as "this is a duplicate, do
not retry". It never reads it as a failure that invites exactly that
behaviour.
A spend settlement is idempotent, so a retry after a network timeout
settles once and reports success. Consumption of a reservation is atomic
with the accounting it settles. Spend, ledger row and reservation release
move together, so a repeat cannot double-charge. The amount settled is
checked against the amount authorized, with a one-cent fixed tolerance.
Settle more than the envelope authorized and the request is rejected.
No further amount is quietly reserved.

An event that exhausts its retries lands in a dead-letter table with
30-day retention, carrying the counter value at the time it was written,
so the amount a reconciliation pass disagreed with is still readable when
someone looks. The reconciliation loop itself compares the Redis counter
against the Postgres ledger every interval and publishes the difference
as a metric; the dead-letter rows are the per-event evidence behind that
number. See the [API reference](https://nullrun.io/docs/api) for the wire shapes and
[/pricing](https://nullrun.io/pricing) for what retention means at each tier.
