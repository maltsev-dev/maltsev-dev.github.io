/**
 * Stamp every image in a Markdown body with the attributes the browser needs
 * to lay it out before the bytes arrive.
 *
 * The site's 109 images shipped bare: no `width`, no `height`, no `loading`,
 * no `decoding`. Two things followed from that. The browser had no intrinsic
 * size to reserve, so each figure shifted the article down as it landed —
 * cumulative layout shift on every post with an image. And with `decoding`
 * unset the image was decoded on the main thread, on the critical path of
 * the text around it.
 *
 * The size is read from the file itself for the images the site hosts, and
 * from a recorded map for the two dozen badges that live on a third party's
 * server. Both are exact; neither is a guess.
 *
 * Registered in astro.config.mjs under `markdown.rehypePlugins`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from './image-size.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const STATIC = join(ROOT, 'static');

// The images that are not hosted here — the shields.io badges and the GitHub
// action badges — measured once by scripts/image-dimensions.mjs. The build
// itself never reaches out to the network.
const REMOTE = JSON.parse(
  readFileSync(join(HERE, '..', 'data', 'image-dimensions.json'), 'utf-8')
);

/** The size of an image the site hosts, read from its header. */
function localSize(src) {
  let path = src.split('#')[0].split('?')[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    /* a malformed escape is not worth failing the build over */
  }
  const file = join(STATIC, path.replace(/^\/+/, ''));
  if (!existsSync(file)) return null;
  try {
    return imageSize(readFileSync(file));
  } catch {
    return null;
  }
}

/** The size of an image the site does not host, from the recorded map. */
function remoteSize(src) {
  const entry = REMOTE[src];
  return entry ? [entry.width, entry.height] : null;
}

/** Every node in the tree, depth first. */
function eachNode(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') fn(node);
  for (const child of node.children || []) eachNode(child, fn);
}

/**
 * The attributes for one image, given its source.
 *
 * An image written as raw HTML in a post body — the version badges are —
 * never becomes an element: the Markdown pipeline hands it through as text.
 * So the tag is stamped as text.
 */
function stampRawTag(tag) {
  const src = (tag.match(/\bsrc\s*=\s*"([^"]*)"/) || tag.match(/\bsrc\s*=\s*'([^']*)'/))?.[1];
  if (!src) return tag;
  const size = /^https?:/i.test(src) ? remoteSize(src) : localSize(src);
  let out = tag;
  const add = (name, value) => {
    if (new RegExp(`\\b${name}\\s*=`).test(out)) return;
    out = out.replace(/^<img\b/i, `<img ${name}="${value}"`);
  };
  add('loading', 'lazy');
  add('decoding', 'async');
  if (size) {
    add('width', size[0]);
    add('height', size[1]);
  }
  return out;
}

export default function rehypeImageAttrs() {
  return (tree) => {
    eachNode(tree, (node) => {
      // Raw HTML in a Markdown body: the badges. It is text by the time it
      // reaches here, so it is stamped as text.
      if (node.type === 'raw' && typeof node.value === 'string' && node.value.includes('<img')) {
        node.value = node.value.replace(/<img\b[^>]*>/gi, stampRawTag);
        return;
      }
      if (node.tagName !== 'img') return;
      const props = node.properties || (node.properties = {});

      // An image that is not fetched until it is near the viewport cannot
      // delay the text around it.
      if (props.loading === undefined) props.loading = 'lazy';
      // Decoding off the main thread.
      if (props.decoding === undefined) props.decoding = 'async';

      const src = props.src;
      if (!src || props.width !== undefined || props.height !== undefined) return;

      const size = /^https?:/i.test(src) ? remoteSize(src) : localSize(src);
      if (!size) return;
      props.width = size[0];
      props.height = size[1];
    });
  };
}
