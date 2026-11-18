---
title: "Which fields are material? What makes a digest mean something"
date: "2026-08-14"
tags: ["authorization", "security"]
---
A tool is described by a JSON schema: its parameters, their types, what
it accepts. This vocabulary fits an interface. A security boundary needs
a different one, and the reason is plain.

A schema says *this tool accepts a recipient, an amount, a currency, a
destination account*. It cannot say *this tool may transfer fifty
thousand dollars to an arbitrary recipient without further approval*,
because it has no idea what the security policy is. It describes what is
possible, not what is dangerous.

A team that reads its authorization out of the schema will have a bad
day. The agent sees what the tool accepts, calls it, and the call
executes. The fact that those particular parameters were dangerous was
never in the schema, because the schema was never asked.

## The classification that everything else depends on

A schema contains many fields. Most are informational. Some are
material, meaning changing them changes what the action *is*. A
recipient, an amount and a destination are material. A trace identifier
is context.

That classification is what determines what a digest covers, and
therefore what an approval is bound to. Get it wrong in one direction and
approvals silently fail to protect: the agent asks for a $100 refund,
gets approved, then changes the amount, and the digest still matches
because the amount was never in it.

Get it wrong in the other direction and every approval is refused: the
agent retries with a new trace ID, the digest changed, and the operator
is asked to approve an action they already approved. Both failures are
silent, and the second one is usually diagnosed as "the hash is broken".

```
   every field the tool declares
         │
         ▼
   ┌──────────────────────────┐
   │ has somebody reviewed    │
   │ this as context?         │
   └─────┬─────────────────┬──┘
        yes               no
         ▼                 ▼
  informational      MATERIAL
  (hash may skip)    (the default)
```

One question settles the awkward cases:

> What is the smallest set of fields where changing any one of them would
> mean the operator approved a different action?

That framing produces the right answer on the awkward fields. `notes` is
free text attached to a refund. If the operator approved *a refund of
$100 to customer A*, and the agent changes the internal note, the
operator approved a different action in no meaningful sense, so the note
is informational. A field named `refund_reason_code` is a different
story: the policy routes differently on the reason, so it is material
even though it reads like metadata.

| Field | Material? | Why | If it is left out of the hash |
|---|---|---|---|
| `recipient` | Material | The operator approved a payment to a specific party | An approval for one recipient carries over to every other recipient |
| `amount` | Material | It is the size of the action | The agent asks for $100, gets approved, changes the amount, and the digest still matches |
| `destination`, `destination_account` | Material | It names where the money lands | An approved transfer quietly becomes a redirect |
| `direction`, `currency` | Material | They decide which side moves | Two opposite actions share one approval |
| `refund_reason_code` | Material | Policy routes differently on the reason, though it reads as metadata | A route that skips review inherits the approval meant for the normal route |
| `amount_hint` plus `amount_scale` | Material, split across two fields | The pair reconstructs the amount and neither field is the amount | The amount changes and the digest still matches |
| `notes` | Informational | Free text on a refund, with no bearing on where the money goes | Correct as is. Including it makes approvals churn on every retry |
| `trace_id`, `request_id`, `model`, `locale` | Informational | Context about the call, not the action | Live approvals get refused on every retry that carries a fresh trace ID |
| `tags`, `labels`, `metadata`, `flags` | Informational | The same facts in a different order | The canonicalizer ends up deciding their order matters, a schema question nobody answered |
| `redirect_to` | Material until reviewed | A vendor-added field nobody has classified | A denylist of known-harmless fields stops covering it, with no signal anywhere |
| Anything the tool has not declared | Material until reviewed | A schema-blind tool that accepts arbitrary JSON cannot be classified | This is why the default has to be material |

## Two designs, and why the second one wins on a closed envelope

Once you have the classification, there are two ways to build on it, and
the choice matters more than the classification does.

### Design one: classify, then allowlist the informational fields

```python
INFORMATIONAL = frozenset({"trace_id", "request_id", "model", "locale"})
material = {k: v for k, v in payload.items() if k not in INFORMATIONAL}
```

