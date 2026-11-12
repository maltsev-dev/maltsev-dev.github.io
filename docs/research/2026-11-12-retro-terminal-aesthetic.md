# Retro terminal / retro computing / hacker-culture visual aesthetic — research dossier

**Date:** 2026-11-12
**Question:** What is the actual visual vocabulary of CRT terminals and retro-computing UIs, what real references exist, what concrete patterns and code implement them, and how do we keep it legible and accessible?
**Decision it informs:** a redesign of a personal developer portfolio (Astro 5 + `three` 0.180, per `package.json`) in a retro-terminal style — which parts to copy, which to skip, and what to build first.

**Method.** Primary sources first: Wikipedia articles on monochrome monitors, phosphors, CRTs, ASCII art, TUIs, VT100, VGA, POST, ANSI escape codes; W3C WCAG 2.2 Understanding pages; MDN; Unicode code charts; upstream GitHub repos (readme + raw source fetched); the Unicode character charts; the spectral-to-hex phosphor table. Vendor blogs and SEO listicles were used only as pointers and are marked.

**Confidence labels used below**
- `FACT` — directly stated by a fetched primary source, quoted/paraphrased.
- `FACT (computed)` — arithmetic I performed against a fetched spec (WCAG relative-luminance formula).
- `INFERENCE` — my design conclusion drawn from facts; reasonable but not directly sourced.
- `OPINION` — taste.
- `UNCERTAIN` — could not verify; flagged for follow-up.

---

## 0. Corrections to the brief (read first)

| Brief said | Reality | Source |
|---|---|---|
| "amber P1, green P3" | **Inverted.** `P1` = green, `P3` = amber/yellow, `P4` = white ("page white"). | https://en.wikipedia.org/wiki/Monochrome_monitor ; https://en.wikipedia.org/wiki/Phosphor — both fetched |
| IBM 5151 | Wikipedia names the 5151 as the 1981 PC 5150's display but **does not assign it a phosphor**. A Hacker News comment (user `bitwize`) says the 5151 used **P39** (green, long persistence). Treat "5151 = green P39" as `UNCERTAIN` (secondary source, not fetched directly — https://news.ycombinator.com/item?id=33486902). | see above |
| three.js ships `webgl_postprocessing_crt` + `examples/jsm/shaders/CRTShader.js` | **It does not (anymore).** `https://threejs.org/examples/files.json` (fetched) contains **no filename containing "crt"** — neither `webgl_*` nor `webgpu_*`. The jsDelivr listing of `three@0.160.0/examples/jsm/shaders/` contains no `CRTShader`. The `webgpu_postprocessing_crt` example is **gone**. Search-engine summaries that confidently quote `CRTShader.js` uniforms are stale/hallucinated. | files.json + jsDelivr listings, fetched |
| xterm.js is "terminal-to-web" tooling | xterm.js is a *terminal emulator for the browser*; it needs a backend shell (node-pty + WebSocket) to be a shell. For a static portfolio you want the *look*, not a shell. | https://xtermjs.org/ (fetched) |

---

## 1. Sources

Legend for the last column: **fetched** = I retrieved and read the page/repo/raw file; **listed** = URL surfaced in search results and is canonical for that resource, but I did not open it in this pass.

