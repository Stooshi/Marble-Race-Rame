/**
 * Small idle movements (a head turning, an arm waving, a tail swishing) for
 * many figures in one draw call. Each moving part is built as usual (a Group
 * of meshes, turned on the race clock about its own pivot); bakeMovers() takes
 * them out of the scene and merges them, in their colours, into one mesh whose
 * corners are turned on the CPU each frame. A few hundred corners per figure:
 * far cheaper than a draw call each.
 *
 * Idlers: { part, base, axis, swing, period, phase } (the costume library's shape).
 */
import { Mesh, MeshLambertMaterial, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { piece } from './scenery/parts';

/** The moving parts of `idlers` (children of `container`) as one mesh, and update(t ms) to turn them. */
export function bakeMovers(idlers, container, name = 'moving') {
  if (!idlers.length) return null;
  container.updateMatrixWorld(true);
  const inv = container.matrixWorld.clone().invert();
  const pieces = [];
  const movers = [];
  let count = 0;
  for (const idle of idlers) {
    const { part } = idle;
    // The part's corners in its own frame: its pivot at the origin, unturned (its scale kept).
    const pivot = part.position.clone();
    part.position.set(0, 0, 0);
    part.quaternion.identity();
    part.updateMatrixWorld(true);
    part.traverse((o) => {
      if (!o.isMesh) return;
      const g = piece(o.geometry.clone(), o.material.color ?? '#ff00ff', inv.clone().multiply(o.matrixWorld));
      for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(key)) g.deleteAttribute(key);
      if (!g.getAttribute('normal')) g.computeVertexNormals();
      pieces.push(g);
      movers.push({ idle, pivot, begin: count, local: Float32Array.from(g.getAttribute('position').array), normals: Float32Array.from(g.getAttribute('normal').array) });
      count += g.getAttribute('position').count;
    });
    part.removeFromParent();
  }
  const mesh = new Mesh(mergeGeometries(pieces), new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.name = name;
  mesh.frustumCulled = false; // (its corners move every frame)
  container.add(mesh);
  const turn = new Quaternion();
  const spin = new Quaternion();
  const v = new Vector3();
  const update = (t) => {
    const sec = t / 1000;
    const pos = mesh.geometry.getAttribute('position');
    const nrm = mesh.geometry.getAttribute('normal');
    for (const m of movers) {
      const a = m.idle;
      turn.copy(a.base).multiply(spin.setFromAxisAngle(a.axis, a.swing * Math.sin((sec + a.phase) * (2 * Math.PI) / a.period)));
      for (let k = 0; k < m.local.length; k += 3) {
        v.set(m.local[k], m.local[k + 1], m.local[k + 2]).applyQuaternion(turn).add(m.pivot);
        pos.setXYZ(m.begin + k / 3, v.x, v.y, v.z);
        v.set(m.normals[k], m.normals[k + 1], m.normals[k + 2]).applyQuaternion(turn);
        nrm.setXYZ(m.begin + k / 3, v.x, v.y, v.z);
      }
    }
    pos.needsUpdate = true;
    nrm.needsUpdate = true;
  };
  update(0);
  return { mesh, update };
}
