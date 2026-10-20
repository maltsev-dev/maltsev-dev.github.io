---
title: "An agent budget is an authorization decision"
date: "2026-06-26"
tags: ["cost", "authorization"]
---
The first version of this always looks the same. There is a number, the
number grows, and when the number crosses a threshold the request is
rejected.

```python
spent = get_spend(period="2026-10")
if spent + estimated_cost > CAP:
    return reject("budget exhausted")
record_spend(estimated_cost)
return allow()
```

This is accounting with a brake on it. Every call it authorizes is
authorized against a balance that only exists on a dashboard, so the
number it checks has already been spent. The difference shows up under
load, which is exactly when it matters.

## The failure mode is a thousand small calls

An agent working a ticket queue issues a thousand cheap calls in an hour.
None of them looks expensive in isolation. The projection at each call
site says there is headroom, because each call only costs a fraction of
what is left.

By the time the aggregate is visible on a dashboard, the agent has
already done the work the operator never intended to fund. The system can
report "seven hundred and ninety dollars spent against a thousand-dollar
cap". It cannot say why those specific calls were authorized, or which
one it should have refused.

A limit observes the past. A permission constrains the future. The
code above is the first one wearing the second one's name.

| Property | Reads settled spend | Reserves against the projected future |
|---|---|---|
| Question it answers | How much did we spend? | May this call proceed? |
| Value it reads | A number that already happened | Settled plus in-flight plus this call |
| Under concurrency | Every caller sees a clear slot | Every caller takes its own reservation |
| Refusal message | "Budget exhausted" | Projected total, outstanding holds, refused call cost |
| Failure it prevents | Overspend, discovered afterwards | Overspend, stopped before the effect |

## The projection has to count calls in flight

Bounding anything means counting calls that have been permitted but
have not finished.

```
projected = spent_in_period + reserved_in_flight + cost_of_this_call
```

| Term | Covers | What breaks without it |
|---|---|---|
| `spent_in_period` | Settled calls in the current period | Nothing yet, so nothing is bounded |
| `reserved_in_flight` | Permitted calls still running | The concurrent case walks straight through the cap |
| `cost_of_this_call` | The call being decided | The decision ignores its own cost |

`reserved_in_flight` is the part teams skip, and it is the part that
matters most, because the expensive calls are the slow ones: a long
context call, a batch tool, an agent that reserved at the gate and is
still streaming forty seconds later. A cap that only reads settled spend
allows exactly the concurrent case that blows through it.

```python
def authorize(cost_cents: int, period: str) -> Decision:
    spent   = counters.spent(period)
    held    = reservations.outstanding(period)
    if spent + held + cost_cents > CAP:
        return Decision(
            "block",
            reason=f"projected {spent + held + cost_cents} exceeds cap {CAP}",
        )
    reservation = reservations.create(cost_cents, period, ttl=SECONDS_300)
    return Decision("allow", reservation=reservation)
```

The block message is part of the diagnostic surface. "Budget
exhausted" is a number without a reason; an operator who sees the
projected total, the outstanding holds, and the cost of the call that
was refused can usually tell whether the agent is looping or whether
the cap is simply too low.

## Reserve and authorize in one operation

Two stores, two calls, and you have rebuilt the same race you would have
found in any counter.

```python
if reservations.create(cost, period):   # ← checked here
    counters.add(cost, period)          # ← written here
    return allow()
```

Between the two, every concurrent call sees a clear slot. The read-then-
write has to move into something atomic: Redis Lua, a conditional SQL
update, or a serializable transaction. The whole decision goes into that
operation, check included.

```text
 ┌──────────┐
 │  agent   │ cost_cents, period
 └────┬─────┘
      ▼
 ┌────┴─────────────────────────┐
 │ authorize()                  │
 │ spend + held + cost > CAP?   │
 └────┬──────────────────────┬──┘
      │                      │
      ▼                      ▼
 ┌───────────┐     ┌───────────────────────┐
 │ block     │     │ reservations.create   │
 │ reason:   │     │ ttl 300s, bound to    │
 │ projected │     │ server-minted exec_id │
 └────┬──────┘     └─────────┬─────────────┘
      │ no effect            │ execute the tool
      ▼                      ▼
 ┌────┴──────┐      ┌────────┴──────────┐
 │ audit row │      │ settle(actual)    │
 └───────────┘      └────────┬──────────┘
                             │ actual vs authorized + ε
                             ▼
              ┌──────────────┴───────────────┐
              │ release hold + ledger write  │
              │ + overage row if over ε      │
              └──────────────────────────────┘
```

[Atomic budget reservation in Redis with Lua](/blog/2026-07-08-atomic-budget-reservation-redis-lua/)
walks through the Lua version, including the four ways a script that
looks correct still leaks money. The short version: the check and the
increment have to be the same operation, the reservation has to be bound
to a server-minted execution ID, and the ownership comparison has to
happen again at settlement and not only at reservation.

## The counter has to be the server's

There is a version of this where the agent reports what it spent and the
gateway adds it up. It is cheaper to build, and it only observes.

The reporting path is the agent, which means it inherits every retry,
every double-counted stream chunk, every provider whose usage field moved
between versions, and every honest mistake in an estimate. A caller that
supplies the number being limited supplies its own limit.