| # | URL | Type | What it gave me | Verified |
|---|---|---|---|---|
| S1 | https://en.wikipedia.org/wiki/Monochrome_monitor | primary-ish encyclopedia | P1 green / P3 amber / P4 white; IBM 5151 is the 1981 PC 5150 display; long-persistence monitors | fetched |
| S2 | https://en.wikipedia.org/wiki/Phosphor | primary-ish encyclopedia | P1 = Zn₂SiO₄:Mn, green, 525 nm, 1–100 ms; P3 = Zn₈:BeSi₅O₁₉:Mn, yellow, 602 nm, medium 13 ms; P4 = white, 565/540 nm, short; P39 = green 525 nm, long persistence | fetched |
| S3 | https://publish.obsidian.md/xybre/permalink/e397c38e-aa6f-45eb-831f-f02a3836abc4 | primary data table | wavelength→hex under four conversion methods (P1 525 nm → `#4aff00`/`#33FF33`/`#00fa37`/`#08ff35`; P3 600 nm → `#ffbe00`/`#FFB000`/`#fa9b00`/`#f68100`) | fetched |
| S4 | https://en.wikipedia.org/wiki/Cathode-ray_tube | encyclopedia | raster scanning, sawtooth deflection, 15–240 kHz horizontal rate, phosphor coating, faceplate curvature radius grew 30→68 in, burn-in from static images | fetched |
| S5 | https://en.wikipedia.org/wiki/ASCII_art | encyclopedia | 95 printable chars (32–126); BBS origins late 70s–80s; block/shading chars `░ █ ▄ ▀ ▓ ▒`, Braille `⣿ ⣴ ⢁`; CP437 vs strict ASCII | fetched |
| S6 | https://en.wikipedia.org/wiki/Text-based_user_interface | encyclopedia | TUIs pre-GUI; curses/ncurses; box-drawing `┌ ╣`; CP437; ANSI X3.64 | fetched |
| S7 | https://en.wikipedia.org/wiki/VT100 | encyclopedia | 12" CRT; 80×24 or 132×14 (AVO → 132×24); DEC box-drawing set; blink/bold/reverse/underline attributes | fetched |
| S8 | https://terminals-wiki.org/wiki/index.php/DEC_VT320 | reference wiki | VT320 = 24 rows × 80 or 132 cols, 15×12 and 9×12 character matrices, green/white/amber options, status line | fetched |
| S9 | https://en.wikipedia.org/wiki/Video_Graphics_Array | encyclopedia | canonical 16-colour text-mode palette with RGB values; 80×25 at 9×16 cells = 720×400 | fetched |
| S10 | https://en.wikipedia.org/wiki/Power-on_self-test | encyclopedia | POST role; memory count from IBM XT onward; beep-code families | fetched |
| S11 | https://en.wikipedia.org/wiki/ANSI_escape_code | encyclopedia | `ESC[?25h/l` show/hide cursor; SGR 1 bold, 4 underline, 5 slow blink, 6 rapid blink, 7 reverse, 0 reset | fetched |
| S12 | https://en.wikipedia.org/wiki/Phosphor → (see S2) | — | — | — |
| S13 | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | standard | 4.5:1 text (SC 1.4.3), 3:1 large text (≥18pt, or ≥14pt bold) | fetched |
| S14 | https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html | standard | colour may not be the only visual signal; 3:1 lightness difference can substitute | fetched |
| S15 | https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html | standard | ≤3 flashes/s; flash = opposing luminance change ≥10 %, darker state <0.80; small-area exemption | fetched |
| S16 | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | standard | auto-started motion >5 s alongside other content needs pause/stop/hide | fetched |
| S17 | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion | reference | `reduce`/`no-preference`; Baseline widely available since Jan 2020 | fetched |
| S18 | https://developer.mozilla.org/en-US/docs/Web/CSS/text-shadow | reference | `<offset-x> <offset-y> <blur-radius> <color>`, multiple shadows front-to-back, **no spread** | fetched |
| S19 | https://css-tricks.com/snippets/css/typewriter-effect/ | reference | the canonical `steps(40,end)` width animation + `step-end` caret blink | fetched |
| S20 | https://www.unicode.org/charts/PDF/U2500.pdf | standard | Box Drawing chart U+2500–U+257F | fetched (index) |
| S21 | https://www.unicode.org/charts/PDF/U2580.pdf | standard | Block Elements chart U+2580–U+259F | fetched (index) |
| S22 | https://github.com/rektdeckard/departure-mono | repo | Departure Mono by Helena Zhang, OFL; use font sizes in **11 px increments** for pixel-perfect rendering | fetched |
| S23 | https://departuremono.com/ | project site | project home (thin page; details sparse) | fetched |
| S24 | https://github.com/IBM/plex | repo | IBM Plex Mono, OFL-1.1; npm `@ibm/plex-mono` | fetched |
| S25 | https://fonts.google.com/specimen/IBM+Plex+Mono | font service | webfont specimen (weights not enumerated in fetched text) | fetched |
| S26 | https://github.com/tonsky/FiraCode | repo | Fira Code, Nikita Prokopov, OFL-1.1, OTF/TTF/WOFF/VF, ligatures | fetched |
| S27 | https://github.com/be5invis/Iosevka | repo | Iosevka, OFL-1.1, many widths/weights, box-drawing/terminal oriented | fetched |
| S28 | https://int10h.org/oldschool-pc-fonts/ | repo/site | Ultimate Oldschool PC Font Pack v2.2, 200+ DOS-era charsets, TTF/FON/WOFF, **CC BY-SA 4.0**, incl. "IBM VGA 8x16" | fetched |
| S29 | https://github.com/dominikwilkowski/cfonts | repo | cfonts: 13 FIGlet-style fonts, gradients, `--env` HTML output mode, **GPL-3.0** | fetched |
| S30 | https://github.com/patorjk/figlet.js | repo | FIGfont in JS, MIT; `figlet.textSync`, `parseFont`, bundled `Standard` | fetched |
| S31 | https://github.com/charmbracelet/vhs | repo | VHS: terminal animations as code (`.tape`), GIF/MP4/WebM/PNG, MIT, gallery https://vhs.charm.sh/ | fetched |
| S32 | https://github.com/nbedos/termtosvg | repo | termtosvg → SVG animation, BSD-3, **archived/read-only since June 2020** | fetched |
| S33 | https://xtermjs.org/ | project | browser terminal emulator, npm `@xterm/xterm`; `open(el)` + `write()` | fetched |
| S34 | https://github.com/statico/langterm | repo | WebGL VT220-style terminal (bitmap font sprites → 2048² texture → CRT pass); scanlines, curvature, vignette, noise; MIT; demo https://langworth.com/ | fetched |
| S35 | https://github.com/remojansen/cool-retro-term-webgl | repo | WebGL CRT renderer that wraps **xterm.js** (`crt.attachXTerm(xterm)`); curvature, phosphor bloom, scanlines, RGB shift, flicker, static noise, burn-in, sync jitter; GPL-3.0; demo https://remojansen.github.io/ | fetched |
| S36 | https://github.com/OutThisLife/crt-shader | repo | multi-pass CRT reconstruction (horizontal/vertical/optics), WebGL2, MIT, `crt-shader/three` → `CRTPass` for EffectComposer | fetched |
| S37 | https://github.com/gingerbeardman/webgl-crt-shader | repo | tweakable GLSL CRT shader, MIT; demo https://gingerbeardman.github.io/webgl-crt-shader/ | fetched |
| S38 | https://raw.githubusercontent.com/gingerbeardman/webgl-crt-shader/main/CRTShader.js | raw source | **the uniform set I use below**, verbatim names/defaults | fetched |
| S39 | https://blog.gingerbeardman.com/2026/01/04/webgl-crt-shader/ | author write-up | dated 2026-01-04; "not a simulator"; runs to iPhone XS | fetched |
| S40 | https://threejs.org/examples/webgpu_postprocessing_retro.html | official example | **the maintained three.js retro reference**: pixelation, colour quantisation + Bayer dither, barrel distortion, scanlines, chromatic aberration, vignette, grain; TSL node `examples/jsm/tsl/display/RetroNode.js` | fetched |
| S41 | https://threejs.org/examples/files.json | official manifest | proof that no `crt` example ships today | fetched |
| S42 | https://gist.github.com/lmas/6a1bd445bc7a7145245085f4a740d3f5 | gist | `crt.css` — scanlines/flicker/colour-separation CSS (contains a typo: `rgb a(...)`) | fetched |
| S43 | https://asciiart.website/ | archive | Christopher Johnson's ASCII Art Collection, est. 1994, **7,622 artworks**, search/browse by category+tag+artist, image→ASCII and text→ASCII (FIGlet) tools | fetched |
| S44 | https://cyber.dabamos.de/88x31/ | archive | 88×31 button/banner GIF collection (4,000+), classic 1990s web | listed |
| S45 | https://patorjk.com/software/taag/ | tool | Text-to-ASCII Art Generator (TAAG), long-lived online FIGlet front-end | listed |
| S46 | https://github.com/xero/figlet-fonts | repo | ~300 FIGlet/toilet font files | listed |
| S47 | https://asciiflow.com/ | tool | browser ASCII diagram editor (now Unicode box-drawing; exports text only) | listed |
| S48 | https://terminaltrove.com/ | showcase | curated catalogue of modern CLI/TUI tools | listed (403 to my fetcher) |
| S49 | https://github.com/ratatui/awesome-ratatui | repo | curated list of real TUI apps — the best gallery of *finished* TUI UI | listed |
| S50 | https://github.com/jdan/98.css/ | repo | faithful Windows-98 CSS design system, semantic HTML, no JS | listed |
| S51 | https://botoxparty.github.io/XP.css/ | repo | Windows XP (Luna) counterpart, same API | listed |
| S52 | https://asciinema.org/ | tool | `.cast` terminal session recorder + web player | listed |
| S53 | https://github.com/tsl0922/ttyd | repo | live shell in the browser over WebSocket/xterm.js | listed |
| S54 | https://github.com/ryanoasis/nerd-fonts | repo | 70+ patched programming fonts, 10,000+ icons | listed |
| S55 | https://www.omoro.io/palettes/amber-terminal | palette generator | curated 5-colour amber CRT palette (interpretation, not canonical) | fetched |
| S56 | https://figlet.org/ | tool | upstream FIGlet — **DNS did not resolve from this environment** | listed, unresolved |
| S57 | https://caca.zoy.org/wiki/toilet | tool | upstream toilet (colour FIGlet) — **TLS handshake failed from this environment** | listed, unresolved |
| S58 | https://sourcefoundry.org/hack/ | font | Hack, Bitstream Vera Sans Mono derivative | listed |
| S59 | https://blog.ansi.org/ansi/ansi-art-ascii-art-iso-standards-x3-64/ | essay | ANSI's own history of ASCII art | listed |
| S60 | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html etc. | standard | WCAG 2.2 Understanding docs | fetched |

---

## 2. Palette

### 2.1 The phosphor facts (FACT)

| Phosphor | Composition | Peak | Persistence | Reads as |
|---|---|---|---|---|
| **P1 (GJ)** | Zn₂SiO₄:Mn | **525 nm** | 1–100 ms | green |
| **P3** | Zn₈:BeSi₅O₁₉:Mn | **602 nm** | medium, 13 ms | amber / yellow |
| **P4** | ZnS:Ag + (Zn,Cd)S:Ag | 565 / 540 nm | short | white ("page white") |
| **P39 (GR)** | Zn₂SiO₄:Mn,As | 525 nm | long | green |

Source: S2 (fetched). S1 confirms the P1/P3/P4 colour mapping: green / amber / white.

> Note the naming trap: "P1" is *green*, "P3" is *amber*, "P4" is *white*. (S1, S2)

### 2.2 Wavelength → hex (FACT, S3)

The same spectral colour converts to different sRGB hex depending on the method; that spread is the reason "the green" is never one value. Use the "user preference" column for UI work — it is the closest to how people actually paint terminal green.

| Phosphor | nm | Kuntzleman–Jacobson | **User preference** | Spektre | Modified Spektre |
|---|---|---|---|---|---|
| P1 GJ | 525 | `#4aff00` | **`#33FF33`** | `#00fa37` | `#08ff35` |
| P24 GE | 505 | `#00ff54` | `#66FF66` | `#00f162` | `#00f467` |
| (user) | 524 | `#46ff00` | `#33FF00` | `#00fa39` | `#07ff37` |
| (user) | 539 | `#7eff00` | `#FFCC00` | `#00f91e` | `#24fd1b` |
| **P3 Phosphor** | 600 | `#ffbe00` | **`#FFB000`** | `#fa9b00` | `#f68100` |
| P3 | 602 | `#ffb700` | — | `#fa9300` | `#f67800` |

