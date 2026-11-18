---
title: "Treat an agent as two systems joined by a seam"
date: "2026-06-01"
tags: ["authorization", "security"]
---
An agent produces a perfectly acceptable response and then sends the
wrong payment, deletes the wrong resource, modifies the wrong record, or
calls a tool with a mutated argument.

The model behaved exactly as designed. The execution is still
unauthorized. Both statements are true, and holding them at the same
time is what makes this problem awkward to reason about.

## The model of the system is wrong

The reason is a single unexamined assumption: that an agent is one
system. It is two, joined at a seam.

- The generative side: the model, the system prompt, the context
  assembly, the output classifiers, the safety policies. It decides what
  to say.
- The operational side: the executor, the tools, the APIs, the
  databases, the external side effects. It decides what happens.

Three kinds of control get grouped together under the word "guardrails",
and the grouping hides the seam. A fourth kind sits outside that word.

| Control | Where it reads | What it decides |
|---|---|---|
| Prompt-level controls | The prompt and the assembled context | What the model says |
| Content filters | The text the model produces | Whether output is allowed through |
| Model-level safety | The model's willingness | What it attempts at all |
| A decision at the seam | The tool call and its final arguments | What the system actually executes |

The first three are genuinely useful. The fourth is the one that decides
what executes.

```
   ┌────────────────────────────────────────────────────────┐
   │  GENERATIVE SIDE                                       │
   │               model · system prompt · context assembly │
   │  output classifiers · safety policies                  │
   │  decides what to SAY                                   │
   └───────────────────────────┬────────────────────────────┘
                               │ tool call + final arguments
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │  THE SEAM                                              │
   │         ┌────────────────────────────────────┐         │
   │         │              the gate              │         │
   │         │  allow │ require_approval │ block  │         │
   │         └────────────────────────────────────┘         │
   │  one decision, made against the action                 │
   └───────────────────────────┬────────────────────────────┘
                               │ execution_id
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │  OPERATIONAL SIDE                                      │
   │            executor · tools · APIs · databases         │
   │  decides what HAPPENS                                  │
   └────────────────────────────────────────────────────────┘
```

## Where the seam shows up concretely

At the approval seam, the operator approves payload A and the executor
later receives payload B. That happens whenever anything between approval
and execution can transform the payload: a retry wrapper, a queue
serialization round trip, a "restore context" feature that rebuilds
arguments from a summary, a middleware layer that merges defaults into
the request.

No prompt policy can observe that transition, because the transition
happens outside the model's context. The model saw the original
arguments. It has no visibility into what the executor will actually
receive.

At the tool-argument seam, a content filter reads text. Authorization
has to read structure: recipient, amount, destination, direction,
currency.

The gap is concrete and narrow. The model says *"transfer the approved
amount"*. Nothing in that string is alarming. It is vague, safe
sounding, and the reasoning trace looks fine. The executor receives
`{"recipient": "...", "amount": 50000, "currency": "USD"}`. Every
material value changed, and not one of them is present in the text a
filter would inspect.

| Seam | What exists on one side | What exists on the other | Who can see the transition |
|---|---|---|---|
| Approval | Payload A, signed by a human | Payload B, arriving at the executor | Nothing that reads the model's output |
| Tool argument | Text the model emitted | Recipient, amount, currency, direction | A content filter, which reads text |

A material field can change authorization semantics without the model
understanding that it happened. The model never saw the value, so it
genuinely does not know.

## The rule: every crossing gets a decision

Because an agent is two systems, the crossings can be enumerated, and
every one of them needs a decision made by something outside the agent.

| Crossing | Why it needs its own decision |
|---|---|
| Every tool call | The arguments are what carry the effect |
| Every outbound network write | Destination and payload are settled after the model speaks |
| Every file mutation | The path is chosen at execution time |
| Every subagent delegation | The subagent is a different executor with different tools |
| Every approval card sent and received | The approval and the action can drift apart |

That list is short, and it is checkable. The failure mode that makes
agent architectures hard to review is that nobody writes it down. The
crossings accumulate silently as integrations are added, and each new
one is individually reasonable.

Counting the seams is a useful metric on its own. Every new integration
adds at least one, and an architecture where the count grows without
anyone reviewing the new crossing is an architecture where the
enforcement guarantee is decaying.

## Making it a build failure

```python
# ci/seam_check.py, fails the build on an ungated side effect
GATED_MODULES = {"gate.policies", "gate.tools", "gate.client"}
SIDE_EFFECTS = {"requests.post", "requests.put", "requests.delete",
                "httpx.post", "subprocess.run", "subprocess.Popen",
                "os.remove", "os.rename", "shutil.rmtree"}

for node in ast.walk(tree):
    if is_call(node) and dotted_name(node) in SIDE_EFFECTS:
        if not inside_allowed_module(node, GATED_MODULES):
            violations.append(f"{filename}:{node.lineno} → {dotted_name(node)}")
```

The allowlist is small on purpose. Every entry is a place where somebody
decided that this specific call site has a decision in front of it, and
adding to the list is a reviewable change to the enforcement surface.
Anywhere else, the change is silent.

