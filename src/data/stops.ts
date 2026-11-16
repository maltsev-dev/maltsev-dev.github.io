/**
 * The career, as a log.
 *
 * A career is a history: it has commits, in an order, each one with a date
 * and a message. So the page is a log — the same shape `git log` prints, one
 * entry per stop, newest first. The hash-shaped values are decoration — they
 * identify an entry, nothing more. Replace or extend as the history changes;
 * the page reads from here.
 *
 * The listing shows three things of a stop: when it ran, what the role was,
 * and the line under it. Everything else — the commit header, the paragraph
 * that says what the step was, the points, the stacks — opens in the panel's
 * dialog, in full.
 */
export interface Stop {
  hash: string;
  /** What the entry is: the ref a branch would point at. */
  ref: string;
  /** The date the commit carries, in the format `git log` prints it in. */
  date: string;
  /** The span of the engagement, for the reader rather than the machine. */
  span: string;
  role: string;
  /** The employer, with its legal form: `PashaPay LLC`. */
  company: string;
  /**
   * How the work was engaged: a contract, a full-time post, work taken
   * independently, or a product of my own.
   */
  form: string;
  /** Where the company is, when it is somewhere a reader can go. */
  href?: string;
  /** What the stop was about, in one line. */
  tagline?: string;
  /**
   * A sentence or two between the employer line and the bullets: what the step
   * was, and what it handed to the next one. The bullets are what was done —
   * this is the thread running through them, and the reason six stops read as
   * one career instead of six vacancies. Nothing here that the points
   * underneath do not already support.
   */
  body?: string;
  points: string[];
  skills: string[];
  /** Count of skills the source profile collapsed; rendered as a muted chip. */
  more?: number;
  /**
   * The stop that is still running. Its period ends at the present, so the
   * date it ends on is not written down anywhere — it is `now`.
   */
  current?: boolean;
}