### 2.3 Ready-to-use palettes

Contrast ratios are `FACT (computed)` using the WCAG relative-luminance formula against the stated background; the 4.5:1 / 3:1 thresholds come from S13.

#### Theme A — "Phosphor green" (P1/P39, 525 nm)

```css
:root {
  --crt-bg:      #000000;   /* the tube face */
  --crt-panel:   #050805;   /* panel/paper, a hair above black */
  --crt-fg:      #33FF33;   /* primary phosphor   15.49:1 on --crt-bg */
  --crt-fg-hi:   #AAFFAA;   /* highlight/bold     17.59:1 on --crt-bg */
  --crt-fg-dim:  #2E8B2E;   /* secondary text      4.85:1 on --crt-bg, 4.65:1 on --crt-panel */
  --crt-grid:    #2C5A2C;   /* rules, frames — decoration, not text */
  --crt-amber:   #FFB000;   /* P3 accent         11.46:1 on --crt-bg */
  --crt-amber-d: #B87A00;   /* dim amber          5.82:1 on --crt-bg */
  --crt-alert:   #FF5555;   /* error              6.68:1 on --crt-bg */
}
```
`FACT (computed)`: `#33FF33` vs `#000000` = 15.49:1; vs `#050805` = 14.85:1. `#2E8B2E` = 4.85:1 / 4.65:1. `#FFB000` = 11.46:1. `#B87A00` = 5.82:1. `#FF5555` = 6.68:1. `#AAFFAA` = 17.59:1.

`INFERENCE`: `#2E8B2E` is the *floor* for body-secondary text on a green tube. Anything dimmer reads as "disabled" and drops under 4.5:1 on a non-black panel. If you need a third, quieter tier, use `--crt-grid` for non-text decoration only.

#### Theme B — "Amber P3" (600–602 nm)

```css
:root {
  --crt-bg:      #000000;
  --crt-panel:   #0A0600;
  --crt-fg:      #FFB000;   /* 11.46:1 */
  --crt-fg-hi:   #FFD060;   /* Omoro's "Bright Output" (S55) */
  --crt-fg-dim:  #B87A00;   /* 5.82:1 */
  --crt-grid:    #5A3A00;
  --crt-alert:   #FF5555;
}
```
`FACT`: the five-colour amber palette `#040200 / #100800 / #302000 / #C07000 / #FFD060` is Omoro's *interpretation* of "Monochrome amber CRT: IBM 3278 readout in the dark" (S55) — a designed palette, not a measured one. Use it as a starting point; keep the WCAG-checked values above for text.

#### Theme C — "Paper white / blue-white" (P4-ish, 3270 blue)

```css
:root {
  --crt-bg:      #000000;
  --crt-panel:   #06080C;
  --crt-fg:      #F2F2F2;   /* 18.76:1 */
  --crt-fg-hi:   #FFFFFF;
  --crt-fg-dim:  #9AA4B2;   /* cool grey, ≥4.5:1 on #000 */
  --crt-grid:    #3A4250;
  --crt-accent:  #A8C8FF;   /* 12.37:1 */
  --crt-alert:   #FF5555;
}
```
`FACT (computed)`: `#F2F2F2` = 18.76:1, `#A8C8FF` = 12.37:1 on `#000000`.

#### Theme D — the DOS/VGA 16-colour text palette (FACT, S9)

Use this for *syntax highlighting inside terminal blocks*, not for chrome. These are the canonical EGA/VGA text-mode values:

```
#000000 #0000AA #00AA00 #00AAAA #AA0000 #AA00AA #AA5500 #AAAAAA
#555555 #5555FF #55FF55 #55FFFF #FF5555 #FF55FF #FFFF55 #FFFFFF
```
`FACT (computed)`: `#00AA00` on black = 6.75:1 (usable); `#AAAAAA` = 9.04:1; `#555555` = **2.82:1 — decoration only, never text**. `FACT`: VGA 80×25 text mode uses 9×16 pixel cells, giving a 720×400 effective resolution (S9) — that 9:16 cell is the reason DOS screens look "taller" than a modern 1:1 grid, and the reason block art should be built on a 1:2 or 1:1.35 cell.

---

## 3. Core visual vocabulary

### 3.1 Physics that you can fake (FACT unless noted)

| Element | Physical grounding | What to fake |
|---|---|---|
| **Raster / scanlines** | "The entire front area of the tube is scanned repeatedly and systematically in a fixed pattern called a raster"; horizontal rate 15–240 kHz (S4) | a `repeating-linear-gradient` overlay at 2–4 px period |
| **Phosphor bloom** | phosphor coating converts beam energy to light, decaying over ms (S2, S4) | `text-shadow` with a blurred same-hue layer |
| **Persistence / ghosting** | P1 1–100 ms, P3 13 ms, P4 short (S2) | (too slow to fake honestly; skip) |
| **Burn-in** | static images discolour the phosphor (S4) | a very faint permanent "ghost" of the header behind the page — `OPINION`: skip on a portfolio |
| **Faceplate curvature** | faceplate radius grew 30→68 in over time (S4) | rounded `border-radius` + inset shadow + corner vignette; true barrel needs a shader |
| **Character cell** | DEC VT320 matrices 15×12 and 9×12 (S8); VGA 9×16 (S9); VT100 80×24 (S7) | lay out in `ch` units so the grid never depends on the font's pixel size |
| **Bezel / status line** | VT320 has a status line (S8) | a fixed bottom strip: `PWR ●  HDD ●  NET ●  80×25  1:1` |

### 3.2 Grid geometry — the single most important decision

`FACT`: the VT100 was 80×24; the VT320 24×80 or 132×24; VGA text mode 25×80 (S7, S8, S9). `OPINION`: the *look* people recognise is **80 columns × 24–25 rows**, and a 9:16-ish cell (taller than wide).

`INFERENCE`: build every frame, tree, table and banner out of a **character grid**, not CSS borders, so that a narrow viewport can be handled by falling back to a smaller grid rather than reflowing the art. In CSS terms: set `font-variant-ligatures: none`, use `ch` for widths, and `white-space: pre` for art blocks.

`FACT`: the classic screen is **24 lines, not 25** — the 25th line was a DOS-ism (and the extra line is where the blinking cursor sat on a DOS box, with the cursor parked on line 25 until you typed).

### 3.3 Terminal chrome inventory

**Cursor.** `FACT` (S11): `ESC[?25h` shows the cursor, `ESC[?25l` hides it; DEC terminals supported a blink attribute (`ESC[5m` slow blink, `ESC[6m` rapid blink) alongside bold (`ESC[1m`), underline (`ESC[4m`) and reverse video (`ESC[7m`). `FACT` (S7): DEC's terminals supported blinking as a text attribute. `OPINION`: a **block** cursor (the cell is filled) reads "authentic terminal"; an **underline** cursor reads "modern terminal emulator". `UNCERTAIN`: that the VT220 (1983) was the first DEC terminal with a *blinking hardware cursor* — widely repeated, not verified in the sources fetched here.

**Prompt.** `FACT` (S7): the VT100's shell prompt style is the ancestor of `user@host:~$`. `OPINION`: a short prompt (`$ `, or `~/❯`) is better for a portfolio than `maltsev@dev:~$` — the long prompt eats 15 columns of an 80-column grid.

**Echo.** `FACT` (S6): TUIs have always been line-oriented with the interface built from the same streams the program prints to. `OPINION`: echoing the user's typed command back into the scrollback (rather than only showing it in the input field) is the single most convincing "this is a terminal" detail, because real shells echo.