This is the obvious design and it has one virtue: approvals survive
incidental churn. It also has a permanent cost. Every entry is a standing
claim that a field does not affect the action, and it is a claim that
somebody has to re-verify every time the tool's semantics move. The next
tool version adds `redirect_to` and the digest stops covering it with no
signal anywhere, because a denylist of known-harmless fields only fails
in the direction nobody is watching.

### Design two: bind the whole envelope

If the thing you are hashing has a small, closed, reviewed shape, a
type instead of a bag, then there is no classification to get wrong.
Every field is material because the envelope is the action. Nothing can
be added to it without being a type change somebody compiles, and
nothing can fall out of the hash without changing that type.

| | Design one: allowlist the informational fields | Design two: bind the whole envelope |
|---|---|---|
| What you maintain | A list of fields that do not affect the action | The shape of a closed type |
| When a vendor adds `redirect_to` | The field silently leaves the hash, and no signal appears anywhere | Adding it is a type change somebody compiles, and the new shape needs its own approval |
| Incidental churn | Approvals survive it | Approvals break, and an envelope carrying incidental fields was a design error you could have caught immediately |
| Where the cost lands | A standing claim somebody re-verifies every time the tool's semantics move | Nothing goes stale, because there is no list to go stale |
| Where it fits | An argument bag you do not control | An envelope you do control |

The usual objection to design two is that an incidental field change
invalidates a live approval. The objection is smaller than it looks: it
bites only if the envelope actually carries incidental fields. A
purpose-built envelope, the one whose fields are the decision-relevant
facts and nothing else, does not have them, because adding a trace ID to
a security envelope is a design error you catch immediately.

So the rule that falls out is: **the narrower the envelope, the more of
it you can hash unconditionally.** A free-form argument bag needs a
classification to be defensible. A closed typed envelope does not, and
the unconditional hash is simpler and stronger, because there is no list
in the system that can go stale.

This matters more for MCP than for a traditional API, because a schema
is close to the only artifact the protocol surfaces. A traditional API
has a documentation page, a security review and an OAuth scope list. MCP
has a name, a schema and a capability list. If you are not deciding what
counts as material, nobody decided for you.

## Canonicalization is a policy decision

Equivalent JSON representations must produce the same identity, and
different material values must not. Key ordering is the easy case; the
rest is where this actually bites.

```python
def canonical_value(v):
    if isinstance(v, bool):        # bool before int, because bool IS a subclass of int
        return {"__bool__": v}
    if isinstance(v, int):
        return {"__int__": str(v)}
    if isinstance(v, float):
        # integral floats collapse onto the integer form
        return {"__int__": str(int(v))} if v.is_integer() else {"__float__": repr(v)}
    if isinstance(v, str):
        return unicodedata.normalize("NFC", v)
    if isinstance(v, list):
        return [canonical_value(x) for x in v]
    if isinstance(v, dict):
        return {k: canonical_value(v[k]) for k in sorted(v)}
    if v is None:
        return {"__null__": True}
    raise Uncanonicalizable(repr(v))
```

The pipeline that turns a payload into an identity runs like this:

```
   {"amount": 100.0, "ok": true}
   │
   ▼
   canonical_value() on every node
     bool  → {"__bool__": True}   before int
     100.0 → {"__int__": "100"}   collapses onto int
     "é"   → NFC
   │
   ▼
   object keys sorted recursively
   arrays left in their own order
   │
   ▼
   SHA-256( domain || canonical )
   │
   ▼
   action_digest, compared against
   the digest on the stored approval
```

The tag wrappers are deliberate. Without them, the string `"true"` and
the boolean `True` could canonicalize to the same thing, and a payload
that says `{"verbose": "true"}` would authorize identically to one that
says `{"verbose": true}`, which matters the moment a downstream tool
coerces one to the other.

### Numbers

