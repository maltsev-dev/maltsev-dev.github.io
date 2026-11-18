---
title: "The AI pipeline is not optional"
date: "2026-04-07"
tags: ["ai", "engineering", "architecture"]
---
Most production AI systems have an excellent model and a mess around it. I have seen GPT-4, Claude and Gemini sitting behind hardcoded prompts, zero validation and no separation of concerns. The model could not save those systems, because the broken part was never the model. The failure was the lack of structure around the model.

The pipeline around it is the part that has to be built. It is framework agnostic and LLM agnostic, and it is what holds in production.

> Block early. Spend late. The LLM is the most expensive call in the chain, so it should be the last thing that runs.

## What a pipeline is

A pipeline is the ordered sequence of processing stages your system runs through before and after the LLM call. Every input passes through it. Every output exits through it.

It is the connective tissue between user intent and model response. The model does one thing well. The pipeline handles everything the model should not have to handle: input sanity, security, context assembly, cost routing, output safety.

There are two flavors:

A **workflow pipeline** runs linearly (stage 1, then 2, then 3, then the LLM, then done). It is predictable, debuggable and easy to test, and it is the right shape for 80% of production use cases.

An **agent pipeline** lets the LLM decide the enrichment order. It is more flexible, costs more, and is harder to reason about. Use it only when the task genuinely requires dynamic orchestration.

## The nine stages

| Stage | What it does | Cost | Exit code |
|---|---|---|---|
| User input | Raw text enters the pipeline | none | |
| Stage 1, rate limiting | Token bucket, per-user quotas, burst protection | ~0 | 429 |
| Stage 2, validation | Regex, length, type checks, null bytes, format | ~0 | reject |
| Stage 3, security | Injection patterns, jailbreak detection, policy check | low | block |
| Stage 4, query shaping | Intent detection, expansion, language normalization | low | |
| Stage 5, intelligence layer | RAG retrieval, tool selection, user personalization | medium | |
| Stage 6, context hydration | Chat history, memory compaction, token budget | medium | |
| Stage 7, preparation layer | Prompt assembly, model routing, reasoning strategy | medium | |
| Stage 8, execution layer | LLM call, streaming, output security scan | high | |
| Stage 9, output formatting | Parse, PII redaction, response contract shaping | low | |
| Response | Delivered to client | none | |

Stages 1 through 3 can end the request before the LLM is ever called. The exit code is the reason it ended, and it is the only thing a caller needs to decide whether to retry.

## The design principles

| Rule | What it means |
|---|---|
| Block early, spend late | Cheap checks go first. The LLM call is the most expensive operation, and it only runs after everything else has cleared |
| Fail fast | A blocked context stops the pipeline immediately. No downstream stage runs on a blocked request |
| Single responsibility | Each stage does one thing. Validation does not touch security. Security does not touch RAG |
| Configurable | Any stage can be disabled for testing or bypassed by environment flag. New stages can be inserted without touching existing ones |
| Observable | The context is serializable. Every stage snapshots it. Every failure has a named reason |

## The context object

Every stage communicates through a shared context object. The rules are simple: each stage reads what previous stages added and appends its own data. Nothing is deleted. The context only grows.

That makes the pipeline fully auditable. You can inspect exactly what each stage contributed. Because it is serializable, you can snapshot it after every stage for debugging, crash recovery and observability.

```python
from dataclasses import dataclass, field
from typing import Any
import json

@dataclass
class PipelineContext:
    """
    Shared state passed through every stage.
    Each stage reads previous enrichments and adds its own.
    Never deletes. Always serializable.
    """
    raw_input: str
    user_id: str
    stages_passed: list[str] = field(default_factory=list)
    enrichments: dict[str, Any] = field(default_factory=dict)
    final_prompt: str | None = None
    response: str | None = None
    blocked: bool = False
    block_reason: str | None = None

    def add(self, key: str, value: Any):
        self.enrichments[key] = value
        self.stages_passed.append(key)

    def block(self, reason: str):
        self.blocked = True
        self.block_reason = reason

    def serialize(self) -> str:
        # Snapshot at any stage — for logging, retries, crash recovery
        return json.dumps(self.__dict__, default=str)
```

## Stage by stage

### Stage 1, rate limiting

Token bucket or sliding window per user. It catches burst abuse before any parsing happens. This is the absolute cheapest gate, a single counter lookup.

### Stage 2, validation

Regex, length checks, null bytes, encoding checks. No ML. It rejects garbage before the garbage wastes a single downstream cycle, and it saves more cost than any other stage.

### Stage 3, security

A compiled regex for known injection patterns, plus an optional embedding-based classifier for borderline cases. The goal is to raise the cost of an attack, not to achieve perfection.

### Stage 4, query shaping

Classify intent, expand sparse queries, normalize language. A user writes "fix my code", and the system needs to know it is a debugging task in Python before retrieval runs.

### Stage 5, intelligence layer

RAG retrieval, tool manifest selection, user profile loading. Retrieved chunks get filtered by relevance score, so that noise does not end up in the context window.

### Stage 6, context hydration

Load chat history. Apply a sliding window, summarization or compaction to stay within the token budget. This is separate from preparation: data loading versus decision making.

### Stage 7, preparation layer

Assemble the final prompt from all enrichments. Route to the right model, since simple tasks go to fast models. Decide whether the task needs extended thinking.

### Stage 8, execution layer

The LLM call. Streaming, tool use and reasoning all happen here, and so does output security: the stage scans for policy violations before the response leaves it.

### Stage 9, output formatting