Run it in CI and it will find things. Most of them will be legitimate: a
migration script, a health check, a local development tool. The value is
that every hit is a decision somebody made out loud.

## The honest position on the generative side

Overclaiming is easy in both directions here.

Controls on the generative side reduce the number of dangerous actions a
system encounters. That is real value, and in a high-volume system it
may be where most of the prevented incidents come from.

Reducing dangerous suggestions and preventing unauthorized execution are
different claims, and the evidence they produce is different. A model
that refuses to propose a $50,000 refund has not stopped the $50,000
refund. Something else stopped it, or nothing did, and the difference
only becomes visible during an incident.

Guardrails fire too early to catch a bad business decision, and
observability shows up too late to stop one. Neither answers the question
that sits at the seam, which is what happens between "the model decided"
and "the state changed".

## What to actually check

| Check | What it proves |
|---|---|
| Enumerate every crossing, then compare it against the list of places a decision is made | The gap, which is usually larger than expected |
| Run the seam check in CI and confirm it fails on an ungated call | The allowlist is a reviewable change |
| Insert a middleware layer that changes an argument after approval | The enforcement path refuses |
| Give the content filter a transcript whose reasoning says "transfer the approved amount" and whose tool arguments are wildly over policy | The filter passes it and the enforcement path does not |
| Hand work to a subagent with broader tools | The delegation itself is a crossing with a decision |

## Limitations worth stating

The static check is incomplete, and its incompleteness is the dangerous
part. Dynamic dispatch, `eval`, subprocess spawning, shell pipelines and
runtime-constructed endpoints all produce side effects a source scan
does not see. A CI check that passes tells you the obvious paths are
covered. That is worth having, and it is a different claim from telling
you they are all covered.

That gap is why the seam has to be closed by structure. The tool the
agent holds should not be able to reach an external system except through
the gate. Once the agent genuinely cannot make an ungated call, the
completeness of the scan stops being the load-bearing property.

MCP makes this harder in a specific way. Crossings are discovered
dynamically, so nothing is covered merely by having been imported and
the seam list is not knowable at build time. The obligation moves to
runtime, which is the argument for why a dynamically attached tool still
goes through a decision instead of being trusted because the runtime
attached it.

And a content filter has a genuine second job that is not prevention:
surfacing suspicious activity. Those are worth having, and calling them a
security control is how a system's actual coverage gets miscounted.

## What to do, and what not to

### What not to

Do not let a content filter stand in for a decision at the seam. It reads
text, and the text is not where the effect lives: the model says
"transfer the approved amount", nothing in that string is alarming, and
the executor receives a recipient, an amount of 50000 and a currency.
Every material value changed and not one of them is present in the text
a filter inspects. The same trap catches a prompt policy and a
model-level refusal, because all three read what the model said and all
three are blind to the argument the executor is about to act on. The
model cannot report the gap either, since the value it never saw is the
value that changed.

### What to do

Write the crossings down and put a decision at each one. The list is
short (every tool call, every outbound network write, every file
mutation, every subagent delegation, every approval card sent and
received) and every new integration adds at least one, so the count is
worth watching on its own. Put the decision where the arguments exist
and before the effect, and hold the agent's tools behind it, so the only
route to an external system is the route that carries a decision. The
price is a network hop per call and the incompleteness of the static
check: dynamic dispatch, eval, subprocess spawning and shell pipelines
all produce side effects a source scan does not see, and with MCP the
crossings are not knowable at build time at all. What it buys is a
checkable property (every crossing with an external consequence has a
decision made by something outside the agent, recorded whether the
answer is allow or block).

## FAQ

### Are prompt-level controls then useless?

No. They reduce the attack surface, they shape behavior, and in some
deployments they are the only control that exists. They are a
probability, and the honest framing is that they reduce frequency rather
than providing a guarantee.

### If everything goes through the gate, do we still need model safety?

Yes, for a different reason: latency and economics. An enforcement layer
that refuses after a full model round trip is more expensive and slower
than a model that declines to propose the action. The two optimize
different things, and conflating them is how teams end up with either a
slow system with weak reasoning or a fast system with a hole.

### How do we count seams without an architecture diagram?

Instrument them. Count the distinct tool identities the agent can invoke
in a given deployment. That is the number of places a decision can
happen. It is easy to measure and it moves when integrations change,
which makes it a useful thing to watch over time.

### Does this mean we should route all traffic through the gateway?

No, and over-broad routing has its own costs. The requirement is that
every crossing with an external consequence gets a decision. Read-only
operations can often be excluded, though you should be honest that
"read-only" is a claim about a tool, and claims about tools change. See
the [schema drift problem](/blog/2026-09-01-mcp-tool-identity-not-tool-name/).

### What about tools the agent invokes directly, without a framework?

The seam exists regardless of what is above it. A hand-written HTTP call
to a payment API is a crossing, and if the credential is in the agent's
environment, no framework in the world will put a decision in front of
it. That is the case the seam model is actually for.
