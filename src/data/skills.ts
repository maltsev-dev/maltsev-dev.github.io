/**
 * Every skill on the profile, stacked as a pyramid: the widest tier at the
 * bottom is what the rest is built on, and each tier above is narrower and
 * more specific. Ordering is the point — a flat list of twenty-three equal
 * chips says nothing about where a skill sits.
 *
 * Each skill carries the three facts that are worth knowing about it and that
 * are not visible from the name: how many jobs it was used on, what certifies
 * it, and where it shipped. All three are plain data, so the pyramid's chips
 * and the hover card read from one place and cannot drift apart.
 *
 * Provenance, because these are claims about a real career:
 *
 * - `jobs` counts the six stops on /experience/. A skill counts for a job when
 *   that job names it or the work it did plainly required it. Nothing is
 *   counted twice for one engagement, and a skill with no jobs is not zero —
 *   it is only that it has not been billed to one yet (C++, TinyML and
 *   the rest were shipped as work of my own).
 * - `certs` are the licences and certifications from the profile. Only
 *   credentials whose own skill list names this skill are attached, so the
 *   "+N skills" summaries are never guessed at. The Solana credentials are the
 *   one judgement call: the profile lists them under Solana, which is not one
 *   of the twenty-three, so they sit on Smart Contracts — the titles in the
 *   card say plainly what they are.
 * - `projects` are the milestones on /projects/, the blog posts behind them
 *   and the shipped work those posts document, named the short way they are
 *   usually called.
 */

export interface Certificate {
  /** Who issued it. */
  issuer: string;
  /** The course or credential, shortened to its own name. */
  title: string;
  /** Month and year, as the profile records it. */
  issued: string;
}

export interface Skill {
  /** Stable id, used as the DOM key and readable in the markup. */
  id: string;
  name: string;
  jobs: string[];
  certs: Certificate[];
  projects: string[];
}

export interface SkillTier {
  id: string;
  /** What the tier is: a rung of the pyramid, and the name on its tray. */
  label: string;
  skills: Skill[];
}

const CERTS = {
  mcpProduction: {
    issuer: 'Hugging Face',
    title: 'MCP for Production Automation',
    issued: 'Mar 2026',
  },
  langgraphFoundation: {
    issuer: 'LangChain',
    title: 'LangGraph Foundation · Python',
    issued: 'Feb 2026',
  },
  langgraphEssentials: {
    issuer: 'LangChain',
    title: 'LangGraph Essentials · Python',
    issued: 'Feb 2026',
  },
  agenticTrack: {
    issuer: 'Udemy',
    title: 'AI Engineer Agentic Track',
    issued: 'Feb 2026',
  },
  tinyml2: {
    issuer: 'HarvardX',
    title: 'TinyML2 · Applications of TinyML',
    issued: 'Aug 2025',
  },
  tinyml1: {
    issuer: 'HarvardX',
    title: 'TinyML1 · Fundamentals of TinyML',
    issued: 'Jul 2025',
  },
  solanaSchool: {
    issuer: 'Ackee Blockchain Security',
    title: 'School of Solana · Season 6',
    issued: 'Apr 2025',
  },
  solanaBuild: {
    issuer: 'Rise In',
    title: 'Build on Solana',
    issued: 'Mar 2025',
  },
  solanaBuilder: {
    issuer: 'HackQuest',
    title: 'Lvl 2 · Certified Solana Builder',
    issued: 'Mar 2025',
  },
  rustWebServers: {
    issuer: 'Udemy',
    title: 'Rust for Web Servers',
    issued: 'Dec 2024',
  },
  substrate: {
    issuer: 'Udemy',
    title: 'Substrate Bootcamp',
    issued: 'Jan 2025',
  },
  rustEssentials: {
    issuer: 'The Linux Foundation',
    title: 'LFEL1002 · Rust Essentials',
    issued: 'Jan 2025',
  },
  ue5cpp: {
    issuer: 'Udemy',
    title: 'Unreal Engine 5 · C++ Developer',
    issued: 'Aug 2024',
  },
  ue5cppGameplay: {
    issuer: 'Udemy',
    title: 'Unreal Engine 5 · C++ Gameplay Programming',
    issued: 'Aug 2024',
  },
  ctfl: {
    issuer: 'ISTQB',
    title: 'Certified Tester Foundation Level',
    issued: 'Apr 2023',
  },
  javaCore: {
    issuer: 'IBS AppLine',
    title: 'Java Core',
    issued: 'Nov 2019',
  },
} as const satisfies Record<string, Certificate>;

const QA_JOBS = ['PashaPay', 'Alfa-Bank', 'Sportmaster', 'Sberbank'];

