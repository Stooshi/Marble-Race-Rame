/**
 * One source for a marble's colours in 2D and 3D.
 *
 * A design's picture is a stack of gradient layers (the same model as CSS
 * backgrounds). From that one description:
 *   toCss(layers)          → the CSS background of the flat shop picture (badge.js)
 *   rasterize(layers, n)   → the same picture as pixels, for the 3D marble's
 *                            textures (materials.js)
 * so the two can never drift apart. The rasterizer follows the CSS rules
 * exactly (circle gradients sized to the farthest corner, stop fix-up,
 * premultiplied interpolation, sRGB compositing), and a test checks it
 * against the browser's own drawing.
 *
 * Colours are kept as sRGB bytes throughout, never converted to linear light:
 * that is how the browser paints the shop pictures, and the 3D marble shader
 * outputs these bytes unchanged.
 *
 * Layer: { type: 'linear', angle, stops } | { type: 'radial', at: [x, y], stops }
 *      | { type: 'conic', from, at: [x, y], stops } | { type: 'solid', color }
 *   (repeat: true for the repeating- forms). Positions: % for linear and
 *   radial, degrees for conic; at: % of the box. Stop: [colour, pos] or
 *   [colour, pos1, pos2] or [colour] (CSS fills the gap). Colour: '#RRGGBB' or
 *   { hex, a } (alpha), or 'transparent'.
 * Layers are listed top first, as in CSS.
 */

// ── Colours ────────────────────────────────────────────────────────────────

