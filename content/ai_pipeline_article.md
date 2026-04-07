+++
title = "The AI pipeline is not optional"
date = "2026-04-07"
raw_html = true
template = "post_article.html"

[taxonomies]
tags = ["ai", "engineering", "architecture"]
+++

<style>
  .wrap {
    /* Article CSS variables — scoped here so they don't override site :root vars */
    --ink: #0f0e0d;
    --ink2: #3a3835;
    --ink3: #6b6762;
    --paper: #f7f4ef;
    --paper2: #ede9e2;
    --paper3: #e2ddd5;
    --accent: #c84b2f;
    --accent2: #1a3a5c;
    --rule: #ccc8c0;
    --mono: 'DM Mono', monospace;
    --serif: 'DM Serif Display', serif;
    --sans: 'Instrument Sans', sans-serif;

    max-width: 720px;
    margin: 40px auto;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--sans);
    font-size: 17px;
    line-height: 1.75;
    padding: 60px 40px 80px;
    border-radius: 12px;
  }

  /* ── Header label ── */
  .header-label {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .header-label::after {
    content: '';
    display: block;
    height: 1px;
    width: 48px;
    background: var(--accent);
  }

  /* ── Headings — override site's flex + bold ── */
  .wrap h1 {
    font-family: var(--serif);
    font-size: 52px;
    line-height: 1.1;
    color: var(--ink);
    margin-bottom: 10px;
    letter-spacing: -.02em;
    display: block;
    font-weight: normal;
  }
  .wrap h1 em {
    font-style: italic;
    color: var(--accent);
  }

  .subtitle {
    font-size: 19px;
    color: var(--ink3);
    margin-bottom: 40px;
    font-weight: 400;
    max-width: 580px;
    line-height: 1.5;
  }

  .byline {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 20px 0;
    border-top: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule);
    margin-bottom: 56px;
    font-size: 13px;
    color: var(--ink3);
    font-family: var(--mono);
  }
  .byline strong { color: var(--ink); font-weight: 500; }
  .byline .dot { color: var(--rule); }

  .wrap h2 {
    font-family: var(--serif);
    font-size: 30px;
    line-height: 1.2;
    color: var(--ink);
    margin: 64px 0 20px;
    letter-spacing: -.01em;
    display: block;
    font-weight: normal;
  }

  .wrap h3 {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--accent2);
    margin: 48px 0 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: normal;
  }
  .wrap h3::before {
    content: '';
    display: block;
    width: 20px;
    height: 1px;
    background: var(--accent2);
  }

  .wrap p { margin-bottom: 22px; color: var(--ink2); }
  .wrap strong { color: var(--ink); font-weight: 600; }

  /* ── Pull quote ── */
  .pullquote {
    border-left: 3px solid var(--accent);
    padding: 4px 0 4px 28px;
    margin: 40px 0;
    font-family: var(--serif);
    font-size: 22px;
    line-height: 1.45;
    color: var(--ink);
  }

  /* ── Pipeline diagram ── */
  .pipeline-wrap {
    background: var(--paper2);
    border: 1px solid var(--rule);
    border-radius: 12px;
    padding: 36px 32px;
    margin: 40px 0;
  }
  .pipeline-label {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--ink3);
    margin-bottom: 28px;
  }
  .pipeline {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
  }
  .pl-row {
    display: grid;
    grid-template-columns: 28px 1fr 72px;
    align-items: stretch;
    gap: 0;
  }
  .pl-connector {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .pl-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--ink3);
    background: var(--paper2);
    flex-shrink: 0;
    margin-top: 18px;
    position: relative;
    z-index: 1;
  }
  .pl-line {
    width: 2px;
    flex: 1;
    background: var(--rule);
  }
  .pl-row:last-child .pl-line { display: none; }

  .pl-stage {
    border-radius: 8px;
    padding: 14px 18px;
    margin: 4px 0;
    border: 1px solid transparent;
    position: relative;
  }
  .pl-stage-name {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: .04em;
    margin-bottom: 3px;
  }
  .pl-stage-desc {
    font-size: 13px;
    color: var(--ink3);
    line-height: 1.4;
  }
  .pl-cost {
    font-family: var(--mono);
    font-size: 11px;
    padding-top: 18px;
    text-align: right;
    line-height: 1.4;
  }

  /* Stage color themes */
  .s-gray   { background: var(--paper3); border-color: var(--rule); }
  .s-gray .pl-stage-name { color: var(--ink3); }
  .s-red    { background: #fdf0ed; border-color: #f0b8ac; }
  .s-red .pl-stage-name { color: #a53318; }
  .s-red .pl-dot { border-color: #c84b2f; background: #fdf0ed; }
  .s-orange { background: #fdf3e8; border-color: #f0cc96; }
  .s-orange .pl-stage-name { color: #8a5a12; }
  .s-orange .pl-dot { border-color: #c47d1a; background: #fdf3e8; }
  .s-amber  { background: #fdf8e8; border-color: #e8d888; }
  .s-amber .pl-stage-name { color: #7a6010; }
  .s-amber .pl-dot { border-color: #b89020; background: #fdf8e8; }
  .s-purple { background: #f2f0fc; border-color: #c4bef0; }
  .s-purple .pl-stage-name { color: #3d358a; }
  .s-purple .pl-dot { border-color: #534AB7; background: #f2f0fc; }
  .s-pink   { background: #fceef4; border-color: #e8b8cc; }
  .s-pink .pl-stage-name { color: #7a2048; }
  .s-pink .pl-dot { border-color: #c04470; background: #fceef4; }
  .s-teal   { background: #ebf7f2; border-color: #9ed8be; }
  .s-teal .pl-stage-name { color: #0a5a3e; }
  .s-teal .pl-dot { border-color: #1D9E75; background: #ebf7f2; }
  .s-blue   { background: #eaf3fc; border-color: #9ec8f0; }
  .s-blue .pl-stage-name { color: #0c3d70; }
  .s-blue .pl-dot { border-color: #378ADD; background: #eaf3fc; }
  .s-green  { background: #eef6e4; border-color: #b0d880; }
  .s-green .pl-stage-name { color: #2a5808; }
  .s-green .pl-dot { border-color: #639922; background: #eef6e4; }

  .cost-zero   { color: var(--ink3); }
  .cost-low    { color: #8a7010; }
  .cost-medium { color: #7030a0; }
  .cost-high   { color: var(--accent); }

  .pl-exit {
    position: absolute;
    right: -90px;
    top: 50%;
    transform: translateY(-50%);
    font-family: var(--mono);
    font-size: 10px;
    color: var(--accent);
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }
  .pl-exit::before {
    content: '→';
    font-size: 12px;
  }

  /* ── Principle box ── */
  .principle {
    background: var(--accent2);
    color: #e8f0f8;
    border-radius: 10px;
    padding: 28px 32px;
    margin: 40px 0;
    font-size: 15px;
    line-height: 1.7;
  }
  .principle-title {
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #7aabdc;
    margin-bottom: 14px;
  }
  .principle ul { padding-left: 20px; }
  .principle li { margin-bottom: 8px; }
  .principle strong { color: #fff; }

  /* ── Code blocks — override site's pre/code styles ── */
  .wrap pre {
    background: #16181c;
    border-radius: 10px;
    padding: 28px 32px;
    overflow-x: auto;
    margin: 28px 0;
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.7;
    border-top: none;
    border-bottom: none;
  }
  .wrap code {
    font-family: var(--mono);
    font-size: 13px;
    background: none;
    padding: 0;
    margin: 0;
  }
  .wrap pre code { color: #c8d0d8; }
  .tok-kw  { color: #79b8ff; }
  .tok-str { color: #9ecbff; }
  .tok-cm  { color: #6a737d; font-style: italic; }
  .tok-fn  { color: #b392f0; }
  .tok-cl  { color: #85e89d; }
  .tok-num { color: #f8c555; }
  .tok-pn  { color: #c8d0d8; }

  /* ── Stage breakdown cards ── */
  .stage-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 32px 0;
  }
  .stage-card {
    border-radius: 10px;
    padding: 22px;
    border: 1px solid var(--rule);
    background: white;
  }
  .sc-num {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink3);
    margin-bottom: 6px;
  }
  .sc-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
    margin-bottom: 8px;
    line-height: 1.3;
  }
  .sc-body {
    font-size: 13px;
    color: var(--ink3);
    line-height: 1.6;
    margin: 0;
  }
  .sc-tag {
    display: inline-block;
    margin-top: 10px;
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: .08em;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .tag-free    { background: #eef6e4; color: #2a5808; }
  .tag-low     { background: #fdf8e8; color: #7a6010; }
  .tag-medium  { background: #f2f0fc; color: #3d358a; }
  .tag-high    { background: #fdf0ed; color: #a53318; }

  /* ── Context rules box ── */
  .ctx-box {
    border: 1px solid var(--rule);
    border-radius: 10px;
    padding: 28px 32px;
    margin: 40px 0;
    background: white;
  }
  .ctx-box-title {
    font-family: var(--serif);
    font-size: 20px;
    margin-bottom: 18px;
  }
  .ctx-rule {
    display: flex;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid var(--paper3);
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink2);
  }
  .ctx-rule:last-child { border-bottom: none; }
  .ctx-rule-num {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--accent);
    font-weight: 500;
    flex-shrink: 0;
    padding-top: 2px;
    width: 20px;
  }

  /* ── CTA ── */
  .cta {
    margin-top: 72px;
    padding-top: 40px;
    border-top: 1px solid var(--rule);
    text-align: center;
  }
  .cta p {
    font-family: var(--serif);
    font-size: 22px;
    color: var(--ink);
    margin-bottom: 12px;
    line-height: 1.4;
  }
  .cta-sub {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink3);
    letter-spacing: .06em;
  }

  .wrap hr.section { border: none; border-top: 1px solid var(--rule); margin: 56px 0; height: 0; }
</style>

<div class="wrap">

  <div class="header-label">Deep breakdown · AI Systems Engineering</div>

  <h1>The AI pipeline is not<br><em>optional</em></h1>
  <p class="subtitle">Most AI systems don't fail because of a bad model. They fail because there's no structure around it. Here's how to build one that holds in production.</p>

  <div class="byline">
    <strong>AI Systems Engineer</strong>
    <span class="dot">·</span>
    <span>7 min read</span>
    <span class="dot">·</span>
    <span>Framework agnostic · LLM agnostic</span>
  </div>

  <p>I've seen production systems where the model was excellent — GPT-4, Claude, Gemini — and the surrounding code was a mess of hardcoded prompts, zero validation, and no separation of concerns. The model couldn't save them.</p>

  <p>The fix is never a better model. It's a better pipeline.</p>

  <div class="pullquote">
    Block early. Spend late. The LLM is the most expensive call in the chain — it should be the last thing that runs.
  </div>

  <h2>What is a pipeline, exactly?</h2>

  <p>A pipeline is the ordered sequence of processing stages your system runs through <strong>before and after</strong> the LLM call. Every input passes through it. Every output exits through it.</p>

  <p>Think of it as the connective tissue between user intent and model response. The model does one thing well. The pipeline handles everything the model shouldn't have to handle: input sanity, security, context assembly, cost routing, output safety.</p>

  <p>Two flavors exist:</p>

  <p><strong>Workflow pipelines</strong> run linearly — stage 1 → 2 → 3 → LLM → done. Predictable, debuggable, easy to test. Right for 80% of production use cases.</p>

  <p><strong>Agent pipelines</strong> let the LLM decide the enrichment order. More flexible, higher cost, harder to reason about. Use only when the task genuinely requires dynamic orchestration.</p>

  <div class="pipeline-wrap">
    <div class="pipeline-label">Pipeline architecture · 9 stages</div>
    <div class="pipeline">

      <div class="pl-row">
        <div class="pl-connector"><div class="pl-dot" style="border-color:#888;background:var(--paper3)"></div><div class="pl-line"></div></div>
        <div class="pl-stage s-gray"><div class="pl-stage-name">User input</div><div class="pl-stage-desc">Raw text enters the pipeline</div></div>
        <div class="pl-cost cost-zero">—</div>
      </div>

      <div class="pl-row">
        <div class="pl-connector"><div class="pl-dot s-gray"></div><div class="pl-line"></div></div>
        <div class="pl-stage s-gray" style="position:relative">
          <div class="pl-stage-name">Stage 1 — Rate limiting</div>
          <div class="pl-stage-desc">Token bucket · per-user quotas · burst protection</div>
          <div class="pl-exit">429</div>
        </div>
        <div class="pl-cost cost-zero">~0</div>
      </div>

      <div class="pl-row">
        <div class="pl-connector"><div class="pl-dot s-red"></div><div class="pl-line"></div></div>
        <div class="pl-stage s-red" style="position:relative">
          <div class="pl-stage-name">Stage 2 — Validation</div>
          <div class="pl-stage-desc">Regex · length · type checks · null bytes · format</div>
          <div class="pl-exit">reject</div>
        </div>
        <div class="pl-cost cost-zero">~0</div>
      </div>

      <div class="pl-row">
        <div class="pl-connector"><div class="pl-dot s-orange"></div><div class="pl-line"></div></div>
        <div class="pl-stage s-orange" style="position:relative">
          <div class="pl-stage-name">Stage 3 — Security</div>
          <div class="pl-stage-desc">Injection patterns · jailbreak detection · policy check</div>
          <div class="pl-exit">block</div>
        </div>
        <div class="pl-cost cost-zero">low</div>
      </div>

      <div class="pl-row">
        <div class="pl-connector"><div class="pl-dot s-amber"></div><div class="pl-line"></div></div>
        <div class="pl-stage s-amber">
          <div class="pl-stage-name">Stage 4 — Query shaping</div>
          <div class="pl-stage-desc">Intent detection · expansion · language normalization</div>
        </div>
        <div class="pl-cost cost-low">low</div>
      </div>

      <div class="pl-row">
        <div class="pl-connector"><div class="pl-dot s-purple"></div><div class="pl-line"></div></div>
        <div class="pl-stage s-purple">
          <div class="pl-stage-name">Stage 5 — Intelligence layer</div>
          <div class="pl-stage-desc">RAG retrieval · tool selection · user personalization</div>
        </div>
        <div class="pl-cost cost-medium">medium</div>
      </div>

      <div class="pl-row">
        <div class="pl-connector"><div class="pl-dot s-pink"></div><div class="pl-line"></div></div>
        <div class="pl-stage s-pink">
          <div class="pl-stage-name">Stage 6 — Context hydration</div>
          <div class="pl-stage-desc">Chat history · memory compaction · token budget</div>
        </div>
        <div class="pl-cost cost-medium">medium</div>
      </div>

      <div class="pl-row">
        <div class="pl-connector"><div class="pl-dot s-teal"></div><div class="pl-line"></div></div>
        <div class="pl-stage s-teal">
          <div class="pl-stage-name">Stage 7 — Preparation layer</div>
          <div class="pl-stage-desc">Prompt assembly · model routing · reasoning strategy</div>
        </div>
        <div class="pl-cost cost-medium">medium</div>
      </div>

      <div class="pl-row">
        <div class="pl-connector"><div class="pl-dot s-blue"></div><div class="pl-line"></div></div>
        <div class="pl-stage s-blue">
          <div class="pl-stage-name">Stage 8 — Execution layer</div>
          <div class="pl-stage-desc">LLM call · streaming · output security scan</div>
        </div>
        <div class="pl-cost cost-high">high</div>
      </div>

      <div class="pl-row">
        <div class="pl-connector"><div class="pl-dot s-green"></div><div class="pl-line"></div></div>
        <div class="pl-stage s-green">
          <div class="pl-stage-name">Stage 9 — Output formatting</div>
          <div class="pl-stage-desc">Parse · PII redaction · response contract shaping</div>
        </div>
        <div class="pl-cost cost-low">low</div>
      </div>

      <div class="pl-row">
        <div class="pl-connector"><div class="pl-dot" style="border-color:#888;background:var(--paper3)"></div><div class="pl-line"></div></div>
        <div class="pl-stage s-gray"><div class="pl-stage-name">Response</div><div class="pl-stage-desc">Delivered to client</div></div>
        <div class="pl-cost">—</div>
      </div>

    </div>
  </div>

  <h2>The design principles</h2>

  <div class="principle">
    <div class="principle-title">Core rules</div>
    <ul>
      <li><strong>Block early, spend late.</strong> Cheap checks go first. The LLM call is the most expensive operation — it only runs after everything else has cleared.</li>
      <li><strong>Fail fast.</strong> A blocked context stops the pipeline immediately. No downstream stage runs on a blocked request.</li>
      <li><strong>Single responsibility.</strong> Each stage does one thing. Validation doesn't touch security. Security doesn't touch RAG.</li>
      <li><strong>Configurable.</strong> Any stage can be disabled for testing or bypassed by environment flag. New stages can be inserted without touching existing ones.</li>
      <li><strong>Observable.</strong> The context is serializable. Every stage snapshots it. Every failure has a named reason.</li>
    </ul>
  </div>

  <h2>The context object</h2>

  <p>Every stage communicates through a shared context object. The rules are simple: each stage reads what previous stages added and appends its own data. Nothing is deleted. The context only grows.</p>

  <p>This makes the pipeline fully auditable — you can inspect exactly what each stage contributed. And because it's serializable, you can snapshot it after every stage for debugging, crash recovery, and observability.</p>

<pre><code><span class="tok-kw">from</span> dataclasses <span class="tok-kw">import</span> dataclass, field
<span class="tok-kw">from</span> typing <span class="tok-kw">import</span> Any
<span class="tok-kw">import</span> json

<span class="tok-kw">@dataclass</span>
<span class="tok-cl">class</span> <span class="tok-fn">PipelineContext</span>:
    <span class="tok-str">"""
    Shared state passed through every stage.
    Each stage reads previous enrichments and adds its own.
    Never deletes. Always serializable.
    """</span>
    raw_input: str
    user_id: str
    stages_passed: list[str] = field(default_factory=list)
    enrichments: dict[str, Any] = field(default_factory=dict)
    final_prompt: str | <span class="tok-kw">None</span> = <span class="tok-kw">None</span>
    response: str | <span class="tok-kw">None</span> = <span class="tok-kw">None</span>
    blocked: bool = <span class="tok-kw">False</span>
    block_reason: str | <span class="tok-kw">None</span> = <span class="tok-kw">None</span>

    <span class="tok-kw">def</span> <span class="tok-fn">add</span>(self, key: str, value: Any):
        self.enrichments[key] = value
        self.stages_passed.append(key)

    <span class="tok-kw">def</span> <span class="tok-fn">block</span>(self, reason: str):
        self.blocked = <span class="tok-kw">True</span>
        self.block_reason = reason

    <span class="tok-kw">def</span> <span class="tok-fn">serialize</span>(self) -> str:
        <span class="tok-cm"># Snapshot at any stage — for logging, retries, crash recovery</span>
        <span class="tok-kw">return</span> json.dumps(self.__dict__, default=str)
</code></pre>

  <h2>Stage by stage</h2>

  <div class="stage-grid">
    <div class="stage-card">
      <div class="sc-num">Stage 1</div>
      <div class="sc-title">Rate limiting</div>
      <p class="sc-body">Token bucket or sliding window per user. Catches burst abuse before any parsing happens. This is the absolute cheapest gate — a single counter lookup.</p>
      <span class="sc-tag tag-free">~free</span>
    </div>
    <div class="stage-card">
      <div class="sc-num">Stage 2</div>
      <div class="sc-title">Validation</div>
      <p class="sc-body">Regex, length checks, null bytes, encoding checks. No ML. Rejects garbage before it wastes a single downstream cycle. Saves more cost than any other stage.</p>
      <span class="sc-tag tag-free">~free</span>
    </div>
    <div class="stage-card">
      <div class="sc-num">Stage 3</div>
      <div class="sc-title">Security</div>
      <p class="sc-body">Compiled regex for known injection patterns. Optional embedding-based classifier for borderline cases. Goal: raise the cost of attack, not achieve perfection.</p>
      <span class="sc-tag tag-low">low cost</span>
    </div>
    <div class="stage-card">
      <div class="sc-num">Stage 4</div>
      <div class="sc-title">Query shaping</div>
      <p class="sc-body">Classify intent, expand sparse queries, normalize language. Users write "fix my code" — your system needs to know it's a debugging task in Python before retrieval.</p>
      <span class="sc-tag tag-low">low cost</span>
    </div>
    <div class="stage-card">
      <div class="sc-num">Stage 5</div>
      <div class="sc-title">Intelligence layer</div>
      <p class="sc-body">RAG retrieval, tool manifest selection, user profile loading. Filter retrieved chunks by relevance score — don't dump noise into the context window.</p>
      <span class="sc-tag tag-medium">medium cost</span>
    </div>
    <div class="stage-card">
      <div class="sc-num">Stage 6</div>
      <div class="sc-title">Context hydration</div>
      <p class="sc-body">Load chat history. Apply sliding window, summarization, or compaction to stay within the token budget. This is separate from preparation — data loading vs. decision making.</p>
      <span class="sc-tag tag-medium">medium cost</span>
    </div>
    <div class="stage-card">
      <div class="sc-num">Stage 7</div>
      <div class="sc-title">Preparation layer</div>
      <p class="sc-body">Assemble the final prompt from all enrichments. Route to the right model — simple tasks go to fast models. Decide whether the task needs extended thinking.</p>
      <span class="sc-tag tag-medium">medium cost</span>
    </div>
    <div class="stage-card">
      <div class="sc-num">Stage 8</div>
      <div class="sc-title">Execution layer</div>
      <p class="sc-body">The LLM call. Finally. Streaming, tool use, reasoning — all here. Also includes output security: scan for policy violations before the response leaves this stage.</p>
      <span class="sc-tag tag-high">high cost</span>
    </div>
  </div>

  <p>Stage 9 — <strong>output formatting</strong> — deserves its own note. PII redaction, response contract enforcement (JSON schema, markdown stripping for voice channels, truncation for UI constraints) are genuinely distinct from generation. Keeping them as a separate, swappable stage means you can change output format per channel without touching the execution layer.</p>

  <h2>Wiring it together</h2>

  <p>The pipeline runner is intentionally minimal. It loops through stages, skips disabled ones, stops on a blocked context, and snapshots after each stage.</p>

<pre><code><span class="tok-cl">class</span> <span class="tok-fn">AIPipeline</span>:
    <span class="tok-kw">def</span> <span class="tok-fn">__init__</span>(self, stages: list, enabled: set[str] | <span class="tok-kw">None</span> = <span class="tok-kw">None</span>):
        self.stages = stages
        self.enabled = enabled  <span class="tok-cm"># None = all stages active</span>

    <span class="tok-kw">def</span> <span class="tok-fn">run</span>(self, raw_input: str, user_id: str) -> <span class="tok-fn">PipelineContext</span>:
        ctx = <span class="tok-fn">PipelineContext</span>(raw_input=raw_input, user_id=user_id)

        <span class="tok-kw">for</span> stage <span class="tok-kw">in</span> self.stages:
            name = stage.<span class="tok-fn">__class__</span>.__name__

            <span class="tok-kw">if</span> self.enabled <span class="tok-kw">and</span> name <span class="tok-kw">not in</span> self.enabled:
                <span class="tok-kw">continue</span>  <span class="tok-cm"># configurable: skip disabled stages</span>

            <span class="tok-kw">if</span> ctx.blocked:
                <span class="tok-kw">break</span>     <span class="tok-cm"># fail fast: don't process blocked context</span>

            ctx = stage.<span class="tok-fn">run</span>(ctx)
            self.<span class="tok-fn">_snapshot</span>(ctx, stage_name=name)  <span class="tok-cm"># observe every step</span>

        <span class="tok-kw">return</span> ctx

<span class="tok-cm"># Usage — framework and LLM agnostic</span>
pipeline = <span class="tok-fn">AIPipeline</span>(stages=[
    <span class="tok-fn">RateLimitStage</span>(limit=<span class="tok-num">100</span>, window_seconds=<span class="tok-num">60</span>),
    <span class="tok-fn">ValidationStage</span>(<span class="tok-fn">ValidationConfig</span>(max_length=<span class="tok-num">2000</span>)),
    <span class="tok-fn">SecurityStage</span>(),
    <span class="tok-fn">QueryShapingStage</span>(),
    <span class="tok-fn">IntelligenceStage</span>(vector_store=vs, user_store=us),
    <span class="tok-fn">ContextHydrationStage</span>(history_store=hs, max_tokens=<span class="tok-num">2000</span>),
    <span class="tok-fn">PreparationStage</span>(system_prompt=SYSTEM_PROMPT),
    <span class="tok-fn">ExecutionStage</span>(llm_client=llm),
    <span class="tok-fn">OutputFormattingStage</span>(),
])

result = pipeline.<span class="tok-fn">run</span>(raw_input=<span class="tok-str">"How do I fix this?"</span>, user_id=<span class="tok-str">"user_42"</span>)

<span class="tok-kw">if</span> result.blocked:
    <span class="tok-fn">print</span>(<span class="tok-str">f"Blocked: {result.block_reason}"</span>)
<span class="tok-kw">else</span>:
    <span class="tok-fn">print</span>(result.response)
</code></pre>

  <h2>Context rules</h2>

  <div class="ctx-box">
    <div class="ctx-box-title">How stages communicate</div>

    <div class="ctx-rule">
      <div class="ctx-rule-num">01</div>
      <div>Each stage sees everything the previous stages added — but <strong>never removes it</strong>. The context is append-only. This makes the pipeline fully auditable without any tracing overhead.</div>
    </div>
    <div class="ctx-rule">
      <div class="ctx-rule-num">02</div>
      <div>The context must be <strong>fully serializable</strong> at all times. Crashes, timeouts, and retries are production facts. Serializable state means you can resume, replay, and debug without loss.</div>
    </div>
    <div class="ctx-rule">
      <div class="ctx-rule-num">03</div>
      <div><strong>Snapshot after every stage.</strong> The single best observability investment you can make. When something goes wrong, you want to know what the context looked like when it entered each stage — not just the final output.</div>
    </div>
    <div class="ctx-rule">
      <div class="ctx-rule-num">04</div>
      <div>Every blocked request carries a <strong>named reason</strong>. Not a boolean flag. Not an HTTP status code. A human-readable string that tells you exactly which stage rejected the request and why.</div>
    </div>
  </div>

  <h2>What model routing actually saves you</h2>

  <p>Most teams default their strongest model for every request. That's expensive and unnecessary. A simple clarification question doesn't need the same model as a multi-step debugging task.</p>

  <p>A primitive routing rule in the preparation layer — based on intent classification and query complexity from earlier stages — can reduce LLM costs by 40–60% with no quality regression on the requests that matter. The data to make that decision is already in the context by stage 7. You just have to use it.</p>

  <hr class="section">

  <p>Most AI reliability problems are pipeline problems. The model is the last mile. Everything before it determines whether that last mile goes well.</p>

  <p>Build the pipeline first. Then worry about the model.</p>

  <div class="cta">
    <p>Building something like this?<br>Hit a pattern that worked better?</p>
    <div class="cta-sub">Drop a comment · ♻ Repost if this saves someone a refactor</div>
  </div>

</div>
