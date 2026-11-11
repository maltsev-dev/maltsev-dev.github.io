/**
 * Tags as URLs.
 *
 * The tags live in the front matter as they were written — `actix_web`,
 * `basic_electronics`, `open_ai` — and the legacy site published tag pages
 * under exactly those spellings. The current pages use the hyphenated form,
 * because a URL with an underscore in it reads like a typo.
 *
 * Both spellings have to keep working: the legacy pages are inbound links
 * from the old archive, and the front matter is what every post carries.
 * So the hyphenated form is the page, and the underscore form is a redirect
 * to it.
 */

/** The address a tag page lives at. */
export function tagSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The other spelling of a tag: the raw one, as the front matter writes it. */
export function tagLegacySlug(tag: string): string {
  return tag.trim().toLowerCase();
}

/**
 * Whether the two spellings differ.
 *
 * Most tags are one word and the two forms are the same string — for those
 * there is nothing to redirect, and the page is the only address.
 */
export function hasLegacySpelling(tag: string): boolean {
  return tagLegacySlug(tag) !== tagSlug(tag);
}

/** A tag as it is displayed: the front-matter spelling, kept readable. */
export function tagLabel(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, ' ');
}
