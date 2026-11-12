"""
Make the portrait's data files.

The portrait is the one the ASCII portrait tool draws. The tool's own page
holds one PNG with two halves in it: the portrait on top, and the height map
below it. It draws the two together — the height map says which character
stands in each cell and how far out of the page that cell sits, the portrait
says what colour the character is.

This writes the same picture out in the form the site draws it:

  static/portrait.png         the portrait, cut out, in a small palette
  static/portrait-height.png  the height map: red for the character, green
                              for the relief

The pixels are the tool's own. The portrait is cut out by its alpha exactly
as the tool cuts it, and the height map keeps its red and green channels
byte for byte, so the site draws the picture the tool draws. Only the
encoding is different: a palette PNG for the portrait, because a photograph
of a face does not need thousands of colours, and the crop the tool's loose
framing left on the table.

    python -I _gen_portrait.py "ASCII 3D портрет (1).html" static

Needs Pillow. The output is committed, so the site never runs this.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys

from PIL import Image

# --- the picture ------------------------------------------------------------

# Where the picture sits in the grid, as fractions of it.
#
# The tool's own framing is a little loose: the head is in the middle with
# empty paper on either side of it. This trims that empty paper away, and
# nothing else — the head, the collar and the shoulders stay where they
# were.
CROP = (0.05, 0.02, 0.95, 0.95)

# How many colours the portrait is reduced to.
#
# The photograph has close to ten thousand of them, and the difference
# between two neighbouring ones is a shade nobody can see at three pixels a
# cell. A hundred and twenty-eight of them is the same picture.
PALETTE = 128

# The grid the tool drew: the portrait is on top, the height map below, and
# the two are the same size.
SOURCE = "ASCII 3D портрет (1).html"


def extract_png(path: str) -> bytes:
    """The PNG out of the tool's page, or the PNG itself."""
    with open(path, "rb") as handle:
        head = handle.read(8)

    if head.startswith(b"\x89PNG"):
        with open(path, "rb") as handle:
            return handle.read()

    text = open(path, encoding="utf-8", errors="replace").read()
    match = re.search(r"data:image/png;base64,([A-Za-z0-9+/=]+)", text)
    if not match:
        raise SystemExit(f"no picture found in {path}")

    return base64.b64decode(match.group(1))


def split(png: bytes) -> tuple[Image.Image, Image.Image]:
    """The portrait and the height map."""
    import io

    im = Image.open(io.BytesIO(png)).convert("RGBA")
    w, h = im.size
    rows = h // 2

    return im.crop((0, 0, w, rows)), im.crop((0, rows, w, h))


def crop_pair(
    portrait: Image.Image, height: Image.Image, crop: tuple[float, float, float, float]
) -> tuple[Image.Image, Image.Image]:
    """The same crop of both halves."""
    w, rows = portrait.size
    x0, y0 = int(crop[0] * w), int(crop[1] * rows)
    x1, y1 = int(crop[2] * w), int(crop[3] * rows)

    return portrait.crop((x0, y0, x1, y1)), height.crop((x0, y0, x1, y1))


