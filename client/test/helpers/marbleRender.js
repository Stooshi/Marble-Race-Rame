// A reference drawing of a 3D marble on the CPU: the marble shader
// (shared/marbles/materials.js FRAGMENT) step for step, for a ball seen
// straight on from far away, so the quality checks can measure it without a GPU.
import { Matrix4, Quaternion, Vector3 } from 'three';
import { GLOSS_LAYERS } from '../../src/shared/marbles/badge';
import { rasterize, toBytes } from '../../src/shared/marbles/paint';

const sample = (tex, u, v) => {
  const { data, width: W, height: H } = tex.image;
  let x = u * W - 0.5; let y = v * H - 0.5;
  const wrap = tex.wrapS === 1000; // RepeatWrapping
  const at = (i, j) => {
    const ii = wrap ? ((i % W) + W) % W : Math.min(W - 1, Math.max(0, i));
    const jj = Math.min(H - 1, Math.max(0, j));
    return (jj * W + ii) * 4;
  };
  const x0 = Math.floor(x); const y0 = Math.floor(y); x -= x0; y -= y0;
  const out = [0, 0, 0, 0];
  for (const [i, j, w] of [[x0, y0, (1 - x) * (1 - y)], [x0 + 1, y0, x * (1 - y)], [x0, y0 + 1, (1 - x) * y], [x0 + 1, y0 + 1, x * y]]) {
    const k = at(i, j);
    for (let c = 0; c < 4; c += 1) out[c] += (data[k + c] / 255) * w;
  }
  return out;
};

/**
 * The marble `spec` (lookSpec / plainSpec) drawn n × n, the ball filling the
 * square; `turn`: the pattern's orientation (a Quaternion, world → as the ball
 * turned); `level`: 1 by day, NIGHT_LEVEL at night; `blur`: 0–1.
 * → [{ x, y, rgb: [0–255 ×3] }] for the pixels inside the ball.
 */
export function drawMarble(spec, { n = 96, turn = new Quaternion(), level = 1, blur = 0 } = {}) {
  const inv = new Matrix4().makeRotationFromQuaternion(turn.clone().invert());
  const q = new Vector3();
  const out = [];
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const mx = ((i + 0.5) / n) * 2 - 1; const my = 1 - ((j + 0.5) / n) * 2;
      const rr = mx * mx + my * my;
      if (rr >= 1) continue;
      // Seen from +z: the normal is the facing-picture's coordinates plus depth.
      const nz = Math.sqrt(1 - rr);
      const tu = 0.5 + 0.5 * mx; const tv = 0.5 - 0.5 * my;
      let c = sample(spec.bodyTexture, tu, tv).slice(0, 3);
      if (spec.detail) {
        q.set(mx, my, nz).applyMatrix4(inv).normalize();
        const phi = Math.atan2(q.z, -q.x);
        const du = phi / (2 * Math.PI) + (phi < 0 ? 1 : 0);
        const dv = 1 - Math.acos(Math.max(-1, Math.min(1, q.y))) / Math.PI;
        const d = sample(spec.detail, du, dv);
        const sharp = c.map((v, k) => v + (Math.min(d[k], 1) - v) * d[3]);
        const bc = spec.blur ? spec.blur.colour.map((v) => v / 255) : [0, 0, 0];
        const ba = spec.blur ? spec.blur.share : 0;
        const blurred = c.map((v, k) => v + (bc[k] - v) * ba);
        c = sharp.map((v, k) => v + (blurred[k] - v) * blur);
      }
      const base = c.map((v) => v * 255);
      const o = sample(spec.overTexture, tu, tv);
      c = c.map((v, k) => (o[k] + v * (1 - o[3])) * level * 255);
      out.push({ x: mx, y: my, rgb: c, base });
    }
  }
  return out;
}

/**
 * The flat shop picture (its layers, the shine on top, on the shop card colour) as the same pixels
 * inside the circle. `shine: false`: without the shine (the colours the marble itself is made of).
 */
export function drawPicture(layers, { n = 96, card = '#1A2133', shine = true } = {}) {
  const px = toBytes(rasterize([...(shine ? GLOSS_LAYERS : []), ...layers, { type: 'solid', color: card }], n));
  const out = [];
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const mx = ((i + 0.5) / n) * 2 - 1; const my = 1 - ((j + 0.5) / n) * 2;
      if (mx * mx + my * my >= 1) continue;
      const k = (j * n + i) * 4;
      out.push({ x: mx, y: my, rgb: [px[k], px[k + 1], px[k + 2]] });
    }
  }
  return out;
}

// ── Colour measures (CIELAB, D65) ──────────────────────────────────────────

const lin = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
export function lab([r, g, b]) {
  const R = lin(r); const G = lin(g); const B = lin(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
/** ΔE (CIE76): about 2.3 is the smallest difference most people can see side by side. */
export const deltaE = (a, b) => Math.hypot(...lab(a).map((v, k) => v - lab(b)[k]));
/** The average colour of some pixels (by light: averaged in linear light, back to sRGB). */
export function meanColour(px) {
  const s = [0, 0, 0];
  for (const p of px) for (let k = 0; k < 3; k += 1) s[k] += lin(Math.max(0, Math.min(255, p.rgb[k])));
  return s.map((v) => {
    const c = v / px.length;
    return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  });
}
/** Hue angle (degrees) and chroma of a colour. */
export function hueOf(rgb) {
  const [, a, b] = lab(rgb);
  return { hue: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360, chroma: Math.hypot(a, b) };
}

/**
 * How far the marble's own colours (under the shine) stray from the picture's: for each
 * pixel the nearest colour in the picture without its shine, ΔE; → { median, p95 }.
 */
export function paletteGap(marblePx, layers) {
  const pal = [...new Map(drawPicture(layers, { n: 64, shine: false }).map((p) => [p.rgb.map((v) => Math.round(v / 3)).join(), lab(p.rgb)])).values()];
  const gaps = marblePx.map((p) => {
    const L = lab(p.base);
    let m = Infinity;
    for (const q of pal) { const e = (L[0] - q[0]) ** 2 + (L[1] - q[1]) ** 2 + (L[2] - q[2]) ** 2; if (e < m) m = e; }
    return Math.sqrt(m);
  }).sort((a, b) => a - b);
  return { median: gaps[Math.floor(gaps.length * 0.5)], p95: gaps[Math.floor(gaps.length * 0.95)] };
}
