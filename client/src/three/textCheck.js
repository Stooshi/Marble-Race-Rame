/**
 * Painted text on a track (lane numbers, scoreboards, timing boards, billboards, backglasses,
 * cabinet art) must read the right way round, never mirrored. Meshes that carry text are tagged
 * `userData.text` ({ floor: true } for text painted on the track's floor; { faces: 'front' } for a
 * two-sided mesh whose pictures all sit on a body's outer face), and this works out, for
 * each of their triangles, the side the text reads correctly from: the cross product of the
 * directions in which the picture's u (left to right) and v (bottom to top) run across it.
 * Used by the tests (client/test/trackText.test.js); drawing never calls it.
 */
import { DoubleSide, Vector3 } from 'three';

/**
 * Each triangle of a (world-space) mesh: { centre, readsFrom (unit: the side the text reads
 * correctly from), front (unit: the triangle's own front), up (unit: the picture's up on it) }.
 */
export function textTriangles(mesh) {
  mesh.updateMatrixWorld(true);
  const g = mesh.geometry;
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  if (!pos || !uv) return [];
  const index = g.index;
  const count = index ? index.count : pos.count;
  const out = [];
  const p = [new Vector3(), new Vector3(), new Vector3()];
  const t = [[0, 0], [0, 0], [0, 0]];
  for (let k = 0; k + 2 < count; k += 3) {
    for (let j = 0; j < 3; j += 1) {
      const n = index ? index.getX(k + j) : k + j;
      p[j].fromBufferAttribute(pos, n).applyMatrix4(mesh.matrixWorld);
      t[j] = [uv.getX(n), uv.getY(n)];
    }
    const e1 = p[1].clone().sub(p[0]);
    const e2 = p[2].clone().sub(p[0]);
    const du1 = t[1][0] - t[0][0]; const dv1 = t[1][1] - t[0][1];
    const du2 = t[2][0] - t[0][0]; const dv2 = t[2][1] - t[0][1];
    const det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-12) continue; // (no picture across it)
    const T = e1.clone().multiplyScalar(dv2).addScaledVector(e2, -dv1).divideScalar(det); // d(position)/du
    const B = e2.clone().multiplyScalar(du1).addScaledVector(e1, -du2).divideScalar(det); // d(position)/dv
    const front = e1.clone().cross(e2).normalize();
    out.push({ centre: p[0].clone().add(p[1]).add(p[2]).divideScalar(3), readsFrom: T.clone().cross(B).normalize(), front, up: B.normalize(), right: T.normalize() });
  }
  return out;
}

/**
 * Mirrored text on a mesh tagged `userData.text`: [{ centre, why }] (empty when it all reads right).
 * `viewerAt(point)`: where the text's viewers look from (a point on or over the track near it);
 * `forwardAt(point)`: the way the race runs there (for text on the floor: its top towards the finish).
 */
export function mirroredText(mesh, { viewerAt, forwardAt } = {}) {
  const bad = [];
  // { faces: 'front' }: drawn from both sides, but every picture sits on a body's outer face (its back
  // covered), so it must read from its own front, whichever way that faces from the track.
  const double = mesh.material?.side === DoubleSide && mesh.userData.text?.faces !== 'front';
  for (const tri of textTriangles(mesh)) {
    if (!double && tri.readsFrom.dot(tri.front) < 0) bad.push({ centre: tri.centre, why: 'mirrored on its front' });
    else if (double && viewerAt) {
      const toViewer = viewerAt(tri.centre).clone().sub(tri.centre).normalize();
      if (tri.readsFrom.dot(toViewer) < 0) bad.push({ centre: tri.centre, why: 'mirrored as seen from the track' });
    }
    if (mesh.userData.text?.floor) {
      if (tri.readsFrom.y < 0.5) bad.push({ centre: tri.centre, why: 'floor text not reading from above' });
      else if (forwardAt && tri.up.dot(forwardAt(tri.centre)) < 0.5) bad.push({ centre: tri.centre, why: 'floor text upside down for the marbles coming' });
    }
  }
  return bad;
}
