---
title: "The AI pipeline is not optional"
date: "2026-04-07"
tags: ["ai", "engineering", "architecture"]
---
<p class="lead-label">Deep breakdown · AI Systems Engineering</p>

  <p class="lede">Most AI systems don't fail because of a bad model. They fail because there's no structure around it. Here's how to build one that holds in production.</p>

  <p class="lead-meta">
    <span>7 min read</span>
    <span class="lead-sep">·</span>
    <span>Framework agnostic · LLM agnostic</span>
  </p>

  <p>I've seen production systems where the model was excellent — GPT-4, Claude, Gemini — and the surrounding code was a mess of hardcoded prompts, zero validation, and no separation of concerns. The model couldn't save them.</p>

  <p>The fix is never a better model. It's a better pipeline.</p>

  <div class="pull">
    Block early. Spend late. The LLM is the most expensive call in the chain — it should be the last thing that runs.<h2>What is a pipeline, exactly?</h2>

  <p>A pipeline is the ordered sequence of processing stages your system runs through <strong>before and after</strong> the LLM call. Every input passes through it. Every output exits through it.</p>

  <p>Think of it as the connective tissue between user intent and model response. The model does one thing well. The pipeline handles everything the model shouldn't have to handle: input sanity, security, context assembly, cost routing, output safety.</p>

  <p>Two flavors exist:</p>

  <p><strong>Workflow pipelines</strong> run linearly — stage 1 → 2 → 3 → LLM → done. Predictable, debuggable, easy to test. Right for 80% of production use cases.</p>

  <p><strong>Agent pipelines</strong> let the LLM decide the enrichment order. More flexible, higher cost, harder to reason about. Use only when the task genuinely requires dynamic orchestration.</p>

  <div class="figure">
    <div class="figure-label">Pipeline architecture · 9 stages</div>
    <div class="figure-body">

      <div class="pipe-row">
        <div class="pipe-connector"><div class="pipe-dot s"></div><div class="pipe-line"></div></div>
        <div class="pipe-stage s-mute"><div class="pipe-name">User input</div><div class="pipe-desc">Raw text enters the pipeline</div></div>
        <div class="pipe-cost c-free">—</div>
      </div>

      <div class="pipe-row">
        <div class="pipe-connector"><div class="pipe-dot s s-mute"></div><div class="pipe-line"></div></div>
        <div class="pipe-stage s-mute" style="position:relative">
          <div class="pipe-name">Stage 1 — Rate limiting</div>
          <div class="pipe-desc">Token bucket · per-user quotas · burst protection</div>
          <div class="pipe-exit">429</div>
        </div>
        <div class="pipe-cost c-free">~0</div>
      </div>

      <div class="pipe-row">
        <div class="pipe-connector"><div class="pipe-dot s s-hot"></div><div class="pipe-line"></div></div>
        <div class="pipe-stage s-hot" style="position:relative">
          <div class="pipe-name">Stage 2 — Validation</div>
          <div class="pipe-desc">Regex · length · type checks · null bytes · format</div>
          <div class="pipe-exit">reject</div>
        </div>
        <div class="pipe-cost c-free">~0</div>
      </div>

      <div class="pipe-row">
        <div class="pipe-connector"><div class="pipe-dot s s-warm"></div><div class="pipe-line"></div></div>
        <div class="pipe-stage s-warm" style="position:relative">
          <div class="pipe-name">Stage 3 — Security</div>
          <div class="pipe-desc">Injection patterns · jailbreak detection · policy check</div>
          <div class="pipe-exit">block</div>
        </div>
        <div class="pipe-cost c-free">low</div>
      </div>

      <div class="pipe-row">
        <div class="pipe-connector"><div class="pipe-dot s s-warm"></div><div class="pipe-line"></div></div>
        <div class="pipe-stage s-warm">
          <div class="pipe-name">Stage 4 — Query shaping</div>
          <div class="pipe-desc">Intent detection · expansion · language normalization</div>
        </div>
        <div class="pipe-cost c-ok">low</div>
      </div>

      <div class="pipe-row">
        <div class="pipe-connector"><div class="pipe-dot s s-cool"></div><div class="pipe-line"></div></div>
        <div class="pipe-stage s-cool">
          <div class="pipe-name">Stage 5 — Intelligence layer</div>
          <div class="pipe-desc">RAG retrieval · tool selection · user personalization</div>
        </div>
        <div class="pipe-cost c-warm">medium</div>
      </div>

      <div class="pipe-row">
        <div class="pipe-connector"><div class="pipe-dot s s-hot"></div><div class="pipe-line"></div></div>
        <div class="pipe-stage s-hot">
          <div class="pipe-name">Stage 6 — Context hydration</div>
          <div class="pipe-desc">Chat history · memory compaction · token budget</div>
        </div>
        <div class="pipe-cost c-warm">medium</div>
      </div>

      <div class="pipe-row">
        <div class="pipe-connector"><div class="pipe-dot s s-cool"></div><div class="pipe-line"></div></div>
        <div class="pipe-stage s-cool">
          <div class="pipe-name">Stage 7 — Preparation layer</div>
          <div class="pipe-desc">Prompt assembly · model routing · reasoning strategy</div>
        </div>
        <div class="pipe-cost c-warm">medium</div>
      </div>

      <div class="pipe-row">
        <div class="pipe-connector"><div class="pipe-dot s s-cool"></div><div class="pipe-line"></div></div>
        <div class="pipe-stage s-cool">
          <div class="pipe-name">Stage 8 — Execution layer</div>
          <div class="pipe-desc">LLM call · streaming · output security scan</div>
        </div>
        <div class="pipe-cost c-hot">high</div>
      </div>

      <div class="pipe-row">
        <div class="pipe-connector"><div class="pipe-dot s s-ok"></div><div class="pipe-line"></div></div>
        <div class="pipe-stage s-ok">
          <div class="pipe-name">Stage 9 — Output formatting</div>
          <div class="pipe-desc">Parse · PII redaction · response contract shaping</div>
        </div>
        <div class="pipe-cost c-ok">low</div>
      </div>

      <div class="pipe-row">
        <div class="pipe-connector"><div class="pipe-dot s"></div><div class="pipe-line"></div></div>
        <div class="pipe-stage s-mute"><div class="pipe-name">Response</div><div class="pipe-desc">Delivered to client</div></div>
        <div class="pl-cost">—</div>
      </div>

    </div><h2>The design principles</h2>

  <div class="os-panel">
    <div class="figure-label">Core rules</div>
    <ul>
      <li><strong>Block early, spend late.</strong> Cheap checks go first. The LLM call is the most expensive operation — it only runs after everything else has cleared.</li>
      <li><strong>Fail fast.</strong> A blocked context stops the pipeline immediately. No downstream stage runs on a blocked request.</li>
      <li><strong>Single responsibility.</strong> Each stage does one thing. Validation doesn't touch security. Security doesn't touch RAG.</li>
      <li><strong>Configurable.</strong> Any stage can be disabled for testing or bypassed by environment flag. New stages can be inserted without touching existing ones.</li>
      <li><strong>Observable.</strong> The context is serializable. Every stage snapshots it. Every failure has a named reason.</li>
    </ul><h2>The context object</h2>

  <p>Every stage communicates through a shared context object. The rules are simple: each stage reads what previous stages added and appends its own data. Nothing is deleted. The context only grows.</p>

  <p>This makes the pipeline fully auditable — you can inspect exactly what each stage contributed. And because it's serializable, you can snapshot it after every stage for debugging, crash recovery, and observability.</p>

