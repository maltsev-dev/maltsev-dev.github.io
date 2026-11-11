import { getCollection, type CollectionEntry } from 'astro:content';
import type { APIContext } from 'astro';
import { MILESTONES } from '../data/milestones';
import { summarize } from '../lib/summarize';

type PostEntry = CollectionEntry<'posts'>;

/*
  llms.txt, generated rather than hand-written.

  The same reasoning as the post index in Base.astro: the writing is the bulk of
  this site, so a static file would be wrong the day after the next post lands.
  Everything below that can be read off the collections — post list, projects,
  milestones — is read at build time, and only the hand-written framing (who
  this is, what the sections mean) lives here.

  The hand-written parts are deliberately short. An agent reading this file
  wants an accurate map, not an essay: what the site is, where the topics are,
  and one honest line per page it can then fetch for the detail.
*/

interface Group {
  /** Heading for the section. */
  title: string;
  /** One line saying what belongs in it, for a reader deciding whether to read on. */
  note: string;
  /** Tags that put a post here. Checked in order, so the specific beats the general. */
  tags: string[];
}

// Order is the classification: the first group holding any of the post's tags
// wins, so `rust` (twenty-seven posts) and `project` (twenty) fall to the end and
// only collect what nothing more specific claimed.
const GROUPS: Group[] = [
  {
    title: 'Authorization, policy and agent security',
    note: 'The largest body of writing: who is allowed to do what, on whose authority, recorded how. This is also what NullRun, the product, is built on.',
    tags: ['authorization', 'security', 'compliance', 'audit', 'mcp', 'enforcement', 'budget'],
  },
  {
    title: 'Reliability, budgets and failure handling',
    note: 'What an agent does when the run goes wrong: unknown outcomes, fail-closed paths, cost per call, and the operations underneath.',
    tags: ['reliability', 'operations', 'cost', 'architecture', 'testing', 'redis', 'ai', 'open_ai'],
  },
  {
    title: 'Embedded Rust and bare metal',
    note: 'Register-level work on Cortex-M and Nordic/RP boards — peripherals, buses, interrupts, and the toolchain that shrinks firmware enough to fit.',
    tags: [
      'embedded', 'basic', 'basic_electronics', 'cpu', 'registers', 'peripherals', 'mmio',
      'gpio', 'pwm', 'timers', 'interrupts', 'clock', 'sync', 'rp2040', 'nrf52833', 'nurse',
    ],
  },
  {
    title: 'Solana and smart contracts',
    note: 'Programs, cross-program invocation and on-chain state, written in Rust on Anchor.',
    tags: ['solana', 'anchor'],
  },
  {
    title: 'Applications and the web',
    note: 'Web servers, WASM, desktop-ish CLIs and TUIs, Android tooling, and the game work — the application layer above the systems.',
    tags: [
      'actix_web', 'webassembly', 'java', 'spring', 'svg', 'cli', 'android', 'graphics',
      'gamedev', 'cpp', 'tui', 'product', 'engineering',
    ],
  },
  {
    title: 'The Rust toolchain and compilers',
    note: 'How Rust source becomes a binary: the pipeline, the linker, AOT compilation, memory layout.',
    tags: ['rust', 'compilers', 'linker', 'aot', 'memory'],
  },
];

// Pages that are not collection-driven, with the one line that says what an
// agent gets by fetching them.
const PAGES = [
  { path: '/', label: 'Home', desc: 'The pitch in one screen: what the work is and where to go next.' },
  { path: '/about/', label: 'Profile', desc: 'Method rather than CV — how engagements run, and what is on the desk right now.' },
  { path: '/blog/', label: 'Writing', desc: 'Every post, newest first, grouped by year.' },
  { path: '/projects/', label: 'Projects', desc: 'Case studies and shipped milestones side by side.' },
  { path: '/experience/', label: 'Experience', desc: 'Six stops over seven years, then the 23-skill toolkit pyramid with provenance per skill.' },
  { path: '/freelance/', label: 'Freelance', desc: 'What is taken on, and the four-step engagement: scope call, fixed-price proposal, build in the open, handover.' },
];

/** First group claiming any of the post's tags, or null for the leftovers. */
function groupOf(tags: string[]): Group | null {
  return GROUPS.find((g) => tags.some((t) => g.tags.includes(t))) ?? null;
}

/** The index line for one post: title, one-line description, date and tags. */
function postLine(post: PostEntry, url: (path: string) => string): string {
  const summary = summarize(post.body);
  const meta = [post.data.date, post.data.tags.join(', ')].filter(Boolean).join(' · ');
  // Older posts carry a leading emoji as a section marker. Fine on the page,
  // noise in an index that is read as a list.
  const title = post.data.title.replace(/^[\p{Extended_Pictographic}\s️]+/u, '').trim();
  return `- [${title || post.data.title}](${url(`/blog/${post.id}/`)}): ${summary ? summary + ' ' : ''}— ${meta}`;
}

