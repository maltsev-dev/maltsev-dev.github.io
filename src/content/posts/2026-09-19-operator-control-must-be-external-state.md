---
title: "Operator Control Lives in State the Agent Cannot Reach"
date: "2026-09-19"
tags: ["reliability", "authorization"]
---
The agent is already running. The operator decides to stop it.

The worker is on another pod. The queue keeps delivering jobs. Another
worker picks up the in-flight execution. Cancelling the framework's call
does not propagate. Killing the container does not stop the queue.

What is left is SSH, hope and patience. None of those are reliable for an
autonomous system that may be sitting on a human approval prompt or stuck
in a retry loop against a service that stopped responding an hour ago.

## Four mechanisms, four different failures

| Mechanism | What it reaches | What keeps running |
|---|---|---|
| Framework cancellation, `task.cancel()` | The coroutine on the process that received it | The worker holding the execution, the queue that will hand the work to another worker, and any external side effect that already happened |
| Killing the container | One process | The queue is durable by design, which is what makes it a queue, so the job returns and is delivered elsewhere. The operator removed a pod |
| SIGTERM with a grace period | The current task, which finishes inside the window | Everything after it. This is the most dangerous of the four because it looks like it worked, and the task it lets complete may be the payment that was the reason for the kill |
| A feature flag read at startup | The current run | Every run after a restart. An agent restarted by a deploy, an autoscaler or a crash comes back with the flag as it was, and nobody noticed it went missing |

The common structure: every one of these is scoped to a process, and the
thing being stopped is a workflow. A workflow is a sequence spanning many
processes, minutes or hours, surviving crashes and deploys and waiting on
a person in the middle.

## The question most frameworks never ask

Almost every team can answer three questions about their agent:

- What can it access?
- What requires approval?
- Where is the audit log?

Far fewer can name the person with real-time authority to interrupt the
agent mid-task.

That gap shows up in how the design is read. Static policy describes
intent. It says what the agent is meant to do. It says nothing about who
is watching at the moment the agent does something else, and nothing about
what happens in the seconds between deciding and acting.

Permission design without an assigned interrupt owner documents a live
system instead of governing one. Two things have to be true at T=0:

1. **There is a revocation condition.** A signal that narrows, pauses or
   removes authority the moment it fires. Waiting for the next planning
   cycle is a delay, not a control.
2. **The interrupt is technical.** A button, not a meeting. A revoked
   grant, not a ticket that someone processes next Tuesday.

If a human cannot veto an agent at T=0, authority has been surrendered
rather than delegated.

## Operator control is a fact in a store

Control belongs in state rather than in a message. The runtime reads
the state at the gate decision, which is the one moment that already
exists in every correct architecture.

```python
class WorkflowState(str, Enum):
    NORMAL = "normal"
    PAUSED = "paused"      # next tool call is held
    KILLED  = "killed"     # in-flight work is abandoned

def check_workflow_state(execution_id: str) -> None:
    state = workflow_gate_state(execution_id)   # durable, not in-memory

    if state is WorkflowState.PAUSED:
        raise Held("workflow paused by operator")
    if state is WorkflowState.KILLED:
        raise Aborted("workflow killed by operator")
```

Every state is a value, and a value is replaced by another value. Nothing
here deletes anything. A stopped workflow reads as stopped and the record
of what it did survives the stop: the interesting question after an
incident is what the workflow was doing, and a control that erases its own
history destroys the evidence before anyone reads it.

The default is worth picking deliberately. If the row is missing, the
choices are "normal" or "not normal", and the second one is the one that
survives contact with an operator: an unreadable or absent control record
should not resolve to "carry on". A missing row collapses to the stopped
state, because the cost of a workflow that has to be restarted is much
lower than the cost of one nobody stopped.

Three properties come from putting the state in the store:

