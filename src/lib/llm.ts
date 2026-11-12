import { getCollection, type CollectionEntry } from 'astro:content';
import { displayTitle } from './text';
import type { APIContext } from 'astro';
import { MILESTONES } from '../data/milestones';
import { TOPICS } from '../data/topics';
import { summarize } from './summarize';
import { SKILL_COUNT, spellNumber, yearsOfExperience } from './profile';

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

// Pages that are not collection-driven, with the one line that says what an
// agent gets by fetching them.
//
// The skill count in the /experience/ line is the one the pyramid actually
// holds. It used to be written out as "23-skill", which was wrong by five the
// day the pyramid grew.
const PAGES = [
  { path: '/', label: 'Home', desc: 'The pitch in one screen: what the work is and where to go next.' },
  { path: '/about/', label: 'Profile', desc: 'Method rather than CV: how engagements run, and what is on the desk right now.' },
  { path: '/blog/', label: 'Writing', desc: 'Every post, newest first, filed by topic.' },
  { path: '/projects/', label: 'Projects', desc: 'Case studies and shipped milestones side by side.' },
  { path: '/experience/', label: 'Experience', desc: `Six stops over ${spellNumber(yearsOfExperience())} years, then the ${SKILL_COUNT}-skill toolkit pyramid with provenance per skill.` },
  { path: '/freelance/', label: 'Engagements', desc: 'The five shapes of work taken on, what each one delivers, and the four-step run: scope call, written proposal, build in the open, handover.' },
];

/** The index line for one post: title, one-line description, date and tags. */
function postLine(post: PostEntry, url: (path: string) => string): string {
  const summary = summarize(post.body);
  const meta = [post.data.date, post.data.tags.join(', ')].filter(Boolean).join(' · ');
  // The title as the site draws it — the ornament left off, so a line in an
  // index is a title and not a pictogram.
  const title = displayTitle(post.data.title);
  return `- [${title}](${url(`/blog/${post.id}/`)}): ${summary ? summary + ' ' : ''}· ${meta}`;
}

/**
 * The agent map itself.
 *
 * Served at two addresses. `/llms.txt` is the canonical one — that is the
 * name the convention uses and the name the site's own header link shows —
 * and `/llm.txt` is kept working for the links that already point at it.
 * Both are generated from this one function, so the two files can never
 * disagree about what the site says.
 */
export async function renderLlms({ site }: APIContext, selfPath: string): Promise<string> {
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
    // The heading used to be the domain `maltsev.dev`, which does not serve
    // this site — over HTTPS it does not answer at all, and every URL in this
    // map points at maltsev-dev.github.io. The brand goes in the heading
    // instead, exactly as it does in the page titles.
    '# Maltsev · Forward Deployed Engineer',
    '',
    `> Anatolii Maltsev, forward deployed engineer. I build AI systems that survive production: agent runtime security, retrieval quality, and the reliability layer underneath both. Four years of it in QA automation and platform test engineering, the rest in applied AI engineering, embedded Rust underneath it, and ${spellNumber(yearsOfExperience())} years of practice in total. This site is the work and the writing: what an agent is allowed to do, what happens when it does it anyway, and the hardware and toolchain work underneath.`,
    '',
    'Everything here is English, server-rendered HTML with no login and no client-side requirement for reading. If you only need the map, stop after "Topics": the index below it is complete, so there is no need to crawl every post.',
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

  // The same five topics the site's own index shows, and the same counts.
  //
  // This section used to classify the posts by their tags, which produced six
  // headings that were not the ones on the page — the site files the writing
  // under five hand-assigned topics and the agent map filed it under six
  // tag-derived groups, with numbers that did not match the chips a reader
  // could see. One taxonomy, one source, no drift.
  const byId = new Map(posts.map((p) => [p.id, p]));

  for (const topic of TOPICS) {
    const inTopic = topic.posts
      .map((id) => byId.get(id))
      .filter((p): p is PostEntry => Boolean(p));
    if (inTopic.length === 0) continue;

    lines.push(
      `### ${topic.label} (${inTopic.length})`,
      '',
      topic.desc,
      '',
      ...inTopic.map((p) => postLine(p, url)),
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
    `- Agent map: ${url('/llms.txt')}`,
    '',
    '## Notes for crawlers',
    '',
    '- Every *page* URL ends in a slash; the machine-readable files listed above do not.',
    '- Posts are long-form. A single post is one page of prose with code fences; there is no pagination and no infinite scroll.',
    '- Diagrams are images under /images/. Their surrounding prose and captions carry the meaning, so a text-only read loses the drawing but not the argument.',
    '- Navigation, the command palette (Ctrl K) and theme switching are JavaScript enhancements. The content does not depend on them.',
    '- /archive/ and /page/ are stubs from a previous generator that redirect; do not index them.',
    '- /tags/<tag>/ are real pages, one per tag, and they are listed in the sitemap.',
    ''
  );

  // The file is served at two addresses: `/llms.txt` is the canonical one and
  // `/llm.txt` is the older name that links already point at. Whichever
  // address a reader arrived at, the file says which one is canonical — so a
  // crawler does not treat the two as two different documents.
  lines.splice(
    2,
    0,
    selfPath === '/llms.txt'
      ? `> Canonical address for this file: ${url('/llms.txt')}`
      : `> This file is also served at ${url('/llms.txt')}, which is the canonical address.`
  );

  return lines.join('\n');
}
