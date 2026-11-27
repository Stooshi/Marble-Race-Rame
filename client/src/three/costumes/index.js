/**
 * The costume library: what each obstacle can be dressed as. A costume never
 * changes how an obstacle races (the physics never sees it); it only decides
 * what the 3D view draws in the obstacle's place.
 *
 * Each costume says which kind of obstacle it dresses (`places`), and the
 * placement for that kind (trackFeatures.js) stands it where the obstacle is:
 *   block    in the pack's line, facing the marbles coming (ice block, snowman)
 *   curtain  figures across the high line (icicles)
 *   swipe    a body beyond the rim and a reaching arm on the swipe's timetable (polar bear)
 *   parked   along a wall, filling the parked object's footprint (bus)
 *   slalom   a thin pole or small round piece (slalom gate)
 * A new costume is one builder (see ./kit.js) and one entry here.
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4 } from 'three';
import { ANIMALS, local } from './animals';
import { COSTUME_COLORS, KIT_COSTUMES } from './kit';

/** Table Mountain Run's elephant: its body beyond the rim (the trunk is its swiping arm). */
function elephantBody(add, base, q) {
  add('elephant', new IcosahedronGeometry(1, 1), local(base, q, 0, 2.3, -0.6, 1.25, 1.15, 1.9));          // body
  for (const [x, z] of [[-0.6, -1.5], [0.6, -1.5], [-0.6, 0.3], [0.6, 0.3]]) add('elephant', new CylinderGeometry(0.32, 0.36, 1.8, 7), local(base, q, x, 0.9, z)); // legs
  add('elephant', new IcosahedronGeometry(0.8, 1), local(base, q, 0, 3.0, 1.2));                          // head
  for (const x of [-1, 1]) add('elephant', new BoxGeometry(0.12, 1.3, 1.1), local(base, q, x * 0.95, 3.0, 0.9).multiply(new Matrix4().makeRotationY(x * 0.35))); // ears
  for (const x of [-1, 1]) add('tusk', new ConeGeometry(0.09, 0.8, 6), local(base, q, x * 0.35, 2.4, 1.75).multiply(new Matrix4().makeRotationX(Math.PI / 2 + 0.5)));
}

export const COSTUMES = {
  // Table Mountain Run's animals (unchanged; the scene fingerprints prove it).
  baboon: { places: 'block', build: ANIMALS.baboon },
  giraffe: { places: 'block', upright: true, build: ANIMALS.giraffe },
  zebras: { places: 'curtain', build: ANIMALS.zebra },
  elephant: {
    places: 'swipe',
    body: elephantBody,
    standOff: 3.2, // metres out beyond the rim
    sink: -0.4,
    // The trunk: from the shoulder (local x, y, z) to the tip, which reaches in on the swipe's timetable.
    arm: { colour: 'elephant', shoulder: [0, 2.6, 1.85], radii: [0.16, 0.3], segments: 8, tip: 0.22, tipDetail: 1, end: 0.1, endDetail: 0, lift: 0.45, outLift: 0.5, nose: 0.15 },
  },
  ...KIT_COSTUMES,
};

export { COSTUME_COLORS };

/** Which physics obstacle types each kind of placement dresses (the kit's obstacles, src/trackKit). */
export const PLACES_ON = {
  block: ['ice_block', 'snowman'],
  curtain: ['icicles'],
  swipe: ['polar_bear'],
  parked: ['bus'],
  slalom: ['slalom_gate'],
};
