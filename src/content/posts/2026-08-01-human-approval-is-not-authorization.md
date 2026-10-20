---
title: "Binding a human approval to the exact payload it authorized"
date: "2026-08-01"
tags: ["authorization", "compliance"]
---
Every framework ships a human-in-the-loop step. A human sees a card, the
human clicks approve, the tool runs.

The card usually shows a tool name, a truncated argument preview, and a
diff of the agent's reasoning. Then the executor receives the payload.
Those two are not always the same object, and nothing in the default
flow checks.

## The three fields nobody diffs

An agent requests approval to refund customer A for one hundred dollars.
The operator approves. The agent, mid-execution, decides the situation is
worse than it looked, and retries at two hundred.

The intention was "refund customer A". The first action was "refund A,
100 USD". The second action was "refund A, 200 USD". Those are different
actions. The operator approved the first one.

The reason this slips through is that most implementations treat the
amount as a *parameter of the operation*. What identifies the operation is
the tool name and the customer, and the amount sits outside that set.
"refund_customer" is the operation. The customer is a field. The amount
is a field. The operator sees the operation and a customer, clicks, and
the system authorizes whatever amount arrives.

It shows up in three places, and only the first is obvious:

| Where it shows up | What the operator approved | What executes |
|---|---|---|
| Magnitude | A refund of ten dollars. | A refund of a thousand. Same tool, different risk. |
| Destination | The customer they named. | A different bank account or recipient address. |
| Accumulation | One approved refund of fifty. | Twenty approved refunds of fifty. A per-call check cannot see the difference. |

The instinct is to make the approval UI show a bigger diff. That helps
the human and does nothing for the system, which still cannot prove after
the fact which payload was authorized. A prettier card does not produce
evidence, and you need the evidence when someone asks what was approved
at 14:03.

## What an approval ID proves and what it misses

The second common design is better and still broken. Instead of trusting
the runtime, the approval step mints a handle:

```python
approval = mint_approval(tool_name="refund_customer")
# approval.id = "apr_8812"
...
execute(approval_id="apr_8812", payload={"customer": "A", "amount": 200})
```

The execution path now depends on an unforgeable handle, which is real
progress. The problem is what happens *between* the mint and the execute.
Anything in the orchestration layer that carries the handle forward and
supplies a different payload defeats the check: a retry wrapper, a queue
consumer, a "resume the workflow" feature. The check still passes:

```python
def execute(approval_id, payload):
    a = load(approval_id)
    if a.state != "approved":
        raise Denied("not approved")
    return run(a.tool_name, payload)      # ← payload never checked against a
```

You have moved the trust from the model to the orchestrator, and the
orchestrator is the component with the most code paths and the least
review attention. The handle proves *who approved*. It does not prove
*what they saw*.

The property you need is narrower than a handle. At execution time, the
system must be able to recompute the thing that was approved and compare
it to the thing that is about to run. That thing is a digest over the
material fields of the payload.

## Bind the digest, and size the envelope so the question disappears

Two decisions have to be made together, and the second is where the
implementations get sloppy.

The first is *which fields go into the digest*. For a free-form argument
bag, the safe default is that every field is material unless you can name
a reason it is not:

```python
INFORMATIONAL = frozenset({
    "trace_id", "request_id", "model", "locale", "client_version",
})

def action_digest(payload: dict) -> str:
    material = {k: v for k, v in payload.items() if k not in INFORMATIONAL}
    canonical = json.dumps(
        material, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
```

That is an allowlist, not a denylist, and the difference matters. A
denylist of known-harmless fields means a tool vendor adds `redirect_to`
next quarter and your digest silently stops covering the one field that
matters. An allowlist means the new field is material until somebody
reviews it and moves it.

But the better move is to make the list unnecessary. If the thing you
are hashing is a small, closed, purpose-built envelope, then every field
in it is decision-relevant by construction and you hash all of it.

