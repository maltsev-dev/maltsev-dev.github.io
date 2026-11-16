/**
 * Every panel on /projects/ comes from here, in one list.
 *
 * Two kinds live side by side: the three deep cases, whose own pages have
 * been folded into the listing's dialog, and the milestones — shipped work
 * recorded from the project history, most of which has a post that covers
 * it.
 *
 * `period` is the human range as written on the source entry, not a computed
 * date span. `href` is only set when there is somewhere to go — the post that
 * documents the milestone, or the product it became — and the listing opens
 * it from inside the panel's dialog rather than from the panel itself.
 *
 * Two texts, two jobs. `summary` is the line the listing shows under the
 * name: one line, never two, because twelve panels are read side by side and
 * a paragraph in one of them stops the scan. `detail` is what the dialog
 * opens with: fifty to a hundred words, which is what it takes to say what
 * the system was and what it moved.
 */
export interface Milestone {
  /** Stable id, used as the key and readable in the DOM. */
  slug: string;
  title: string;
  /**
   * The period the work ran in, as the source entry writes it: `Current`,
   * `Mar 2026`, `Jul 2025 — Nov 2025`. The listing shortens it to a column.
   */
  period: string;
  /**
   * The one line under the name. Short enough to stay on one line at the
   * width of the listing column: what the thing is, in one clause.
   */
  summary: string;
  /**
   * What the dialog opens with. Fifty to a hundred words — what it was,
   * how it was put together, and the one number that makes it interesting.
   */
  detail: string;
  tags: string[];
  /** Where the work is documented, when it is documented anywhere. */
  href?: string;
}

