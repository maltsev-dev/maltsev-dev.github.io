---
title: "Atomic budget reservation in Redis Lua: pattern and failure modes"
date: "2026-07-08"
tags: ["redis", "architecture"]
---
The budget check looks like this, and it is wrong:

```python
balance = redis.get(f"bp:{period}:cost_cents")
if int(balance) < cost:
    redis.decrby(f"bp:{period}:cost_cents", cost)   # ← race lives here
    return allow
return block
```

Between the `get` and the `decrby`, every other agent in the system
reads the same stale balance and draws the same conclusion. Twenty
concurrent calls all see 100 units available, all of them are under
the 100-unit cap, and all twenty are allowed. You have enforced
nothing and under-enforced by 20×.

Redis is single-threaded, which is exactly why this is fixable.

## Move the whole decision into the script

Lua scripts in Redis run atomically. No other command interleaves
between two lines of yours. The fix is to hand Redis the whole decision
instead of a sequence of decisions it cannot see:

```lua
-- KEYS[1] = bp:{period}:cost_cents
-- KEYS[2] = reservation:{execution_id}
-- ARGV[1] = cost to reserve
-- ARGV[2] = execution_id
-- ARGV[3] = org_id
-- ARGV[4] = api_key_id
-- ARGV[5] = ttl seconds

local current = tonumber(redis.call('GET', KEYS[1]) or '0')

if current + tonumber(ARGV[1]) > CAP then
  return 0   -- block
end

redis.call('INCRBY', KEYS[1], ARGV[1])
redis.call('HSET', KEYS[2],
  'cost_cents', ARGV[1],
  'org_id',     ARGV[3],
  'api_key_id', ARGV[4])
redis.call('EXPIRE', KEYS[2], ARGV[5])

return 1  -- allow
```

Every line runs with no interleaving. The check and the increment are
now the same operation, and the race window is closed by construction
instead of by a lock.

Two keys carry the whole decision:

| Key | Holds | Set by | TTL |
|---|---|---|---|
| `bp:{period}:cost_cents` | Period counter, the authoritative spend for one period | `INCRBY` at reserve, adjusted at settle | Outlives the period it names |
| `reservation:{execution_id}` | Reserved cents plus `org_id` and `api_key_id` | `HSET` at reserve, deleted at settle | `ARGV[5]`, the backstop for a crash |

The counter persists for the period it names. The reservation record
expires on a timer, because a crashed agent never comes back to delete
it. The `org_id` and `api_key_id` fields let settlement re-check
ownership, and that check is the only thing that stops an approved
action from being replayed against a different payload.

For why the cap must arrive with the request rather than be read inside
the script, and why a `TIME`-derived legacy period branch still exists
for older callers, see
[hard budget enforcement per LLM call](/blog/2026-07-02-budget-enforcement-per-llm-call/).

## Four ways a Lua budget script still leaks money

Atomicity covers the happy path. The rest needs its own argument.

**1. Non-idempotent retries.** A network timeout on `EVAL` leaves the
caller unable to tell whether the script ran. If it retries, the money
is reserved twice. Every write in a money path needs an idempotency
key, and the retry has to carry the same one.

**2. Reservations that never settle.** If settlement never arrives, the
reserved amount stays held until the key expires. That TTL is a
deliberate design and it is the backstop, but the consequence is that a
crashed agent silently withholds budget from everything behind it, and
"my agent stopped making calls" is the symptom. Track the count of
outstanding reservations as a first-class metric rather than a
debugging detail.

**3. The binding check on the wrong side.** Doing the ownership
comparison at reservation time but not at settlement time means the
second half of the guarantee does not exist. Settlement has to
re-read `org_id` and `api_key_id` and compare, atomically, before
touching the counter.

**4. Settling more than was reserved.** Re-checking the budget at
settlement time looks like a safety net. By then the decision to spend
has already been made. Settlement compares the actual cost against the
*authorised* reservation plus a fixed-cent epsilon, and rejects on
overrun so the TTL can release the money.

## The resolution step is where most of the bugs live

Reservation is the easy half. Settlement touches three structures that
have to stay consistent:

- decrement the period counter by the **actual** cost, not the reserved
  amount
- delete the reservation record
- write the cost to the ledger

