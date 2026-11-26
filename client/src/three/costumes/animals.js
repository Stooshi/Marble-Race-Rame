/**
 * The costume library's animals, moved here unchanged from trackFeatures.js:
 * Table Mountain Run's baboon, zebra, giraffe and penguin. Each builds itself in
 * a frame (origin on the ground, turned by q) and returns its moving parts.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, IcosahedronGeometry, Matrix4, Mesh, Quaternion, Vector3 } from 'three';

/** A matrix placing a part at local (x, y, z) in a frame (origin, turned by q), scaled (sx, sy, sz). */
export function local(origin, q, x, y, z, sx = 1, sy = 1, sz = 1) {
  return new Matrix4().compose(origin.clone().add(new Vector3(x, y, z).applyQuaternion(q)), q, new Vector3(sx, sy, sz));
}

/**
 * Table Mountain Run's animals, standing in for Bobsleigh Run's obstacles
 * (physics.features with a `look`): each races exactly like the obstacle it
 * stands in for. They stand in place; only small, natural movements (a head
 * turning, a tail swishing), done in update(). Each returns the moving parts
 * it added to the group.
 */
export const ANIMALS = {
  // A baboon sitting on the track, looking about (the ice block's footprint).
  baboon(add, mat, group, point, q) {
    add('baboon', new IcosahedronGeometry(0.55, 1), local(point, q, 0, 0.55, 0, 1, 1.05, 0.9));        // body, sitting up
    add('baboon', new IcosahedronGeometry(0.35, 1), local(point, q, 0.3, 0.2, 0.35, 0.9, 0.6, 1.2));    // haunches
    add('baboon', new IcosahedronGeometry(0.35, 1), local(point, q, -0.3, 0.2, 0.35, 0.9, 0.6, 1.2));
    add('baboon', new CylinderGeometry(0.07, 0.05, 1.1, 6), local(point, q, 0, 0.45, -0.6, 1, 1, 1).multiply(new Matrix4().makeRotationX(-1.1))); // tail
    const head = new Group();
    head.position.copy(point.clone().add(new Vector3(0, 1.25, 0.15).applyQuaternion(q)));
    head.quaternion.copy(q);
    head.add(new Mesh(new IcosahedronGeometry(0.3, 1), mat('baboon')));
    const muzzle = new Mesh(new IcosahedronGeometry(0.17, 1), mat('baboonFace'));
    muzzle.position.set(0, -0.06, 0.28);
    muzzle.scale.set(1, 0.8, 1.4);
    head.add(muzzle);
    group.add(head);
    return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.7, period: 3.7 }];
  },
  // A zebra standing side-on across the high line, swishing its tail.
  zebra(add, mat, group, point, q) {
    const W = 'zebraW';
    const B = 'zebraB';
    add(W, new BoxGeometry(0.55, 0.6, 1.6), local(point, q, 0, 1.1, 0));
    for (const z of [-0.55, -0.15, 0.25, 0.6]) add(B, new BoxGeometry(0.57, 0.62, 0.12), local(point, q, 0, 1.1, z)); // stripes
    for (const [x, z] of [[-0.18, -0.6], [0.18, -0.6], [-0.18, 0.6], [0.18, 0.6]]) add(W, new BoxGeometry(0.13, 0.85, 0.13), local(point, q, x, 0.42, z));
    add(W, new BoxGeometry(0.25, 0.75, 0.3), local(point, q, 0, 1.55, 0.85).multiply(new Matrix4().makeRotationX(0.5))); // neck
    add(B, new BoxGeometry(0.06, 0.6, 0.18), local(point, q, 0, 1.68, 0.78).multiply(new Matrix4().makeRotationX(0.5)));   // mane
    const head = new Group();
    head.position.copy(point.clone().add(new Vector3(0, 1.88, 1.05).applyQuaternion(q)));
    head.quaternion.copy(q);
    const skull = new Mesh(new BoxGeometry(0.24, 0.26, 0.6), mat(W));
    skull.position.set(0, 0, 0.2);
    skull.rotation.x = 0.6;
    head.add(skull);
    const nose = new Mesh(new BoxGeometry(0.2, 0.18, 0.18), mat(B));
    nose.position.set(0, -0.2, 0.42);
    head.add(nose);
    group.add(head);
    const tail = new Group();
    tail.position.copy(point.clone().add(new Vector3(0, 1.3, -0.82).applyQuaternion(q)));
    tail.quaternion.copy(q);
    const hair = new Mesh(new CylinderGeometry(0.04, 0.06, 0.7, 5), mat(B));
    hair.position.set(0, -0.35, 0);
    tail.add(hair);
    group.add(tail);
    return [
      { part: tail, base: q.clone(), axis: new Vector3(0, 0, 1), swing: 0.45, period: 1.3 },
      { part: head, base: q.clone(), axis: new Vector3(1, 0, 0), swing: 0.18, period: 4.1 },
    ];
  },
  // A giraffe standing in the pack's line, turning its head slowly (the snowman's footprint: its legs).
  giraffe(add, mat, group, point, q) {
    const G = 'giraffe';
    const S = 'giraffeSpot';
    for (const [x, z] of [[-0.35, -0.5], [0.35, -0.5], [-0.35, 0.5], [0.35, 0.5]]) add(G, new CylinderGeometry(0.1, 0.12, 2.2, 6), local(point, q, x, 1.1, z));
    add(G, new IcosahedronGeometry(0.7, 1), local(point, q, 0, 2.5, 0, 0.75, 0.75, 1.45)); // body
    for (const [x, y, z] of [[0.5, 2.6, 0.3], [-0.5, 2.4, -0.4], [0.45, 2.3, -0.6], [-0.48, 2.7, 0.5]]) add(S, new IcosahedronGeometry(0.16, 0), local(point, q, x, y, z, 1, 1, 0.5));
    add(G, new CylinderGeometry(0.14, 0.22, 2.2, 6), local(point, q, 0, 3.6, 0.75).multiply(new Matrix4().makeRotationX(0.35))); // the long neck
    const head = new Group();
    head.position.copy(point.clone().add(new Vector3(0, 4.7, 1.15).applyQuaternion(q)));
    head.quaternion.copy(q);
    const skull = new Mesh(new BoxGeometry(0.28, 0.32, 0.65), mat(G));
    skull.position.set(0, 0, 0.18);
    head.add(skull);
    for (const x of [-0.08, 0.08]) {
      const horn = new Mesh(new CylinderGeometry(0.035, 0.035, 0.28, 5), mat(S));
      horn.position.set(x, 0.28, 0);
      head.add(horn);
    }
    group.add(head);
    return [{ part: head, base: q.clone(), axis: new Vector3(0, 1, 0), swing: 0.5, period: 6.3 }];
  },
  // A penguin standing on the quay, swaying from foot to foot.
  penguin(add, mat, group, point, q, scale = 1) {
    const body = new Group();
    body.position.copy(point);
    body.quaternion.copy(q);
    body.scale.setScalar(scale);
    const back = new Mesh(new IcosahedronGeometry(0.3, 1), mat('penguinB'));
    back.scale.set(1, 1.55, 0.9);
    back.position.y = 0.45;
    const belly = new Mesh(new IcosahedronGeometry(0.24, 1), mat('penguinW'));
    belly.scale.set(1, 1.5, 0.6);
    belly.position.set(0, 0.42, 0.14);
    const head = new Mesh(new IcosahedronGeometry(0.17, 1), mat('penguinB'));
    head.position.y = 0.95;
    const beak = new Mesh(new ConeGeometry(0.05, 0.16, 6), mat('beak'));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.93, 0.18);
    body.add(back, belly, head, beak);
    group.add(body);
    return [{ part: body, base: q.clone(), axis: new Vector3(0, 0, 1), swing: 0.12, period: 1.6 + scale }];
  },
};