`100`, `100.0` and `1e2` are the same amount of money and must produce
the same digest, or every retry that goes through a JSON round trip gets
a spurious refusal. There are two defensible answers and both are in
production use. Collapse the integral floats onto the
integer form, as above. Or refuse them: reject the value at validation
with a typed error, so that the caller has to send an integer or a
string and the ambiguity never reaches the hasher. The second is the
stricter option and it has an advantage that is easy to miss. Refusing a
value cannot lose information, whereas collapsing one silently asserts
that two different wire representations meant the same thing.

For money specifically the cleanest resolution is to take it off the
float table entirely: represent an amount as an integer in minor units.
`50000` is unambiguous, has no precision ceiling a JavaScript client can
trip over, and compares directly against a threshold expressed in the
same unit. A digest layer that accepts a float is carrying a precision
problem it does not need to have.

### Unicode

`NFC` normalization exists because `é` can arrive as one code point
(U+00E9) or as `e` plus a combining accent (U+0065 U+0301).
They render identically, they hash differently, and if the downstream
mail system treats them as the same address then your digest will refuse
an action that would have gone to the same place.

## Order sensitivity is a property of the schema

This is the one that gets decided by accident.

```python
ORDER_INSENSITIVE = {"tags", "labels", "metadata", "flags"}
```

A list of tags in a different order is the same action. A list of
operations in a different order might not be: "transfer A then B" and
"transfer B then A" can differ if the second transfer depends on the
first one's result. A list of recipients is order-insensitive for
authorization while being order-sensitive for delivery, which is exactly
the kind of thing nobody thinks about until the canonicalizer and the
mailer disagree.

Global sorting is the wrong default. The cheap correct rule is narrower
than a config list: sort object keys, because an object's key order is
carrying no meaning, and leave arrays alone, because whether an array's
order is meaningful is a property of what the array means, and only the
schema knows that. A canonicalizer that sorts arrays to be helpful has
silently decided that every list your product has is a set.

## What to actually check

Build an equivalence corpus. It is the only way to catch a
canonicalization bug, because the bug's signature is two payloads that
*should* be identical and are not, and eyeballing payloads does not find
it.

| Pair | Expected | What to assert |
|---|---|---|
| Keys in two different orders, at every nesting depth | Must hash the same | Canonical json equality, so a failure points at the sorter |
| `{"amount": 100}` re-serialized by a different writer | Must hash the same | Canonical json equality |
| `é` as precomposed and as decomposed | Must hash the same | Canonical json equality after NFC |
| `{"amount": 100}` and `{"amount": 101}` | Must not hash the same | Different digest |
| `{"recipient": "a"}` and `{"recipient": "b"}` | Must not hash the same | Different digest |
| `{"recipient": "a@b"}` and `{"recipient": "ab@"}` | Must not hash the same | Different digest |
| `{"verbose": true}` and `{"verbose": "true"}` | Must not hash the same | Different digest |
| `{"amount": 100}` and `{"amount": 100.0}`, if the design rejects floats | Must not reach the hasher | A typed validation error, not a digest comparison |

A test that asserts "these two hash the same" is testing the wrong
layer, and it keeps passing after you change the policy underneath it.

Then run property-based tests over generated payloads, asserting that
any two payloads differing only in key order hash identically. Write the
corpus before you need it. A canonicalizer that has only been tested on
hand-picked examples has been tested on five examples.

## Limitations worth stating

The classification is a human judgment, and any code that consumes it
only enforces the outcome. No amount of structure stops a vendor
splitting one material field into two that each look informational, as
`amount_hint` and `amount_scale` do. The fix is a review of the schema
shape itself. Clever canonicalization does not close that gap.

Canonicalization is where subtle bugs live, and the precision one is the
worst. JavaScript cannot represent integers above 2^53 exactly. A
monetary amount of 9007199254740993 that passes through a JavaScript
client arrives as 9007199254740992, with no error, no warning, and a
digest that faithfully records the wrong number. This is the practical
reason to represent money as a bounded integer in minor units with a
declared per-call ceiling: the ceiling and the unit make the pathological
value unrepresentable instead of merely unlikely.