Output formatting deserves its own note. PII redaction, response contract enforcement (JSON schema, markdown stripping for voice channels, truncation for UI constraints) are distinct from generation. Keeping them as a separate, swappable stage means the output format can change per channel without touching the execution layer.

## Wiring it together

The pipeline runner is intentionally minimal. It loops through stages, skips disabled ones, stops on a blocked context, and snapshots after each stage.

```python
class AIPipeline:
    def __init__(self, stages: list, enabled: set[str] | None = None):
        self.stages = stages
        self.enabled = enabled  # None = all stages active

    def run(self, raw_input: str, user_id: str) -> PipelineContext:
        ctx = PipelineContext(raw_input=raw_input, user_id=user_id)

        for stage in self.stages:
            name = stage.__class__.__name__

            if self.enabled and name not in self.enabled:
                continue  # configurable: skip disabled stages

            if ctx.blocked:
                break     # fail fast: don't process blocked context

            ctx = stage.run(ctx)
            self._snapshot(ctx, stage_name=name)  # observe every step

        return ctx

# Usage — framework and LLM agnostic
pipeline = AIPipeline(stages=[
    RateLimitStage(limit=100, window_seconds=60),
    ValidationStage(ValidationConfig(max_length=2000)),
    SecurityStage(),
    QueryShapingStage(),
    IntelligenceStage(vector_store=vs, user_store=us),
    ContextHydrationStage(history_store=hs, max_tokens=2000),
    PreparationStage(system_prompt=SYSTEM_PROMPT),
    ExecutionStage(llm_client=llm),
    OutputFormattingStage(),
])

result = pipeline.run(raw_input="How do I fix this?", user_id="user_42")

if result.blocked:
    print(f"Blocked: {result.block_reason}")
else:
    print(result.response)
```

## Context rules

1. Each stage sees everything the previous stages added, and never removes it. The context is append-only, which makes the pipeline auditable without any tracing overhead.
2. The context must be fully serializable at all times. Crashes, timeouts and retries are production facts, and serializable state means you can resume, replay and debug without loss.
3. Snapshot after every stage. It is the single best observability investment you can make: when something goes wrong, you want to know what the context looked like when it entered each stage, not just the final output.
4. Every blocked request carries a named reason, not a boolean flag and not an HTTP status code. A human-readable string that says which stage rejected the request and why.

## What model routing actually saves

Most teams default their strongest model for every request. That is expensive and unnecessary. A simple clarification question does not need the same model as a multi-step debugging task.

A primitive routing rule in the preparation layer, based on the intent classification and query complexity from earlier stages, can reduce LLM costs by 40% to 60% with no quality regression on the requests that matter. The data to make that decision is already in the context by stage 7. You just have to use it.

## What to actually check

1. Send a request that trips the rate limiter. Confirm it never reaches the LLM and comes back as a 429.
2. Send garbage that fails validation. Confirm no downstream stage ran and nothing was paid for.
3. Send a prompt that trips the security stage. Confirm the context carries a named block reason and not just a boolean.
4. Disable one stage through the environment flag. Confirm it is skipped and the rest of the pipeline still runs.
5. Inspect the serialized context after the preparation stage. Confirm the routing decision is there, along with everything the earlier stages added.

## Limitations worth stating

The security stage raises the cost of an attack rather than removing it. Its coverage is exactly the coverage of the regex set and the optional classifier you configure, and neither is a proof of anything.

Routing saves money only when the intent classification and the complexity signal are good, and the 40% to 60% figure assumes the classification is right.

A workflow pipeline assumes a fixed enrichment order, which is what makes it predictable and testable. When the task needs dynamic orchestration, the agent flavor buys flexibility and pays for it in cost and in the difficulty of reasoning about what happened.

## What to do, and what not to

### What not to

A prompt is not a pipeline. The single-call shape (one system prompt, one request, one response) has no stage boundary, so validation, injection checks and output shaping all run inside the most expensive call in the chain instead of ahead of it. A request that stage 2 would reject for a null byte or a length past 2000 characters, and that stage 1 would have answered with a 429, gets paid for at model prices first and rejected second. The request still ends up blocked, but it ends up blocked by something that cannot name the reason, because no stage owns one. That is the shape that makes a bad request expensive to refuse and its refusal unexplainable to whoever has to answer for it later.

### What to do

Give each stage one decision to own, and let the cheap ones answer first: a rate limit that returns 429, a validator that rejects a null byte or a length past 2000 characters, a security stage that raises the cost of an attack rather than promising to remove it. Carry their verdicts in one serializable context that only grows, so the block reason is a string you wrote rather than a boolean the model produced, and snapshot after every stage so you can see what the request looked like when it entered each one. It costs nine stages of code to maintain, a context that grows with every enrichment, and a snapshot written nine times per request. The result is a property you can check: the request which reaches the model is one you decided to spend on, rather than one that arrived and had to be paid for in order to be judged.

## FAQ

### Is the structure worth it if the model is good?

The model quality and the pipeline quality are independent. A better model raises the ceiling on the answer and changes nothing about the request that reaches it, the tool call that gets made with the wrong argument, or the response that leaves without a scan.

### Do I need all nine stages?

The stages are ordered by cost, so the useful question is where the money is. If the LLM call dominates the spend, the early stages are what protect it. If a stage does nothing for your workload, the runner disables it by name without touching the others.

### Why does the context only grow?

Because deleting from it loses what each stage contributed, and that is what makes the pipeline auditable. The append-only context is also what survives a snapshot, a resume and a replay.

### Does the order of the stages matter?

Yes, and it is the order of cost. Moving the execution layer earlier means paying for the expensive call before the cheap checks that would have rejected the request, which is the opposite of what the pipeline is for.
