/**
 * The portrait, drawn the way the tool that made it draws it.
 *
 * This is the tool's own renderer, ported: the same shaders, the same sheet
 * of glyphs, the same points, the same loop, the same drag with its inertia
 * and its spring back to the middle, and the same slow sway when nobody is
 * touching it. The picture moves because the tool's picture moves.
 *
 * Two things are different, and only because the site needs them to be. The
 * ground is transparent, so the panel the picture sits in shows through it
 * and the theme's colour is the colour of the page. And the colour the tool
 * draws its single-colour mode in — a greenish white, hard-coded in its
 * shader — is a uniform here, so the theme can hand it the colour of the
 * theme.
 *
 * The picture itself is the tool's: the same photograph, the same height
 * map, the same rules for which character stands where. See
 * `_gen_portrait.py` for where the two come from.
 */

/** How much taller a cell is than it is wide. */
const DY = 1.6;

/** How many characters there are, and so how many of them fit on the sheet. */
const N = 64;
const G = 8;

/** The size of one cell of the sheet of glyphs. */
const S = 32;

/**
 * The characters, from the faintest to the densest.
 *
 * The tool's own ramp, in the tool's own order: the densest characters are
 * the ones that cover the most of the cell, so the picture is a picture and
 * not a page of letters.
 */
const RAMP = [...' .\'`^",:;Il!i~+_-?]}1)|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$'].slice(
  0,
  N
);

/**
 * How far out of the page the picture stands.
 *
 * Zero. The tool's own slider goes from nothing to a fifth of the width of
 * the picture; the site leaves it at nothing, and the picture is flat.
 */
const RELIEF = 0;

const VS = `
attribute vec3 aPos;attribute vec3 aCol;attribute float aGlyph;
uniform vec4 uRot;uniform vec2 uHalf;uniform float uScale,uZs,uZc,uD,uSize,uDpr;
varying vec3 vCol;varying float vGlyph;
void main(){
  float z=aPos.z*uZs-uZc;
  float x1=aPos.x*uRot.x+z*uRot.y;
  float z1=-aPos.x*uRot.y+z*uRot.x;
  float y1=aPos.y*uRot.z-z1*uRot.w;
  float z2=aPos.y*uRot.w+z1*uRot.z;
  float f=uD/(uD-z2);
  vec2 p=vec2(x1,y1)*f*uScale;
  gl_Position=vec4(p.x/uHalf.x,-p.y/uHalf.y,-z2/(uD*0.5),1.0);
  gl_PointSize=uSize*f*uDpr;
  vCol=aCol;vGlyph=aGlyph;
}`;

const FS = `
precision mediump float;
uniform sampler2D uTex;uniform float uMono;uniform vec3 uInk;uniform vec3 uGround;
uniform float uTone;uniform vec2 uRange;
varying vec3 vCol;varying float vGlyph;
void main(){
  float g=floor(vGlyph+0.5);
  vec2 cell=vec2(mod(g,8.0),floor(g/8.0));
  float a=texture2D(uTex,(cell+gl_PointCoord)/8.0).a;
  if(a<0.04)discard;
  float l=dot(vCol,vec3(.299,.587,.114));
  // The tone of the photograph, stretched over the picture's own range.
  float t=clamp((l-uRange.x)/max(0.001,uRange.y-uRange.x),0.0,1.0);
  // On a dark ground the tone rides on the colour of the ink: the dark
  // parts of the photograph fade into the ground behind them, and the light
  // parts are the ones that show. On paper there is only the one colour of
  // ink there is, so the tone rides on how close that ink is to the paper,
  // and the dark parts of the photograph are the ones that take the ink.
  float f=mix(1.15*l,1.0-t,uTone);
  vec3 c=mix(vCol,mix(uGround,uInk,f),uMono);
  gl_FragColor=vec4(c,a);
}`;

export interface PortraitOptions {
  /** The canvas to draw on. */
  canvas: HTMLCanvasElement;
  /** The picture: the portrait, cut out. */
  picture: string;
  /** The height map below it: red for the character, green for the relief. */
  height: string;
  /** The face the characters are drawn in. */
  font: string;
  /** The colour of the picture, when it is drawn in one colour. */
  ink?: [number, number, number];
  /** Whether the picture is drawn in one colour rather than in colours. */
  mono?: boolean;
  /**
   * Whether the ground the picture is on is light.
   *
   * On a dark ground the tone of the photograph rides on the colour of the
   * ink. On a light one — on paper — it has to ride on how close that ink
   * is to the paper, because there is only the one colour of ink there is.
   */
  light?: boolean;
  /** The colour of the ground the picture is on. */
  ground?: [number, number, number];
  /**
   * How fat the stroke of the characters is.
   *
   * Zero is the tool's own stroke. A little more makes the characters into
   * the marks of a pen on paper, which is what the paper theme wants.
   */
  weight?: number;
  /** The darkest cell of the picture, and the brightest. */
  range?: [number, number];
}