export const STOPS: Stop[] = [
  {
    hash: 'f7c21a9',
    ref: 'HEAD -> main',
    date: 'Mon Mar  9 10:02:11 2026 +0200',
    span: '8 mos',
    role: 'Founder & Lead Engineer',
    company: 'NullRun',
    form: 'Own product',
    href: 'https://nullrun.io',
    tagline: 'Runtime authorization for AI agents',
    body: 'Cloud SaaS for AI agent security, policy enforcement and execution governance. The problem kept turning up on client work, so I built it once as a product instead of again for each engagement.',
    points: [
      'Founder and lead engineer behind NullRun: the architecture, the policy model and the public API.',
      'Backend systems, SDK development and cloud infrastructure, end to end.',
      'Developer experience and product direction.',
    ],
    skills: ['AI Agent Security', 'Platform Engineering'],
    more: 2,
    current: true,
  },
  {
    hash: '4c8be17',
    ref: 'branch: independent',
    date: 'Wed Dec 10 09:31:44 2025 +0200',
    span: '11 mos',
    role: 'Applied AI Engineer',
    company: 'Independent',
    form: 'Independent',
    tagline: 'LLM systems, RAG & agentic workflows · Automation at scale',
    body: 'The step out of a reporting line: briefs instead of a backlog, and clients asking for agents rather than for scripts. The toolkit stopped being a list of tools and became a way of working, and the specialization above it on the pyramid started to be worth something.',
    points: [
      'Took SMB workflows from vague requirements to production, cutting manual work by 40–80%.',
      'Built LLM systems on RAG pipelines and multi-agent orchestration, integrated Google APIs and OAuth, and automated document-heavy processes end to end.',
      'Delivered production systems across backend, frontend, infrastructure and system design, from architecture through deployment.',
    ],
    skills: ['AI Agent Development', 'LangGraph'],
    more: 5,
  },
  {
    hash: 'a31d0be',
    ref: 'branch: contract',
    date: 'Mon Dec  4 11:05:02 2023 +0200',
    span: '1 yr 8 mos',
    role: 'Senior SDET',
    company: 'PashaPay LLC',
    form: 'Contract',
    tagline: 'Mobile & backend test automation',
    body: 'Senior, and no longer only writing tests. The app and the services behind it ended up under one framework, one set of standards and one owner. That is the point where a test engineer starts designing the system that does the testing, and where the framing changes from running the work to owning it.',
    points: [
      'Designed and built integration, e2e and load test automation frameworks from scratch, covering mobile and backend services.',
      'Owned test architecture across the full SDLC, from technical design through deployment and release validation.',
      'Authored engineering documentation and testing standards adopted across multiple teams, improving consistency and onboarding speed.',
    ],
    skills: ['Test Automation', 'Quality Assurance'],
    more: 2,
  },
  {
    hash: '5e2f904',
    ref: 'branch: full-time',
    date: 'Fri Dec  3 10:00:37 2021 +0300',
    span: '1 yr 9 mos',
    role: 'Senior SDET',
    company: 'Alfa-Bank JSC',
    form: 'Full-time',
    tagline: 'Backend test automation',
    body: 'Automation moved inward, into the platform itself. The suites had to keep their throughput under production load, and for the first time the work sat with core engineering, security and infrastructure as colleagues rather than as the QA team taking their requirements.',
    points: [
      'Engineered and optimized automated test suites for backend services, improving throughput and stability under production load.',
      'Partnered with core engineering, security and infrastructure teams to validate integration of distributed system components.',
      'Drove test infrastructure improvements that reduced regression cycle time and increased release confidence.',
    ],
    skills: ['Test Automation', 'Quality Assurance'],
    more: 2,
  },
  {
    hash: '90b5e77',
    ref: 'branch: full-time',
    date: 'Tue Jun 16 09:20:11 2020 +0300',
    span: '1 yr 7 mos',
    role: 'SDET',
    company: 'Sportmaster JSC',
    form: 'Full-time',
    tagline: 'Performance & quality engineering',
    body: 'Still writing tests, but no longer only writing them. Performance became the first thing to own outright, and peer review the first say in how the team worked. That is the difference between a tester who found defects and an engineer who removed the reason for them.',
    points: [
      'Identified and mitigated performance bottlenecks in service integrations, hardening systems against high-load conditions.',
      'Built test automation and quality documentation frameworks, establishing repeatable engineering standards.',
      'Conducted peer code reviews to enforce code quality, consistency and best practices across the team.',
    ],
    skills: ['Performance Testing', 'Test Automation'],
    more: 2,
  },
  {
    hash: 'c07d3aa',
    ref: 'branch: full-time',
    date: 'Mon May 13 12:00:00 2019 +0300',
    span: '1 yr 2 mos',
    role: 'QA Automation Engineer',
    company: 'Sberbank PJSC',
    form: 'Full-time',
    tagline: 'Automated coverage for core banking products',
    body: 'Where it starts. Reading a banking system closely enough to find what could break in it, and writing the checks that would go on finding it. That habit is what every later step is built on, and the reason the frameworks that came after had something to generalize from.',
    points: [
      'Analyzed complex banking systems to surface functional risks and edge cases, translating findings into automated coverage.',
      'Designed and implemented automated test scripts validating core product functionality, improving release reliability.',
      'Collaborated with development teams to integrate testing earlier in the workflow, the start of a shift toward test automation engineering.',
    ],
    skills: ['Test Automation', 'Quality Assurance'],
    more: 1,
  },
];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** The month and the year out of the date a commit carries. */
const started = (date: string): { month: number; year: number } | null => {
  // `git log` prints `Mon Mar  9 10:02:11 2026 +0200`: the weekday, then the
  // name of the month, then the day of the month, then the time.
  const m = /[A-Za-z]{3}\s+([A-Za-z]{3})\s+\d{1,2}\s+\d{1,2}:\d{2}:\d{2}\s+(\d{4})/.exec(date);
  if (!m) return null;
  const month = MONTHS.findIndex((name) => name.toLowerCase() === m[1].toLowerCase());
  if (month < 0) return null;
  return { month, year: Number(m[2]) };
};

/** The span of a stop in months: `1 yr 8 mos` is twenty. */
const months = (span: string): number => {
  const years = /(\d+)\s*yr/.exec(span);
  const rest = /(\d+)\s*mos/.exec(span);
  return (years ? Number(years[1]) * 12 : 0) + (rest ? Number(rest[1]) : 0);
};

/**
 * The length of a stop, in the short form: `1Y 8M`.
 *
 * The span as the profile writes it — `1 yr 8 mos` — is a phrase, and a
 * record of six stops reads better with a value that is a value.
 */
export const duration = (span: string): string => {
  const years = /(\d+)\s*yr/.exec(span);
  const rest = /(\d+)\s*mos/.exec(span);
  return [
    years ? `${Number(years[1])}Y` : '',
    rest ? `${Number(rest[1])}M` : '',
  ]
    .filter(Boolean)
    .join(' ');
};

/**
 * The period of a stop, as a reader wants it.
 *
 * `Mon Dec  4 11:05:02 2023 +0200` is what `git log` prints, and nobody reads
 * a career that way. The stop ran from Dec 2023 for a year and eight months,
 * so the period is `Dec 2023 → Aug 2025`: two months, and the length of the
 * engagement in the same words the span beside it uses.
 *
 * The end is the start plus the span, so the two can never disagree. The stop
 * that is still running ends at the present, which is not a date anything
 * wrote down.
 */
export const period = (stop: Stop): string => {
  const start = started(stop.date);
  if (!start) return stop.date;

  const from = `${MONTHS[start.month]} ${start.year}`;
  if (stop.current) return `${from} → now`;

  const end = new Date(Date.UTC(start.year, start.month + months(stop.span), 1));
  return `${from} → ${MONTHS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
};
