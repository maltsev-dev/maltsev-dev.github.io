/**
 * Every panel on /projects/ comes from here, in one list.
 *
 * Two kinds live side by side: deep-dive cases that have their own page under
 * /projects/<slug>/, and milestones — shipped work recorded from the project
 * history that has no page of its own, but often a post that covers it.
 *
 * `period` is the human range as written on the source entry, not a computed
 * date span. `href` is only set when there is somewhere to go — a case page or
 * the post that documents the milestone — and a panel without one is rendered
 * as plain markup so it is never dressed as a link.
 */
export interface Milestone {
  /** Stable id, used as the key and readable in the DOM. */
  slug: string;
  title: string;
  period: string;
  /**
   * One panel is one glance. Two sentences at most: what it is, and the one
   * number or constraint that makes it interesting. The long form belongs in
   * the linked case or post.
   */
  summary: string;
  tags: string[];
  href?: string;
}

export const MILESTONES: Milestone[] = [
  {
    slug: 'nullrun',
    title: 'NullRun',
    period: 'Current',
    summary:
      'Runtime authorization layer for agents: tool execution, approvals, budgets and policy, so an agent acts inside a limit instead of an assumption.',
    tags: ['Agent runtime', 'Authorization', 'Policy'],
  },
  {
    slug: 'ai-social-media-agent',
    title: 'AI Social Media Agent: 7-Platform Publishing with Human-in-the-Loop',
    period: 'Mar 2026',
    summary:
      'A LangGraph pipeline generating content variants with DALL-E media across seven networks, holding each one for human approval before it schedules and publishes. Target: 75% less production time, 3x posting frequency.',
    tags: ['Python', 'LangGraph', 'Celery', 'React'],
  },
  {
    slug: 'permission-aware-rag',
    title: 'Internal Knowledge: Permission-aware RAG That Never Lies',
    period: 'Mar 2026',
    summary:
      'A 13-stage hybrid retrieval pipeline — dense and BM25, merged by Reciprocal Rank Fusion, reranked by a cross-encoder — where GPT-4o synthesis refuses to answer without grounded sources.',
    tags: ['Python', 'RAG', 'ChromaDB', 'Slack'],
  },
  {
    slug: 'telegram-support-agent',
    title: 'AI-Powered Telegram Customer Support Multi-Agent System',
    period: 'Feb 2026',
    summary:
      'A 10-node LangGraph pipeline that classifies intent, answers from a RAG knowledge base, validates for safety and escalates the rest to human agents. Targets 60%+ auto-resolution under 5 seconds.',
    tags: ['Python', 'LangGraph', 'RAG', 'Observability'],
  },
  {
    slug: 'dev-nurse',
    title: 'Dev-Nurse',
    period: 'Jul 2025 — Nov 2025',
    summary:
      'A resource-constrained TinyML system on ESP32-S3: on-device inference, MQTT streaming and a Rust backend, built to run fully at the edge with no cloud dependency.',
    tags: ['TinyML', 'Embedded', 'Rust', 'ESP32-S3'],
    href: '/blog/2026-01-07-from-device-to-system-communication-backend-and-dashboard-for-an-embedded-ai-product/',
  },
  {
    slug: 'rest-on',
    title: 'RestOn',
    period: 'Dec 2024 — Jan 2025',
    summary:
      'Get tested Actix-web backend code with third-party API integrations in minutes, from a prompt.',
    tags: ['Rust', 'Actix-web'],
    href: '/blog/2025-01-26-actix-web-ai-agent/',
  },
  {
    slug: 'ue5-shooter-game',
    title: 'UE5 Shooter Game',
    period: 'Jul 2024 — Aug 2024',
    summary:
      'A shooter that never gets boring because you made it with your own hands. The result exceeded my expectations, and I really enjoyed the sci-fi story.',
    tags: ['C++', 'Unreal Engine 5'],
    href: '/blog/2024-09-15-exploring-c-game-development-with-unreal-engine-5/',
  },
  {
    slug: 'emulator-launcher',
    title: 'Android Emulator Launcher',
    period: 'Aug 2023 — Sep 2023',
    summary:
      'A Java Swing desktop application for configuring, creating and managing Android emulators.',
    tags: ['Java', 'Android'],
    href: '/blog/2023-07-05-android-emulator-launcher/',
  },
  {
    slug: 'dev-stories-blog',
    title: 'dev_stories_blog',
    period: 'Jun 2023 — Dec 2025',
    summary:
      'Technical writing: disassembling my own projects and experiments, and self-reflection on the engineering journey behind them.',
    tags: ['TinyML', 'Embedded', 'Writing'],
    href: '/blog/',
  },
];