<pre><code><span class="tok t-kw">from</span> dataclasses <span class="tok t-kw">import</span> dataclass, field
<span class="tok t-kw">from</span> typing <span class="tok t-kw">import</span> Any
<span class="tok t-kw">import</span> json

<span class="tok t-kw">@dataclass</span>
<span class="tok t-cl">class</span> <span class="tok t-fn">PipelineContext</span>:
    <span class="tok t-str">"""
    Shared state passed through every stage.
    Each stage reads previous enrichments and adds its own.
    Never deletes. Always serializable.
    """</span>
    raw_input: str
    user_id: str
    stages_passed: list[str] = field(default_factory=list)
    enrichments: dict[str, Any] = field(default_factory=dict)
    final_prompt: str | <span class="tok t-kw">None</span> = <span class="tok t-kw">None</span>
    response: str | <span class="tok t-kw">None</span> = <span class="tok t-kw">None</span>
    blocked: bool = <span class="tok t-kw">False</span>
    block_reason: str | <span class="tok t-kw">None</span> = <span class="tok t-kw">None</span>

    <span class="tok t-kw">def</span> <span class="tok t-fn">add</span>(self, key: str, value: Any):
        self.enrichments[key] = value
        self.stages_passed.append(key)

    <span class="tok t-kw">def</span> <span class="tok t-fn">block</span>(self, reason: str):
        self.blocked = <span class="tok t-kw">True</span>
        self.block_reason = reason

    <span class="tok t-kw">def</span> <span class="tok t-fn">serialize</span>(self) -> str:
        <span class="tok t-cm"># Snapshot at any stage — for logging, retries, crash recovery</span>
        <span class="tok t-kw">return</span> json.dumps(self.__dict__, default=str)