export async function GET({ site }: APIContext) {
  // Absolute URLs are the point of the file — an agent reading it is not
  // necessarily on the domain, so a relative path would be a dead reference.
  // `site` comes from astro.config; the fallback keeps the build working if it
  // is ever unset rather than emitting a path-only file.
  const origin = site ?? new URL('https://maltsev-dev.github.io');
  const url = (path: string) => new URL(path, origin).href;

  const posts = (await getCollection('posts')).sort((a, b) =>
    (b.data.date ?? '').localeCompare(a.data.date ?? '')
  );
  const projects = await getCollection('projects');

  const lines: string[] = [];

  lines.push(
    '# maltsev.dev',
    '',
    '> Anatolii Maltsev. AI agent authorization and reliability as the main subject, embedded Rust underneath it. Seven years in QA automation and platform test engineering, now building NullRun — a runtime authorization layer for AI agents. This site is the writing that came out of it: what an agent is allowed to do, what happens when it does it anyway, and the hardware and toolchain work underneath.',
    '',
    'Everything here is English, server-rendered HTML with no login and no client-side requirement for reading. If you only need the map, stop after "Topics" — the index below it is complete, so there is no need to crawl every post.',
    '',
    '## Pages',
    '',
    ...PAGES.map((p) => `- [${p.label}](${url(p.path)}): ${p.desc}`),
    '',
    '## Case studies',
    '',
    'Three, each with the problem, the architecture and what it moved:',
    '',
    ...projects.map(
      (p) =>
        `- [${p.data.title}](${url(`/projects/${p.data.slug}/`)}): ${p.data.description ?? ''}` +
        (p.data.tags.length ? ` Tags: ${p.data.tags.join(', ')}.` : '')
    ),
    '',
    '## Shipped work',
    '',
    'Milestones from the project history. Where there is no page of its own, the entry links to the post that covers it.',
    '',
    ...MILESTONES.map(
      (m) =>
        `- ${m.title} (${m.period}): ${m.summary}` +
        (m.href ? ` See: ${m.href.startsWith('http') ? m.href : url(m.href)}` : '')
    ),
    '',
    '## Topics',
    ''
  );

  // Each post lands in exactly one group: the first whose tags it carries.
  // Filtering per group instead would list a `rust, embedded` post under both
  // headings and quietly inflate the counts.
  const buckets = new Map<Group | null, typeof posts>();
  for (const post of posts) {
    const key = groupOf(post.data.tags);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(post);
    else buckets.set(key, [post]);
  }

  for (const group of GROUPS) {
    const inGroup = buckets.get(group);
    if (!inGroup || inGroup.length === 0) continue;

    lines.push(
      `### ${group.title} (${inGroup.length})`,
      '',
      group.note,
      '',
      ...inGroup.map((p) => postLine(p, url)),
      ''
    );
  }

  // Whatever no group claimed — kept rather than dropped, so the index stays a
  // complete picture of the writing.
  const rest = buckets.get(null);
  if (rest && rest.length > 0) {
    lines.push(
      `### Other notes (${rest.length})`,
      '',
      ...rest.map((p) => postLine(p, url)),
      ''
    );
  }

  lines.push(
    '## Contact',
    '',
    '- Email: mr.a.maltsev@gmail.com (mailto:mr.a.maltsev@gmail.com)',
    '- GitHub: https://github.com/maltsev-dev',
    '- LinkedIn: https://www.linkedin.com/in/a-maltsev',
    '- Telegram: https://t.me/a_maltsev_dev',
    '',
    '## Machine-readable',
    '',
    `- RSS: ${url('/rss.xml')}`,
    `- Sitemap: ${url('/sitemap.xml')}`,
    `- robots.txt: ${url('/robots.txt')}`,
    `- This file: ${url('/llm.txt')}`,
    '',
    '## Notes for crawlers',
    '',
    '- Every URL ends in a slash.',
    '- Posts are long-form. A single post is one page of prose with code fences; there is no pagination and no infinite scroll.',
    '- Diagrams are images under /images/. Their surrounding prose and captions carry the meaning, so a text-only read loses the drawing but not the argument.',
    '- Navigation, the command palette (Ctrl K) and theme switching are JavaScript enhancements. The content does not depend on them.',
    '- /archive/, /tags/ and /page/ are stubs from a previous generator that redirect; do not index them.',
    ''
  );

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
