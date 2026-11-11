/**
 * Give every table in a Markdown body a scroll container of its own.
 *
 * A table wide enough for its content does not fit a phone. The article's
 * prose has `overflow-x: visible`, so the table simply pushed the document
 * wider than the viewport — and Chrome, asked to lay out a 713-pixel table
 * inside a 390-pixel window, answered by widening the *layout viewport* to
 * 730 pixels. The visible area stayed 390, but the page could now be dragged
 * sideways by 340 pixels, and the header changed shape with it: the
 * navigation stopped being the flat mobile bar and became the three-row
 * intermediate layout.
 *
 * The class `.table-scroll` was in the stylesheet for this and nothing used
 * it. Now the wrapper is in the markup: the table scrolls inside its own
 * box, the document keeps its width, and the header keeps its shape.
 *
 * Registered in astro.config.mjs under `markdown.rehypePlugins`.
 */

/**
 * Replace a node with another in its parent's children.
 *
 * The tree is walked by hand rather than with a visitor: the plugin is three
 * dozen lines and the dependency would be one more thing to keep current.
 */
function replaceChild(parent, index, replacement) {
  const children = parent.children || [];
  const removed = children.splice(index, 1, replacement);
  return removed[0];
}

/** Walk the tree, wrapping every table it finds. */
export default function rehypeTableScroll() {
  return (tree) => {
    const walk = (node) => {
      const children = node.children || [];
      for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        if (!child || typeof child !== 'object') continue;

        if (child.tagName === 'table') {
          const wrapper = {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['table-scroll'],
              // The box is a scroll region, and a keyboard user has to be
              // able to reach it to scroll it.
              tabIndex: 0,
            },
            children: [child],
          };
          replaceChild(node, i, wrapper);
          // The table is now inside the wrapper; walk the table's own
          // children, not the wrapper's, so a table inside a table is still
          // wrapped by its own box.
          walk(child);
          continue;
        }

        walk(child);
      }
    };

    walk(tree);
  };
}