An allowlist, if you take design one, is also a maintenance commitment.
Every entry holds only until the tool's semantics change. At that point
it is the
[schema drift problem](/blog/2026-09-01-mcp-tool-identity-not-tool-name/)
arriving through the classification layer instead of the identity layer.
That is the argument for design two on any envelope you control.

And there is no classification for fields the tool has not declared. A
schema-blind tool that accepts arbitrary JSON cannot be classified at
all, which is why "unknown fields are material until reviewed" has to be
the default from the start.

## What to do, and what not to

### What not to

Do not build the digest's coverage on a list of fields somebody decided
were harmless. A tool with fifty parameters is fifty chances for that
list to be incomplete, and whoever maintains it has to re-check every
entry whenever the tool's semantics change, which is a cost nobody
budgets for. The failure also has a direction: the list only breaks
when a field turns out to matter, and the field that turns out to
matter is the one nobody looked at. `redirect_to` is a vendor-added
field, and on the day it arrives the list has no answer for it. The
approval still matches, the operator still sees a card, and the action
that runs is not the action they judged. The opposite error is just as
quiet: a hash that covers a field with no bearing on the action turns
every retry carrying a fresh `trace_id` into a refusal, and the
operator concludes that the digest is broken.

### What to do

Bind the whole envelope, on an envelope you control, and make the
envelope a closed type rather than a bag. Every field is then material
by construction, the digest covers the action with no allowlist to keep
current, and adding a field becomes a type change somebody compiles
rather than a line in a config file. Two decisions make that promise
real rather than nominal. Represent money as an integer number of minor
units, under a ceiling you declare per call, so the value a JavaScript
client cannot represent above 2^53 is refused at validation instead of
being hashed into the wrong number. And keep a list's order as it
arrived, because a list can be order-insensitive for the check and
order-sensitive for delivery, and only the party that ships to a person
can tell the order mattered. Domain-separate the hash,
`SHA-256( "approval/v1/business_impact:" || canonical_json(envelope) )`,
so a digest computed for one action cannot be replayed into another
namespace, and recompute it server-side from the payload that arrived:
a client-supplied digest is a digest the client chose. The price is a
stricter edge contract and a type to maintain: a payload carrying a
float is refused with a typed error rather than normalized.

## FAQ

### Why not hash the entire payload?

A free-form argument bag leaves you on design one, and hashing the whole
payload on top of that invalidates a live approval on any incidental
change. Operators stop approving anything once the refusals become
unexplainable. That reasoning does not settle the question, because the
cost lands on correctness rather than convenience: a payload that is not
in the hash cannot fail to match.

Which of the two is right depends entirely on whether you control the
envelope's shape. A bag you do not control needs a classification. An
envelope you do control should be hashed whole, and the discipline moves
from maintaining a list to keeping the type small.

### Should informational fields be included in the hash at all?

On a closed typed envelope, yes, and the reason is that there are none
to exclude. An envelope that carries a field with no bearing on the
decision is a field you should delete from the type, not one you should
carve out of the digest. Once the shape is narrow enough that every field
is a decision-relevant fact, the hash covers all of it, unconditionally,
and there is no list in the system that can fall out of date.

### Does this belong in the policy definition or the code?

The canonicalization is code, and it has to be: a configurable
canonicalizer is a way to make two different actions hash identically.
Classification, where you need one,
is data. It is a property of the tool and belongs with the tool's
registration.

### How do we classify fields on a tool with fifty parameters?

Most are informational by elimination: read them, and any field you
cannot construct a scenario for where changing it alters the effect goes
on the material list by default. The allowlist direction means you only
have to make a confident argument for the small set, instead of a
confident argument for every field.

### What happens when the tool schema changes?

On a hashed-whole envelope, the schema cannot change without a type
change, and a new required field is a new action shape that needs a new
approval, which is the correct outcome. Where a classification exists,
it is versioned with the schema: a new field is material until reviewed,
and a field whose meaning changed is a different field as far as the
approval is concerned.
