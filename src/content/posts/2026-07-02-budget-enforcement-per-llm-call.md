---
title: "How to enforce a hard budget on every LLM call your agent makes"
date: "2026-07-02"
tags: ["budget", "enforcement"]
---
Every "control your LLM spend" guide reaches the same place: you set
a monthly cap somewhere and hope the number on the dashboard means
something. It does not. A monthly cap that is read *after* the money
is spent is a report, and the gap between a report and a control is the
gap between a budget and a bill.

This is what a real cap looks like.

## A cap has to be taken before the call

The sequencing constraint is the whole design. An LLM call that is
already running has already spent the money, so there is no enforcement
point after it. A cap can stop something only *before* the request
leaves your infrastructure.

That means three operations per tool call, in this order:

1. **Reserve**: take the maximum the call could cost out of the
   period counter, atomically. If the remainder cannot cover it, block.
2. **Execute**: the agent runs the tool.
3. **Settle**: convert the reservation into the amount actually
   charged, and release the difference.

```text
      t ────────────────────────────────────────────►

   reserve ────► execute ──────────────────────►  settle
      │             │                               │
      ▼             ▼                               ▼
   counter         tool                          counter
  + envelope       runs                         − actual
   INCRBY'd         │                         − envelope
      │             │                              DEL'd
      │             │ ◄── crash ─────┬              │
      │             │                │              │
      │             │       envelope │              │
      │             │        expires │              │
      │             │          (TTL) │              │
      │             │                │              │
      │             │                ▼              │
      │             │        envelope               │
      │             │       released,               │
      │             │         nothing               │
      │             │         settled               │
      ▼             ▼                               ▼

the cap is enforced in the first box, and nothing after it can
stop an overspend that has already happened
```

Collapse this into one operation at the end and you have a dashboard.

## The counter has to be period-bound

A `monthly_cost` field on a row is a running total. It can drift, and
it has no idea which month a spend belongs to, which is what makes it
useless as an enforcement primitive.

The counter NULLRUN enforces against is keyed by period:

```
bp:{period_stamp}:cost_cents
```

where `period_stamp` is computed by exact UTC calendar arithmetic in
Rust, once per execution. Two properties matter here, and they are
easy to get wrong:

- **The period comes from the server.** A client that computes its own
  month boundary can choose a period with more room in it. The backend
  is the trust boundary precisely because the client is not trustworthy.
- **It is computed once per call.** If the period were resolved at both
  reserve time and settle time, a call that straddles midnight on the
  31st would be checked against January's budget and charged to
  February's, spending both months' headroom on a single call.

| Number | Where it lives | Enforcement role | Failure mode |
|---|---|---|---|
| `bp:{period_stamp}:cost_cents` | Redis, period-bound counter | The only number a refusal is based on | None. Period and unit are both fixed by the server |
| `cost_millicents` | Redis, same period namespace | The unit the counter is actually carried in | Compared against a cents-scaled cap, this is an off-by-1000x |
| `monthly_cost` | Postgres row | Audit total | Runs after the spend, so it reports and cannot stop |
| Audit ledger total | Postgres `cost_events` | Reconciliation reference | Accumulates settled rows, including refusals |

## Reserve, then settle, and never re-reserve

The settlement rule is stricter than it first looks:

```
settled ≤ reserved + ε
```

where `ε` is a fixed number of **cents**, one by default. Two details
in that sentence carry real money:

- **Fixed cents, never a percentage.** A 0.1% epsilon on a large
  reservation is unbounded money; a fixed one-cent epsilon on a tiny
  reservation is just tolerance. A percentage is more flexible and
  wrong.
- **Over-budget settlement is rejected, never absorbed.** When the
  settled amount exceeds the reservation plus epsilon, the right move
  is to reject the settlement and let the reservation's TTL release the
  money. Silently re-reserving the difference is an implicit second
  charge against a budget the operator already declined to extend.

Settlement exceeds reservation because the exact cost is only knowable
after the model responds, so you are reserving against an estimate. The
epsilon absorbs estimator error. It is not headroom.

## Fail closed, and mean it

The cheapest way to make a budget layer fail open is to write the
infrastructure error handler as `return allow`. It looks defensive and
is the opposite: an unreachable Redis becomes an unlimited agent, and
the failure mode is silent.