The ordering is not a style choice. A crash lands wherever the process
dies, and each landing spot has a different amount of money stuck in it:

```
   SDK / agent                              Redis (primary)
       │                                  │
       │ reserve(ARGV[1..5]) ────────────►│
       │                                  │  GET   bp:{period}:cost_cents
       │                                  │  cmp   current + cost > CAP
       │                                  │  INCRBY bp:{period}:cost_cents
       │                                  │  HSET  reservation:{exec_id}
       │                                  │  EXPIRE reservation:{exec_id}
       │ ◄── 1 (allow) ───────────────────│
       │                                  │
       │ run the tool, get the real cost  │
       │                                  │
       │ ── CRASH HERE ──────────────────►│  reservation TTL fires,
       │                                  │  counter keeps the envelope
       │                                  │  until the period TTL.
       │                                  │  Headroom is withheld,
       │                                  │  not overspent.
       │                                  │
       │ settle(actual) ─────────────────►│
       │                                  │  HGET  reservation:{exec_id}
       │                                  │  cmp   org_id + api_key_id
       │                                  │  cmp   actual vs authorised + ε
       │                                  │  DECRBY by the actual cost
       │                                  │  DEL   reservation:{exec_id}
       │ ◄── settled − released ──────────│
```

| Step | What fails | What the caller sees |
|---|---|---|
| Reserve | Counter already at cap | Block, no execution |
| Reserve | Reservation write times out on the network | Ambiguous; a retry without the same idempotency key reserves twice |
| Execute | Agent crashes, tool never runs | The envelope stays held until its TTL expires |
| Settle | Reservation record gone, TTL fired | Reject, nothing moves |
| Settle | `org_id` or `api_key_id` mismatch | Reject, counter untouched |
| Settle | `actual > authorised + ε` | Reject, TTL releases the envelope |

Two skews in that settlement step are permanent and cannot be
subtracted away:

- A reservation held but never settled decrements nothing while the
  ledger row still records the spend.
- An overage row with sub-cent actual cost decrements the whole
  envelope while the ledger adds approximately nothing.

Both push reconciliation drift in one direction only, so a drift of
exactly zero is not reachable. Pick a tolerance, publish it, and track
the genuinely unrecoverable cases as their own counter. A drift number
with no idea of its own error floor measures nothing.

## Read the clock from inside the script

If the script needs a timestamp, get it from Redis:

```lua
local t = redis.call('TIME')
```

`redis.call('TIME')` is documented to return server time as a
non-deterministic command, and scripts must be written on the
assumption that they may be re-executed or replicated. Passing a
timestamp in from the application is also wrong for a different reason:
it means the writer's clock is now part of the correctness argument,
and two application instances with skewed clocks produce two different
periods for the same key.

## FAQ

### Do we even need Lua, or is a Redis lock enough?

A lock works, but it is three round trips where Lua is one, and every
lock implementation eventually grows a timeout path that has to decide
what an expired lock means. Lua gets the atomicity from Redis itself,
which is the property the feature needs.

### Is there a limit on how long a script may run?

Yes. Redis terminates long-running scripts and blocks the server while
it does. Budget scripts touch two or three keys and finish in
microseconds. Never put anything in a script that calls back out to
the network.

### What about clock skew across Redis replicas?

It is the reason the script is the unit of atomicity. A read replica
cannot give you a consistent check-and-set, so budget operations have
to run on the primary.

## Where this runs

NullRun does the reservation, the cap comparison and the ownership
binding in one script on the primary. Read the counter, decide, write
the counter: three operations with no interleaving point, because the
script is the interleaving point. The two that most often leak money in
a hand-rolled version are the check-then-act pair and the
reserve-then-consume pair, and this shape removes both by construction
instead of by discipline.

The same script mints nothing. The execution identity is generated
server-side beforehand and passed in, so the reservation records whose
call it is at the moment it is written rather than at the moment it is
settled. That is what lets the settle path re-check ownership atomically
against a value that was captured under the same lock as the reserve.

The scripts are loaded with `redis.call` semantics and no callbacks, so a
slow invocation is bounded by the data store and nothing else. The wire
shapes are in the [API reference](https://nullrun.io/docs/api).
