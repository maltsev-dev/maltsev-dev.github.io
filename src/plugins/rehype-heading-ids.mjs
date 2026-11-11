/**
 * Give every heading a clean, stable id.
 *
 * Astro builds heading ids with `github-slugger`, and the slugger drops the
 * emoji and keeps the space that followed it: `## 🚀 Features` became
 * `id="-features"`, `## ⚙️ Tech Stack` became `id="️-tech-stack"` with the
 * variation selector still sitting in it. A hundred and six of them on the
 * site, and every one of them is an anchor that resolves to nothing.
 *
 * The plugin runs before Astro's own heading-id pass — Astro registers the
 * user's rehype plugins first and slugifies the headings afterwards — so it
 * sets the id itself and Astro keeps it: `rehypeHeadingIds` only slugifies a
 * heading that has no id yet.
 *
 * The rules:
 *
 *   - the id is the slug of the heading's text with the decoration taken off
 *     the front and the back: the emoji, the variation selectors that hang
 *     off them, and the separator punctuation around them;
 *   - the heading text itself is not touched — the emoji stays on the page,
 *     it just stops being part of the address;
 *   - a heading that already has an id keeps it;
 *   - a heading with no usable text left keeps the id Astro would have given
 *     it, rather than an empty one.
 *
 * Registered in astro.config.mjs under `markdown.rehypePlugins`.
 */

/** The node types the text of a heading is read from. */
const TEXT_TYPES = new Set(['text', 'raw', 'mdxTextExpression']);

/** Inside code, the text is taken as it is written. */
const CODE_TAGS = new Set(['code', 'pre']);

/**
 * The decoration around a heading: the emoji, the variation selectors and
 * the joiners that hang off them, and the punctuation that is only ever a
 * separator.
 *
 * All of it is dropped by the slugger anyway — taking it off the text first
 * is what keeps the space that follows an emoji from turning into a leading
 * hyphen.
 */
const DECORATION = /[ -⯿\u{FE00}-\u{FE0F}\u{1F000}-\u{1FAFF}]/gu;

/** The punctuation that only separates, at either end of a heading. */
const SEPARATOR = /^[\s\-–—_.:,;!?]+|[\s\-–—_.:,;!?]+$/g;

/**
 * The text of a heading, read the way Astro reads it.
 *
 * Astro extracts the text before it slugifies, and the two have to agree: an
 * id built from a different text is an id that nothing links to. An element
 * contributes nothing itself but its own text is read, a raw node that looks
 * like an HTML tag is skipped, and text inside `code` is taken as it is
 * written.
 */
function headingText(node, isMdx) {
  let text = '';

  const walk = (current, parent) => {
    const children = current.children || [];
    for (const child of children) {
      if (!child || typeof child !== 'object') continue;

      if (child.type === 'element') {
        walk(child, child);
        continue;
      }

      if (child.type === 'raw' && /^\n?<.*>\n?$/.test(child.value)) continue;
      if (!TEXT_TYPES.has(child.type)) continue;

      if (isMdx || (parent && CODE_TAGS.has(parent.tagName))) {
        text += child.value;
      } else {
        // Astro escapes a brace that is not an expression, so that a heading
        // with `{` in it slugifies the same way in every file type.
        text += child.value.replace(/\{/g, '${');
      }
    }
  };

  walk(node, node);
  return text;
}

/**
 * The slug of a string, by the rules of `github-slugger` — the slugger Astro
 * uses: lower case, punctuation and symbols dropped, spaces turned into
 * hyphens.
 *
 * It is written out here rather than imported so the plugin carries no
 * dependency of its own: `github-slugger` is a dependency of Astro, not one
 * this repository declares, and an undeclared import is one `npm ci` away
 * from being a broken build.
 */
function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\-_ ]/gu, '')
    .replace(/ /g, '-');
}

/**
 * The slugger, keeping track of the slugs it has already handed out.
 *
 * A heading that repeats its text gets a number: the second `## Features` is
 * `features-1`, the third `features-2`.
 */
class Slugger {
  constructor() {
    this.occurrences = Object.create(null);
  }

  slug(value) {
    let result = slugify(value);
    const original = result;

    while (Object.prototype.hasOwnProperty.call(this.occurrences, result)) {
      this.occurrences[original] += 1;
      result = original + '-' + this.occurrences[original];
    }

    this.occurrences[result] = 0;
    return result;
  }
}

/** The text of a heading, without the decoration around it. */
export function cleanHeadingText(text) {
  return text.replace(DECORATION, '').replace(SEPARATOR, '');
}

/** The slug of a heading's text, as Astro would have made it. */
export function headingSlug(text) {
  return slugify(cleanHeadingText(text));
}

export default function rehypeHeadingIds() {
  return (tree, file) => {
    const history = (file && file.history) || [];
    const isMdx = Boolean(history[0] && history[0].endsWith('.mdx'));
    const slugger = new Slugger();

    const walk = (node) => {
      const children = node.children || [];
      for (const child of children) {
        if (!child || typeof child !== 'object') continue;

        if (child.type === 'element' && /^h[1-6]$/.test(child.tagName)) {
          const properties = child.properties || {};
          // A heading that already carries an id keeps it, and does not
          // take a number away from the headings that repeat their text.
          if (typeof properties.id !== 'string') {
            const cleaned = cleanHeadingText(headingText(child, isMdx));
            if (cleaned) {
              let slug = slugger.slug(cleaned);
              // A slug that ends in a hyphen ends in the space the heading
              // ended with; the slugger leaves it, and so does Astro.
              if (slug.endsWith('-')) slug = slug.slice(0, -1);
              if (slug) {
                child.properties = properties;
                child.properties.id = slug;
              }
            }
          }
        }

        walk(child);
      }
    };

    walk(tree);
  };
}
