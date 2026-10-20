---
title: "A tool name is a label: MCP authorization binds to identity"
date: "2026-09-01"
tags: ["mcp", "security"]
---
The trust list has an entry that says `delete_user` is allowed. What the
agent calls is `delete_user`. Same string, two different things.

## Names collide, and the resolver picks one for you

Two servers in the same agent's tool list both expose `delete_user`. One
is your user service, the one that removes accounts and their data. The
other is an analytics tool that maintains a derived view and drops the
matching row from it.

```
  agent writes delete_user(user_id=4471)
                         │
                         ▼
            ┌────────────────────────┐
            │ resolver matches on    │
            │ name only              │
            └────────────┬───────────┘
                         ▼
           ┌─────────────┴─────────────┐
           ▼                           ▼
  ┌──────────────────┐        ┌──────────────────┐
  │ user_service     │        │ analytics        │
  │ removes the      │        │ drops a derived  │
  │ account          │        │ row              │
  └────────┬─────────┘        └────────┬─────────┘
           └─────────────┬─────────────┘
                         ▼
             whichever one it picked
```

The agent writes `delete_user(user_id=4471)`. It means the first one.
The runtime resolves the name: first registered, most recently used, or
whatever heuristic the framework uses. It may well execute the second.
The agent's transcript says it deleted a user. A derived analytics row
disappeared instead.

Nothing in that chain is a bug. Every component behaved as written.
The gap is between a label and an identity, so two different things
answered to one.

This generalises past MCP. A function name in an RPC system, a class
name in an object system, a route in an HTTP service: all labels.
Authorization that binds to a label carries a label-dependence bug, and
the bug stays invisible until the label collides or is repurposed.

## The second failure is quieter

A server has been running for weeks. The trust list is populated, the
policies are written, the approvals have been granted. The agent calls
`transfer` every day and it works.

Then the server ships a new version. The new version adds a field:

```diff
- transfer(recipient, amount)
+ transfer(recipient, amount, destination_account)
```

Yesterday this moved money. Today it moves money to a specific account,
which is a different action in a different risk class, possibly one the
operator never agreed to.

The trust list still holds the old identity. The policy still matches
the old shape. The approval granted last week still covers the old
shape. And the call executes.

The reason nothing complains is that the new field is *optional*. The
signature still validates against a JSON schema. The server name is
unchanged, the tool name is unchanged, the version is not in the name.
Runtime diagnostics are all green while the trust list authorizes
something nobody reviewed.

This is the failure a review process does not catch. The review
happened, the tool was approved, and the thing that got approved is no
longer the thing that runs.

## A schema is the wrong contract

The instinct is to read the tool's JSON schema at call time and match
the policy against it. This does not work, for a structural reason.

A schema says *this tool accepts a recipient, an amount, a currency, a
destination account.* It cannot say *this tool may transfer at most
five thousand dollars to a pre-approved recipient without a second
approval*, because it has no idea what the security policy is. It
describes what is possible. It does not describe what is dangerous.

JSON Schema does exactly the job it was built for. The gap belongs to a
different layer, so the authorization layer has to be structurally
separate from the schema layer, and it has to carry the part of the
schema that actually determines the effect:

- **Material fields**: changing them changes what the action does.
  Recipient, amount, direction, destination, currency.
- **Informational fields**: trace ID, model ID, locale. They describe
  context, not action.

The classification is server-side, always. A client that can declare
its own dangerous field to be metadata has no authorization boundary at
all. The classification is an **allowlist**: every field is material
until somebody reviews it as informational. A denylist of known-harmless
fields means the next vendor release adds `redirect_to` and your
boundary silently stops covering it. The classification problem itself,
which fields count and why order sensitivity is a per-field decision,
is covered in
[material fields and canonicalization](/blog/2026-08-14-material-fields-and-canonicalization/).

## Identity is server plus name; drift is a digest beside it

```python
def tool_identity(server_id: str, name: str) -> str:
    return f"{server_id}::{name}"

def tool_digest(name: str, schema: dict, server_id: str) -> str:
    canonical = json.dumps(schema, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(f"{server_id}::{name}::{canonical}".encode()).hexdigest()
```