**Boot / POST.** `FACT` (S10): POST runs before the bootstrap loader; from the IBM XT onward the machine displayed a **memory count**; one short beep means a normal POST; two short beeps means a POST error with a code on screen; AMI BIOSes have their own beep families; POST may ask for a keypress to enter firmware setup. `OPINION`: a boot sequence that prints `640KB OK`, `INITIALIZING HDD...`, `PRESS DEL TO ENTER SETUP` and then hands over to the site is a good 2-second intro — but it must be skippable and must not delay access to content.

**Status LEDs.** `FACT` (S11): `ESC[5m`/`ESC[6m` give real "blinking hardware" semantics. `OPINION`: an HDD light that pulses *while something is actually happening* (a request in flight, a lazy-loaded panel) is meaningful; a permanently blinking decorative light is noise.

**ASCII art & ANSI.** `FACT` (S5): strict ASCII art uses the 95 printable characters (32–126); it flourished on BBSes in the late 1970s–80s because printers and modems could not carry graphics; "high ASCII"/block art uses CP437 (`░ ▒ ▓ █ ▄ ▀`) and Braille (`⣿ ⣴ ⢁`); ANSI art adds colour, cursor movement and flashing on top of CP437. `FACT` (S6): DOS interfaces used IBM code page 437; ANSI X3.64 standardises cursor movement and colour.

### 3.4 Unicode repertoire to use

| Need | Characters | Chart |
|---|---|---|
| Light box drawing | `─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼` | S20 (U+2500) |
| Heavy box drawing | `━ ┃ ┏ ┓ ┗ ┛ ┣ ┫ ┳ ┻ ╋` | S20 |
| Double box drawing | `═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬` | S20 |
| Rounded corners | `╭ ╮ ╰ ╯` | S20 |
| Mixed single/double | `╒ ╕ ╘ ╛ ╞ ╡ ╤ ╧ ╪ ╫` | S20 |
| Blocks (shading/progress) | `█ ▉ ▊ ▋ ▌ ▍ ▎ ▏ ▄ ▀ ░ ▒ ▓ ▁ ▂ ▃ ▄ ▅ ▆ ▇` | S21 (U+2580) |
| Braille (fine shading) | `⣀ ⣤ ⣿ ⠿ ⠟ ⠻` | U+2800 block |
| Geometric / pointers | `▲ ▼ ► ◄ ▸ ▾ ◼ ◻ ★ ☆ ● ○ ◆ ◇` | U+25A0+ |
| Arrows / keys | `← → ↑ ↓ ⇧ ⏎ ⌘ ⌥ ⌃` | misc |

`FACT` (S6): TUIs traditionally build borders from `┌ ╣`-style box drawing; `FACT` (S5): CP437 supplies the block/shading set.

`INFERENCE` — the alignment trap, which this repo already knows about (see `src/styles/tty.css`: "a drawing that mixes two advance widths shears apart the moment it wraps"): **box-drawing glyphs must resolve to the same face as the letters inside them.** If the art font lacks U+2500–U+257F, the browser falls back per character and the columns shear. Two mitigations: (a) load the art face with a font stack where the art font is first and a face known to carry the box range is second, and set `font-variant-ligatures: none`; (b) draw frames with CSS borders and keep glyph-art only for the banner.

---

## 4. ASCII / TUI pattern library

All blocks below are **authored for this document** (not quoted), sized for an 80-column grid, and safe to paste into a `<pre>`-style container. Double-width borders (`═║╔╗╚╝`) read as "dialog / modal"; single (`─│┌┐└┘`) reads as "panel"; heavy (`━┃┏┓┗┛`) reads as "emphasised".

### 4.1 Window frame with title (the workhorse)

```
┌─ ABOUT ─────────────────────────────┐
│                                     │
│  body text                          │
│                                     │
└─────────────────────────────────────┘
```
```
╔═ ABOUT ═════════════════════════════╗
║                                     ║
║  body text                          ║
║                                     ║
╚═════════════════════════════════════╝
```
`INFERENCE`: the title chip in the top rule (`┌─ ABOUT ───`) is the single most recognisable TUI signature; the repo's `.tty-title` already does exactly this with a CSS-masked chip (`src/styles/tty.css`).

### 4.2 Dialog box with a blinking cursor

```
┌─────────────────────────────────────┐
│  CONFIRM                            │
│                                     │
│  Delete build cache?  240 MB        │
│                                     │
│  ▸ [Y] yes     [N] no               │
│                                     │
│  Answer: █                          │
└─────────────────────────────────────┘
```
`▸` marks the default action; `█` is the block cursor (CSS `background`, not a glyph — see §6.4).

### 4.3 Menu with selection brackets

```
  [ History ]      recent commands
  [ Settings ]     theme, density
> [ Projects ]     case studies
  [ Writing ]      posts
  [ Contact ]      email, socials
```
Variant with the classic `>` prompt marker and a dimmed hotkey column:

```
  ls -la          list all files
  cd <dir>        change directory
  cat <file>      print a file
> help            show this screen
```

### 4.4 Table of contents with dotted leaders

```
  01  Boot sequence .............. 2s
  02  Command history ............ 8
  03  Case studies ............... 14
  04  Contact .................... 21
```
The leader is one character cell wide and repeats; the repo already has `.rule` as a 6 px-period `linear-gradient` dotted rule — the same idea, drawn in CSS so it never needs a literal run of dots in the markup (`src/styles/tty.css`).

### 4.5 Progress bars

```
[██████████░░░░░░░░░░]  50%
[####------]  33%
[░░░░░░░░░░] 100%
```
Block ramp for finer granularity: `▏▎▍▌▋▊▉█`
Sparkline ramp: `▁▂▃▄▅▆▇█`
Braille ramp (highest resolution): `⣀⣄⣤⣦⣶⣷⣿` / `⠁⠂⠄⡀⢀`

### 4.6 Status bar with LEDs

```
┌─ STATUS ─────────────────────────────────────────────────────────────┐
│ ● PWR   ◐ HDD   ○ NET   ● BUILD OK   80×24   UTF-8   1:1           │
└──────────────────────────────────────────────────────────────────────┘
```
`●` filled = on, `◐` = working, `○` = off. `FACT` (S14): colour alone may not be the only signal — so the LED must be paired with a word (`BUILD OK`, `HDD`), which the repo's `.led` + `.tty-status` already does.

### 4.7 File tree