</code></pre>

  <h2>Stage by stage</h2>

  <div class="card-grid">
    <div class="card">
      <div class="card-meta">Stage 1</div>
      <div class="card-title">Rate limiting</div>
      <p class="card-body">Token bucket or sliding window per user. Catches burst abuse before any parsing happens. This is the absolute cheapest gate — a single counter lookup.</p>
      <span class="tag c-free">~free</span>
    </div>
    <div class="card">
      <div class="card-meta">Stage 2</div>
      <div class="card-title">Validation</div>
      <p class="card-body">Regex, length checks, null bytes, encoding checks. No ML. Rejects garbage before it wastes a single downstream cycle. Saves more cost than any other stage.</p>
      <span class="tag c-free">~free</span>
    </div>
    <div class="card">
      <div class="card-meta">Stage 3</div>
      <div class="card-title">Security</div>
      <p class="card-body">Compiled regex for known injection patterns. Optional embedding-based classifier for borderline cases. Goal: raise the cost of attack, not achieve perfection.</p>
      <span class="tag c-ok">low cost</span>
    </div>
    <div class="card">
      <div class="card-meta">Stage 4</div>
      <div class="card-title">Query shaping</div>
      <p class="card-body">Classify intent, expand sparse queries, normalize language. Users write "fix my code" — your system needs to know it's a debugging task in Python before retrieval.</p>
      <span class="tag c-ok">low cost</span>
    </div>
    <div class="card">
      <div class="card-meta">Stage 5</div>
      <div class="card-title">Intelligence layer</div>
      <p class="card-body">RAG retrieval, tool manifest selection, user profile loading. Filter retrieved chunks by relevance score — don't dump noise into the context window.</p>
      <span class="tag c-warm">medium cost</span>
    </div>
    <div class="card">
      <div class="card-meta">Stage 6</div>
      <div class="card-title">Context hydration</div>
      <p class="card-body">Load chat history. Apply sliding window, summarization, or compaction to stay within the token budget. This is separate from preparation — data loading vs. decision making.</p>
      <span class="tag c-warm">medium cost</span>
    </div>
    <div class="card">
      <div class="card-meta">Stage 7</div>
      <div class="card-title">Preparation layer</div>
      <p class="card-body">Assemble the final prompt from all enrichments. Route to the right model — simple tasks go to fast models. Decide whether the task needs extended thinking.</p>
      <span class="tag c-warm">medium cost</span>
    </div>
    <div class="card">
      <div class="card-meta">Stage 8</div>
      <div class="card-title">Execution layer</div>
      <p class="card-body">The LLM call. Finally. Streaming, tool use, reasoning — all here. Also includes output security: scan for policy violations before the response leaves this stage.</p>
      <span class="tag c-hot">high cost</span>
    </div>
  </div>

  <p>Stage 9 — <strong>output formatting</strong> — deserves its own note. PII redaction, response contract enforcement (JSON schema, markdown stripping for voice channels, truncation for UI constraints) are genuinely distinct from generation. Keeping them as a separate, swappable stage means you can change output format per channel without touching the execution layer.</p>

  <h2>Wiring it together</h2>

  <p>The pipeline runner is intentionally minimal. It loops through stages, skips disabled ones, stops on a blocked context, and snapshots after each stage.</p>