The **identity** is the registered server plus the tool name. Both parts
are load-bearing:

- **`server_id`**: a registered identity, not a URL. A hostname is a
  mutable label too. It resolves differently from different networks,
  it moves behind a load balancer, it can be pointed somewhere else in
  a config change. The server's identity is whatever it registered as,
  bound at registration time and re-verified.
- **`name`**: the part humans read, so it stays in the identifier.

The **digest** is a separate value that sits beside the identity. It
hashes the canonicalized definition, which covers description, input
schema, output schema, annotations, server identity and name, and it is
what changes when the meaning changes.

```
               call: tool + server_id
               │
               ▼
   ┌────────────────────────┐
   │ identity               │
   │ server_id :: name      │
   └───────────┬────────────┘
               ▼
               trust list lookup
               0 matches → refuse
               2 matches → refuse
               │
               ▼
   ┌────────────────────────┐
   │ digest                 │
   │ SHA-256(server_id ::   │
   │  name :: canonical)    │
   └───────────┬────────────┘
               ▼
               == approved_digest ?
                 yes → callable
                 no  → suspend until a
                       human reviews it
```

The trust list is keyed by the identity:

```python
def lookup(trust_list, server_id, name):
    matches = [e for e in trust_list if e.server_id == server_id
               and e.name == name]
    if len(matches) != 1:
        raise AmbiguousTool(server_id, name, count=len(matches))
    return matches[0]
```

Two servers exposing the same name now produce two entries, and the
lookup above fails loudly instead of resolving by accident.

A rename lands the other way round, and the same design handles it
correctly. The renamed tool does not match the existing entry, so it
arrives as a tool nobody has reviewed, and an unreviewed tool is refused
until a human looks at it. That is the behaviour you want from a rename:
the entry keeps its history under the old name, and the new name gets
its own review. It inherits no approval that was granted for a different
label.

Each case behaves differently under the two designs.

| Attack case | What the agent sends | What a name-only check accepts | What the identity binding accepts |
|---|---|---|---|
| Name collision | `delete_user(user_id=4471)` | Accepts. `delete_user` is on the list, and the resolver picked a server | Accepts only when the registered `server_id` is the one the entry was created for. `analytics::delete_user` is a different key |
| Optional field added | `transfer(recipient, amount, destination_account)` | Accepts. The signature still validates and the name is unchanged | The identity holds. The digest stops matching the accepted one, so the entry suspends |
| Rename on the server | `delete_user_v2(user_id=4471)` | Refuses, and the refusal carries no reason. The entry under the old name still holds the approval | Treats the new name as a new key. It arrives unreviewed and stays refused until a human accepts it |
| Registration repointed | `delete_user(user_id=4471)` sent to a different host | Accepts. The name still matches | Fails the registration check, because the binding is the identity the server registered as |

## Catching drift before it executes

```python
def reconcile(entry, current_schema: dict) -> None:
    live = tool_digest(entry.name, current_schema, entry.server_id)
    if live == entry.approved_digest:
        return
    if drift_reviewed(entry, live):
        entry.approved_digest = live
        return
    entry.drift = DriftState.CHANGED
    # unresolved drift means the tool is not callable
```

The important property is the last line. Drift that nobody has reviewed
suspends the tool instead of annotating it. A flag that does not stop
anything is a log line, and a log line is exactly what the previous
design already had.

The same logic applies to approvals. An approval binds to a shape of
action; if the shape changes, the approval does not transfer to the new
one. Those are two different actions and the second needs its own
decision.

## Letting the server classify risk

MCP servers already publish annotations on their tools: read-only,
destructive, open-world. Those are worth reading, and the useful part is
that they turn a policy that was written once into a classification that
travels with the tool:

| Annotation | What it tells a reviewer |
|---|---|
| Read-only | The tool declares itself side-effect free |
| Destructive | The tool declares that it removes or overwrites |
| Open-world | The tool declares that its reach is unbounded |