```
~/
├── src/
│   ├── components/
│   │   ├── Terminal.astro
│   │   └── StatusBar.astro
│   ├── scripts/
│   │   └── terminal.js
│   └── styles/
│       └── tty.css
├── public/
└── package.json
```
Unicode variant: `├─ └─ │ ─` (the repo's `.tree` renders `├─`/`└─` from `::before`).

### 4.8 TUI dashboard (panels + gauges)

```
┌─ SYSTEM ────────────┐  ┌─ BUILD ──────────────────────────────┐
│ uptime   04:12:33   │  │ ████████████████░░░░░░░░  68%         │
│ load     0.42       │  │ rustc 1.82.0 · cargo 0.83.0          │
│ mem      412 MB     │  │ ✓ 214 passed  ✗ 2 failed  ⠿ running    │
└─────────────────────┘  └──────────────────────────────────────┘
┌─ LINKS ─────────────────────────────────────────────────────────────┐
│ mail   maltsev@…      │  git   github.com/…                    │
│ code  github.com/…   │  notes  …                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.9 Directory listing (`ls -la`)

```
drwxr-xr-x  12  maltsev  staff   384  Nov 12 09:14  .
drwxr-xr-x   5  maltsev  staff   160  Nov 11 22:03  ..
-rw-r--r--   1  maltsev  staff   214  Nov 12 09:14  README.md
drwxr-xr-x   8  maltsev  staff   256  Nov 10 18:22  src
```
`FACT` (S9): VGA text mode is 25×80 with 9×16 cells — a listing is exactly the kind of thing that fits that grid. The repo's `.ls` already implements this as a CSS grid on `ch` units.

### 4.10 Boot sequence (POST)

```
 Award Modular BIOS v4.51PG, An Energy Star Ally
 Copyright (C) 1984-97, Award Software, Inc.

 PENTIUM-S CPU at 233MHz
 Memory Test :  1048576K OK

 Press DEL to enter SETUP, Ctrl-Alt-Del for POST Screen
 09/14/96-i430VX-2A59KA5C-00

 Detecting IDE Primary Master  ...  QUANTUM FIREBALL 1280AT
 Detecting IDE Primary Slave   ...  None
 Detecting IDE Secondary Master...  None
 Detecting IDE Secondary Slave ...  None

 Press F12 to boot from CD-ROM
```
`FACT` (S10): the memory count and the "press a key to enter setup" prompt are genuine POST behaviour; the specific strings above are an homage to the Award BIOS of the era, written for this document, not quoted from a vendor manual.

### 4.11 Banner / logo

Two techniques:

1. **FIGlet outline** (`figlet.textSync("MAIL", { font: "Standard" })` — S30) — thin, wide, 6–8 lines, reads as "hacker banner".
2. **Block-element solid** — set the word in the art face at large size and let the font's block glyphs do the work. The repo's `.banner` already does this with `--font-art` and a `data-shadow` pseudo-element copy offset one line down (a real "hard shadow" trick used by DOS-era ANSI art).

`FACT` (S31): VHS can record a scripted terminal session to GIF/MP4 — a recorded *typing* of a banner is the authentic "it types itself" asset, and it is reproducible from a `.tape` file rather than hand-timed.

### 4.12 Small decorative marks

```
─ separator        ┈ separator (light)      ═ separator (double)
· bullet           • bullet                 ▸ pointer
[ ] checkbox       [x] checked              ( ) radio   (•) selected
▲ ▼ scroll hints   ◀ ▶
```

---

## 5. Animated interaction patterns: authentic vs. gimmicky

`OPINION` throughout this section, but the mechanics are grounded in S11 (cursor show/hide, blink attributes), S10 (POST), S19 (the `steps()` typewriter), S31 (scripted recordings).

**Authentic (do):**
1. **Typed boot sequence** — lines appear one at a time with the *same* pacing a serial line would have (≈ 30–60 ms per line, longer for "memory test"). Make it skippable by any key, and never gate content behind it.
2. **Block cursor** that toggles with `steps(1, end)` at ~1.05 s — the repo's `.cursor` already uses exactly this (`src/styles/tty.css`).
3. **Prompt echo** — typed command echoed into the scrollback, then output lines prefixed with nothing (real `ls` output has no prefix) or with a subtle marker.
4. **`$` prompt with a trailing space** — the cheapest signal of "terminal" and the easiest to keep out of the way.
5. **LED that pulses only while work is in flight.**
6. **ASCII logo that types itself** — reveal by character index, not by a width animation on a heading (a width animation reflows text and breaks the grid; the CSS-Tricks typewriter trick is fine for prose but wrong for art).

**Gimmicky (avoid):**
- A CRT "power-on" that plays every visit with a white flash and a degauss wobble — it delays the content, it triggers `prefers-reduced-motion`, and it fails WCAG 2.3.1 if the flash rate is high.
- An infinite horizontal marquee. `FACT` (S16): auto-started motion longer than 5 s that appears alongside other content requires a mechanism to pause/stop/hide. A marquee has no natural pause, so it either needs a control (bad) or must be one-shot (good).
- Scanlines so heavy that body text loses contrast. `FACT (computed)`: a 25 % black overlay over `#33FF33` on `#000000` pulls the ratio from 15.49:1 to roughly 3.4:1 — under the 4.5:1 floor for body text (S13). Keep the scanline alpha ≤ 0.15 for text-bearing surfaces, or put the overlay *behind* the text.
- A blinking cursor that never stops on a page with no input field.

**Cadence numbers** (all `OPINION`, chosen to sit under S15's three-flashes-per-second rule): cursor blink 1.05 s period (`steps(1,end)`), LED pulse 1.4 s, scanline drift none (static), "power" flicker 4–8 s at ≤ 4 % opacity delta, typing 18–40 ms per character.

`FACT` (S15): a flash is an opposing pair of luminance changes of at least 10 % of maximum luminance, with the darker state below 0.80; the limit is three general flashes (or three red flashes) per second. The `crt.css` gist (S42) animates flicker at **0.15 s infinite** with random opacity values between 0.09 and 0.96 — that is roughly 6.7 luminance reversals per second and a ~96 % swing. **It would fail SC 2.3.1.** Use it as a technique reference, not as a template.

---

## 6. Implementation recipes

### 6.1 CSS-only CRT (recommended for a DOM portfolio)

Structure: one container, one scanline layer, one glass layer.

```html
<div class="crt">
  <div class="crt-screen">
    <!-- real content -->
  </div>
</div>
```

```css
.crt {
  --bezel: #1a1a1a;
  --glass: rgba(0,0,0,.18);
  --scan-period: 3px;      /* one lit line + one dark line */
  --scan-depth: .14;       /* keep <= .15 over text */
  --glow: 0 0 2px currentColor,
          0 0 8px color-mix(in srgb, currentColor 45%, transparent);
  --vignette: radial-gradient(ellipse at 50% 45%,
              rgba(0,0,0,0) 52%,
              rgba(0,0,0,.30) 82%,
              rgba(0,0,0,.72) 100%);
  background: var(--bezel);
  border-radius: 14px;
  padding: clamp(10px, 2vw, 26px);
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.06),
    inset 0 0 60px rgba(0,0,0,.9),
    0 24px 60px rgba(0,0,0,.55);
}

/* The glass: curvature + vignette + a slow, tiny flicker. */
.crt-screen {
  position: relative;
  isolation: isolate;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 0 40px rgba(0,0,0,.9);
}

/* Scanlines. Placed UNDER the text (z-index 0/1) so glyph contrast survives. */
.crt-screen::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    repeating-linear-gradient(
      to bottom,
      rgba(0,0,0,0) 0,
      rgba(0,0,0,0) calc(var(--scan-period) / 2),
      rgba(0,0,0,var(--scan-depth)) calc(var(--scan-period) / 2),
      rgba(0,0,0,var(--scan-depth)) var(--scan-period)
    );
}

/* Vignette + flicker, ABOVE the text but only lightly. */
.crt-screen::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: var(--vignette);
  animation: crt-flicker 6s steps(1, end) infinite;
}
@keyframes crt-flicker {
  0%, 96%  { opacity: 0; }
  97%      { opacity: .05; }
  98%      { opacity: 0; }
  99%      { opacity: .03; }
  100%     { opacity: 0; }
}
.crt-screen > * { position: relative; z-index: 1; }
```

**Phosphor bloom on the text**
```css
.crt-screen :is(h1,h2,h3,.crt-fg,.tty-cmd) {
  text-shadow: var(--glow);
}
```
`FACT` (S18): `text-shadow` takes `<offset-x> <offset-y> <blur-radius> <color>`, multiple shadows paint front-to-back, and **there is no spread radius** (that is `box-shadow` only). `INFERENCE`: bloom belongs on headings, the cursor, the banner and the prompt — applying it to every paragraph is a paint cost and a legibility tax.

**Chromatic aberration on a single accent**
```css
.crt-ab {
  text-shadow:
    -0.5px 0 0 rgba(255, 0, 60, .55),
     0.5px 0 0 rgba(0, 120, 255, .55),
     0 0 6px currentColor;
}
```
If you want the *separating* version (the RGB split that walks apart), S42's approach is a keyframe animation on `text-shadow` offsets, 1.6 s period, `steps`/discrete values. Use it on **one** element (the boot banner), never on body text.

**Reduced motion** — the non-negotiable block:
```css
@media (prefers-reduced-motion: reduce) {
  .crt-screen::after { animation: none; }
  .cursor, .led-blink, .tty-boot-line { animation: none !important; }
  .tty-boot { display: none; }   /* ship the final state, not the animation */
}
```
`FACT` (S17): `prefers-reduced-motion: reduce` is Baseline widely available since January 2020; the media feature conveys that the user wants motion removed, reduced or replaced, and matters most for people with vestibular disorders. `INFERENCE`: the right reduced-motion behaviour for a boot sequence is **not** "the same animation, slower" — it is to not run it at all and render the end state.

### 6.2 Faking curvature without a shader

`INFERENCE`: CSS cannot barrel-warp text. Three honest options, in ascending cost:

1. **Bezel + corner vignette** (above). Reads as "old monitor" at 0 % of the cost. Recommended.
2. **A separate glass overlay**: a `::after` with `border-radius: 40%/6%` and `backdrop-filter: blur(0.4px)` plus a radial white highlight streak at the top-left. Sells the curved glass without touching the glyphs.
3. **SVG `feDisplacementMap`**: wrap the art in an SVG filter with `feTurbulence` + `feDisplacementMap` to warp the rasterised layer. `INFERENCE`: it rasterises text, kills selection and text rendering quality, and is expensive — use it on a *decorative* frame only, never on the reading column.

### 6.3 Canvas-based ASCII rendering (for imagery, not text)

`INFERENCE` (technique, not a cited source): to render a photo as ASCII —
1. pick a cell size from the monospace font's advance (`ctx.measureText('M').width`),
2. draw the source image into an offscreen canvas scaled to (cols × rows),
3. read `getImageData` and average the luminance of each cell,
4. map luminance to a ramp — `" .:-=+*#%@"` or blocks `" ░▒▓█"` or Braille,
5. `fillText` each cell with `ctx.font` locked to the same monospace face.

`FACT` (S5): the shading ramp is the historical mechanism — `░ █ ▄ ▀` and Braille `⣿ ⣴ ⢁` are the standard high-density blocks; `FACT` (S34): a browser terminal that renders text into a texture and then applies a CRT pass does exactly this pipeline in reverse.

### 6.4 Optional three.js path

`FACT` (S40): the maintained three.js retro reference is `webgpu_postprocessing_retro.html`, which uses the TSL node `examples/jsm/tsl/display/RetroNode.js` and produces pixelation, colour quantisation with a Bayer dither, barrel distortion, scanlines, chromatic aberration, vignette and grain. `FACT` (S41): there is no `crt` example in the current three.js example set.

`FACT` (S38): the uniform set of a good standalone CRT shader (from `gingerbeardman/webgl-crt-shader`, MIT) — `tDiffuse`, `scanlineIntensity` 0.15, `scanlineCount` 400, `time`, `yOffset`, `brightness` 1.1, `contrast` 1.05, `saturation` 1.1, `bloomIntensity` 0.2, `bloomThreshold` 0.5, `rgbShift` 0.0, `adaptiveIntensity` 0.5, `vignetteStrength` 0.3, `curvature` 0.15, `flickerStrength` 0.01. Its maths: `curveRemapUV` maps `uv*2-1` then multiplies by `(1 + dist*curveAmount)`; `vignetteApprox` uses `1 - dist*dist*strength` with `dist = max(abs(x),abs(y))`; scanlines come from `abs(sin((uv.y + yOffset) * scanlineCount * PI))`; flicker is `1 + sin(time*110)*flickerStrength`.

If you want a shader in this repo, write it as a `ShaderPass` (EffectComposer), because the repo already depends on `three@^0.180`:

```js
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass }     from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass }     from 'three/examples/jsm/postprocessing/OutputPass.js';
```

```glsl
// crt.frag
uniform sampler2D tDiffuse;
uniform vec2  resolution;
uniform float curvature;        // 0.15
uniform float vignetteAmount;   // 0.30
uniform float scanlineIntensity;// 0.15
uniform float scanlineCount;    // 400.0
uniform float aberration;       // 0.0015
uniform float time;
varying vec2 vUv;

vec2 curve(vec2 uv) {
  uv = uv * 2.0 - 1.0;
  vec2 offset = abs(uv.yx) / vec2(4.0, 3.0);
  uv += uv * offset * offset * curvature;
  return uv * 0.5 + 0.5;
}

void main() {
  vec2 uv = curve(vUv);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); return;
  }
  vec2 d = uv - 0.5;
  float r2 = dot(d, d);
  vec2 off = d * r2 * aberration;                 // chromatic split
  vec3 col = vec3(
    texture2D(tDiffuse, uv + off).r,
    texture2D(tDiffuse, uv).g,
    texture2D(tDiffuse, uv - off).b
  );
  float scan = abs(sin(uv.y * scanlineCount * 3.14159265));
  col *= 1.0 - scan * scanlineIntensity;
  float vig = smoothstep(0.95, 0.15, length(d) * 1.4);
  col *= mix(1.0, vig, vignetteAmount);
  col *= 1.0 + sin(time * 110.0) * 0.01;           // gentle flicker
  gl_FragColor = vec4(col, 1.0);
}
```

`INFERENCE` / caveat: this shader warps **a texture**. DOM text is not in a texture unless you render it into a canvas (S34's approach) or use `CSS3DRenderer`. For a portfolio whose body copy must be selectable, searchable and accessible, the honest answer is: **CSS for the page, WebGL only for a decorative hero** (the banner, the boot logo, a self-portrait rendered as ASCII).

Other real implementations to read, in order of usefulness:
- S37/S38 `gingerbeardman/webgl-crt-shader` — one file, tunable, MIT, runs to an iPhone XS (S39).
- S35 `remojansen/cool-retro-term-webgl` — xterm.js + a full CRT pass (curvature, bloom, scanlines, RGB shift, flicker, noise, burn-in, sync jitter); GPL-3.0 (copying code into an MIT/OFL project needs care).
- S34 `statico/langterm` — a VT220 emulator in WebGL; bitmap-font sprite sheet → 2048² texture → CRT pass; MIT.
- S36 `OutThisLife/crt-shader` — multi-pass (horizontal → vertical → optics) reconstruction with aperture-grille mask and bloom; MIT; `crt-shader/three` exports `CRTPass` for EffectComposer.
- S40 three.js `webgpu_postprocessing_retro` — the official, currently maintained retro post-process.

### 6.5 Terminal-to-web tooling, when you want real terminal output in the page

| Tool | URL | Use it when |
|---|---|---|
| asciinema | S52 | you want a real `.cast` recording embedded with copy/paste and speed control |
| VHS | S31 | you want a **scripted** terminal animation as GIF/MP4 — reproducible, not hand-timed |
| termtosvg | S32 | you want vector output for docs — but note it is **archived since June 2020** |
| ttyd | S53 | you want a *live* shell in the browser (needs a backend; wrong for a static portfolio) |
| xterm.js | S33 | you want a real terminal emulator in the page; needs node-pty + WebSocket behind it |
| figlet.js | S30 | you want FIGlet banners generated at build time in JS/Node — MIT, `figlet.textSync()` |
| cfonts | S29 | coloured/gradient FIGlet output; **GPL-3.0** — generate the art at build time and ship the plain text, or stay out of the licence |

`FACT` (S30): figlet.js supports `figlet.text()` (async), `figlet.textSync()`, `parseFont()`, and bundled fonts such as `Standard`; options include `font`, `horizontalLayout`, `verticalLayout`, `width`. `FACT` (S29): cfonts ships 13 fonts (`block`, `slick`, `tiny`, `grid`, `pallet`, `shade`, `chrome`, `simple`, `simpleBlock`, `3d`, `simple3d`, `huge`, `console`) with `--colors`, `--gradient`, `--align`, `--letter-spacing`, and `--env` for HTML output.

### 6.6 Fonts

| Font | URL | Why | Licence |
|---|---|---|---|
| **Departure Mono** | S22 / S23 | "lo-fi, techy vibe"; pixel-perfect in **11 px increments**; late-90s tiny-pixel feel — the best single choice for a modern retro-terminal face | OFL (MIT for the site) |
| **IBM Plex Mono** | S24 / S25 | the most legible of the "authentic" faces; use for body copy inside terminal blocks | OFL-1.1 |
| **Perfect DOS VGA 437** | https://www.dafont.com/perfect-dos-vga-437.font (listed) | the 8×16 IBM VGA text-mode recreation, by **Zeh Fernando** | free for personal/commercial use (listed) |
| **Ultimate Oldschool PC Font Pack** | S28 | 200+ DOS-era charsets as TTF/FON/**WOFF**, incl. "IBM VGA 8x16"; the pack is **CC BY-SA 4.0** | CC BY-SA 4.0 |
| **Hack** | S58 | Bitstream Vera Sans Mono derivative; reads "hacker" without being a bitmap font | permissive |
| **Fira Code** | S26 | ligatures, arrow/powerline/box-drawing glyph sets, progress-bar glyphs | OFL-1.1 |
| **Iosevka** | S27 | terminal-oriented, many widths/weights, OFL | OFL-1.1 |
| **Nerd Fonts** | S54 | 70+ patched programming fonts, 10,000+ icons — for file-tree/terminal icons | OFL + per-font |

`INFERENCE`: use **two faces** — a readable monospace for prose/code (`IBM Plex Mono` or `Iosevka`), a bitmap face for frames and banners (`Departure Mono` or `Perfect DOS VGA 437`). The repo already does exactly this with `--font-mono` / `--font-art` (`src/styles/fonts.css`).

`FACT` (S28): the Oldschool pack publishes **WOFF** remakes, which is what a web project needs; `FACT` (S22): Departure Mono should be used at 11 px increments.

`INFERENCE` — the fallback stack must be ordered so box-drawing glyphs land in one face:

```css
--font-art: "Departure Mono", "Perfect DOS VGA 437", "IBM VGA 8x16",
            ui-monospace, "DejaVu Sans Mono", monospace;
--font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo,
             Consolas, "Liberation Mono", monospace;
```

---

## 7. Reference gallery

**Collections / archives**
- S43 https://asciiart.website/ — 7,622 pieces, searchable, with image→ASCII and text→ASCII tools; the best survey of what "good ASCII" looks like.
- S44 https://cyber.dabamos.de/88x31/ — 4,000+ 88×31 button/banner GIFs; the reference for *web-era* banner art, not just terminal art.
- S49 https://github.com/ratatui/awesome-ratatui — real TUI applications; the closest thing to a gallery of finished TUI interfaces.
- S48 https://terminaltrove.com/ — curated modern CLI/TUI tools; good for spotting current TUI conventions.
- S50 https://github.com/jdan/98.css/ and S51 https://botoxparty.github.io/XP.css/ — faithful Windows 98 / XP chrome in pure CSS; the model for "retro GUI panel" details (title-bar chips, sunken/raised bevels, taskbar) if you want more than a terminal.

**Tools**
- S47 https://asciiflow.com/ — draw ASCII/Unicode box diagrams in the browser; the fastest way to lay out a file tree or flow.
- S45 https://patorjk.com/software/taag/ — online FIGlet; pick a font, copy the block.
- S30 https://github.com/patorjk/figlet.js — FIGlet in JS for build-time banner generation (MIT).
- S29 https://github.com/dominikwilkowski/cfonts — FIGlet with colour gradients (GPL-3).
- S31 https://github.com/charmbracelet/vhs — record scripted terminal sessions to GIF/MP4 (MIT); gallery at https://vhs.charm.sh/.
- S52 https://asciinema.org/ — `.cast` recordings + web player, with copy/paste and speed control.
- S37 https://github.com/gingerbeardman/webgl-crt-shader — one-file GLSL CRT shader with a live tweak panel (MIT).
- S36 https://github.com/OutThisLife/crt-shader — multi-pass CRT reconstruction (MIT).
- S34 https://github.com/statico/langterm — VT220 in WebGL; see the sprite-sheet → texture → CRT-pass pipeline.
- S35 https://github.com/remojansen/cool-retro-term-webgl — CRT renderer wrapped around xterm.js; the most complete effect list of any public implementation.

**Standards / reference reading**
- S20 https://www.unicode.org/charts/PDF/U2500.pdf and S21 https://www.unicode.org/charts/PDF/U2580.pdf — the authoritative glyph sets.
- S8 https://terminals-wiki.org/wiki/index.php/DEC_VT320 — DEC terminal hardware specs (24 rows, 80/132 cols, character matrices).
- S7 https://en.wikipedia.org/wiki/VT100 — the ancestor's geometry and attributes.
- S9 https://en.wikipedia.org/wiki/Video_Graphics_Array — the 16-colour text palette and 720×400 text mode.
- S59 https://blog.ansi.org/ansi/ansi-art-ascii-art-iso-standards-x3-64/ — ANSI's own account of how ASCII art became a standard.
- S5 https://en.wikipedia.org/wiki/ASCII_art — the definitive account of what ASCII art is and is not.

---

## 8. Accessibility, legibility, and the dos/don'ts

### 8.1 Hard rules

1. **Contrast.** `FACT` (S13): body text needs **4.5:1**; large text (≥18 pt, or ≥14 pt bold) **3:1**. `FACT (computed)`: on `#000000`, `#33FF33` = 15.49:1, `#FFB000` = 11.46:1, `#F2F2F2` = 18.76:1, `#A8C8FF` = 12.37:1. The danger is not the palette — it is the **overlay**. A 25 % black scanline layer over `#33FF33` drops it to ≈3.4:1, below AA for body text. `INFERENCE`: keep scanlines under the text, or cap the overlay at 0.15 alpha, and re-check the ratio *after* the effect is applied.
2. **Never colour alone.** `FACT` (S14): colour may not be the only visual means of conveying information; where hue must be identified, another indicator is required, unless there is a ≥3:1 lightness difference. `INFERENCE`: an LED must always be beside a word (`● HDD  BUSY`), and a status colour must always be beside a status word (`BUILD OK` / `BUILD FAILED`). The repo already does this and the comment in `tty.css` says so.
3. **Reduced motion.** `FACT` (S17): `prefers-reduced-motion` is Baseline widely available since January 2020. `INFERENCE`: the reduced-motion behaviour is *not* "slower" — it is "ship the end state". Kill the boot animation, keep the final frame, stop the cursor blink, stop the LED pulse, remove the flicker.
4. **Flash limits.** `FACT` (S15): no more than three flashes per second; a flash is an opposing luminance pair with ≥10 % relative-luminance change and the darker state below 0.80. The 0.15 s random flicker in S42 would violate this. Keep flicker slow (≥4 s) and shallow (≤5 % opacity delta).
5. **Pause/stop/hide.** `FACT` (S16): auto-started motion longer than 5 s alongside other content needs a pause/stop/hide mechanism. `INFERENCE`: this is the reason the marquee must be one-shot, and the reason a boot sequence must auto-complete within ~2–3 s and be skippable.

### 8.2 Legibility

- **Glow budget.** `FACT` (S18): `text-shadow` has no spread; multiple shadows stack. `INFERENCE`: bloom radius ≤ 8 px and alpha ≤ 45 % on anything a reader must read. Large blur on long paragraphs smears the glyph edges and lowers effective contrast.
- **Type size.** `FACT` (S9): VGA text was 9×16 cells at 720×400 — i.e. roughly 9 px wide glyphs. `INFERENCE`: you cannot ship 9 px text on a modern screen and call it accessible. Target ≥ 15 px for body copy inside the "terminal" chrome and use the pixel font only for chrome, banners, labels and status text.
- **Line height.** `FACT` (S7): DEC terminals had a status line and a fixed row grid. `INFERENCE`: set the terminal body to a line-height that is an exact multiple of the row rhythm (1.4–1.6 for a 9:16 feel) so the grid does not wobble.
- **Selection & search.** `INFERENCE`: the whole body must remain real selectable DOM text. ASCII art belongs in `<pre>` with `aria-hidden="true"` and an adjacent visually-hidden description, never as the carrier of information.
- **Font fallback.** `INFERENCE`: `font-variant-ligatures: none` on any face used for art — a ligature in a "banner" changes the advance width and shears the frame.
- **Colour-blind safety.** `FACT` (S14) + `INFERENCE`: green/amber is the classic red-green trap. Pair every colour with shape (█ vs ░), text, or position — e.g. an error is `✗` + red, an ok is `✓` + green, both readable in greyscale.

### 8.3 How much ASCII is too much (OPINION with reasons)

| Placement | Guidance | Reason |
|---|---|---|
| Hero banner | 4–8 lines, one instance | Establishes the register; more competes with the name/role. |
| Section frames | one per section, ≤ 60 cols, `overflow-x: auto` on mobile | Frames help scanning; a wall of frames is noise. |
| File tree / listing | fine — it *is* the content | Real terminal output, not decoration. |
| Body copy | never | ASCII art at 15 px is 2× the reading cost and it does not reflow. |
| Icons | fine at 1 char | `│ ├ └ ● ▸` carry meaning. |
| Rules/dividers | fine | A single `─` line is a TUI separator, not a picture. |
| Whole-page frames | no | Above ~2 frames per viewport the grid stops being a frame and starts being a cage; it also destroys the responsive layout. |

---

## 9. Contradictions and gaps

1. **P1/P3 inverted in the brief** — resolved against S1/S2: P1 green, P3 amber. Any palette decision must use this mapping.
2. **The IBM 5151's phosphor** — S1 names the 5151 but assigns no phosphor; a secondary HN comment says P39. `UNCERTAIN`. Not load-bearing: the 5151 was visually a green tube either way.
3. **three.js's CRT example** — multiple search summaries assert `webgl_postprocessing_crt.html` and `examples/jsm/shaders/CRTShader.js` exist with specific uniforms. S41 (`files.json`) and the jsDelivr package listing both show **no such file**. Resolution: those summaries are stale or generated. The *uniform names* quoted in some of them (`curvature`, `vignetteIntensity`, `scanlinesIntensity`, `curvatureR`, `curvatureB`) are, however, recognisably the same family as the independently verified S38 set — so a hand-written shader with those names is safe even though the cited file is not.
4. **Phosphor hex is method-dependent** — S3 gives four conversions differing by up to ~15 % in hex value. There is no "correct" hex for a phosphor; pick a conversion and be consistent. This document uses the "user preference" column.
5. **Font attribution confusion** — "Perfect DOS VGA 437" is by **Zeh Fernando**, not by Helena Zhang (who designed Departure Mono). Both are in circulation; do not credit them the same way.
6. **`figlet.org` did not resolve** and **`caca.zoy.org` failed TLS** from this environment — upstream URLs unverified; use S30 (figlet.js) and S29 (cfonts) which I did read.
7. **`termtosvg` is archived** (June 2020, read-only) — still usable, but treat as a historical reference; `asciinema` + `vhs` are the live options.
8. **Windows 3.1 chrome palette** — not researched in this pass; the verified retro-GUI references are 98.css / XP.css (S50/S51). Any "Win 3.1 teal desktop" claim would be `UNCERTAIN` until checked.
9. **Not researched**: keyboard-hardware references (keycap legends, Model M fonts), Commodore/Amiga specifics beyond Topaz, Japanese "mojibake" nostalgia, demoscene/ANSI cracktro art, ASCII video (asciinema-style GIF loops) — all plausible next passes.

---

## 10. Implications for this repository

The site is **Astro 5 + `three@^0.180`** and already has a mature terminal design system in `src/styles/tty.css`: `.tty` window frame with a title chip, `.cursor` (block, `steps(1,end)`, 1.05 s), `.led` / `.led-on` / `.led-blink`, `.meter`, `.ls` listing on a `ch` grid, `.rule` dotted leader, `.tree` with `├─`/`└─`, `.frame`, `.banner` with a `data-shadow` hard shadow, `.chip`, `.hash`, `.tty-status`, and — importantly — `prefers-reduced-motion` handling for the cursor and the LED.

Decisions this research implies:

1. **Do not rebuild the terminal language.** The vocabulary in §4 is already in `tty.css`. Extend it: add a `.dialog` (double-rule frame + `▸` default action), a `.toc` that pairs `.rule` with a right-aligned page number, and a `.gauge` block-ramp meter alongside the existing `.meter`.
2. **Add a CRT layer above the existing system, not inside it.** A single `.crt` wrapper with the §6.1 scanline/vignette/flicker layers, `isolation: isolate`, and `pointer-events: none` on the overlays. Because `tty.css` already sets `text-shadow: var(--glow)` on titles and commands, the phosphor bloom exists — the missing piece is scanlines and the vignette.
3. **Adopt one of the two palettes as the accent system** (`--braise`, `--encre`, `--fort`, `--grid`, `--ok`, `--led-warn`, `--erreur` already exist in `src/styles/global.css`). Measured phosphor values (§2.3) fit that naming; swap the amber accent to `#FFB000` and the dim tier to `#B87A00` if the current values are below 4.5:1.
4. **Fonts.** `src/styles/fonts.css` already separates `--font-mono` and `--font-art`. Swap `--font-art` to **Departure Mono** (OFL, S22) at 11 px increments and keep the current art face as fallback; consider "Perfect DOS VGA 437" or the Oldschool pack's WOFF (S28, CC BY-SA 4.0 — attribution required) for the banner only.
5. **The boot sequence.** `src/scripts/terminal.js` already implements a real shell over the site's own data with a prompt, history and scrollback. A boot sequence should be a *prelude to that shell*, auto-completing in ~2 s, skippable, and fully suppressed under `prefers-reduced-motion` (render the end state).
6. **Marquee: drop it.** S16 makes an infinite marquee a compliance problem with no good fix. Use a one-shot typed banner instead (S31-style, but generated at build time, not as a runtime GIF).
7. **three.js:** use it only for a decorative hero (an ASCII-rendered portrait or a self-typing logo in a canvas, then the CRT pass from S38/S40). Do **not** try to render body copy through a WebGL CRT pass — selection, search, screen readers and the WCAG contrast work all depend on the text staying in the DOM. Note S40 is WebGPU-based; for a WebGL path, write a `ShaderPass` (S36) with the fragment shader in §6.4.
8. **Do not adopt the `crt.css` flicker as-is** (S42): ~6.7 luminance reversals/s at up to 96 % swing would fail SC 2.3.1 (S15), and it contains a `rgb a(...)` typo.

---

## 11. Open questions

1. Which of the three themes (green / amber / blue-white) is the site's identity, and is the theme switchable at runtime (the site has `src/data/themes.ts` and a `Palette.astro` component — worth checking whether a phosphor palette can slot into the existing theme mechanism)?
2. Do we want a real WebGL hero at all, given the page already has a strong CSS-native terminal language? Cost/benefit is unclear and the DOM-only route is cheaper to keep accessible.
3. Should the "shell" on the front page accept *real* commands that navigate (e.g. `cd projects`, `cat about`) — the data model in `terminal.js` suggests it nearly does — and does that need the 80-column grid to be enforced?
4. How much of the ASCII vocabulary (dialogs, dashboards, gauges) genuinely improves comprehension versus being ornament? A/B or a readability test would answer this; the current evidence is taste, not measurement.
5. Does `Perfect DOS VGA 437` / the Oldschool pack's WOFF survive a body-copy line-height that is not an integer multiple of 16 px? (bitmap fonts at non-native sizes blur — `image-rendering: pixelated` does not apply to text.)
6. Is there a screen-reader story for the terminal region? (`role="log"` + `aria-live="polite"` on the output, `aria-label` on the input) — worth verifying with an actual screen reader before shipping.