So the counter is derived where the decision is made. The SDK reports
usage so cost can be *settled*; it does not report the balance. If a
provider's streaming response puts usage only in the final chunk, the
fix is a buffer that waits for that chunk. An estimate supplied by the
caller leaves the limit in the agent's hands.

## Settling is where the drift lives

Reservation is the easy half. Settlement touches three things that have
to stay consistent: decrement the period counter by the *actual* cost,
release the reservation, write the ledger.

```python
def settle(execution_id: str, actual_cents: int) -> None:
    res = reservations.load(execution_id)
    if res is None:
        return  # never reserved, or already settled
    delta = actual_cents - res.authorized_cents

    if delta > EPSILON_CENTS:
        counters.add(delta, period=res.period)     # real overage
        overages.record(execution_id, delta)       # and visible
    reservations.release(execution_id)
    ledger.write(execution_id, actual_cents)
```

Re-checking the budget at settlement happens after the decision to spend
has been made and the effect already exists. Refusing at that point
tells you nothing and leaves the caller's state inconsistent. The
comparison that carries meaning is actual against the **authorized
reservation**, plus a fixed-cent tolerance to absorb routine estimation
error. Any excess becomes a visible overage event, and never a silent
second reservation.

| Settlement outcome | Counter | Reservation | Ledger |
|---|---|---|---|
| `actual ≤ authorized + ε` | Adjusted by the actual | Released | One row |
| `actual > authorized + ε` | Adjusted by the actual | Released | One row, plus an overage row for the difference |

Two skews here are permanent and cannot be subtracted out:

- A reservation that is held and never settled decrements nothing while
  the ledger may already record the spend.
- An overage row whose actual cost rounds to nearly nothing still
  decrements the envelope.

Both push reconciliation drift in the same direction, so "drift equals
zero" is not a target you can hit. Pick a tolerance, publish it, and keep
the genuinely unrecoverable cases as their own counter. A drift number
with no idea of its own error floor is not a measurement.

## One more property: who owns the clock

If the period boundary is computed from a timestamp the SDK reports, then
two pods with skewed clocks invent two different periods for the same
counter, and a user with a fast clock gets a fresh budget every hour.

Derive the period in the gateway. If a script needs a timestamp at all,
take it from the data store's clock, never from the process that
happened to be handling the request. This is the same argument as the one
about who owns the counter, applied to time.

## What to actually check

1. **Concurrent reservation.** Twenty parallel calls each just under the
   cap. Exactly one should be allowed if the cap is only one call's worth.
2. **Refusal before the effect.** Reject a call and confirm the downstream
   system has no record of it.
3. **Settlement skew.** Reserve 100, settle 103, confirm the counter moved
   by 103 and an overage row exists for the 3.
4. **A crashed reservation.** Reserve and never settle. Confirm the TTL
   releases it, and confirm that outstanding reservations are a
   first-class metric with their own panel. "My agent stopped making
   calls" is the symptom of a leaked hold.
5. **Clock skew.** Two workers with deliberately different clocks. The
   period must be identical.

## Limitations worth stating

Cost estimation is an estimate. A reservation is a forecast, and long
context or batch tools have a forecast error wide enough to matter at a
tight cap. That is what the tolerance and the overage event are for, and
they degrade the guarantee while keeping it. The cap bounds the
*authorized* spend, and the overage record tells you where the estimate
was wrong.

The bounded-overrun mode allows a small overrun when the action is part
of an authorized multi-step operation. It is genuinely useful and
genuinely a hole. Without a multi-step operation in flight, the mode has
to degrade back to the strict one, and that condition is a second thing
to get right.

And none of this bounds cost from a downstream provider that does not
report usage you can read. The cap authorizes your agent's spending. It
cannot stop a vendor billing you for something you did not measure.

## FAQ

### Should the cap be per agent, per key, or per organization?

All three, and they are different controls. Per-key scopes a credential
that leaked or was copied. Per-agent scopes one workflow's blast radius.
Per-organization is the one people actually mean by "the cap", and it is
the one that has to be reserved against in a shared counter.

### Do we need per-provider cost tables?

You need enough of one to settle accurately, which is a smaller ask than
teams assume. Providers disagree on field names and stop reasons far more
than they disagree on the underlying cost. Normalizing the usage shape
once at the edge is more durable than handling each vendor's accounting
at every call site.

### Should a rejected call be retried?

No, and the error code should say so distinctly from a policy denial.
Retrying a budget refusal produces the same refusal plus noise, and a
retrying agent will fill the log with refusals that look like an
outage.

### What if we only want reporting, not enforcement?

Then do not build the counter to look like an enforcement counter. A
read-only projection that misses the reservation term will look correct
in every demo and under-enforce in production, and the first time someone
relies on it as a cap, the gap is already load-bearing.

## Where this runs

NullRun keeps the enforcement counter and the audit total as two separate
numbers. The counter is read atomically with the projection of the
post-decision total, so two concurrent requests cannot both fit. The
reservation is bound to a server-minted execution ID in that same
operation, and settlement re-reads the ownership binding before it
touches the counter.

That is what makes the budget a permission. It answers "may this call
proceed" with the same atomicity that the authorization decision itself
has, and the answer is recorded as a decision, including when it is "no".
The [API reference](https://nullrun.io/docs/api) covers the wire shapes.