| Design | What is hashed | What it misses |
|---|---|---|
| Denylist of harmless fields | Everything except a named set. | A field the vendor adds next quarter is uncovered until someone notices. |
| Allowlist of material fields | Only a named set. | A new field is material until somebody reviews it, which is the safe default. |
| Closed envelope | Every field in an envelope you built for this purpose. | Nothing, at the cost of a narrower argument type. |

The envelope approach resolves the material-field question by narrowing
the type, with no set to maintain and no list that can fall out of date.
The tradeoff is that an incidental field in the envelope invalidates live
approvals, which is only tolerable because a well-shaped envelope does not
contain incidental fields. This is developed in
[material fields and canonicalisation](/blog/2026-08-14-material-fields-and-canonicalization/).

The second decision is *who computes it*. It cannot be the SDK. If the
client sends the digest alongside the payload, a compromised or merely
buggy client can send a digest computed over a different payload and the
server has nothing to compare against. The server derives it twice, once
from the payload the operator's card rendered and once from the live
request at execution, and compares. If the server cannot reconstruct the
payload from its own state, it refuses. Falling back to the client value
would make the check optional, and an optional verification is not a
verification.

```
  approval time
┌───────────────────┐
│ card renders P    │
└────────┬──────────┘
         │ server derives
         ▼
┌───────────────────┐
│ d(P), stored      │
│ on the row        │
└────────┬──────────┘
         │
         │ execution time
         │ ┌───────────────────┐
         │ │ live request, Q   │
         │ └────────┬──────────┘
         │          │ server derives again
         │          ▼
         │ ┌───────────────────┐
         │ │ d(Q)              │
         │ └────────┬──────────┘
         └──────────┤
                    ▼
    ┌────────────────────────────────┐
    │        d(P) == d(Q) ?          │
    └───┬───────────────────┬────────┘
        ▼                   ▼
      equal             not equal

┌──────────────┐   ┌─────────────────┐
│ consume      │   │ refuse, grant   │
│ the grant    │   │ stays APPROVED  │
└──────────────┘   └─────────────────┘
```

## Consume the grant in one statement

Binding the digest gets you the "what". Consumption gets you the "once".

```sql
UPDATE approvals
   SET state = 'consumed',
       consumed_at = now()
 WHERE id        = :approval_id
   AND state     = 'approved'
   AND expires_at > now()
   AND digest     = :live_digest
RETURNING id;
```

One statement, four preconditions, no window. Zero rows returned means
refuse. This is the part that is easy to build wrong, because the
tempting version reads then writes:

```python
a = load_approval(approval_id)          # everyone sees "approved"
if a.digest == live_digest:
    run(payload)                        # ← 40 concurrent workers all pass
    mark_consumed(approval_id)
```

The read-then-write is the same race as the budget counter, one layer up,
and it produces duplicate refunds in place of an over-spent budget. The
single-statement form is what makes a retry from another worker fail
deterministically, instead of depending on scheduling.

Give the replay its own error code, distinct from a generic denial. The
agent needs to be able to tell "this was already executed, do not retry"
apart from "this was refused", and the operator needs to see the
difference in the log.

## The moment is a coordinate too

An approval is a fact about an action, a context, and a time. Most
implementations bind the first two and treat the third as infinite.

The travel-agent case: the operator approves a four-hundred-and-eighty
dollar fare. The agent gets to the booking call forty-one minutes later.
The fare feed now says six hundred and twelve. The monthly budget was
drained by a different booking. A policy revision now requires a second
approval above six hundred. Every precondition has changed and the
approval is still technically unexpired.

Put an expiry on every approval, and re-evaluate live budget, live
policy, and live rate limit at the moment of execution, when the world has
moved on. The re-evaluation is cheap. The post-mortem where the fare was
six hundred and twelve under a four-hundred-and-eighty-dollar approval is
expensive.

## What to actually check