export const MILESTONES: Milestone[] = [
  {
    slug: 'nullrun',
    title: 'NullRun',
    period: 'Current',
    summary: 'Authorization runtime for agents: gated calls, approvals, budgets.',
    detail:
      'A runtime authorization layer for agents: tool execution, approvals, budgets and policy in one place. Every call is gated before it runs, every grant is recorded, and every budget is enforced rather than assumed. Permissions are scoped to the credential the agent holds, approvals are treated as security state rather than session state, and the audit trail says what was allowed and why. The writing on this site is the reasoning behind it; the runtime is the product.',
    tags: ['Agent runtime', 'Authorization', 'Policy'],
    href: 'https://nullrun.io',
  },
  {
    slug: 'ai-social-media-agent',
    title: 'Social Media Agent: 7-Platform Publishing with Human Review',
    period: 'Mar 2026',
    summary: 'LangGraph pipeline publishing across seven networks, with human approval.',
    detail:
      'A LangGraph pipeline that generates content variants with DALL-E media across seven social networks, and holds each one for human approval before it schedules and publishes. The approval step is the point: the pipeline drafts, the person signs off, and only then does the post go out. The target was 75% less production time and 3x posting frequency. Python, LangGraph, Celery, and a React dashboard where the queue of drafts waits.',
    tags: ['Python', 'LangGraph', 'Celery', 'React'],
  },
  {
    slug: 'permission-aware-rag',
    title: 'Internal Knowledge: Permission-aware RAG',
    period: 'Mar 2026',
    summary: 'Hybrid retrieval with reranking, refusing to answer without sources.',
    detail:
      'A 13-stage hybrid retrieval pipeline over an internal knowledge base: dense vectors and BM25 run side by side and are merged by Reciprocal Rank Fusion, then a cross-encoder reranks whatever survived. GPT-4o writes the answer from grounded sources only and refuses when there are none, so the system cannot invent a citation. Python, ChromaDB and Slack — where the question arrives and the answer goes back.',
    tags: ['Python', 'RAG', 'ChromaDB', 'Slack'],
  },
  {
    slug: 'telegram-support-agent',
    title: 'Telegram Support Multi-Agent System',
    period: 'Feb 2026',
    summary: 'Ten-node LangGraph pipeline answering from a RAG base, escalating the rest.',
    detail:
      'A 10-node LangGraph pipeline that classifies the intent of every message and answers it from a RAG knowledge base. Anything unsafe or unresolved is validated and escalated to a human agent with the context already attached. The target was 60%+ auto-resolution under 5 seconds, with the observability to see which node decided what. Python, LangGraph and a RAG base, running where the customers actually are.',
    tags: ['Python', 'LangGraph', 'RAG', 'Observability'],
  },
  {
    slug: 'dev-nurse',
    title: 'Dev-Nurse',
    period: 'Jul 2025 — Nov 2025',
    summary: 'TinyML on ESP32-S3: on-device inference, MQTT, Rust backend.',
    detail:
      'A resource-constrained TinyML system on an ESP32-S3: inference runs on the device, MQTT streams the results, and a Rust backend receives and stores them. It was built to run fully at the edge, with no cloud dependency when the network drops. The hardware, the firmware and the backend are written up in the post — the system-communication layer that turns a model on a microcontroller into something a team can deploy.',
    tags: ['TinyML', 'Embedded', 'Rust', 'ESP32-S3'],
    href: '/blog/2026-01-07-from-device-to-system-communication-backend-and-dashboard-for-an-embedded-ai-product/',
  },
  {
    slug: 'rest-on',
    title: 'RestOn',
    period: 'Dec 2024 — Jan 2025',
    summary: 'Actix-web backend from a prompt, with the tests already written.',
    detail:
      'Actix-web backend code with third-party API integrations, generated from a prompt. It arrives with the tests already written, so a prototype runs in minutes instead of an afternoon. The point was never the generated code — it is the wiring of the third-party APIs, the error handling and the test suite that come with it, which is what a prototype needs before anybody trusts it. Rust, Actix-web, and a starting point that is already green.',
    tags: ['Rust', 'Actix-web'],
    href: '/blog/2025-01-26-actix-web-ai-agent/',
  },
  {
    slug: 'ue5-shooter-game',
    title: 'UE5 Shooter Game',
    period: 'Jul 2024 — Aug 2024',
    summary: 'A sci-fi shooter built by hand in Unreal Engine 5.',
    detail:
      'A shooter I built with my own hands over two months. The sci-fi story and the combat both exceeded what I expected from a project that size: C++ and Unreal Engine 5, with the gameplay written rather than assembled out of templates. It is work of my own hours rather than a client engagement, and the post is the account of what building a game from scratch actually turns into.',
    tags: ['C++', 'Unreal Engine 5'],
    href: '/blog/2024-09-15-exploring-c-game-development-with-unreal-engine-5/',
  },
  {
    slug: 'emulator-launcher',
    title: 'Android Emulator Launcher',
    period: 'Aug 2023 — Sep 2023',
    summary: 'Swing desktop app for managing Android emulators.',
    detail:
      'A Java Swing desktop application for configuring, creating and managing Android emulators. It turns the command-line ritual of AVD setup into a window with buttons: the same AVDs, the same flags, without the memorising. Java and the Android SDK, and a small tool that makes a daily chore into a click. The kind of thing written once, used every week, and never mentioned again.',
    tags: ['Java', 'Android'],
    href: '/blog/2023-07-05-android-emulator-launcher/',
  },
  {
    slug: 'dev-stories-blog',
    title: 'dev_stories_blog',
    period: 'Jun 2023 — Dec 2025',
    summary: 'Technical writing that takes my own projects apart.',
    detail:
      'Technical writing that takes my own projects apart piece by piece, and doubles as reflection on the work behind them. Every post is about something that shipped — the Rust toolchain, the embedded firmware, the agent runtime — read from the inside, with the numbers and the dead ends left in. It is the long form of the argument the rest of this site makes in one screen: what the work was, and what it moved.',
    tags: ['TinyML', 'Embedded', 'Writing'],
    href: '/blog/',
  },
];