Treat these as display enrichment. Enforcement sits elsewhere. The
annotations are supplied by the server, which is the party you are
trying to constrain, so read them as a claim: a server that misdeclares
itself as read-only writes the declaration itself. The enforced part of
this design is the digest. A definition that changed is a fact computed
from the definition, and it is the one that stops the tool.

## What to actually check

| Check | How to set it up | What you expect |
|---|---|---|
| Name collision | Register two servers exposing the same tool name | The lookup refuses with an ambiguous count instead of resolving |
| Field addition | Add an optional field to a registered tool | The digest stops matching the accepted one and the entry suspends |
| Rename | Rename a tool on the server | The new name arrives unreviewed and is refused, and the old entry keeps its history |
| Unresolvable server | Point a registered server at a different host | The registration check fails |
| Annotation honesty | Flip a destructive tool to declare itself read-only | A separate control notices |

## Limitations worth stating

The schema fingerprint is a blunt instrument in one direction and a
fine one in the other. A description-only change alters the digest and
produces drift for something that did not change what the tool does.
That is noise, and in a system with hundreds of tools the noise is how
review queues stop being worked. Splitting structural and descriptive
changes is possible and is worth doing, but be honest about the cost: a
tool description is exactly where MCP tool poisoning lives, so the
"harmless" half of that split is the half an attacker writes to.

The fingerprint detects change, not intent. It tells you a tool became
something else, not whether that change was an improvement, and not
whether the tool was safe before it. It tells you that you reviewed it
at a point in time.

Server identity has the same ceiling. Registering a server is a trust
decision, and identity only tells you that the thing on the other end
today is the thing you reviewed last month. When the answer is no, the
right response is to re-review, which is why unresolved drift has to
suspend instead of notify.

And none of this changes what the tool does. Identity, drift detection
and classification decide whether a call is permitted. They leave the
arguments uninspected, so whether *these particular* arguments are safe
is a separate layer, and a permission model that stops at the tool is
leaving the expensive part open.

## FAQ

### Does MCP already give us a stable identifier?

Tool names and server names are what the protocol carries, and both are
labels. What you can build on top is a registration step that binds a
server to an identity you control, plus a fingerprint you compute
yourself from the schema you were handed. Neither has to be a protocol
feature to be useful.

### Should a drifted tool be deleted or suspended?

Suspended, and it should require a human to resolve. Deleting loses the
history of what was trusted before, and re-approving from scratch means
the operator cannot tell a routine version bump from a tool that
changed shape on purpose.

### How often should the drift check run?

On a heartbeat, so the window between a schema changing and the check
noticing is bounded instead of open-ended. The tighter the bound, the
smaller the attack. The trade is refresh cost, so it is a number to pick
deliberately instead of inheriting it.

### Is a schema digest enough on its own?

For detecting change, yes. For deciding permission, no. A digest tells
you the tool is the same one you reviewed. It does not tell you this
call is safe. Those are different questions, and the second one needs
the material-field layer.

## Where this runs

NullRun keeps a per-organization catalog of the tools its MCP servers
expose. An entry is keyed by the registered server plus the tool name,
so two servers offering the same name are two entries instead of one
ambiguous match, and it carries two hashes: the current definition and
the one a human accepted. Server-supplied annotations are read for
display, and the enforced half is the digest.

A tool the catalog has seen but nobody has reviewed is refused as
requiring a decision. A tool whose current hash differs from the accepted
one is refused as drifted, and stays refused until an operator accepts the
new definition. A rename does not match the existing key, so the tool
arrives unreviewed, and inherits no approval that was granted for a
different label. The catalog is loaded once per sweep instead of read
per call, so the gate does not pay a lookup on the hot path.

What that buys is worth stating precisely. Every tool the catalog holds
carries a human-accepted definition, and a definition that changes stops
the tool. That is a claim about provenance. A matched definition still
goes through the same action-level decision as everything else. The wire
shapes are in the [API reference](https://nullrun.io/docs/api); the catalog is one of the
sources behind the [tool control](https://nullrun.io/security) page.