| Check | How to run it | What a pass looks like |
|---|---|---|
| The digest reacts to the right field | Change the amount, then change a field that is not in the envelope. | The amount change is refused. The out-of-envelope change is allowed; if it refuses, the canonicalisation is not sorted. |
| The grant is consumed once | Consume an approval, then attempt the execution again. | The second attempt is refused, and the state transition is what refused it. A success out of the same row means the read-then-write is still there. |
| A consumed grant replays as a duplicate | Consume an approval, then replay it. | The error code names the duplicate. Assert the code: the failure alone does not say which branch refused. |
| Expiry is enforced | Mint an approval with a 60-second TTL and sleep past it. | The consume refuses. |
| A failed recomputation refuses | Make the server unable to re-derive the digest. | The path refuses with the recompute error, and never falls back to the value the client sent. |

## Limitations worth stating

The digest binds the payload you decided to bind. It does not classify
fields for you, and it cannot tell you that a field you marked
informational is actually load-bearing. That is a review decision with a
human in it, and the digest only enforces the outcome of that review.

Schema-blind tools are the genuinely hard case. If a tool accepts
arbitrary JSON, "material" and "informational" are indistinguishable by
inspection, and a deny-list is what most teams reach for under time
pressure. That is the failure mode worth naming out loud: unknown fields
have to be treated as material, and the cost of doing that is a larger,
slower approval surface for tools that genuinely only take metadata.

There is also a window you cannot close. Between the operator clicking
approve and the executor running the tool, the system has not verified
that the human was looking at what the card claimed. The digest proves
the execution matched the approved payload. It does not prove the card was
an honest rendering of that payload. Making the approval UI a faithful
projection of the materialized fields is a separate piece of work.

A replay within a short window is a genuine ambiguity. If the first
attempt's outcome is known, you can return the stored result instead of
re-running. If the outcome is unknown, because the process died between
the tool call and the settlement write, re-running risks a duplicate side
effect and refusing produces an operator-visible failure. That case wants
a third answer: refuse, and mark it for review.

## FAQ

### Do we need a cryptographic hash, or would any comparison do?

The point is determinism and binding. SHA-256 over a canonical
serialisation gives you both for free. What actually breaks is
non-canonical input. If `{"a":1,"b":2}` and `{"b":2,"a":1}` produce
different digests, every approval refuses for a reason nobody can
explain.

### The tool has forty parameters. Is the digest still useful?

Forty parameters mean more fields where a value change alters the
real-world effect, so the digest gets more useful. The question is only
whether you are hashing the raw argument bag or an envelope you built out
of the parts that matter. The envelope is better: it is smaller, it is
reviewable, and it has no list attached to it that a future tool version
can invalidate.

### Should an approval cover a batch of actions?

Only if the batch is genuinely the action. If the operator approves
"send these 5,000 emails", the digest has to be computed over the whole
resolved recipient set. Digesting the template and approving a set the
agent assembles afterwards is the same seam, one level up.

### Does this replace framework middleware?

No, and it should not. Middleware is a good place to *ask*. It is a poor
place to be the only thing that *decides*, because the answer has to
survive the agent crashing and resuming on a different pod, which is
what [durable approval state](/blog/2026-08-08-approval-is-security-state-not-session-state/)
is for.

## Where this runs

NullRun treats the approval as a record with a state machine. The digest
is derived server-side from the material fields at approval time, derived
again from the live request at execution time, and the grant is consumed
by a single conditional update. Nothing supplied by the SDK is trusted
for the re-check, and a payload the server cannot reconstruct gets a
refusal, with no fallback path.

The practical consequence is that an approval stops being a UI moment and
becomes a row with a state machine. It can survive a crash. It can be
recovered by a new instance that reconnects and asks what happened. An
auditor can cite it later to establish what was authorized, as opposed to
what was asked for. The [integration docs](https://nullrun.io/docs) cover wiring the gate
into the tool path.