| Property | What it buys |
|---|---|
| Shared | Every worker reads the same state, so a pause applies to the whole workflow. Guessing which pod was busy stops being part of the procedure |
| Persistent | It survives the process that set it. The pod that restarted comes back and finds the workflow still paused, which is the exact failure the startup flag had |
| Ordered | It is checked at the gate, so it composes with everything else. A paused workflow is also subject to budget and policy checks when it resumes, because resuming is just another gate decision |

Here is the whole arrangement, with the write paths marked:

```
    inside the agent                outside the agent
  ┌────────────────────────┐      ┌──────────────────────────────┐
  │    agent process       │      │    workflow_gate_state       │
  │                        │      │     (durable, shared)        │
  │      tool call         ┼─────►│    read at the gate          │
  │                        │      │  normal / paused / killed    │
  │  write path       none │      │                              │
  │  pause credential none │      │                              │
  └────────────────────────┘      └──────────────────────────────┘

  operator ── pause / kill / resume ──► workflow_gate_state
```

The agent can read and it can ask. It holds no credential that the store
accepts for a write, so there is no interface for it to widen its own
scope.

## Killing a workflow means killing the work

This is the part that has to be built, and the part most implementations
skip:

```python
def handle(job) -> None:
    # Check before dequeueing, or the queue hands the killed job
    # to the next worker who has never heard of the kill.
    if workflow_state(job.execution_id) is WorkflowState.KILLED:
        metrics.incr("jobs.discarded_killed")
        return ack_without_running(job)

    result = run(job)
    ack(job, result)
```

That first check is the whole queue integration. Without it the kill is
advisory: the queue does not know, so it delivers, so another worker
runs it. With it, a killed workflow stops producing work even though the
queue is still healthy.

The kill lands in the store and the worker reads it before it does
anything:

```
   operator          durable queue          worker pod
│               │                   │
│  kill         │                   │
├──────────────►│ state = KILLED    │
│               │                   │
│               ├── job A ──────────►│
│               │                   │
│               │                   │  read state
│               │                   │  KILLED
│               │                   │
│               ┤───────────────────◄
│               │                   │  ack, no run
│               │                   │  discarded_killed
```

The cost is that the queue has to participate, which is integration
work in a system you may not own. Until it lands, "kill" reliably means
"stop at the next gate decision", not "stop now".

## What "in flight" costs you

A gate check happens *before* a tool call. If the operator kills while a
long tool call is already running, the gate check has already passed and
nothing interrupts it.

```python
async def call_tool(execution_id, tool, args):
    token = abort_token(execution_id)      # polls the workflow state
    try:
        return await tool.invoke(args, cancel_token=token)
    except Cancelled:
        metrics.incr("tools.aborted")
        raise Aborted("cancelled by operator")
```

Realistically:

| Kind of call | What the operator gets |
|---|---|
| Short calls, the common case | The call finishes before the operator can react, so killing is effectively a pause |
| Long calls | The downstream tool has to honour a cancellation token. Most HTTP clients can drop a request, and many APIs keep processing after the client disconnects, so whether the effect happened is genuinely unknown |
| Local side effects already written | Nothing rolls them back. Killing stops the workflow and leaves the writes in place |

So "the operator killed it" and "the action did not happen" are
different claims, and conflating them is how an incident review ends up
arguing about a log line. The system should say which one it can prove.
This is the same unknown-state problem described in
[fail-closed](/blog/2026-07-20-fail-closed-is-not-a-single-switch/): the safe answer
to "did it run?" is to record that it may have, not to guess.

## Do not put two state machines in one column

One implementation detail is worth copying, because the bug it prevents
is more confusing than it is dangerous-looking:

Workflow lifecycle and the circuit breaker are **independent state
machines**. A workflow can be paused by an operator and simultaneously
tripped by a failing dependency. Both are true, and neither implies the
other.

Put them in one status column and the second transition silently
overwrites the first. You get a paused workflow whose breaker is closed
and a tripped workflow whose lifecycle says normal, and because a
workflow that looks alive is one nobody investigates, the enforcement
problem hides inside the display problem.

