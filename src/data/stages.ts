// Long-form copy for the ten stage panels of the architecture figure.
//
// It lives here rather than in AiStack.astro because it is prose, and the
// component is drawing code: the figure itself stays readable, and the copy can
// be edited without touching a single column of the ASCII.
//
// The voice is first person on purpose. These are the ten stages of the system
// I actually run, and a modal that describes them in the abstract reads like a
// tutorial. Every bullet is a [label, text] pair so the label can be set in
// bold as a run-in head instead of a sentence that ends in a colon. The `art`
// blocks are arrays of lines rather than template literals, so no editor can
// reindent a diagram or trim the spaces that hold a frame together.

export type Bullet = [string, string];

export interface StageCopy {
  /** One sentence: what this stage is and how I run it. */
  lede: string;
  /** The stage drawn on its own, shown above the prose. */
  art: string;
  /** What I have to get right here. */
  key: Bullet[];
  /** What I do differently because of what broke. */
  tips: Bullet[];
  /** Numbered, because these are ordered by how expensive they are. */
  pitfalls: Bullet[];
  /** Unchecked on purpose: this is a list to work through, not a claim. */
  check: string[];
}

export const STAGE_COPY = {
  backend: {
    lede: 'My backend is a single async service, and every stage below is a module it loads.',
    art: [
      '       [ Client Request ]',
      '               │',
      '               ▼',
      '   ┌───────────────────────┐',
      '   │ FastAPI Async Router  │',
      '   └───────────┬───────────┘',
      '               │',
      '               ▼',
      '   ┌───────────────────────┐',
      '   │ Pydantic Validation   │ ──(Invalid)──► [ 422 Unprocessable Entity ]',
      '   └───────────┬───────────┘',
      '               │ (Valid)',
      '               ▼',
      '   ┌───────────────────────┐',
      '   │ Async IO Task Group   │ ──► Parallel Execution (LLM / DB / Webhooks)',
      '   └───────────────────────┘',
    ].join('\n'),
    key: [
      ['Async all the way', 'I keep blocking calls off the event loop and push CPU work to a thread or a queue.'],
      ['Types at the edge', 'I let Pydantic validate in and out, so a bad payload fails before it reaches a stage.'],
      ['One error path', 'I use custom exceptions and FastAPI handlers instead of try/except in every route.'],
    ],
    tips: [
      ['I offload CPU work', '`asyncio.to_thread`, or Celery and ARQ for parsing and vector maths.'],
      ['I stream the answer', 'SSE keeps time-to-first-token low, so a long tool call reads as progress rather than a freeze.'],
      ['I configure once', '`pydantic-settings` loads `.env` and validates types at container start.'],
    ],
    pitfalls: [
      ['Sync drivers in async code', '`psycopg2` and `requests` block the whole thread; I use `asyncpg` and `httpx`.'],
      ['Unwatched `asyncio.gather`', 'One failed task leaves the rest running as orphans, so I use `asyncio.TaskGroup`.'],
    ],
    check: [
      'Every network client is an `httpx.AsyncClient`.',
      'Global handlers for `HTTPException` and for internal 500s.',
      '`pytest-asyncio` fixtures with one database session per test.',
    ],
  },

  llm: {
    lede: 'I only accept a model response I can validate; text I cannot parse is a bug, not an answer.',
    art: [
      '+-----------------------------------------------------------------------------------+',
      '| LLM INVOCATION PIPELINE                                                           |',
      '|                                                                                   |',
      '|  +------------------+     JSON Schema     +-------------------+                   |',
      '|  | Pydantic Model   | ------------------> | Tool Definition   |                   |',
      '|  +------------------+                     +---------+---------+                   |',
      '|                                                     |                             |',
      '|                                                     v                             |',
      '|  +------------------+     LLM Call        +-------------------+                   |',
      '|  | OpenAI / Gemini  | <------------------ | System Prompt     |                   |',
      '|  +--------+---------+                     +-------------------+                   |',
      '|           |                                                                       |',
      '|           v                                                                       |',
      '|  +------------------+     Validation      +-------------------+                   |',
      '|  | Structured Output| ------------------> | Tool Execution    | ──► [ Result ]    |',
      '|  +------------------+                     +-------------------+                   |',
      '+-----------------------------------------------------------------------------------+',
    ].join('\n'),
    key: [
      ['Structured output', 'Every schema comes from a Pydantic model, never from hand-written JSON.'],
      ['Pruned context', 'I count tokens and trim the history, keeping the system prompt and the last message.'],
      ['Cost on the meter', 'Prompt and completion tokens are counted per call and the spend is tracked as it happens.'],
    ],
    tips: [
      ['`strict=True` on every tool', 'The model then cannot emit arguments outside the schema.'],
      ['I tag untrusted data', 'User input and RAG context go inside `<user_context>` and `<documents>`.'],
      ['I fail over on 5xx', 'OpenAI hands over to Claude or Gemini instead of surfacing the outage.'],
    ],
    pitfalls: [
      ['Trusting argument types', 'I run tool arguments through Pydantic before the call, because the model returns `"123"` where I expected `123`.'],
      ['History that only grows', 'Untrimmed context eventually overruns the window, and the bill with it.'],
    ],
    check: [
      'Every tool schema generated from a Pydantic model.',
      'Rate-limit handling with exponential backoff.',
      'Token usage logged per request.',
    ],
  },

  agents: {
    lede: 'My agent is a state graph, not a loop that I hope terminates.',
    art: [
      '         ┌───────────────┐',
      '         │  START NODE   │',
      '         └───────┬───────┘',
      '                 │',
      '                 ▼',
      '         ┌───────────────┐',
      '         │  Agent Node   │ ◄──────────────────┐',
      '         └───────┬───────┘                    │',
      '                 │                            │',
      '                 ▼                            │',
      '      /─────────────────────\\                 │',
      '     /  Conditional Edge     \\                │',
      '    <   Tool Call Needed?     >               │',
      '     \\                       /                │',
      '      \\─────────────────────/                 │',
      '        │ YES           │ NO                  │',
      '        │               └──────────┐          │',
      '        ▼                          ▼          │',
      '┌───────────────┐          ┌───────────────┐  │',
      '│ Human Approval│          │   Tool Node   │ ─┘',
      '│  (Interrupt)  │          └───────────────┘',
      '└───────┬───────┘',
      '        │ (Approved)',
      '        ▼',
      '┌───────────────┐',
      '│   END NODE    │',
      '└───────────────┘',
    ].join('\n'),
    key: [
      ['State is the source of truth', 'Reducers update it, and no node mutates it in place.'],
      ['Routing is code', 'Pure functions pick the next node from the state, not from what the model says it intends.'],
      ['I checkpoint every step', 'Each transition is persisted, so a run resumes instead of starting over.'],
    ],
    tips: [
      ['I use subgraphs for planning', 'Router → fetch subgraph → synthesis, instead of free-form wandering.'],
      ['I interrupt before I act', '`interrupt_before` on money moves and on outbound email.'],
      ['I cap the recursion', '`recursion_limit=10..20` stops a confused agent from burning the budget in a loop.'],
    ],
    pitfalls: [
      ['Mutating state in place', '`state[\'key\'] = val` desynchronises checkpointing and misbehaves under async.'],
      ['Unknown tool, no `KeyError`', 'An invalid tool routes the graph to a self-correction node instead of crashing it.'],
    ],
    check: [
      'A max-steps fuse on every loop.',
      'Graph state persisted, e.g. with `PostgresSaver`.',
      'Human approval on the dangerous actions.',
    ],
  },

  api: {
    lede: 'This is where my agent touches systems that charge money and send mail, so the rules here are defensive.',
    art: [
      '[ Agent Tool Call ]',
      '       │',
      '       ▼',
      '┌──────────────────────────────────────┐',
      '│  OAuth 2.0 Auth & Token Refresh      │',
      '└──────────────────┬───────────────────┘',
      '                   │',
      '                   ▼',
      '┌──────────────────────────────────────┐',
      '│  Idempotency Key Generation (UUID)   │',
      '└──────────────────┬───────────────────┘',
      '                   │',
      '                   ▼',
      '┌──────────────────────────────────────┐',
      '│  External API Request (Rest/Webhook) │',
      '└──────────────────┬───────────────────┘',
      '                   │',
      '         /───────────────────\\',
      '        /   Success (2xx)?    \\',
      '       <                       >',
      '        \\                     /',
      '         \\───────────────────/',
      '           │ YES           │ NO',
      '           │               └─────────────┐',
      '           ▼                             ▼',
      '┌──────────────────────┐     ┌──────────────────────┐',
      '│  Reconciliation Log  │     │  Dead Letter Queue   │',
      '└──────────────────────┘     └──────────────────────┘',
    ].join('\n'),
    key: [
      ['OAuth lifecycle', 'Tokens are encrypted, validated and refreshed in the background, not under pressure.'],
      ['Idempotency everywhere', 'Every POST, PATCH and DELETE carries an `Idempotency-Key`.'],
      ['Webhooks verified', 'The HMAC signature is checked before the body is even parsed.'],
    ],
    tips: [
      ['I write two phases', 'Record `PENDING`, make the call, then move it to `COMPLETED` only on success.'],
      ['I back off with jitter', 'Randomised delays stop my retries from hitting the provider as a herd.'],
      ['I reconcile on a schedule', 'Compare what I believe with what the system of record says and repair the difference.'],
    ],
    pitfalls: [
      ['Retrying without a key', 'A timeout may have landed already, so a blind retry duplicates the charge.'],
      ['Secrets in the database', 'API keys and refresh tokens are AES-256 (GCM) encrypted at the cell level.'],
    ],
    check: [
      'An `Idempotency-Key` on every mutating call.',
      'Inbound webhooks checked against the provider signature.',
      'A background job refreshing OAuth tokens before they expire.',
    ],
  },

  rag: {
    lede: 'Retrieval is a pipeline with permissions inside it, not a vector search with a prompt wrapped around it.',
    art: [
      '[ User Query ] ──► [ Metadata ACL Filter Injection ]',
      '                           │',
      '                           ▼',
      '     ┌───────────────────────────────────────────┐',
      '     │           HYBRID RETRIEVAL ENGINE         │',
      '     │  ┌───────────────────┐ ┌───────────────┐  │',
      '     │  │ Dense (Embeddings)│ │ Sparse (BM25) │  │',
      '     │  └─────────┬─────────┘ └───────┬───────┘  │',
      '     └────────────┼───────────────────┼──────────┘',
      '                  │                   │',
      '                  └─────────┬─────────┘',
      '                            │',
      '                            ▼',
      '             ┌─────────────────────────────┐',
      '             │ Reciprocal Rank Fusion (RRF)│',
      '             └──────────────┬──────────────┘',
      '                            │ (Top 50)',
      '                            ▼',
      '             ┌─────────────────────────────┐',
      '             │ Cross-Encoder Reranker      │',
      '             └──────────────┬──────────────┘',
      '                            │ (Top 5)',
      '                            ▼',
      '             ┌─────────────────────────────┐',
      '             │ Citation & Grounding Check  │',
      '             └─────────────────────────────┘',
    ].join('\n'),
    key: [
      ['Hybrid retrieval', 'BM25 holds the exact identifier, embeddings hold the paraphrase, and RRF fuses the two.'],
      ['The ACL lives in the metadata', 'Access lists sit on every chunk, so a filter cannot be forgotten on one code path.'],
      ['Rerank and ground', 'A cross-encoder orders the top, and every claim in the answer has to carry a source id.'],
    ],
    tips: [
      ['I filter before, not after', 'The ACL goes into the query; post-filtering burns the context window and can return nothing.'],
      ['Small chunks, big context', 'I index 200-token chunks and hand the model the 1000-token parent section.'],
      ['Citations the model has to earn', 'It cites `[Doc-12]`, and a post-validator checks the document really said it.'],
    ],
    pitfalls: [
      ['Vectors only', 'Exact part numbers, error codes and proper nouns need lexical search, and vectors lose them.'],
      ['Cross-tenant reads', 'Without index isolation, one user’s query returns another user’s documents.'],
    ],
    check: [
      'An `acl` field on every vector.',
      'A cross-encoder reranking stage.',
      'RRF merging the BM25 and dense result lists.',
    ],
  },

  reliability: {
    lede: 'Failures are a given; a run that dies on the first one is not.',
    art: [
      '                          [ Incoming Task ]',
      '                                  │',
      '                                  ▼',
      '                     /─────────────────────────\\',
      '                    /   Circuit Breaker Open?   \\',
      '                   <                             >',
      '                    \\                           /',
      '                     \\─────────────────────────/',
      '                       │ YES               │ NO',
      '                       │                   ▼',
      '                       │        ┌─────────────────────┐',
      '                       │        │ Primary LLM Call    │',
      '                       │        └──────────┬──────────┘',
      '                       │                   │',
      '                       │         /───────────────────\\',
      '                       │        /  Error / Timeout?   \\',
      '                       │       <                       >',
      '                       │        \\                     /',
      '                       │         \\───────────────────/',
      '                       │           │ YES           │ NO',
      '                       │           ▼               │',
      '                       │   ┌───────────────┐       │',
      '                       │   │ Exponential   │       │',
      '                       │   │ Retries (3x)  │       │',
      '                       │   └───────┬───────┘       │',
      '                       │           │ (Exhausted)   │',
      '                       ▼           ▼               │',
      '             ┌─────────────────────────────────┐   │',
      '             │   Fallback Model / Degradation  │   │',
      '             └─────────────────┬───────────────┘   │',
      '                               │                   │',
      '                               ▼                   ▼',
      '                     ┌─────────────────────────────────┐',
      '                     │          Final Output           │',
      '                     └─────────────────────────────────┘',
    ].join('\n'),
    key: [
      ['Circuit breaker', 'I open the circuit to a dead provider instead of rediscovering the outage on every run.'],
      ['Backoff with jitter', 'Retries grow slowly and not in lockstep.'],
      ['Graceful degradation', 'A partial answer beats a 500.'],
    ],
    tips: [
      ['Timeouts on every hop', 'Connect and read, and for LLMs a timeout on time-to-first-token.'],
      ['I cache semantically', 'Redis for deterministic repeats, a vector cache for near-identical questions.'],
      ['Saga for multi-step', 'Every step has a compensating action in case the last one fails.'],
    ],
    pitfalls: [
      ['Retrying a fatal error', 'A 401 or a 400 will never succeed; retrying only burns the budget.'],
      ['No isolation', 'One slow external API must not stall every worker I own.'],
    ],
    check: [
      'Timeouts wrapped around every external call.',
      'A fallback provider configured.',
      '`tenacity` or `pybreaker` driving the retries.',
    ],
  },

  security: {
    lede: 'The model proposes and my code decides; nothing runs that the backend has not authorised.',
    art: [
      '[ Untrusted User Input ]',
      '       │',
      '       ▼',
      '┌──────────────────────────────────────┐',
      '│  Guardrail Filter / Input Sanitizer  │',
      '└──────────────────┬───────────────────┘',
      '                   │',
      '                   ▼',
      '┌──────────────────────────────────────┐',
      '│  LLM Decision (Tool & Arguments)     │',
      '└──────────────────┬───────────────────┘',
      '                   │',
      '                   ▼',
      '┌──────────────────────────────────────┐',
      '│  DETERMINISTIC AUTHORIZATION LAYER   │',
      '│  • RBAC/ABAC Check                   │',
      '│  • Token Scope Validation            │ ──(Unauthorized)──► [ Access Denied Logs ]',
      '│  • Argument Boundaries Inspection    │',
      '└──────────────────┬───────────────────┘',
      '                   │ (Authorized)',
      '                   ▼',
      '┌──────────────────────────────────────┐',
      '│  Sandboxed Execution Environment     │',
      '└──────────────────────────────────────┘',
    ].join('\n'),
    key: [
      ['Authorisation in code', 'RBAC and token scope are checked in Python, and never asked of the model.'],
      ['Injection defence', 'User text and fetched pages are data, and my system prompt says so.'],
      ['Sandboxed tools', 'Generated code runs in gVisor, Docker sandboxes or WASM.'],
    ],
    tips: [
      ['Least privilege keys', 'Each tool gets a read-only or session-scoped credential and nothing wider.'],
      ['I clamp the arguments', '`min(limit, 50)`, so a single call cannot dump the database.'],
      ['Two guardrail layers', 'A fast local validator screens the request and the answer before either reaches the client.'],
    ],
    pitfalls: [
      ['Rights in the system prompt', '"Never share another department\'s data" is not a control; the model can be talked out of it.'],
      ['`eval()` on generated code', 'Run inside the backend process, that is full server compromise rather than a bug.'],
    ],
    check: [
      'RBAC checked before every external tool call.',
      'User data isolated in XML tags and stripped of special characters.',
      'Any dynamic code execution inside a sandbox.',
    ],
  },

  eval: {
    lede: 'Every prompt change is a measurement, and until it is one it is a guess.',
    art: [
      '                   ┌─────────────────────────────────────────┐',
      '                   │    Golden Dataset (Ground Truth Test)   │',
      '                   └────────────────────┬────────────────────┘',
      '                                        │',
      '                                        ▼',
      '                   ┌─────────────────────────────────────────┐',
      '                   │    Test Execution Pipeline (Promptfoo)  │',
      '                   └────────────────────┬────────────────────┘',
      '                                        │',
      '         ┌──────────────────────────────┼──────────────────────────────┐',
      '         ▼                              ▼                              ▼',
      '┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐',
      '│ Trajectory Eval │            │ Retrieval Eval  │            │ Answer Quality  │',
      '│ (Tool Selection │            │ (HitRate, MRR,  │            │ (Faithfulness,  │',
      '│  & Execution)   │            │  NDCG)          │            │  Correctness)   │',
      '└─────────────────┘            └─────────────────┘            └─────────────────┘',
    ].join('\n'),
    key: [
      ['Golden dataset', 'Question, expected tool call, context and ideal answer, all versioned.'],
      ['Trajectory tests', 'I assert the path and not just the answer, so a lucky run still fails.'],
      ['Automated metrics', 'Faithfulness, context precision and recall measured without a human in the loop.'],
    ],
    tips: [
      ['I evaluate in CI', '`promptfoo` or `pytest` on every pull request and every prompt change.'],
      ['The judge gets rubrics', 'Binary criteria, the reasoning first and the score second.'],
      ['I classify the failures', 'Retrieval, tool choice, hallucination and format, counted separately.'],
    ],
    pitfalls: [
      ['Vibe checking', 'A prompt edit without a golden-dataset run breaks the edge cases, and finds out in production.'],
      ['Similarity as truth', 'Cosine distance passes answers that are factually wrong.'],
    ],
    check: [
      'Fifty to a hundred versioned golden cases.',
      'CI checking the tool-call trajectory.',
      'Hit rate and context recall measured.',
    ],
  },

  sql: {
    lede: 'A conversation that vanishes when a process restarts is a bug, so state lives in Postgres and only the hot path lives in Redis.',
    art: [
      '                  ┌──────────────────────────────────────────┐',
      '                  │          PostgreSQL (Relational)         │',
      '                  │  • User Sessions & ACL                   │',
      '                  │  • Agent State Checkpoints               │',
      '                  │  • Transaction Logs & Audits             │',
      '                  └────────────────────┬─────────────────────┘',
      '                                       │',
      '         ┌─────────────────────────────┴─────────────────────────────┐',
      '         ▼                                                           ▼',
      '┌───────────────────────────────────┐               ┌───────────────────────────────────┐',
      '│     pgvector / Dedicated Vector   │               │       Redis (In-Memory)           │',
      '│  • Embeddings & HNSW Indexes      │               │  • Distributed Locks (Redlock)    │',
      '│  • Hybrid Search Engine           │               │  • Rate Limiting Counters         │',
      '└───────────────────────────────────┘               │  • Pub/Sub & Fast Caching         │',
      '                                                    └───────────────────────────────────┘',
    ].join('\n'),
    key: [
      ['Durable checkpoints', 'Graph snapshots written in ACID transactions, never left in memory.'],
      ['pgvector alongside Postgres', 'Records and their vectors in one store, with HNSW indexes.'],
      ['Distributed locks', 'Redis serialises the concurrent requests of one user.'],
    ],
    tips: [
      ['Transactional outbox', 'The state and the outbound event go in one transaction, and a worker delivers it.'],
      ['Proper HNSW settings', '`m=16`, `ef_construction=64`, and the right operator class for the distance.'],
      ['Partitioned history', 'Old messages archived by date keep the live conversation tables small.'],
    ],
    pitfalls: [
      ['Redis as the only store', 'Restart it and every long conversation is gone.'],
      ['Lost updates', 'Two quick messages read the same state and overwrite each other’s work.'],
    ],
    check: [
      'A checkpoint schema in PostgreSQL.',
      'HNSW indexes on the vector columns.',
      'Alembic managing the migrations.',
    ],
  },

  obs: {
    lede: 'When a run goes wrong I need to know which request, which node and which call produced it.',
    art: [
      '[ User Request ] ── (Trace ID: a1b2c3d4) ───────────────────────────────────────────────────────┐',
      '                                                                                                │',
      '  ├── [ FastAPI Middleware ] ──────────────────────── (Span 1: Auth & Validation)               │',
      '  │                                                                                             │',
      '  ├── [ LangGraph Orchestrator ] ──────────────────── (Span 2: State Machine Execution)         │',
      '  │     │                                                                                       │',
      '  │     ├── [ RAG Retriever ] ─────────────────────── (Span 3: Hybrid Search & BM25)            │',
      '  │     │                                                                                       │',
      '  │     ├── [ OpenAI Call ] ───────────────────────── (Span 4: LLM Generation, Tokens: 450)     │',
      '  │     │                                                                                       │',
      '  │     └── [ External Tool Call ] ────────────────── (Span 5: POST https://api.crm.com)        │',
      '  │                                                                                             │',
      '  └── [ Response Delivered ] ───────────────────────────────────────────────────────────────────┘',
    ].join('\n'),
    key: [
      ['Distributed tracing', 'A trace id travels the whole stack, so a long chain can be reconstructed exactly.'],
      ['LLM metrics', 'TTFT, token usage, cost per request, and the p95 and p99 of the model itself.'],
      ['Structured logs', 'JSON carrying the trace id, the user, the tenant and the node.'],
    ],
    tips: [
      ['One OpenTelemetry collector', 'Traces go out to Langfuse, Arize Phoenix, Datadog or Jaeger.'],
      ['I log the payloads, and redact', 'A sanitizer middleware strips personal data and tokens before they are stored.'],
      ['Alerts on anomalies', 'A spike in token spend or a tool error rate over 2% reaches me immediately.'],
    ],
    pitfalls: [
      ['No link back to the request', 'Without it every incident is a guess about what triggered it.'],
      ['Logging everything', 'No rotation and no sampling fills the disk and then the invoice.'],
    ],
    check: [
      'One OTel collector across the whole stack.',
      'TTFT, token cost and tool error rate charted.',
      'PII masked in both traces and logs.',
    ],
  },
} satisfies Record<string, StageCopy>;
