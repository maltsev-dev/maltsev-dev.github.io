/**
 * Intrinsic size of an image file, read from the file itself.
 *
 * The site had 109 `<img>` elements and not one of them carried a `width` or
 * a `height`, so the browser could not reserve the space before the bytes
 * arrived and every article shifted as its figures landed. The size is
 * written in the file header, so it does not have to be guessed or
 * maintained by hand.
 */

/** PNG: the IHDR chunk carries the size. */
function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

/** GIF: the logical screen descriptor carries the size. */
function gifSize(buf) {
  if (buf.length < 10 || buf.toString('latin1', 0, 3) !== 'GIF') return null;
  return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
}

/** JPEG: the size lives in the frame header (SOF). */
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    // Standalone markers carry no length.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    const isFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isFrame) {
      return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    }
    i += 2 + len;
  }
  return null;
}

/** SVG: the width and height attributes, or the viewBox. */
function svgSize(text) {
  const w = text.match(/\bwidth="([\d.]+)"/);
  const h = text.match(/\bheight="([\d.]+)"/);
  if (w && h) return [Math.round(Number(w[1])), Math.round(Number(h[1]))];
  const box = text.match(/\bviewBox="([-\d.\s]+)"/);
  if (box) {
    const parts = box[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4) return [Math.round(parts[2]), Math.round(parts[3])];
  }
  return null;
}

/**
 * The intrinsic size of an image, or null when the format is not one of the
 * four the site uses.
 */
export function imageSize(buf) {
  return (
    pngSize(buf) ||
    gifSize(buf) ||
    jpegSize(buf) ||
    svgSize(buf.toString('utf8', 0, 4096))
  );
}
