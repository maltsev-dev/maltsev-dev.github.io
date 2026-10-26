"""Build the box-drawing art font the architecture diagram needs.

The diagram is 119 columns of `┌ ─ │ ▼ •` and letters, and it only lines up if
every one of those glyphs comes from a face with a single advance width. The
stack the CSS asked for — Cascadia Mono, Consolas, SF Mono, Menlo, the DejaVu
and Liberation faces — is a list of fonts the site does not ship: on Linux,
ChromeOS and most Android devices none of them is there, the browser falls
through to a generic `monospace`, and the box-drawing glyphs in it do not
share the advance width of the letters. The grid falls apart.

So the site ships the face instead of hoping for it. Cascadia Mono is under
the SIL Open Font License. This script subsets it to the characters the
drawing actually uses and writes one woff2.

    python scripts/build-art-font.py

The source is the Cascadia Mono that ships with Windows; point --source at a
Cascadia Mono TTF if you are building somewhere else.
"""

import argparse
import pathlib
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "static" / "fonts" / "cascadia-mono-art.woff2"

DEFAULT_SOURCE = pathlib.Path("C:/Windows/Fonts/CascadiaMono.ttf")

# Everything the diagram and the other art on the site can draw:
#   ASCII            the labels
#   ·                the middle dot used in the labels
#   – — ' ' " "     the punctuation the site uses
#   •                the separator inside a box
#   ← → ↑ ↓ ↔        arrows
#   ─ │ ┌ ┐ └ ┘ ┬ ┴ ┼  box drawing
#   ▼ ● ◆ ○ ▪ ◼      the geometric shapes
#   ▀ ▄ █ ░ ▒ ▓      block elements
RANGES = [
    (0x0020, 0x007E),
    (0x00B7, 0x00B7),
    (0x2010, 0x2027),
    (0x2190, 0x21FF),
    (0x2500, 0x257F),
    (0x25A0, 0x25FF),
    (0x2580, 0x259F),
]


def charset() -> str:
    out = []
    for lo, hi in RANGES:
        out.extend(range(lo, hi + 1))
    return "".join(chr(c) for c in out)


def advances(path: pathlib.Path, chars: str) -> dict:
    """The advance width of each character, in font units."""
    font = TTFont(path)
    upem = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    out = {}
    for ch in chars:
        glyph = cmap.get(ord(ch))
        if glyph is None:
            out[ch] = None
            continue
        out[ch] = hmtx[glyph][0]
    font.close()
    return upem, out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", type=pathlib.Path, default=DEFAULT_SOURCE)
    args = ap.parse_args()

    if not args.source.exists():
        print(f"source font not found: {args.source}", file=sys.stderr)
        return 1

    OUT.parent.mkdir(parents=True, exist_ok=True)

    # The advance width of the glyphs the grid depends on. If these differ,
    # the drawing shears and no amount of subsetting helps.
    upem, adv = advances(args.source, "M─┌•▼")
    widths = {c: (v / upem if v is not None else None) for c, v in adv.items()}
    # The console here is cp1252 and cannot print a box-drawing character, so
    # the report is by codepoint.
    print("source advances (em):", {f"U+{ord(c):04X}": round(v, 4) for c, v in widths.items()})
    if len({v for v in widths.values() if v is not None}) > 1:
        print("source face has mixed advances — the grid cannot use it", file=sys.stderr)
        return 1

    options = subset.Options()
    options.flavor = "woff2"
    options.desubroutinize = True
    options.drop_tables += ["DSIG"]
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    options.recalc_bounds = True

    font = subset.load_font(str(args.source), options)
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=charset())
    subsetter.subset(font)
    subset.save_font(font, str(OUT), options)

    # The subset must keep the same advance as the source, or the columns the
    # diagram was drawn to no longer line up.
    sub_upem, sub_adv = advances(OUT, "M─┌•▼")
    sub_widths = {c: (v / sub_upem if v is not None else None) for c, v in sub_adv.items()}
    print("subset advances (em):", {f"U+{ord(c):04X}": round(v, 4) for c, v in sub_widths.items()})

    if sub_widths != widths:
        print("subset advances differ from the source", file=sys.stderr)
        return 1

    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
