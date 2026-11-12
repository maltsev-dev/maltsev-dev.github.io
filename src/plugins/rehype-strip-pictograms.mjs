/**
 * The pictograms out of the post bodies.
 *
 * The site is drawn in one colour. Amber phosphor on a near-black ground,
 * box drawing for the rules, blocks for the diagrams, a mono face for
 * everything that is a word. A post body was the one place where that rule
 * was broken: the corpus is a decade of writing made on a platform whose
 * editor had a button for inserting an emoji, and a gear before "Tech
 * stack" or a sparkle before "Features" used to end up in the middle of a
 * mono heading, where the heading stops being a heading from that moment on.
 *
 * The corpus has been cleaned up, so the site rarely has anything to strip.
 * The plugin stays as the rule that keeps it that way, and as the answer for
 * the next post that arrives with an ornament in it.
 *
 * The rule is deliberately narrow, because the corpus is not only emoji: it
 * is also ASCII art, and the art uses the same Unicode blocks the emoji
 * live in. The arrows in the diagrams (→), the triangles (▶), the solid and
 * hollow squares, the check marks in the tables and every box-drawing
 * character are all things this plugin must leave alone. What it removes is
 * exactly the set of characters a browser would paint in colour:
 *
 *   1. anything with the Unicode `Emoji_Presentation` property — the ones
 *      that are emoji whether or not anything else says so;
 *   2. anything that was followed by the emoji selector (U+FE0F) — the ones
 *      that are only emoji because a selector says so. The selector goes
 *      with them, or it would turn the character back into text.
 *
 * The two marks that carry meaning rather than decoration are kept, as the
 * monochrome versions of themselves: ✅ and ❌ become ■ and □. A table with a
 * yes in it must still have a yes in it; a filled square and an empty one
 * say the same thing in a terminal.
 *
 * An ornament takes up a place and leaves its spacing behind, so the word
 * after it would start half a space in. The gap the removal leaves is
 * closed, and a word that opens a heading or a paragraph is pulled back to
 * the margin.
 *
 * Registered in astro.config.mjs under `markdown.rehypePlugins`.
 */

/** The marks that mean something, and the plain marks that mean it here. */
const SUBSTITUTE = new Map([
  ['✅', '■'], // white heavy check mark
  ['❌', '□'], // cross mark
]);

/**
 * The emoji selector, the zero-width joiner and the keycap mark.
 *
 * They are not pictograms themselves — they are the punctuation around them.
 * Left behind, a stray selector renders as a box on some platforms.
 */
const ORPHAN = /[\uFE0F\u200D\u20E3]/gu;

/** The characters a browser paints in colour without being told to. */
const PICTOGRAM = /\p{Emoji_Presentation}/gu;

/**
 * A pictogram that was told to be one.
 *
 * The selector only counts when the character before it is itself a
 * pictogram: an arrow followed by a selector would be a plain arrow with a
 * stray mark, and the arrow is ASCII art.
 */
const SELECTED = /\p{Extended_Pictographic}\uFE0F/gu;

/**
 * Take the colour out of one string.
 *
 * Exported so the title pipeline and the body pipeline can be checked
 * against each other.
 */
export function stripPictograms(text) {
  let out = text;

  for (const [from, to] of SUBSTITUTE) {
    out = out.split(from).join(to);
  }

  out = out.replace(SELECTED, '');
  out = out.replace(PICTOGRAM, '');
  out = out.replace(ORPHAN, '');

  return out;
}

/** Walk the tree, cleaning every text node it holds. */
export default function rehypeStripPictograms() {
  return (tree) => {
    const walk = (node) => {
      const children = node.children || [];

      // A block that starts with a word: a heading, a paragraph, a list
      // item, a table cell. An ornament at the front of one of these
      // leaves the space that separated it from the word behind it, and
      // the word then starts half a space in.
      const startsWithWord = /^(h[1-6]|p|li|td|th|blockquote)$/.test(
        node.tagName || ''
      );

      let first = true;

      for (const child of children) {
        if (!child || typeof child !== 'object') continue;

        // Code is code. A snippet with a box-drawing character in it is a
        // snippet about box drawing, and the characters there are the
        // subject, not decoration.
        if (child.tagName === 'code' || child.tagName === 'pre') continue;

        if (child.type === 'text' && typeof child.value === 'string') {
          const before = child.value;
          let after = stripPictograms(before);

          if (after !== before) {
            // The ornament took up a place and left its spacing behind.
            after = after.replace(/[ \t]{2,}/g, ' ');

            if (startsWithWord && first) {
              after = after.replace(/^[ \t]+/, '');
            }
          }

          child.value = after;
          first = false;
          continue;
        }

        walk(child);
        first = false;
      }
    };

    walk(tree);
  };
}