export interface Portrait {
  /** The colour of the picture, when it is drawn in one colour. */
  ink(colour: [number, number, number]): void;
  /** The colour of the ground the picture is on. */
  ground(colour: [number, number, number]): void;
  /** Whether the picture is drawn in one colour rather than in colours. */
  mono(on: boolean): void;
  /** Whether the ground the picture is on is light. */
  light(on: boolean): void;
  /** How fat the stroke of the characters is. */
  weight(amount: number): void;
  /** Draw the sheet of glyphs again, in another face. */
  atlas(font: string): void;
  /** Stop drawing. */
  destroy(): void;
}

/** A picture, loaded. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`the portrait would not load: ${src}`));
    image.src = src;
  });
}

/** The pixels of a picture, as the tool reads them. */
function pixels(image: HTMLImageElement): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('the portrait would not draw');

  ctx.drawImage(image, 0, 0);

  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));

/**
 * Draw the portrait.
 *
 * The promise settles when the picture is on the canvas and moving.
 */
export async function createPortrait(options: PortraitOptions): Promise<Portrait> {
  const canvas = options.canvas;

  const gl = canvas.getContext('webgl', { alpha: true, antialias: false });
  if (!gl) throw new Error('this browser has no WebGL');

  const [picture, relief] = await Promise.all([
    loadImage(options.picture),
    loadImage(options.height),
  ]);

  const cols = picture.width;
  const rows = picture.height;

  const p = pixels(picture);
  const h = pixels(relief);

  /*
    The points.

    One point for each cell of the picture that the portrait is actually in:
    where it stands, how far out of the page, what colour it is, and which
    character stands there. The character comes from the height map's red
    channel, the way the tool picks it, and the relief comes from its green
    channel.
  */
  const arr: number[] = [];

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = (j * cols + i) * 4;
      if (p[k + 3] < 128) continue;

      const l = Math.max(1, Math.round((h[k] / 255) * (N - 1)));

      arr.push(
        i - cols / 2 + 0.5,
        (j - rows / 2 + 0.5) * DY,
        h[k + 1] / 255,
        p[k] / 255,
        p[k + 1] / 255,
        p[k + 2] / 255,
        l
      );
    }
  }

  const count = arr.length / 7;

  /* The shaders, the program and its uniforms. */
  const shader = (type: number, source: string) => {
    const out = gl.createShader(type);
    if (!out) throw new Error('this browser has no WebGL');
    gl.shaderSource(out, source);
    gl.compileShader(out);
    return out;
  };

  const program = gl.createProgram();
  if (!program) throw new Error('this browser has no WebGL');

  gl.attachShader(program, shader(gl.VERTEX_SHADER, VS));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(program);
  gl.useProgram(program);

  const U: Record<string, WebGLUniformLocation | null> = {};
  [
    'uRot',
    'uHalf',
    'uScale',
    'uZs',
    'uZc',
    'uD',
    'uSize',
    'uDpr',
    'uMono',
    'uInk',
    'uGround',
    'uTone',
    'uRange',
    'uTex',
  ].forEach((name) => (U[name] = gl.getUniformLocation(program, name)));

  /*
    The sheet of glyphs: white characters, one per cell, ordered from light
    to dense. White, because the sheet is drawn in the colour of the picture
    before it is used, and transparent, so that the colour fills the shape
    of the character and nothing else.
  */
  const sheet = document.createElement('canvas');
  sheet.width = S * G;
  sheet.height = S * G;

  /* The one texture of the sheet. It is filled again and again. */
  const texture = gl.createTexture();

  const atlas = (font: string, weight: number) => {
    const sctx = sheet.getContext('2d');
    if (!sctx) throw new Error('this browser has no canvas');

    sctx.clearRect(0, 0, sheet.width, sheet.height);
    sctx.font = `${S * 0.95}px ${font}`;
    sctx.fillStyle = '#fff';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';

    /*
      The weight of the stroke.

      A character drawn in a line of text covers about a third of its cell.
      On a dark ground that is a glow and it is meant to be. On paper it is
      a smudge, and a smudge is not a drawing — so there the stroke is
      fattened, in the sheet itself, rather than in the transparency of the
      picture. A fattened stroke keeps the same shape at every size, where a
      thickened transparency does not: the same picture that is a drawing on
      a laptop is a black blob on a retina screen.
    */
    if (weight > 0) {
      sctx.strokeStyle = '#fff';
      sctx.lineWidth = S * weight;
      sctx.lineJoin = 'round';
    }

    RAMP.forEach((char, i) => {
      const x = (i % G + 0.5) * S;
      const y = (Math.floor(i / G) + 0.5) * S + S * 0.04;

      sctx.fillText(char, x, y);

      if (weight > 0) sctx.strokeText(char, x, y);
    });

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sheet);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(U.uTex, 0);
  };

  let face = options.font;
  let weight = options.weight ?? 0;

  atlas(face, weight);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.DEPTH_TEST);

  /* The points, and where each of them sits in the buffer. */
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);

  (
    [
      ['aPos', 3, 0],
      ['aCol', 3, 12],
      ['aGlyph', 1, 24],
    ] as const
  ).forEach(([name, size, offset]) => {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 28, offset);
  });

  /* The state the picture moves in. */
  let W = 0;
  let H = 0;
  let dpr = 1;

  let yaw = 0;
  let pit = 0;
  let uy = 0;
  let up = 0;
  let vy = 0;
  let vp = 0;
  let idle = 9;
  let drag = false;
  let lx = 0;
  let ly = 0;
  let lt = 0;
  let last = 0;

  let mono = options.mono ?? false;
  let ink = options.ink ?? [0.86, 0.98, 0.82];
  let ground = options.ground ?? [0, 0, 0];
  let light = options.light ?? false;
  const range = options.range ?? [0, 255];

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    const box = canvas.getBoundingClientRect();
    W = box.width;
    H = box.height;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  resize();

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  /*
    The picture is only drawn when it can be seen. The tool's window is the
    whole page, so it always is; here the picture is one panel among a few
    dozen, and a panel that is off the screen has no business asking for a
    frame.
  */
  let visible = true;
  const watcher = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
    },
    { threshold: 0 }
  );
  watcher.observe(canvas);

  /* The drag. The picture turns under the pointer and keeps turning for a
     moment after the pointer lets go. */
  canvas.addEventListener('pointerdown', (event) => {
    drag = true;
    idle = 0;
    vy = vp = 0;
    lx = event.clientX;
    ly = event.clientY;
    lt = event.timeStamp;
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;

    const dt = Math.max((event.timeStamp - lt) / 1000, 0.001);
    const dy = ((event.clientX - lx) / W) * 3;
    const dp = ((event.clientY - ly) / H) * 2;

    uy = clamp(uy + dy, -1.3, 1.3);
    up = clamp(up + dp, -0.8, 0.8);
    vy = vy * 0.6 + 0.4 * (dy / dt);
    vp = vp * 0.6 + 0.4 * (dp / dt);

    lx = event.clientX;
    ly = event.clientY;
    lt = event.timeStamp;
  });

  const end = () => {
    if (!drag) return;
    drag = false;
    idle = 0;
    if (performance.now() - lt > 80) vy = vp = 0;
    canvas.classList.remove('is-dragging');
  };

  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  let frame = 0;

  const loop = (t: number) => {
    const dt = Math.min((t - last) / 1000 || 0.016, 0.05);
    last = t;

    if (drag) {
      idle = 0;
    } else {
      const dec = Math.exp(-dt * 4);
      vy *= dec;
      vp *= dec;
      uy = clamp(uy + vy * dt, -1.3, 1.3);
      up = clamp(up + vp * dt, -0.8, 0.8);
      idle += dt;
      if (idle > 1.5) {
        const k = 1 - Math.exp(-dt * 0.7);
        uy -= uy * k;
        up -= up * k;
      }
    }

    /*
      The idle.

      A second and a half after the last touch, the picture lets go of
      wherever it was turned to and drifts back to the middle, and then it
      sways: a slow rock, side to side and up and down, out of phase with
      itself. The sway comes in over two seconds, so the picture settles
      into it rather than starting.
    */
    const sw = reduce ? 0 : clamp((idle - 1) / 2, 0, 1);
    const k = 1 - Math.exp(-dt * 10);
    yaw += (uy + 0.42 * sw * Math.sin(t / 1700) - yaw) * k;
    pit += (up + 0.07 * sw * Math.sin(t / 2500) - pit) * k;

    if (visible) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const s = W / cols;
      const zs = RELIEF * cols * 0.4;

      gl.uniform4f(U.uRot, Math.cos(yaw), Math.sin(yaw), Math.cos(pit), Math.sin(pit));
      gl.uniform2f(U.uHalf, W / 2, H / 2);
      gl.uniform1f(U.uScale, s);
      gl.uniform1f(U.uZs, zs);
      gl.uniform1f(U.uZc, zs * 0.45);
      gl.uniform1f(U.uD, cols * 4);
      gl.uniform1f(U.uSize, s * DY);
      gl.uniform1f(U.uDpr, dpr);
      gl.uniform1f(U.uMono, mono ? 1 : 0);
      gl.uniform3f(U.uInk, ink[0], ink[1], ink[2]);
      gl.uniform3f(U.uGround, ground[0], ground[1], ground[2]);
      gl.uniform1f(U.uTone, light ? 1 : 0);
      gl.uniform2f(U.uRange, range[0], range[1]);

      gl.drawArrays(gl.POINTS, 0, count);
    }

    frame = requestAnimationFrame(loop);
  };

  frame = requestAnimationFrame(loop);

  return {
    ink(colour: [number, number, number]) {
      ink = colour;
    },
    ground(colour: [number, number, number]) {
      ground = colour;
    },
    mono(on: boolean) {
      mono = on;
    },
    light(on: boolean) {
      light = on;
    },
    weight(amount: number) {
      if (amount === weight) return;
      weight = amount;
      atlas(face, weight);
    },
    atlas(font: string) {
      face = font;
      atlas(face, weight);
    },
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      watcher.disconnect();
    },
  };
}
