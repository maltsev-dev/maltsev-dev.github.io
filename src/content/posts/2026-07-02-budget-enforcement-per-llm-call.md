---
title: "How to enforce a hard budget on every LLM call your agent makes"
date: "2026-07-02"
tags: ["budget", "enforcement"]
---
Every "control your LLM spend" guide reaches the same place: you set
a monthly cap somewhere and hope the number on the dashboard means
something. The number means nothing, because a monthly cap read *after*
the money is spent is a report, and the gap between a report and a
control is the gap between a budget and a bill.

## A cap has to be taken before the call

The sequencing constraint is the whole design. An LLM call that is
already running has already spent the money, so there is no enforcement
point after it. A cap can stop something only *before* the request
leaves your infrastructure.

That means three operations per tool call, in this order:

1. Reserve: take the maximum the call could cost out of the
   period counter, atomically. If the remainder cannot cover it, block.
2. Execute: the agent runs the tool.
3. Settle: convert the reservation into the amount actually
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

## The counter has to be period-bound

A `monthly_cost` field on a row is a running total. It can drift, and
it has no idea which month a spend belongs to, which is what makes it
useless as an enforcement primitive.

The counter the gate enforces against is keyed by period:

```
bp:{period_stamp}:cost_cents
```

where `period_stamp` is computed by exact UTC calendar arithmetic in
Rust, once per execution. Two properties matter here, and they are
easy to get wrong:

- The period comes from the server. A client that computes its own
  month boundary can choose a period with more room in it. The backend
  is the trust boundary precisely because the client is not trustworthy.
- It is computed once per call. If the period were resolved at both
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

- Fixed cents, never a percentage. A 0.1% epsilon on a large
  reservation is unbounded money; a fixed one-cent epsilon on a tiny
  reservation is just tolerance. A percentage is more flexible and
  wrong.
- Over-budget settlement is rejected, never absorbed. When the
  settled amount exceeds the reservation plus epsilon, the right move
  is to reject the settlement and let the reservation's TTL release the
  money. Silently re-reserving the difference is an implicit second
  charge against a budget the operator already declined to extend.

Settlement exceeds reservation because the exact cost is only knowable
after the model responds, so you are reserving against an estimate. The
epsilon absorbs estimator error and nothing more.

## Fail closed, and mean it

The cheapest way to make a budget layer fail open is to write the
infrastructure error handler as `return allow`. It looks defensive. An
unreachable Redis becomes an unlimited agent, and the failure mode is
silent.

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

Two of those rows carry the design. The two refusals, an unreachable
counter and a settlement that overran its own reservation, reach the
caller as different answers.

## Why millicents

Billing precision in integer cents is a rounding bug waiting to
happen. A model call that costs $0.0004 rounds to zero, and a thousand
of them round to a hundred thousand. The gate carries the counter in
**millicents** and treats the cent as a display unit.

The budget cap is derived at millicents precision too, so the ceiling
and the counter are compared in the same unit. Comparing a
millicents-scaled cap against a cents-scaled counter is an
off-by-1000x in one direction or the other, depending on which side you
got wrong.

## What this looks like on the wire

The reservation is invisible to the agent. The agent calls a tool; the
gate answers before the call happens. What the client-side wrapper sends
is a request in this shape:

```http
POST /budget/reserve HTTP/1.1
Content-Type: application/json
Authorization: Bearer $GATE_TOKEN

{
  "workflow": "support-agent",
  "tool": "search_orders",
  "cost_millicents": 4200
}
```

```json
{"decision": "allow", "execution_id": "9f31c0a4"}
```

Neither the period nor the execution id comes from the client. The server
resolves the period and mints the id, so what the client sends is a
description of the call and not a claim about where it will be charged.

The client wrapper that makes this request is the enforcement point, and
the agent never sees it. An unenforced call path is the most common way a
budget layer silently becomes advisory, so it is worth auditing for
explicitly. See the
[audit trail](/blog/2026-09-25-audit-trail-for-ai-agent-tool-calls/) post for how
to prove which calls actually passed through the gate.

## Order of checks

A blocked call should cost as little as possible, so cheap and decisive
checks go first:

1. Tool block: is this tool denied outright? Hard, always.
2. Rate limit: sliding window, per org and per key. Hard, always.
3. Budget cache: is there an obvious early reject? Advisory, cheap.
4. Reservation: the atomic spend check. Fails closed.

If you put the budget check first, every request pays for a Redis
round trip even the ones that were going to be blocked by policy
anyway.

## What to do, and what not to

### What not to

Do not let the period be anybody's choice but the server's, and do not
enforce against a running total. A month boundary is the one number in
the path a caller can move, and it moves without leaving a trace, so the
same call booked against the roomier month is a call the cap never has to
refuse. Resolve the period at two moments instead of one and a single
call lands in two months, spending the headroom of both, and the counter
the refusal rested on and the ledger that recorded the spend are then
counting different months. Mixing up the enforced counter and the audit
total is what produces a dashboard that keeps reading right until a call
that was never measured against the cap goes through. Neither mistake is a
wrong total, which is what makes them cheap to leave in.

### What to do

Let the server resolve the period once and hand it to the script with the
reserve, so a request cannot be measured against one month and paid out of
another. Keep the enforced counter and the audit total apart, and resolve
both to the same period before either is quoted: the period-bound counter
is what the refusal is computed from, the Postgres total is what the
ledger accumulates.

Refuse a settlement that lands over what it reserved rather than covering
it, and keep the tolerance an absolute number of cents: scaled up, a share
of the reservation has no ceiling. Refusing the overrun leaves the
operator's decision intact: the difference is never charged twice.

The price: the server owns the clock, so a skewed worker cannot invent a
second period; the period travels with the reservation, so the script is
handed its key rather than deriving one; a refused settlement holds the
envelope until the TTL fires, so headroom stays unavailable longer than a
settled one.

The property is checkable: every call is accounted to exactly one period,
and the counter it was checked against is the one it is charged to.

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