Runtime transitions update breaker state. Operator actions update
lifecycle state. Neither implicitly changes the other, and a temporary
inconsistency between them is a dashboard bug; an inconsistency inside
the enforcement path is not.

## Expiry is the cheaper control

Killing is reactive. It requires a human to notice, decide, and act while
the agent is still doing the thing.

Authority that expires by design does not require any of that. Grants
that carry a short time-to-live narrow on their own, so the window in
which a stale capability is usable is bounded by construction rather
than by detection speed.

That inverts the burden. Revocation becomes the exception path for
genuine emergencies, and the normal case of a grant nobody renewed is
handled by the clock.

## What to actually check

1. **Pause from another pod.** Pause the workflow, then issue a tool call
   from a different worker. It must be held.
2. **Kill with a full queue.** Kill a workflow with jobs queued behind it.
   Confirm none of them start.
3. **Restart survival.** Pause, restart every worker, then call. The
   workflow is still paused.
4. **Resume.** Un-pause and confirm the next call proceeds and is
   re-evaluated against current policy. The snapshot from before the
   pause must not decide anything.
5. **Kill during a long call.** Confirm the system reports "aborted with
   unknown outcome". A report of "did not execute" is a claim it has no
   evidence for.
6. **Unauthorized interrupt.** Confirm an operator without the right
   permission cannot pause someone else's workflow.

## Limitations worth stating

The queue integration is the hard part and it is real work. Without it,
the honest description of your kill switch is "stops at the next gate",
which is useful and is not the same thing.

In-flight abort is bounded by what the downstream honours. For a tool
that performs a multi-second write inside a server you do not control,
you cannot prove the effect did not happen, and no amount of local state
will let you claim otherwise.

Paused workflows keep holding what they hold: budget reservations,
connections, approval cards that operators will eventually answer about
an agent that is no longer running. That is a resource decision, not a
bug, and it needs a policy about how long a pause lasts before
something reclaims it.

And the operator surface needs its own authorization. A control plane
that can pause anyone's workflow is a control plane that can be used to
stop someone else's incident response, which is a privilege escalation
with a very short demo.

## FAQ

### Does container-level isolation cover most cases?

For most cases it does, and it is worth having. It stops runaway CPU and
memory. It does not stop a workflow: the queue is durable, so the work
returns, and the tool calls that had external effects already had them.
For a batch job that is acceptable; for an agent holding payment
credentials it is not.

### Pause or kill first?

Pause. It is reversible, it preserves the state for inspection, and it
stops new side effects immediately. Kill is for the case where the
workflow is causing harm right now and you cannot wait to understand it.

### Should the operator be able to resume?

Yes, and the resume should be a gate decision like any other. The world
may have changed during the pause, and a resumed workflow re-evaluates
against current policy rather than the snapshot it held before.

### How often do people actually hit this?

Rarely, which is exactly the problem. An untested control surface is
assumed to work, and the first real test is the incident. Run the checks
above on a schedule; a kill switch discovered to be broken during an
incident is a compound failure.

### Where does this belong architecturally?

In the enforcement layer, which already has a place in the execution
path where a decision is made before an irreversible action. The agent
loop, the orchestrator and the queue are each one process, and the thing
that needs stopping is not.

## Where this runs

NullRun reads every workflow's state at the gate, and the state lives
outside the workers. An operator can pause a workflow and the next tool
call is held; kill it and in-flight work is abandoned. A stopped workflow
reads as stopped and its record is retained, so what it was doing is
still answerable afterwards. The state is shared across pods, so a kill
means kill on every pod at once, with no hoping that the others notice.

Authority is ephemeral by default, and expiry is specific about what it
covers: the execution binding that ties a server-minted execution
identity to its organization and API key is time-limited, and an
approval envelope carries its own expiry. Neither needs anyone to act for
the window to close. Because control is read at the gate, it composes
with the rest of the decision and stays inside it, so a paused
workflow resumes into a full re-evaluation and not a continuation of the
policy it held before the pause. The wire shapes are in the
[API reference](https://nullrun.io/docs/api).
