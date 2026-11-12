/**
 * schema.org structured data.
 *
 * The site had none: no `Person`, no `WebSite`, no `BlogPosting`. Everything a
 * rich result needs is already in the repo — the author in the header and the
 * footer, the profile links in the agent map, the post metadata in the front
 * matter — so the graph is assembled at build time rather than maintained by
 * hand.
 */

/** The site owner, as the site names them. */
export const AUTHOR = {
  name: 'Anatolii Maltsev',
  jobTitle: 'Agentic engineer',
  description:
    'Builds AI operational systems, agentic engineering, embedded and distributed systems: the authorization layer, the failure handling and the hardware underneath it.',
  sameAs: [
    'https://github.com/maltsev-dev',
    'https://www.linkedin.com/in/a-maltsev',
    'https://t.me/a_maltsev_dev',
  ],
} as const;

/**
 * The one address the site writes to.
 *
 * It was written into five files by hand: the footer, the header, the
 * engagements page, the script that opens the mail client and the agent map.
 * An address that changes is a thing to change in one place, so it lives
 * here and everywhere else asks for it.
 */
export const CONTACT_EMAIL = 'mr.a.maltsev@gmail.com';

/** A mailto link to the address above. */
export const contactMailto = (subject?: string): string =>
  `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;

/** The social card every page shares unless it has one of its own. */
const SITE_IMAGE = '/og.png';

/** The social card for one post. */
export function postImage(slug: string): string {
  return `/og/${slug}.png`;
}

/** The person behind the writing. */
export function personNode(site: URL): Record<string, unknown> {
  return {
    '@type': 'Person',
    '@id': site.href + '#person',
    name: AUTHOR.name,
    jobTitle: AUTHOR.jobTitle,
    description: AUTHOR.description,
    url: site.href,
    image: new URL(SITE_IMAGE, site).href,
    sameAs: [...AUTHOR.sameAs],
  };
}

/** The site itself: its name, its URL and the page it calls home. */
export function websiteNode(site: URL): Record<string, unknown> {
  return {
    '@type': 'WebSite',
    '@id': site.href + '#website',
    name: 'Maltsev · Agentic Engineering',
    url: site.href,
    publisher: { '@id': site.href + '#person' },
    inLanguage: 'en',
  };
}

/**
 * One post as a `BlogPosting`.
 *
 * The byline points at the same `Person` node the site declares, so a reader
 * and a crawler see one author rather than two.
 */
export function blogPostingNode(
  site: URL,
  post: {
    title: string;
    description: string;
    date?: string;
    updated?: string;
    tags: string[];
    slug: string;
  }
): Record<string, unknown> {
  const url = new URL(`/blog/${post.slug}/`, site).href;
  return {
    '@type': 'BlogPosting',
    '@id': url + '#post',
    headline: post.title,
    description: post.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    // The post's own card, not the site card: a preview of a post that shows
    // the site's homepage image tells the reader nothing about the post.
    image: new URL(postImage(post.slug), site).href,
    datePublished: post.date ?? undefined,
    dateModified: post.updated ?? post.date ?? undefined,
    author: { '@id': site.href + '#person' },
    publisher: { '@id': site.href + '#person' },
    keywords: post.tags.length ? post.tags.join(', ') : undefined,
    inLanguage: 'en',
  };
}

/**
 * The graph a page declares: the site, its author, and whatever the page
 * itself adds.
 *
 * `undefined` values are dropped rather than serialized — schema.org reads
 * `"datePublished": undefined` as a missing field, but it reads
 * `"keywords": null` as a claim that there are no keywords.
 */
export function graph(site: URL, extra: Record<string, unknown>[] = []): string {
  const nodes = [personNode(site), websiteNode(site), ...extra].map((node) =>
    JSON.parse(JSON.stringify(node))
  );
  // `<` is escaped so a description containing `</script>` cannot close the
  // tag the JSON is written into.
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(
    /</g,
    '\\u003c'
  );
}