```rust
// The correct shape. Infrastructure failure is a block.
match reserve_in_redis(&execution).await {
    Ok(decision) => decision,
    Err(infra) => GateDecision::Block(infra.into()),  // 402 REDIS_UNAVAILABLE
}
```

Every step in the path gets the same treatment: rate limiter, budget
cache, the Lua script itself. If any of them cannot answer, the call
does not proceed. When the failure mode is "spend more", you built a
dashboard.

| Step | What fails | What the caller sees |
|---|---|---|
| Policy check | Tool denied outright | Block |
| Rate limit | No answer from the limiter | Block |
| Budget cache | Counter unreachable | `402 REDIS_UNAVAILABLE`, never a pass |
| Reserve | Reserved cost exceeds the remainder | Block, the cap holds |
| Settle | Reservation missing, TTL already fired | Reject, nothing moves |
| Settle | `actual > reserved + ε` | Reject, TTL releases the envelope |

Two of those rows carry the design. A caller that cannot reach the
counter gets a refusal, and a caller whose settlement overruns its own
reservation gets a refusal, and those two refusals reach the caller as
different answers.

## Why millicents

Billing precision in integer cents is a rounding bug waiting to
happen. A model call that costs $0.0004 rounds to zero, and a thousand
of them round to a hundred thousand. NULLRUN carries the counter in
**millicents** and treats the cent as a display unit.

The budget cap is derived at millicents precision too, so the ceiling
and the counter are compared in the same unit. Comparing a
millicents-scaled cap against a cents-scaled counter is an
off-by-1000x in one direction or the other, depending on which side you
got wrong.

## What this looks like in an SDK

The reservation is invisible to the agent. The agent calls a tool; the
gate answers before the call happens.

```python
from nullrun import NullRun

gate = NullRun(api_key="...", workflow="support-agent")

@gate.enforce
def search_orders(query: str):
    ...
```

The decorator is the enforcement point. An unenforced call path is the
most common way a budget layer silently becomes advisory, so it is
worth auditing for explicitly. See the
[audit trail](/blog/2026-09-25-audit-trail-for-ai-agent-tool-calls/) post for how
to prove which calls actually passed through the gate.

## Order of checks

Cheap and decisive checks go first, so a blocked call costs as little
as possible:

1. **Tool block**: is this tool denied outright? Hard, always.
2. **Rate limit**: sliding window, per org and per key. Hard, always.
3. **Budget cache**: is there an obvious early reject? Advisory, cheap.
4. **Reservation**: the atomic spend check. Fails closed.

If you put the budget check first, every request pays for a Redis
round trip even the ones that were going to be blocked by policy
anyway.

## FAQ

### Does a monthly spend cap count as budget enforcement?

No. A cap that is evaluated after the money is spent can only report an
overspend, and it cannot reverse it. Enforcement requires reserving
against the cap before the call and rejecting the call when the
reservation fails.

### How much should I over-reserve for a single call?

Enough that a legitimate call is never rejected for a wrong estimate,
and no more. Over-reserving permanently withholds headroom that no other
call can use until the reservation expires, which turns one expensive
call into a temporary outage for everything behind it.

### What happens when Redis is down?

The call is blocked. A budget layer that fails open on infrastructure
errors is advisory in exactly the way a dashboard is advisory. If
availability matters more than spend certainty, that is a legitimate
product decision, but it has to be made explicitly rather than inherited
from an error handler.

## Where this runs

NullRun keeps the period counter and the audit total as separate numbers
and enforces against the counter. The reported total is what the ledger
accumulates. The enforced number is what the period-bound counter
holds, and that is the one a refusal is based on. Conflating them is
what produces a dashboard that reads comfortably right up to the moment
the cap is breached by a call that was never measured against it.

The reservation happens before the call and the settlement after it,
and the amount settled is compared against the amount reserved with a
one-cent fixed tolerance. That is a refusal rather than a silent second
reserve. Infrastructure errors on that path are refusals with their own
codes, so "we could not reach the counter" and "the counter said no"
reach the caller as two different answers.

The period comes from the server, computed once per execution and passed
into the script alongside the reserve, so a call cannot straddle a
boundary and be accounted to two different periods. The [integration
docs](https://nullrun.io/docs) cover the SDK path.