export const SKILL_TIERS: SkillTier[] = [
  {
    id: 'foundations',
    label: 'Foundations',
    skills: [
      {
        id: 'python',
        name: 'Python',
        jobs: ['NullRun', 'Freelance'],
        certs: [
          CERTS.langgraphFoundation,
          CERTS.langgraphEssentials,
          CERTS.agenticTrack,
          CERTS.tinyml2,
          CERTS.tinyml1,
        ],
        projects: ['7-platform agent', 'Permission-aware RAG', 'Telegram support agent', 'Dev-Nurse'],
      },
      {
        id: 'rust',
        name: 'Rust',
        jobs: ['Freelance'],
        certs: [
          CERTS.rustWebServers,
          CERTS.substrate,
          CERTS.rustEssentials,
          CERTS.solanaBuild,
          CERTS.solanaBuilder,
        ],
        projects: [
          'Dev-Nurse',
          'RestOn',
          'Actix-web server',
          'TUI Pomodoro',
          'Wasm tax calculator',
        ],
      },
      {
        id: 'cpp',
        name: 'C++',
        jobs: [],
        certs: [CERTS.ue5cpp, CERTS.ue5cppGameplay],
        projects: ['UE5 shooter', 'Dungeon Raider'],
      },
      {
        id: 'java',
        name: 'Java',
        jobs: QA_JOBS,
        certs: [CERTS.javaCore],
        projects: ['Emulator launcher', 'HTML scraper', 'API scraper'],
      },
    ],
  },
  {
    id: 'practice',
    label: 'Practice',
    skills: [
      {
        id: 'test-automation',
        name: 'Test Automation',
        jobs: QA_JOBS,
        certs: [CERTS.ctfl],
        projects: [],
      },
      {
        id: 'quality-assurance',
        name: 'Quality Assurance',
        jobs: QA_JOBS,
        certs: [CERTS.ctfl],
        projects: [],
      },
      {
        id: 'stlc',
        name: 'STLC',
        jobs: QA_JOBS,
        certs: [CERTS.ctfl],
        projects: [],
      },
      {
        id: 'tmap',
        name: 'TMAP',
        jobs: QA_JOBS,
        certs: [CERTS.ctfl],
        projects: [],
      },
    ],
  },
  {
    id: 'systems',
    label: 'Systems',
    skills: [
      {
        id: 'platform-engineering',
        name: 'Platform Engineering',
        jobs: ['NullRun'],
        certs: [],
        projects: ['NullRun', 'Dev-Nurse'],
      },
      {
        id: 'embedded-systems',
        name: 'Embedded Systems',
        jobs: [],
        certs: [],
        projects: ['Dev-Nurse'],
      },
      {
        id: 'machine-learning',
        name: 'Machine Learning',
        jobs: [],
        certs: [],
        projects: ['Dev-Nurse'],
      },
      {
        id: 'tinyml',
        name: 'TinyML',
        jobs: [],
        certs: [CERTS.tinyml2, CERTS.tinyml1],
        projects: ['Dev-Nurse'],
      },
      {
        id: 'smart-contracts',
        name: 'Smart Contracts',
        jobs: [],
        certs: [CERTS.solanaSchool, CERTS.solanaBuild, CERTS.solanaBuilder],
        projects: ['Solana counter', 'Guess the number', 'Anchor CPI'],
      },
    ],
  },
  {
    id: 'agents',
    label: 'Agents',
    skills: [
      {
        id: 'ai-agent-development',
        name: 'AI Agent Development',
        jobs: ['NullRun', 'Freelance'],
        certs: [CERTS.agenticTrack],
        projects: ['Telegram support agent', '7-platform agent'],
      },
      {
        id: 'agentic-workflows',
        name: 'Agentic Workflows',
        jobs: ['Freelance'],
        certs: [CERTS.agenticTrack],
        projects: ['7-platform agent'],
      },
      {
        id: 'rag',
        name: 'Retrieval-Augmented Generation',
        jobs: ['Freelance'],
        certs: [],
        projects: ['Permission-aware RAG', 'Telegram support agent'],
      },
      {
        id: 'multi-agent-systems',
        name: 'Multi-agent Systems',
        jobs: ['Freelance'],
        certs: [CERTS.agenticTrack],
        projects: ['Telegram support agent'],
      },
      {
        id: 'langgraph',
        name: 'LangGraph',
        jobs: ['Freelance'],
        certs: [CERTS.langgraphEssentials, CERTS.langgraphFoundation],
        projects: ['Telegram support agent', '7-platform agent'],
      },
      {
        id: 'mcp',
        name: 'Model Context Protocol',
        jobs: ['NullRun', 'Freelance'],
        certs: [CERTS.mcpProduction, CERTS.agenticTrack],
        projects: ['NullRun'],
      },
      {
        id: 'ai-systems-architecture',
        name: 'AI Systems Architecture',
        jobs: ['NullRun', 'Freelance'],
        certs: [CERTS.mcpProduction, CERTS.langgraphFoundation],
        projects: ['NullRun', 'Permission-aware RAG', 'Telegram support agent'],
      },
    ],
  },
  {
    id: 'specialisation',
    label: 'Specialisation',
    skills: [
      {
        id: 'ai-agent-security',
        name: 'AI Agent Security',
        jobs: ['NullRun'],
        certs: [CERTS.mcpProduction],
        projects: ['NullRun'],
      },
      {
        id: 'enforcement-governance',
        name: 'Enforcement & Governance',
        jobs: ['NullRun'],
        certs: [],
        projects: ['NullRun'],
      },
      {
        id: 'ai-reliability-engineering',
        name: 'AI Reliability Engineering',
        jobs: ['NullRun'],
        certs: [],
        projects: ['NullRun'],
      },
    ],
  },
];