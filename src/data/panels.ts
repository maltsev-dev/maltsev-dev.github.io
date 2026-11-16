import type { CollectionEntry } from 'astro:content';
import { MILESTONES, type Milestone } from './milestones';

/**
 * The panels of the listing on /projects/.
 *
 * One shape for everything the listing shows: the milestones from the
 * project history and the three cases, which used to have pages of their own
 * and are now panels like everything else. A panel is a name, a date, one
 * line, a paragraph, the tags, the numbers it moved and — when the work is
 * documented somewhere — the place it is documented.
 */
export interface Metric {
  value: string;
  label: string;
}

export interface Panel {
  /** The panel's id, and the key of its panel in the dialog. */
  slug: string;
  title: string;
  /** The when-column, shortened: `2026-03`, `current`, `2026`. */
  when: string;
  /** The one line under the name. Never two. */
  line: string;
  /** What the dialog opens with. */
  detail: string;
  tags: string[];
  metrics: Metric[];
  /** Where the work is documented, when it is documented anywhere. */
  link?: { href: string; label: string };
}

/**
 * The when column.
 *
 * The source periods are written for a reader — "Jul 2025 — Nov 2025" — and
 * they are longer than a listing column can be without pushing the name out
 * of the way. In a listing a date is a date: `2025-07 → 2025-11`. The long
 * form is still in the data, and it is still what the panel's dialog opens
 * with.
 */
const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

export const when = (period: string): string => {
  if (!period) return '';
  if (period === 'Current') return 'current';

  return period
    .split('—')
    .map((part) => {
      const m = /^([A-Za-z]{3})\s+(\d{4})$/.exec(part.trim());
      const month = m ? MONTHS[m[1].toLowerCase()] : undefined;
      return m && month ? `${m[2]}-${month}` : part.trim();
    })
    .join(' → ');
};

/**
 * What a panel's outbound link is called.
 *
 * The rule follows what the link is — a post to read, the writing to browse,
 * a product to open — and not one hardcoded URL: the old rule switched on
 * the string '/blog/', so two links that looked the same were labeled with
 * two different verbs.
 */
type LinkKind = 'post' | 'writing' | 'external';

const linkKind = (href: string): LinkKind => {
  if (/^https?:\/\//.test(href)) return 'external';
  if (href === '/blog/') return 'writing';
  return 'post';
};

const LINK: Record<LinkKind, string> = {
  post: 'Read the post →',
  writing: 'Browse the writing →',
  external: 'Open the project →',
};

/**
 * The catalog.
 *
 * Calendar order, newest first. What is being built now leads — `period:
 * 'Current'` is the top of the list — and the three cases follow it, since a
 * year is not a date to interleave with the history. The rest is the
 * milestone list, already newest first.
 */
export function buildPanels(cases: CollectionEntry<'projects'>[]): Panel[] {
  const milestonePanel = (m: Milestone): Panel => ({
    slug: m.slug,
    title: m.title,
    when: when(m.period),
    line: m.summary,
    detail: m.detail,
    tags: m.tags,
    metrics: [],
    link: m.href ? { href: m.href, label: LINK[linkKind(m.href)] } : undefined,
  });

  const casePanel = (c: CollectionEntry<'projects'>): Panel => ({
    slug: c.data.slug,
    title: c.data.title,
    when: when(c.data.period ?? ''),
    line: c.data.line,
    detail: c.data.description ?? '',
    tags: c.data.tags,
    metrics: c.data.metrics,
  });

  return [
    ...MILESTONES.filter((m) => m.period === 'Current').map(milestonePanel),
    // The cases in a fixed order: the collection hands them over in whatever
    // order the file system gave them, and the listing is read as a list.
    ...[...cases].sort((a, b) => a.data.slug.localeCompare(b.data.slug)).map(casePanel),
    ...MILESTONES.filter((m) => m.period !== 'Current').map(milestonePanel),
  ];
}
