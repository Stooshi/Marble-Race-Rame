/**
 * Small helpers for building cartoon scenery out of a few simple shapes,
 * merged so each kind of object costs one draw call.
 */
import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Small, fast, seedable random numbers so scenery looks the same every visit. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A geometry ready for merging: non-indexed, no uvs, one flat colour, moved by `matrix`. */
export function piece(geometry, color, matrix) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g !== geometry) geometry.dispose();
  g.deleteAttribute('uv');
  if (matrix) g.applyMatrix4(matrix);
  const c = new Color(color);
  const colors = new Float32Array(g.getAttribute('position').count * 3);
  for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b; }
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return g;
}

/** A box of size (w, h, d) centred at (x, y, z). */
export function box(w, h, d, x, y, z, color) {
  return piece(new BoxGeometry(w, h, d), color, new Matrix4().makeTranslation(x, y, z));
}

/** A square beam of the given thickness from point a to point b. */
export function beam(a, b, thickness, color) {
  const dir = new Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new Matrix4().compose(
    new Vector3().addVectors(a, b).multiplyScalar(0.5),
    new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir.normalize()),
    new Vector3(1, 1, 1),
  );
  return piece(new BoxGeometry(thickness, thickness, len), color, m);
}

/** Raw triangles (flat list of [x, y, z] triples) as a coloured piece. */
export function triangles(points, color) {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(points.flat(), 3));
  g.computeVertexNormals();
  return piece(g, color);
}

export function merge(pieces) {
  const merged = mergeGeometries(pieces, false);
  for (const p of pieces) p.dispose();
  return merged;
}

export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