/** '#RRGGBB' → [r, g, b] (0–255, sRGB). */
export function hexRgb(hex) {
  const n = parseInt(String(hex).slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const hex2 = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
export const rgbHex = ([r, g, b]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();

/**
 * `hex` moved `k` of the way towards `to` (in sRGB, as CSS color-mix(in srgb)
 * does): mixHex('#FF0000', '#FFFFFF', 0.25) is a quarter of the way to white.
 */
export function mixHex(hex, to, k) {
  const a = hexRgb(hex); const b = hexRgb(to);
  return rgbHex(a.map((v, i) => v + (b[i] - v) * k));
}

/** A colour with alpha (for a layer stop). */
export const alpha = (hex, a) => ({ hex, a });
export const T = 'transparent';

/** A stop colour → [r, g, b, a] (rgb 0–255, a 0–1). */
function rgba(c) {
  if (c === T) return [0, 0, 0, 0];
  if (typeof c === 'string') return [...hexRgb(c), 1];
  return [...hexRgb(c.hex), c.a];
}

function cssColour(c) {
  if (c === T) return 'rgba(0,0,0,0)';
  if (typeof c === 'string') return c.toUpperCase();
  const [r, g, b] = hexRgb(c.hex);
  return `rgba(${r},${g},${b},${c.a})`;
}

// ── CSS ────────────────────────────────────────────────────────────────────

const num = (v) => String(Math.round(v * 1000) / 1000);

function cssStops(stops, unit) {
  return stops.map(([c, ...pos]) => [cssColour(c), ...pos.map((p) => `${num(p)}${unit}`)].join(' ')).join(', ');
}

/** One layer as a CSS image. */
export function layerCss(l) {
  const rep = l.repeat ? 'repeating-' : '';
  if (l.type === 'solid') return cssColour(l.color);
  if (l.type === 'linear') return `${rep}linear-gradient(${num(l.angle ?? 180)}deg, ${cssStops(l.stops, '%')})`;
  if (l.type === 'radial') {
    const [x, y] = l.at ?? [50, 50];
    return `${rep}radial-gradient(circle at ${num(x)}% ${num(y)}%, ${cssStops(l.stops, '%')})`;
  }
  if (l.type === 'conic') {
    const [x, y] = l.at ?? [50, 50];
    return `${rep}conic-gradient(from ${num(l.from ?? 0)}deg at ${num(x)}% ${num(y)}%, ${cssStops(l.stops, 'deg')})`;
  }
  throw new Error(`Unknown layer type ${l.type}`);
}

/**
 * A pattern fixed in the ball, as a function of the direction (x, y, z: a unit
 * vector in the ball's own frame) → straight [r, g, b, a]. The 3D marble paints
 * its rolling texture with it, and a picture layer { type: 'ball' } draws the
 * same ball as the shop picture, so the two match point for point.
 *   map 'gores': a conic layer as slices from pole to pole (y up), twisting
 *     `twist` degrees from pole to pole; seen down the axis, the conic as CSS draws it.
 *   map 'caps': round patches ({ at: [x, y, z], size: degrees, color }) on `base`.
 *   map 'band': a soft band `width` degrees wide round the great circle square to `axis`.
 */
export function ballPattern(pattern) {
  const soft = (e0, e1, v) => { const t = Math.max(0, Math.min(1, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  if (pattern.map === 'gores') {
    const layer = pattern.layers[0];
    const flat = resolveStops(layer.stops, 360);
    const twist = pattern.twist ?? 0;
    return (x, y, z) => {
      const deg = (Math.atan2(x, -z) * 180) / Math.PI + twist * y - (layer.from ?? 0);
      const c = colourAt(flat, ((deg % 360) + 360) % 360, layer.repeat);
      return c[3] > 0 ? [c[0] / c[3], c[1] / c[3], c[2] / c[3], c[3]] : [0, 0, 0, 0];
    };
  }
  if (pattern.map === 'caps') {
    const base = rgba(pattern.base);
    const caps = pattern.caps.map(({ at, size, color }) => {
      const n = Math.hypot(...at);
      return { at: at.map((v) => v / n), cos: Math.cos((size * Math.PI) / 180), edge: Math.cos(((size + 1.2) * Math.PI) / 180), c: rgba(color) };
    });
    return (x, y, z) => {
      let c = base;
      for (const cap of caps) {
        const dot = x * cap.at[0] + y * cap.at[1] + z * cap.at[2];
        if (dot > cap.edge) { const k = soft(cap.edge, cap.cos, dot); c = c.map((v, i) => v + (cap.c[i] - v) * k); }
      }
      return c;
    };
  }
  if (pattern.map === 'band') {
    const n = Math.hypot(...pattern.axis); const a = pattern.axis.map((v) => v / n);
    const c = rgba(pattern.color);
    const half = Math.sin(((pattern.width / 2) * Math.PI) / 180); const edge = Math.sin(((pattern.width / 2 + (pattern.soft ?? 4)) * Math.PI) / 180);
    return (x, y, z) => {
      const s = Math.abs(x * a[0] + y * a[1] + z * a[2]);
      const k = 1 - soft(half, edge, s);
      return [c[0], c[1], c[2], c[3] * k];
    };
  }
  throw new Error(`Unknown ball pattern ${pattern.map}`);
}

/** Whether CSS can draw these layers (a 'ball' layer needs the painter: rasterize). */
export const cssDrawable = (layers) => layers.every((l) => l.type !== 'ball');

/** A stack of layers (top first) as a CSS background value. */
export const toCss = (layers) => layers.map(layerCss).join(', ');

// ── Pixels ─────────────────────────────────────────────────────────────────

/**
 * A layer's stops as CSS resolves them: two-position stops split in two,
 * missing positions filled in, every position at least the one before.
 * → [{ c: [r, g, b, a], p }] with p in the layer's unit.
 */
function resolveStops(stops, end) {
  const flat = [];
  for (const [c, ...pos] of stops) {
    if (!pos.length) flat.push({ c: rgba(c), p: null });
    for (const p of pos) flat.push({ c: rgba(c), p });
  }
  if (flat[0].p === null) flat[0].p = 0;
  if (flat[flat.length - 1].p === null) flat[flat.length - 1].p = end;
  let max = -Infinity;
  for (const s of flat) if (s.p !== null) { s.p = Math.max(s.p, max); max = s.p; }
  for (let i = 1; i < flat.length; i += 1) {
    if (flat[i].p !== null) continue;
    let j = i;
    while (flat[j].p === null) j += 1;
    const a = flat[i - 1].p; const b = flat[j].p;
    for (let k = i; k < j; k += 1) flat[k].p = a + ((b - a) * (k - i + 1)) / (j - i + 1);
  }
  return flat;
}

/** Premultiplied colour at position p along resolved stops → [r, g, b, a] (rgb premultiplied, 0–255). */
function colourAt(flat, p, repeat) {
  if (repeat) {
    const first = flat[0].p; const period = flat[flat.length - 1].p - first;
    if (period > 0) p = first + ((((p - first) % period) + period) % period);
  }
  const pre = ({ c }) => [c[0] * c[3], c[1] * c[3], c[2] * c[3], c[3]];
  if (p <= flat[0].p) return pre(flat[0]);
  for (let i = 0; i < flat.length - 1; i += 1) {
    const a = flat[i]; const b = flat[i + 1];
    if (p < b.p) {
      if (b.p === a.p) return pre(b);
      const t = (p - a.p) / (b.p - a.p);
      const x = pre(a); const y = pre(b);
      return x.map((v, k) => v + (y[k] - v) * t);
    }
  }
  return pre(flat[flat.length - 1]);
}

/**
 * A conic layer's colour at an angle (degrees, measured as CSS does from its
 * "from") → straight [r, g, b, a] (rgb 0–255, a 0–1). For painting a conic
 * pattern round a sphere (the Cat's Eye vane).
 */
export function conicAt(layer, deg) {
  const c = colourAt(resolveStops(layer.stops, 360), (((deg - (layer.from ?? 0)) % 360) + 360) % 360, layer.repeat);
  return c[3] > 0 ? [c[0] / c[3], c[1] / c[3], c[2] / c[3], c[3]] : [0, 0, 0, 0];
}

/** A function (x, y in the 0–1 box) → premultiplied [r, g, b, a] for one layer. */
function layerSampler(l) {
  if (l.type === 'solid') { const c = rgba(l.color); return () => [c[0] * c[3], c[1] * c[3], c[2] * c[3], c[3]]; }
  if (l.type === 'linear') {
    const a = ((l.angle ?? 180) * Math.PI) / 180;
    const dx = Math.sin(a); const dy = -Math.cos(a); const len = Math.abs(dx) + Math.abs(dy);
    const flat = resolveStops(l.stops, 100);
    return (x, y) => colourAt(flat, (((x - 0.5) * dx + (y - 0.5) * dy) / len + 0.5) * 100, l.repeat);
  }
  if (l.type === 'radial') {
    const cx = (l.at?.[0] ?? 50) / 100; const cy = (l.at?.[1] ?? 50) / 100;
    const r = Math.max(...[[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => Math.hypot(u - cx, v - cy))); // farthest corner
    const flat = resolveStops(l.stops, 100);
    return (x, y) => colourAt(flat, (Math.hypot(x - cx, y - cy) / r) * 100, l.repeat);
  }
  if (l.type === 'conic') {
    const cx = (l.at?.[0] ?? 50) / 100; const cy = (l.at?.[1] ?? 50) / 100;
    const flat = resolveStops(l.stops, 360);
    return (x, y) => {
      const deg = (Math.atan2(x - cx, -(y - cy)) * 180) / Math.PI - (l.from ?? 0);
      return colourAt(flat, ((deg % 360) + 360) % 360, l.repeat);
    };
  }
  if (l.type === 'ball') {
    // The ball's own pattern as the picture shows it (see ballPattern): 'axis' looks down its
    // pattern's axis, 'front' from the front. Outside the ball: nothing.
    const at = ballPattern(l.pattern);
    return (x, y) => {
      const mx = 2 * x - 1; const my = 1 - 2 * y; const rr = mx * mx + my * my;
      if (rr >= 1) return [0, 0, 0, 0];
      const nz = Math.sqrt(1 - rr);
      const c = l.view === 'axis' ? at(mx, nz, -my) : at(mx, my, nz);
      return [c[0] * c[3], c[1] * c[3], c[2] * c[3], c[3]];
    };
  }
  throw new Error(`Unknown layer type ${l.type}`);
}

/**
 * Paints a stack of layers (top first) into an n × n square, row 0 at the top.
 * → Float32Array of premultiplied RGBA (rgb 0–255, a 0–1). `ss`: samples per
 * pixel side (smooths the hard edges, as the browser does).
 */
export function rasterize(layers, n = 256, { ss = 2 } = {}) {
  const samplers = layers.map(layerSampler).reverse(); // bottom first
  const out = new Float32Array(n * n * 4);
  const w = 1 / (ss * ss);
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      let r = 0; let g = 0; let b = 0; let a = 0;
      for (let sj = 0; sj < ss; sj += 1) {
        for (let si = 0; si < ss; si += 1) {
          const x = (i + (si + 0.5) / ss) / n; const y = (j + (sj + 0.5) / ss) / n;
          let pr = 0; let pg = 0; let pb = 0; let pa = 0;
          for (const s of samplers) {
            const c = s(x, y);
            pr = c[0] + pr * (1 - c[3]); pg = c[1] + pg * (1 - c[3]); pb = c[2] + pb * (1 - c[3]); pa = c[3] + pa * (1 - c[3]);
          }
          r += pr * w; g += pg * w; b += pb * w; a += pa * w;
        }
      }
      const k = (j * n + i) * 4;
      out[k] = r; out[k + 1] = g; out[k + 2] = b; out[k + 3] = a;
    }
  }
  return out;
}

/**
 * Premultiplied pixels → RGBA bytes. `premultiplied`: keep them premultiplied
 * (for blending a see-through layer), else straight colour with alpha.
 */
export function toBytes(px, { premultiplied = false } = {}) {
  const out = new Uint8Array(px.length);
  for (let k = 0; k < px.length; k += 4) {
    const a = px[k + 3];
    const d = premultiplied ? 1 : (a > 0 ? a : 1);
    out[k] = Math.round(Math.min(255, px[k] / d));
    out[k + 1] = Math.round(Math.min(255, px[k + 1] / d));
    out[k + 2] = Math.round(Math.min(255, px[k + 2] / d));
    out[k + 3] = Math.round(a * 255);
  }
  return out;
}