def write_picture(portrait: Image.Image, out: str) -> int:
    """The portrait, as a palette PNG with a transparent entry.

    The cut-out is what the tool cut out, alpha and all — the tool skips the
    cells the portrait is not in, and so does this. The alpha is a straight
    yes or no, so it rides on the palette as a transparent entry rather than
    a channel of its own, and the picture costs a fifth of what it would
    cost as it stands.
    """
    rgb = portrait.convert("RGB")
    alpha = portrait.getchannel("A")

    px = rgb.load()
    ap = alpha.load()
    w, h = portrait.size

    solid = [[ap[x, y] >= 128 for x in range(w)] for y in range(h)]

    # The colour the paper takes where the picture is not. It is only there
    # to keep the palette honest — the quantiser must not spend its colours
    # on the empty background — and it is thrown away afterwards.
    covered = [px[x, y] for y in range(h) for x in range(w) if solid[y][x]]
    paper = tuple(sum(c[i] for c in covered) // len(covered) for i in range(3))

    flat = Image.new("RGB", portrait.size, paper)
    flat.paste(rgb, (0, 0), alpha.point(lambda v: 255 if v >= 128 else 0))

    quantised = flat.quantize(colors=PALETTE, method=Image.Quantize.MEDIANCUT)
    palette = quantised.getpalette()[: PALETTE * 3]
    qp = quantised.load()

    # Which entries of the palette the picture actually uses.
    used = set()
    for y in range(h):
        for x in range(w):
            if solid[y][x]:
                used.add(qp[x, y])

    keep = sorted(used)
    remap = {old: i for i, old in enumerate(keep)}

    out_palette = []
    for old in keep:
        out_palette += palette[old * 3 : old * 3 + 3]
    out_palette += [0, 0, 0]

    index = Image.new("P", portrait.size)
    ip = index.load()
    for y in range(h):
        for x in range(w):
            ip[x, y] = remap[qp[x, y]] if solid[y][x] else len(keep)

    index.putpalette(out_palette)
    transparency = bytes([255] * len(keep) + [0])

    index.save(out, format="PNG", optimize=True, transparency=transparency)

    # How bright the picture is, over the part of it that is there. The
    # drawing on paper stretches this range over the whole of the paper, so
    # that the drawing has the full of the paper's contrast to spend.
    brightest = 0
    darkest = 255

    for y in range(h):
        for x in range(w):
            if not solid[y][x]:
                continue

            r, g, b = out_palette[remap[qp[x, y]] * 3 : remap[qp[x, y]] * 3 + 3]
            lum = 0.299 * r + 0.587 * g + 0.114 * b

            brightest = max(brightest, lum)
            darkest = min(darkest, lum)

    return len(keep), (round(darkest), round(brightest))


def write_height(height: Image.Image, out: str) -> None:
    """The height map, as it is.

    Red says which character stands in the cell — the tool reads it as
    round(red / 255 * 63) — and green says how far the cell stands out of
    the page, which is the relief. Blue is not used by the tool and is
    dropped.
    """
    r, g, _b, _a = height.split()
    flat = Image.new("L", r.size, 0)
    Image.merge("RGB", (r, g, flat)).save(out, format="PNG", optimize=True)


def write_module(cols: int, rows: int, light: tuple[int, int], out: str) -> None:
    """The grid, for the layout.

    The page needs to know how big the picture is before it is drawn, so
    that the window it sits in does not jump when the picture arrives. It
    also needs to know how bright the picture is, because the drawing on
    paper stretches the picture's own range of tones over the whole of it.
    """
    module = f'''/**
 * The portrait's grid.
 *
 * Generated by `_gen_portrait.py`. The picture is {cols} cells across and
 * {rows} down, and a cell is one and a half times taller than it is wide.
 *
 * Do not edit this by hand — run the generator instead:
 *
 *     python -I _gen_portrait.py "ASCII 3D портрет (1).html" static
 */

/** Cells across. */
export const PORTRAIT_COLS = {cols};

/** Cells down. */
export const PORTRAIT_ROWS = {rows};

/** How much taller a cell is than it is wide. */
export const PORTRAIT_CELL_RATIO = 1.6;

/** The brightest cell of the picture. */
export const PORTRAIT_LIGHT_MIN = {light[0]};

/** The darkest cell of the picture. */
export const PORTRAIT_LIGHT_MAX = {light[1]};

/** The picture. */
export const PORTRAIT_PICTURE = '/portrait.png';

/** The height map below it. */
export const PORTRAIT_HEIGHT = '/portrait-height.png';
'''

    with open(out, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(module)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "source", nargs="?", default=SOURCE, help="the tool's page, or the portrait png"
    )
    parser.add_argument("out", nargs="?", default="static", help="where to write the pngs")
    parser.add_argument(
        "--module",
        default="src/data/portrait.ts",
        help="the module to write the grid into",
    )
    parser.add_argument(
        "--crop",
        default=",".join(str(v) for v in CROP),
        help="x0,y0,x1,y1 as fractions of the grid",
    )
    args = parser.parse_args()

    crop = tuple(float(v) for v in args.crop.split(","))

    portrait, height = crop_pair(*split(extract_png(args.source)), crop)

    picture = f"{args.out}/portrait.png"
    relief = f"{args.out}/portrait-height.png"

    colours, light = write_picture(portrait, picture)
    write_height(height, relief)

    cols, rows = portrait.size
    write_module(cols, rows, light, args.module)

    print(
        f"{cols}x{rows} cells, {colours} colours, tones {light[0]}-{light[1]}"
        f" -> {picture}, {relief}, {args.module}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