<pre><code><span class="tok t-cl">class</span> <span class="tok t-fn">AIPipeline</span>:
    <span class="tok t-kw">def</span> <span class="tok t-fn">__init__</span>(self, stages: list, enabled: set[str] | <span class="tok t-kw">None</span> = <span class="tok t-kw">None</span>):
        self.stages = stages
        self.enabled = enabled  <span class="tok t-cm"># None = all stages active</span>

    <span class="tok t-kw">def</span> <span class="tok t-fn">run</span>(self, raw_input: str, user_id: str) -> <span class="tok t-fn">PipelineContext</span>:
        ctx = <span class="tok t-fn">PipelineContext</span>(raw_input=raw_input, user_id=user_id)

        <span class="tok t-kw">for</span> stage <span class="tok t-kw">in</span> self.stages:
            name = stage.<span class="tok t-fn">__class__</span>.__name__

            <span class="tok t-kw">if</span> self.enabled <span class="tok t-kw">and</span> name <span class="tok t-kw">not in</span> self.enabled:
                <span class="tok t-kw">continue</span>  <span class="tok t-cm"># configurable: skip disabled stages</span>

            <span class="tok t-kw">if</span> ctx.blocked:
                <span class="tok t-kw">break</span>     <span class="tok t-cm"># fail fast: don't process blocked context</span>

            ctx = stage.<span class="tok t-fn">run</span>(ctx)
            self.<span class="tok t-fn">_snapshot</span>(ctx, stage_name=name)  <span class="tok t-cm"># observe every step</span>

        <span class="tok t-kw">return</span> ctx

<span class="tok t-cm"># Usage — framework and LLM agnostic</span>
pipeline = <span class="tok t-fn">AIPipeline</span>(stages=[
    <span class="tok t-fn">RateLimitStage</span>(limit=<span class="tok t-num">100</span>, window_seconds=<span class="tok t-num">60</span>),
    <span class="tok t-fn">ValidationStage</span>(<span class="tok t-fn">ValidationConfig</span>(max_length=<span class="tok t-num">2000</span>)),
    <span class="tok t-fn">SecurityStage</span>(),
    <span class="tok t-fn">QueryShapingStage</span>(),
    <span class="tok t-fn">IntelligenceStage</span>(vector_store=vs, user_store=us),
    <span class="tok t-fn">ContextHydrationStage</span>(history_store=hs, max_tokens=<span class="tok t-num">2000</span>),
    <span class="tok t-fn">PreparationStage</span>(system_prompt=SYSTEM_PROMPT),
    <span class="tok t-fn">ExecutionStage</span>(llm_client=llm),
    <span class="tok t-fn">OutputFormattingStage</span>(),
])

result = pipeline.<span class="tok t-fn">run</span>(raw_input=<span class="tok t-str">"How do I fix this?"</span>, user_id=<span class="tok t-str">"user_42"</span>)

<span class="tok t-kw">if</span> result.blocked:
    <span class="tok t-fn">print</span>(<span class="tok t-str">f"Blocked: {result.block_reason}"</span>)
<span class="tok t-kw">else</span>:
    <span class="tok t-fn">print</span>(result.response)
</code></pre>

  <h2>Context rules</h2>

  <div class="os-panel">
    <div class="figure-label">How stages communicate</div>

    <div class="ctx-rule">
      <div class="ctx-num">01</div>
      <div>Each stage sees everything the previous stages added — but <strong>never removes it</strong>. The context is append-only. This makes the pipeline fully auditable without any tracing overhead.</div>
    </div>
    <div class="ctx-rule">
      <div class="ctx-num">02</div>
      <div>The context must be <strong>fully serializable</strong> at all times. Crashes, timeouts, and retries are production facts. Serializable state means you can resume, replay, and debug without loss.</div>
    </div>
    <div class="ctx-rule">
      <div class="ctx-num">03</div>
      <div><strong>Snapshot after every stage.</strong> The single best observability investment you can make. When something goes wrong, you want to know what the context looked like when it entered each stage — not just the final output.</div>
    </div>
    <div class="ctx-rule">
      <div class="ctx-num">04</div>
      <div>Every blocked request carries a <strong>named reason</strong>. Not a boolean flag. Not an HTTP status code. A human-readable string that tells you exactly which stage rejected the request and why.</div>
    </div><h2>What model routing actually saves you</h2>

  <p>Most teams default their strongest model for every request. That's expensive and unnecessary. A simple clarification question doesn't need the same model as a multi-step debugging task.</p>

  <p>A primitive routing rule in the preparation layer — based on intent classification and query complexity from earlier stages — can reduce LLM costs by 40–60% with no quality regression on the requests that matter. The data to make that decision is already in the context by stage 7. You just have to use it.</p>

  <hr class="section">

  <p>Most AI reliability problems are pipeline problems. The model is the last mile. Everything before it determines whether that last mile goes well.</p>

  <p>Build the pipeline first. Then worry about the model.</p>

  <div class="os-panel cta">
    <p>Building something like this?<br>Hit a pattern that worked better?</p>
    <div class="lead-meta">Drop a comment · ♻ Repost if this saves someone a refactor</div>
