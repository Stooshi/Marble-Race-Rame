'use strict';

/**
 * The layout library: eight proven section orders for the rest of a track,
 * after its opening, so tracks differ in where the splitter sits (or whether
 * there is one), where the sharp bend comes, how many spirals and climbs they
 * have and where their obstacles stand.
 *
 *   opening: opening('crest-start'),
 *   sections: layout('twin-spirals', { mirror: true, costumes: { swipe: 'stag' }, dress: { spiral1: { name: 'Great Tree spiral', around: 'giant-tree' } } }),
 *
 * Each was proven on its own test track (src/tracks/variety-*.js) with the
 * classic opening: three batches of 1,000 races and the full track report, every
 * fairness and racing target passing. A track takes a layout as it is and dresses
 * it (names, scenery, landmarks, billboards, costumes); `mirror` turns every bend
 * the other way and swaps each splitter's channels exactly, as the mirror tool does.
 * A track may still write its own sections by hand; the sameness check in the track
 * report then makes sure they differ from every other track's.
 */

const {
  straight, plunge, climb, sBends, sweep, spiral, hairpin, splitter, waterfall, halfPipe, box, rail, tableTop, jibLine, boostJump,
  pileUp, block, curtain, swipe, parked, slalom, peg, boost, moguls, rumble, steps, brake, paint,
} = require('./parts');

// The proven Grand Prix splitter (Dubai Marble Grand Prix onwards): a left-hand splitter's
// channels, and the same mirrored for a right-hand one.
const BALANCE = {
  left: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } },
  right: { tipOffset: 0.8, left: { drag: 0.42, scrub: 0.72 }, right: { drag: 1.32, scrub: 1.32 } },
};
// The proven splitter with its inside channel's ice rougher (drag and scrub both `rough`).
const insideDrag = (side, rough) => (side === 'left'
  ? { ...BALANCE.left, left: { drag: rough, scrub: rough } }
  : { ...BALANCE.right, right: { drag: rough, scrub: rough } });
// The late splitter's: its inside channel a little rougher.
const LATE_BALANCE = {
  left: { tipOffset: -0.8, left: { drag: 1.5, scrub: 1.5 }, right: { drag: 0.42, scrub: 0.72 } },
  right: { tipOffset: 0.8, left: { drag: 0.42, scrub: 0.72 }, right: { drag: 1.5, scrub: 1.5 } },
};

// Each layout: a function of the bends' sides (L = the first bend's way, R = the other) and the costumes.
const LAYOUTS = {
  /** L1 Classic: S-bends, splitter, sweep, braking straight, hairpin, spiral, last straight. */
  classic: (L, R, c, b) => [
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 80, grade: 0.13 }), billboards: 2 },
    { key: 'splitter', name: 'Splitter', shape: splitter({ side: L, balance: b(L) }) },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 80, degrees: 160, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: R, radius: 45, grade: 0.17 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.15, side: L, length: 8 })], features: [rumble({ from: 0.55, to: 0.95, count: 4 })],
    },
  ],

  /** L2 Early hairpin: the sharp bend comes first, then S-bends spread the field out again before the splitter. */
  'early-hairpin': (L, R, c, b) => [
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 80, degrees: 100, grade: 0.12 }), billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'outOfHairpin', name: 'Out of the hairpin', shape: plunge(50, { grade: 0.28, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.5, to: 0.9, count: 2, loss: 0.3 })] },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 80, grade: 0.14 }), billboards: 2 },
    { key: 'splitter', name: 'Splitter', shape: splitter({ side: L, balance: b(L) }) },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: R, radius: 48, grade: 0.18 }) },
    { key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }), features: [rumble({ from: 0.55, to: 0.95, count: 3 })] },
  ],

  /** L3 Twin spirals: no splitter; a spiral each way, a peg field between them, the hairpin in the middle. */
  'twin-spirals': (L, R, c) => [
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 80, grade: 0.13 }), billboards: 2 },
    { key: 'spiral1', name: 'First spiral', shape: spiral({ side: L, radius: 45, grade: 0.17 }) },
    {
      key: 'pegRun', name: 'Peg field', shape: straight(75, { grade: 0.16 }),
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'left' }), peg({ costume: c.peg, at: 0.32, line: 'right' }), peg({ costume: c.peg, at: 0.44, line: 'center' }), peg({ costume: c.peg, at: 0.56, line: 'left' }), peg({ costume: c.peg, at: 0.68, line: 'right' }), peg({ costume: c.peg, at: 0.8, line: 'center' })],
    },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spiral2', name: 'Second spiral', shape: spiral({ side: R, radius: 50, grade: 0.17 }) },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 80, degrees: 110, grade: 0.08 }), features: [boost({ at: 0.1 })], billboards: 3 },
    { key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }), obstacles: [curtain({ costume: c.curtain, at: 0.2, side: L })], features: [rumble({ from: 0.6, to: 0.95, count: 4 })] },
  ],

  /** L4 Climb and drop: a sweep, a short climb over a crest and a drop, S-bends into the splitter; the hairpin comes late. */
  'climb-drop': (L, R, c, b) => [
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 80, degrees: 90, grade: 0.12 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'approach', name: 'Run to the climb', shape: straight(35, { grade: 0.14 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })] },
    { key: 'climb', name: 'Climb', shape: climb(8, { grade: -0.04, after: 0.3 }) },
    { key: 'drop', name: 'Drop', shape: plunge(60, { grade: 0.55, from: 0.3 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.95, count: 4, loss: 0.3 })], billboards: 1 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 70, grade: 0.13 }), billboards: 2 },
    // (Its inside channel's ice rougher than the proven splitter's: the field comes off the drop faster.)
    { key: 'splitter', name: 'Splitter', shape: splitter({ side: L, balance: insideDrag(L, 2.9) }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: L, radius: 45, grade: 0.18 }) },
    { key: 'lastStraight', name: 'Last straight', shape: straight(60, { grade: 0.15 }) },
  ],

  /** L5 Late splitter: a sweep, the hairpin early, a spiral, then S-bends into a splitter just before the finish. */
  'late-splitter': (L, R, c, b) => [
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 80, degrees: 140, grade: 0.08 }), billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'outOfHairpin', name: 'Out of the hairpin', shape: plunge(45, { grade: 0.28, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.9, count: 4, loss: 0.3 })] },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: R, radius: 50, grade: 0.16 }) },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 80, grade: 0.13 }), billboards: 2 },
    // (Its inside channel's ice a little rougher than the proven splitter's: here, near the line, the field arrives at full speed.)
    { key: 'splitter', name: 'Splitter', shape: splitter({ side: L, balance: LATE_BALANCE[L] }) },
    { key: 'lastStraight', name: 'Last straight', shape: straight(40, { grade: 0.15 }) },
  ],

  /** L6 Mid drop: an early splitter, then a waterfall (or a plunge) halfway down, the hairpin late. */
  'mid-drop': (L, R, c, b, o) => [
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 80, grade: 0.13 }), billboards: 2 },
    { key: 'splitter', name: 'Splitter', shape: splitter({ side: L, balance: b(L) }) },
    { key: 'aboveDrop', name: 'Above the drop', shape: straight(35, { grade: 0.12 }) },
    o.waterfall === false
      ? { key: 'drop', name: 'Drop', shape: plunge(40, { grade: 0.35, from: 0.12 }) }
      : { key: 'drop', name: 'Waterfall', shape: waterfall(40, { grade: 0.35 }), surface: 'water' },
    { key: 'belowDrop', name: 'Below the drop', shape: straight(40, { grade: 0.12 }), billboards: 1 },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 80, degrees: 140, grade: 0.07 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: R, radius: 45, grade: 0.17 }) },
    { key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }), obstacles: [curtain({ costume: c.curtain, at: 0.2, side: L })], features: [rumble({ from: 0.6, to: 0.95, count: 4 })] },
  ],

  /** L7 Two splitters: each after S-bends, one before the hairpin and one after it. */
  'two-splitters': (L, R, c, b) => [
    { key: 'sBends1', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 70, grade: 0.13 }), billboards: 2 },
    { key: 'splitter1', name: 'First splitter', shape: splitter({ side: L, balance: b(L) }) },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 80, degrees: 100, grade: 0.08 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'outOfHairpin', name: 'Out of the hairpin', shape: plunge(40, { grade: 0.28, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.9, count: 3, loss: 0.3 })] },
    { key: 'sBends2', name: 'More S-bends', shape: sBends({ first: L, radius: 75, degrees: 70, grade: 0.14 }) },
    // (Out of the hairpin the field reaches it faster: its inside channel's ice much rougher.)
    { key: 'splitter2', name: 'Second splitter', shape: splitter({ side: L, balance: insideDrag(L, 3.2) }) },
    { key: 'lastStraight', name: 'Last straight', shape: straight(40, { grade: 0.15 }) },
  ],

  /** L8 Long sweeps: no splitter; two long sweeps with a mogul field between, the hairpin, then a spiral and a half. */
  'long-sweeps': (L, R, c) => [
    { key: 'sweep1', name: 'First sweep', shape: sweep({ side: L, radius: 80, degrees: 150, grade: 0.1 }), billboards: 2 },
    { key: 'moguls', name: 'Mogul field', shape: straight(60, { grade: 0.15 }), features: [moguls({ from: 0.55, to: 0.95, count: 4 })] },
    {
      key: 'sweep2', name: 'Second sweep', shape: sweep({ side: R, radius: 80, degrees: 150, grade: 0.08 }), billboards: 2,
      obstacles: [peg({ costume: c.peg, at: 0.35, line: 'left' }), peg({ costume: c.peg, at: 0.55, line: 'right' }), peg({ costume: c.peg, at: 0.75, line: 'center' })],
    },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: R, radius: 45, turns: 1.5, grade: 0.18 }) },
    { key: 'lastStraight', name: 'Last straight', shape: straight(70, { grade: 0.15 }), obstacles: [curtain({ costume: c.curtain, at: 0.2, side: R })], features: [rumble({ from: 0.6, to: 0.95, count: 4 })] },
  ],

  /** L9 Island spins: a peg run (a cave), a long sweep, a spin, S-bends, the hairpin, a slalom drop, the second spin and the run-in. */
  'island-spins': (L, R, c) => [
    {
      key: 'caveRun', name: 'Peg run', shape: straight(70, { grade: 0.13 }),
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'left' }), peg({ costume: c.peg, at: 0.4, line: 'right' }), peg({ costume: c.peg, at: 0.55, line: 'center' }), peg({ costume: c.peg, at: 0.7, line: 'left' })],
    },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 85, degrees: 150, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'spiral1', name: 'First spiral', shape: spiral({ side: L, radius: 55, grade: 0.15 }) },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 70, grade: 0.12 }), billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(50, { grade: 0.22, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.9, count: 4, loss: 0.3 })] },
    { key: 'spiral2', name: 'Second spiral', shape: spiral({ side: R, radius: 55, grade: 0.17 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(70, { grade: 0.15 }), features: [rumble({ from: 0.7, to: 0.95, count: 3 })], billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'right' }), peg({ costume: c.peg, at: 0.38, line: 'left' }), peg({ costume: c.peg, at: 0.51, line: 'center' })],
    },
  ],

  /** L10 Sea crossing: S-bends, a long straight crossing with moguls, a spiral, the hairpin, a drop (a tunnel), S-bends, a sweep and a peg run home. No splitter: one here, after the drop or after S-bends, could not be balanced (the leaders all took one channel). */
  'sea-crossing': (L, R, c) => [
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 70, grade: 0.14 }), billboards: 2 },
    { key: 'crossing', name: 'Long crossing', shape: straight(180, { grade: 0.085 }), features: [boost({ at: 0.1 }), moguls({ from: 0.5, to: 0.9, count: 4 })], billboards: 2 },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: L, radius: 50, grade: 0.16 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'tunnelRun', name: 'Drop out of the hairpin', shape: plunge(50, { grade: 0.26, from: 0.16 }) },
    { key: 'sBends2', name: 'More S-bends', shape: sBends({ first: R, radius: 80, degrees: 70, grade: 0.13 }) },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 120, grade: 0.08 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(100, { grade: 0.14 }), features: [rumble({ from: 0.75, to: 0.95, count: 3 })],
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'left' }), peg({ costume: c.peg, at: 0.33, line: 'right' }), peg({ costume: c.peg, at: 0.46, line: 'center' }), peg({ costume: c.peg, at: 0.59, line: 'left' })],
    },
  ],

  /** L11 Canopy run: a straight first (a tunnel), a long high sweep, a slalom drop, S-bends, the hairpin late, a spiral and a half, a second sweep and a peg run home. */
  'canopy-run': (L, R, c) => [
    { key: 'trunkRun', name: 'Straight run', shape: straight(50, { grade: 0.14 }) },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 150, grade: 0.08 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'fernDrop', name: 'Slalom drop', shape: plunge(60, { grade: 0.2, from: 0.1 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 70, grade: 0.12 }), billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: R, radius: 48, turns: 1.5, grade: 0.15 }) },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: L, radius: 80, degrees: 110, grade: 0.08 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.3, line: 'left' }), peg({ costume: c.peg, at: 0.5, line: 'right' })],
    },
  ],
  /** L12 Terrace run: S-bends (a curtain), a straight, a long sweep, a spin and a quarter, the hairpin late, a slalom drop, a second sweep and a parked car at the run-in. */
  'terrace-run': (L, R, c) => [
    { key: 'swoops', name: 'S-bends', shape: sBends({ first: L, radius: 72, degrees: 65, grade: 0.13 }), obstacles: [curtain({ costume: c.curtain, at: 0.5, side: R })], billboards: 1 },
    { key: 'straightRun', name: 'Straight run', shape: straight(35, { grade: 0.13 }) },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 90, degrees: 150, grade: 0.085 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: L, radius: 58, turns: 1.25, grade: 0.15 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(55, { grade: 0.2, from: 0.1 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: L, radius: 80, degrees: 80, grade: 0.09 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(50, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
  ],
  /** L13 Delta skim: a long straight through a slalom, a drop, a long sweep, S-bends, the hairpin late, a spiral and a half, a second drop and a parked car and pegs at the run-in. */
  'delta-skim': (L, R, c) => [
    { key: 'skim', name: 'Slalom straight', shape: straight(110, { grade: 0.1 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 4, loss: 0.15 })] },
    { key: 'islandDrop', name: 'Drop', shape: plunge(45, { grade: 0.2, from: 0.1 }) },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 90, degrees: 170, grade: 0.075 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 70, grade: 0.12 }), billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: R, radius: 50, turns: 1.5, grade: 0.16 }) },
    { key: 'lastDrop', name: 'Last drop', shape: plunge(40, { grade: 0.18, from: 0.1 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(75, { grade: 0.14 }),
      obstacles: [parked({ costume: c.parked, at: 0.25, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })],
    },
  ],
  /** L14 Two spins: a spin first, a slalom drop, S-bends, a long sweep (no boost: there the slow marbles took it most), the hairpin late, a second spin and a parked cart and pegs at the run-in. */
  'two-spins': (L, R, c) => [
    { key: 'spin1', name: 'First spin', shape: spiral({ side: L, radius: 48, turns: 1, grade: 0.17 }) },
    { key: 'meadowDrop', name: 'Slalom drop', shape: plunge(50, { grade: 0.2, from: 0.1 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    { key: 'swoops', name: 'S-bends', shape: sBends({ first: R, radius: 72, degrees: 65, grade: 0.12 }), billboards: 1 },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 88, degrees: 150, grade: 0.08 }), billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spin2', name: 'Second spin', shape: spiral({ side: L, radius: 46, turns: 1, grade: 0.17 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(70, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L15 Wall dive: S-bends, a slalom straight, a straight (a tunnel), S-bends, a long sweep, a spin and a quarter, the hairpin late and a parked boat and pegs at the run-in. */
  'wall-dive': (L, R, c) => [
    { key: 'swoops', name: 'S-bends', shape: sBends({ first: L, radius: 72, degrees: 65, grade: 0.13 }), billboards: 1 },
    { key: 'slalomRun', name: 'Slalom straight', shape: straight(50, { grade: 0.13 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 3, loss: 0.15 })] },
    { key: 'tunnelRun', name: 'Straight run', shape: straight(55, { grade: 0.12 }) },
    { key: 'sBends', name: 'More S-bends', shape: sBends({ first: R, radius: 75, degrees: 60, grade: 0.12 }), billboards: 1 },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 90, degrees: 165, grade: 0.08 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: R, radius: 50, turns: 1.25, grade: 0.16 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(70, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 7 }), peg({ costume: c.peg, at: 0.45, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L16 Staircases: a sweep, a spiral, a slalom drop, a straight (a curtain and pegs), a second spiral, the hairpin late, a second sweep and pegs at the run-in. */
  staircases: (L, R, c) => [
    { key: 'gallery', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 165, grade: 0.085 }), billboards: 2 },
    { key: 'stair1', name: 'First spiral', shape: spiral({ side: R, radius: 48, turns: 1, grade: 0.17 }) },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(55, { grade: 0.2, from: 0.1 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    { key: 'library', name: 'Straight run', shape: straight(70, { grade: 0.13 }), obstacles: [curtain({ costume: c.curtain, at: 0.3, side: L }), peg({ costume: c.peg, at: 0.55, line: 'right' }), peg({ costume: c.peg, at: 0.75, line: 'left' })], billboards: 1 },
    { key: 'stair2', name: 'Second spiral', shape: spiral({ side: L, radius: 46, turns: 1, grade: 0.17 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: L, radius: 80, degrees: 90, grade: 0.08 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(55, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.3, line: 'left' }), peg({ costume: c.peg, at: 0.45, line: 'right' }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [rumble({ from: 0.75, to: 0.95, count: 3 })],
    },
  ],
  /** L17 Siege routes: a sweep, a splitter, a spiral, the run to the hairpin (a bridge), the hairpin late, a slalom drop and pegs at the run-in. A second splitter (after the hairpin, before or after S-bends, or before the hairpin) could not be balanced: the leaders always took one channel. */
  'siege-routes': (L, R, c, b) => [
    { key: 'approach', name: 'Sweep', shape: sweep({ side: R, radius: 85, degrees: 160, grade: 0.085 }), billboards: 2 },
    // (Its tip further over than the proven splitter's, its inside channel a little rougher: from this sweep the field kept to the outside channel.)
    { key: 'splitter', name: 'Splitter', shape: splitter({ side: L, balance: { ...insideDrag(L, 1.42), tipOffset: L === 'left' ? -1.3 : 1.3 } }) },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: L, radius: 48, turns: 1.25, grade: 0.16 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'outOfHairpin', name: 'Out of the hairpin', shape: plunge(45, { grade: 0.26, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.9, count: 3, loss: 0.3 })] },
    { key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }), obstacles: [peg({ costume: c.peg, at: 0.3, line: 'left' }), peg({ costume: c.peg, at: 0.5, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })], billboards: 2 },
  ],
  /** L18 Stage hairpin: the hairpin first, a slalom drop, a long sweep (a curtain), a spiral, S-bends and pegs at the run-in. */
  'stage-hairpin': (L, R, c) => [
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'outOfHairpin', name: 'Slalom drop', shape: plunge(45, { grade: 0.26, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.9, count: 3, loss: 0.3 })] },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 90, degrees: 170, grade: 0.08 }), obstacles: [curtain({ costume: c.curtain, at: 0.5, side: L })], billboards: 2 },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: L, radius: 50, turns: 1, grade: 0.16 }) },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 70, grade: 0.13 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.3, line: 'right' }), peg({ costume: c.peg, at: 0.5, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L19 Saucer sweeps: a long sweep, a slalom drop, a second sweep (a curtain), S-bends, the hairpin late, a third sweep and a parked row and pegs at the run-in. */
  'saucer-sweeps': (L, R, c) => [
    { key: 'sweep1', name: 'Sweep', shape: sweep({ side: L, radius: 95, degrees: 150, grade: 0.085 }), billboards: 2 },
    { key: 'drop', name: 'Slalom drop', shape: plunge(45, { grade: 0.2, from: 0.1 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: R, radius: 95, degrees: 130, grade: 0.085 }), obstacles: [curtain({ costume: c.curtain, at: 0.5, side: R })], billboards: 1 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 65, grade: 0.13 }), billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sweep3', name: 'Third sweep', shape: sweep({ side: L, radius: 80, degrees: 90, grade: 0.09 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(70, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L20 Lower playfield: a long sweep, a straight over score-reel bumps, a waterfall down to the lower playfield (a peg), S-bends, the hairpin, a sweep, a spiral and a parked piece and pegs at the run-in. */
  'lower-playfield': (L, R, c, b, o) => [
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 100, grade: 0.1 }), billboards: 2 },
    { key: 'reels', name: 'Bump run', shape: straight(50, { grade: 0.13 }), features: [moguls({ from: 0.62, to: 0.92, count: 3, look: o.bumps })] },
    { key: 'drop', name: 'Waterfall', shape: waterfall(40, { grade: 0.35 }), surface: 'water' },
    { key: 'lower', name: 'Below the drop', shape: straight(32, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'left' })] },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 60, grade: 0.13 }), billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    // (A long sweep out of the hairpin, carrying the spiral and the run-in away from the stretches far above them, so no bank hides the marbles.)
    { key: 'outOfHairpin', name: 'Out of the hairpin', shape: sweep({ side: L, radius: 80, degrees: 150, grade: 0.13 }) },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: R, radius: 48, turns: 1, grade: 0.16 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(50, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L21 Clock tower: a long sweep, a run (a peg) to a short climb and a slalom drop off it, a spiral, the hairpin, S-bends, a straight (a curtain) and a parked piece and pegs at the run-in. */
  'clock-tower': (L, R, c) => [
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 85, degrees: 130, grade: 0.085 }), billboards: 2 },
    { key: 'approach', name: 'Run to the climb', shape: straight(35, { grade: 0.14 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })] },
    { key: 'climb', name: 'Climb', shape: climb(8, { grade: -0.04, after: 0.3 }) },
    // (A gentle drop off the climb: a steep one left the spiral's foot far below its top, where the bank hid the camera.)
    { key: 'drop', name: 'Drop', shape: plunge(55, { grade: 0.25, from: 0.3 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.95, count: 3, loss: 0.15 })], billboards: 1 },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: L, radius: 48, turns: 1.25, grade: 0.16 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 80, grade: 0.13 }), billboards: 1 },
    { key: 'doorRun', name: 'Straight run', shape: straight(38, { grade: 0.13 }), obstacles: [curtain({ costume: c.curtain, at: 0.4, side: R })] },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(50, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L22 Encore split: a straight (pegs), S-bends, the hairpin early, a drop, a spiral, a sweep the same way, a late splitter (its tip well over and its inside channel much rougher: the field comes off the sweep on the inside) and pegs at the run-in. */
  'encore-split': (L, R, c) => [
    // (A short run with pegs first: it mixes the lanes after a split start, whose chutes would otherwise send their own marbles into the S-bends.)
    { key: 'stageRun', name: 'Straight run', shape: straight(30, { grade: 0.13 }), obstacles: [peg({ costume: c.peg, at: 0.4, line: 'left' }), peg({ costume: c.peg, at: 0.65, line: 'right' })] },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 60, grade: 0.13 }), billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'outOfHairpin', name: 'Out of the hairpin', shape: plunge(45, { grade: 0.26, from: 0.16 }) },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: R, radius: 48, turns: 1, grade: 0.17 }) },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 90, degrees: 120, grade: 0.09 }), billboards: 2 },
    { key: 'beforeSplit', name: 'Run to the splitter', shape: straight(30, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.4, line: 'center' })] },
    { key: 'splitter', name: 'Splitter', shape: splitter({ side: R, balance: { ...insideDrag(R, 2.1), tipOffset: R === 'right' ? -2.0 : 2.0 } }) },
    { key: 'lastStraight', name: 'Last straight', shape: straight(40, { grade: 0.15 }), obstacles: [peg({ costume: c.peg, at: 0.4, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'right' })] },
  ],
  /** L23 Cabinet rows: a long sweep, a straight (a peg), a second sweep the other way, a slalom drop, the hairpin, a third sweep, S-bends and a parked piece and a peg at the run-in. */
  'cabinet-rows': (L, R, c) => [
    { key: 'row1', name: 'Sweep', shape: sweep({ side: L, radius: 95, degrees: 130, grade: 0.11 }), billboards: 2 },
    { key: 'aisle', name: 'Straight run', shape: straight(45, { grade: 0.13 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: R })] },
    { key: 'row2', name: 'Second sweep', shape: sweep({ side: R, radius: 95, degrees: 120, grade: 0.11 }), billboards: 1 },
    { key: 'drop', name: 'Slalom drop', shape: plunge(45, { grade: 0.22, from: 0.1 }), obstacles: [slalom({ costume: c.slalom, from: 0.45, to: 0.85, count: 2, loss: 0.15 })] },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'row3', name: 'Third sweep', shape: sweep({ side: R, radius: 90, degrees: 115, grade: 0.09 }), billboards: 1 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 65, grade: 0.13 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(70, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L24 Maze corridors: the hairpin first, a long straight over low bumps, S-bends, a slalom straight, a drop, a spiral, a straight (a peg), a sweep and a parked piece and pegs at the run-in. */
  'maze-corridors': (L, R, c, b, o) => [
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'corridor1', name: 'Bump run', shape: straight(70, { grade: 0.13 }), features: [moguls({ from: 0.45, to: 0.9, count: 4, look: o.bumps })] },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 55, grade: 0.14 }), billboards: 2 },
    { key: 'corridor2', name: 'Slalom straight', shape: straight(55, { grade: 0.13 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 3, loss: 0.15 })] },
    { key: 'drop', name: 'Drop', shape: plunge(40, { grade: 0.3, from: 0.12 }) },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: L, radius: 50, turns: 1.25, grade: 0.18 }) },
    { key: 'corridor3', name: 'Straight run', shape: straight(50, { grade: 0.13 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'left' })] },
    // (The sweep turns the same way as the spiral, carrying the run-in away from under the spiral's upper turns.)
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 90, degrees: 130, grade: 0.09 }), billboards: 2 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(65, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L25 Bullet spirals: a sweep, a first spiral, a straight (a curtain), a slalom drop, the hairpin, a second spiral the other way, S-bends and pegs and low bumps at the run-in. */
  'bullet-spirals': (L, R, c, b, o) => [
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 45, grade: 0.11 }), billboards: 2 },
    { key: 'spiral1', name: 'First spiral', shape: spiral({ side: R, radius: 50, turns: 1, grade: 0.16 }) },
    { key: 'curtainRun', name: 'Straight run', shape: straight(35, { grade: 0.14 }), obstacles: [curtain({ costume: c.curtain, at: 0.45, side: L })], billboards: 1 },
    { key: 'drop', name: 'Slalom drop', shape: plunge(45, { grade: 0.24, from: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.45, to: 0.85, count: 2, loss: 0.15 })] },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spiral2', name: 'Second spiral', shape: spiral({ side: L, radius: 50, turns: 1, grade: 0.16 }) },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 70, grade: 0.13 }), billboards: 2 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(50, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'left' }), peg({ costume: c.peg, at: 0.42, line: 'right' })], features: [moguls({ from: 0.62, to: 0.92, count: 3, look: o.bumps })],
    },
  ],
  /** L26 Up up, down down: a run (a peg) and two climbs, a slalom drop and a second, steeper drop, two sets of S-bends the same way round (left, right, left, right), the hairpin, a sweep and a parked piece and pegs at the run-in. */
  'up-up-down-down': (L, R, c, b, o) => [
    { key: 'run', name: 'Straight run', shape: straight(30, { grade: 0.14 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })] },
    { key: 'climb1', name: 'First climb', shape: climb(7, { grade: -0.04, after: 0.14 }) },
    { key: 'ledge', name: 'Ledge', shape: straight(25, { grade: 0.12 }), features: [moguls({ from: 0.35, to: 0.8, count: 2, look: o.bumps })] },
    { key: 'climb2', name: 'Second climb', shape: climb(7, { grade: -0.04, after: 0.3 }) },
    { key: 'drop', name: 'Slalom drop', shape: plunge(45, { grade: 0.26, from: 0.3 }), obstacles: [slalom({ costume: c.slalom, from: 0.45, to: 0.9, count: 3, loss: 0.15 })], billboards: 1 },
    { key: 'drop2', name: 'Second drop', shape: plunge(35, { grade: 0.3 }) },
    { key: 'sBends1', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 60, grade: 0.13 }), billboards: 2 },
    { key: 'sBends2', name: 'More S-bends', shape: sBends({ first: L, radius: 75, degrees: 60, grade: 0.13 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 90, degrees: 145, grade: 0.09 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(75, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L27 Bracket splits: S-bends into a first splitter, the hairpin, a slalom drop into a second splitter the other way, a spiral and a parked piece and a peg at the run-in. */
  'bracket-splits': (L, R, c, b) => [
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 70, grade: 0.13 }), billboards: 2 },
    { key: 'splitter1', name: 'First splitter', shape: splitter({ side: R, balance: b(R) }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(35, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'outOfHairpin', name: 'Out of the hairpin', shape: plunge(35, { grade: 0.26, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.75, count: 3, loss: 0.3 })] },
    // (Out of the hairpin the field reaches it faster: its inside channel's ice much rougher, as on the two-splitters layout.)
    { key: 'splitter2', name: 'Second splitter', shape: splitter({ side: R, degrees: 70, approach: 50, merge: 30, balance: { ...insideDrag(R, 1.2), tipOffset: R === 'right' ? 3.15 : -3.15 } }) },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: L, radius: 48, turns: 1, grade: 0.17 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(45, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.68, to: 0.95, count: 3 })], billboards: 1,
    },
  ],
  /** L28 Coast road: two long sweeps, a straight (a peg) into a splitter (the fork), a third sweep, the hairpin, a slalom drop, a last sweep and a parked piece and a peg at the run-in. */
  'coast-road': (L, R, c, b) => [
    { key: 'sweep1', name: 'First sweep', shape: sweep({ side: L, radius: 90, degrees: 120, grade: 0.12 }), billboards: 2 },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: R, radius: 90, degrees: 90, grade: 0.12 }), billboards: 1, obstacles: [peg({ costume: c.peg, at: 0.85, line: R })] },
    { key: 'splitter', name: 'Splitter', shape: splitter({ side: L, balance: { ...b(L), tipOffset: L === 'left' ? -1.5 : 1.5 } }) },
    { key: 'sweep3', name: 'Third sweep', shape: sweep({ side: R, radius: 85, degrees: 110, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'drop', name: 'Slalom drop', shape: plunge(45, { grade: 0.24, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.35, to: 0.9, count: 2, loss: 0.1 })] },
    { key: 'sweep4', name: 'Last sweep', shape: sweep({ side: R, radius: 90, degrees: 150, grade: 0.12 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(75, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L29 Co-op street: a straight (pegs), S-bends into a splitter, a slalom drop, the hairpin, a spiral, a sweep, more S-bends and a parked piece and a peg at the run-in. */
  'co-op-street': (L, R, c, b, o) => [
    { key: 'streetRun', name: 'Straight run', shape: straight(30, { grade: 0.14 }), obstacles: [peg({ costume: c.peg, at: 0.35, line: 'left' }), peg({ costume: c.peg, at: 0.65, line: 'right' })] },
    { key: 'sBends1', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 80, grade: 0.13 }), billboards: 2 },
    { key: 'splitter', name: 'Splitter', shape: splitter({ side: L, balance: b(L) }) },
    { key: 'drop', name: 'Slalom drop', shape: plunge(40, { grade: 0.24, from: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: L, radius: 48, turns: 1, grade: 0.16 }) },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 90, degrees: 80, grade: 0.1 }), billboards: 2 },
    { key: 'sBends2', name: 'More S-bends', shape: sBends({ first: L, radius: 75, degrees: 45, grade: 0.14 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(50, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [moguls({ from: 0.7, to: 0.95, count: 3, look: o.bumps ?? 'rumble' })],
    },
  ],
  /** L30 Horseshoe bend (Canyon Series): a slalom straight along the river, a short climb over a crest, a long sweep (a boost; a canyon climbs out over the rock here), a drop back in, the horseshoe (a 225° sweep round a butte), the hairpin, a slalom drop, a second sweep and a parked piece and a peg at the run-in. */
  'horseshoe-bend': (L, R, c) => [
    { key: 'riverRun', name: 'Slalom straight', shape: straight(120, { grade: 0.11 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 4, loss: 0.15 })], billboards: 1 },
    { key: 'rapids', name: 'Climb', shape: climb(14, { grade: -0.05, after: 0.17 }) },
    { key: 'climbOut', name: 'Sweep', shape: sweep({ side: L, radius: 90, degrees: 110, grade: 0.08 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'dropIn', name: 'Drop', shape: plunge(55, { grade: 0.24, from: 0.08 }) },
    { key: 'horseshoe', name: 'Horseshoe', shape: sweep({ side: R, radius: 65, degrees: 225, grade: 0.075 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(50, { grade: 0.22, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: R, radius: 85, degrees: 130, grade: 0.09 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L31 Great bend (Canyon Series): S-bends down the gorge, a peg straight, a long sweep (a boost; a canyon climbs out here), a drop back in, the hairpin, the great bend (a spiral and a quarter, round a peak), a slalom drop and a parked piece, a peg and rumble strips at the run-in. */
  'great-bend': (L, R, c) => [
    { key: 'gorge', name: 'S-bends', shape: sBends({ first: L, radius: 80, degrees: 70, grade: 0.13 }), billboards: 1 },
    {
      key: 'flagRun', name: 'Peg straight', shape: straight(90, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.3, line: 'left' }), peg({ costume: c.peg, at: 0.5, line: 'right' }), peg({ costume: c.peg, at: 0.7, line: 'center' })],
    },
    { key: 'ledge', name: 'Sweep', shape: sweep({ side: R, radius: 85, degrees: 140, grade: 0.085 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'dropIn', name: 'Drop', shape: plunge(50, { grade: 0.24, from: 0.085 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'greatBend', name: 'Spiral', shape: spiral({ side: R, radius: 55, turns: 1.25, grade: 0.15 }) },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(50, { grade: 0.22, from: 0.15 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(110, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L32 Terrace steps (Canyon Series): a long sweep (a boost; a canyon climbs out here), a drop, a straight down terrace steps, the hairpin, a slalom drop, S-bends, a second sweep and a parked piece and a peg at the run-in. */
  'terrace-steps': (L, R, c) => [
    { key: 'highSweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 160, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.09 }) },
    { key: 'terraces', name: 'Steps', shape: straight(140, { grade: 0.14 }), features: [steps({ from: 0.4, to: 0.9, count: 5, drag: 0.01 })], billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(50, { grade: 0.2, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 70, grade: 0.12 }), billboards: 1 },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: R, radius: 80, degrees: 150, grade: 0.09 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(100, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L33 Rafting run (Canyon Series): a slalom straight, a spin, a long straight (a boost, moguls; under a bridge on a canyon), a long sweep (a canyon climbs out here), a drop, S-bends, the hairpin and a peg and a parked piece at the run-in (well clear of the hairpin's exit). */
  'rafting-run': (L, R, c) => [
    { key: 'gates', name: 'Slalom straight', shape: straight(60, { grade: 0.13 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 3, loss: 0.15 })] },
    { key: 'whirlpool', name: 'Spiral', shape: spiral({ side: L, radius: 50, turns: 1, grade: 0.16 }) },
    { key: 'bridgeRun', name: 'Long straight', shape: straight(100, { grade: 0.1 }), features: [boost({ at: 0.1 }), moguls({ from: 0.55, to: 0.9, count: 4 })], billboards: 2 },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 90, degrees: 150, grade: 0.085 }), billboards: 2 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.085 }) },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 72, degrees: 60, grade: 0.12 }), billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(75, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.4, line: 'right' }), parked({ costume: c.parked, at: 0.7, side: L, length: 6 })], features: [rumble({ from: 0.8, to: 0.97, count: 3 })],
    },
  ],
  /** L34 Six canyons (Canyon Series): a sweep, a slalom straight, S-bends, a drop, a straight (two pegs), a long sweep (a boost), the hairpin, a spin and a parked piece and a peg at the run-in; a canyon hops out over the rock on the sweeps and the S-bends. */
  'six-canyons': (L, R, c) => [
    { key: 'hop1', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 110, grade: 0.1 }), billboards: 2 },
    { key: 'canyon2', name: 'Slalom straight', shape: straight(60, { grade: 0.13 }), obstacles: [slalom({ costume: c.slalom, from: 0.35, to: 0.85, count: 3, loss: 0.1 })] },
    { key: 'hop2', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 60, grade: 0.12 }), billboards: 1 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.24, from: 0.12 }) },
    {
      key: 'canyon3', name: 'Peg straight', shape: straight(70, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.35, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'right' })],
    },
    { key: 'hop3', name: 'Second sweep', shape: sweep({ side: R, radius: 85, degrees: 130, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 56, turns: 1, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(70, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L35 Basalt gorge (Canyon Series): a long sweep (a boost; a canyon climbs out here on trestles), a drop, a straight of rapids (moguls), S-bends, a straight, the hairpin, a short climb, a second sweep (on trestles again), a drop and a parked piece and a peg at the run-in. */
  'basalt-gorge': (L, R, c) => [
    { key: 'trestle1', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 150, grade: 0.085 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.085 }) },
    { key: 'whitewater', name: 'Mogul straight', shape: straight(120, { grade: 0.12 }), features: [moguls({ from: 0.45, to: 0.9, count: 4 })], billboards: 1 },
    { key: 'columns', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 80, grade: 0.12 }), billboards: 1 },
    { key: 'rapids', name: 'Straight', shape: straight(70, { grade: 0.13 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'crest', name: 'Climb', shape: climb(14, { grade: -0.05, after: 0.13 }) },
    { key: 'trestle2', name: 'Second sweep', shape: sweep({ side: L, radius: 80, degrees: 140, grade: 0.1 }) },
    { key: 'drop2', name: 'Last drop', shape: plunge(50, { grade: 0.2, from: 0.1 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L36 Twin peaks (Canyon Series): a peg straight, a long sweep, S-bends, the hairpin, a spin, a drop, a second sweep (a boost) and a parked piece and a peg at the run-in. */
  'twin-peaks': (L, R, c) => [
    {
      key: 'windRun', name: 'Peg straight', shape: straight(80, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.3, line: 'right' }), peg({ costume: c.peg, at: 0.5, line: 'left' }), peg({ costume: c.peg, at: 0.7, line: 'center' })],
    },
    { key: 'sweep1', name: 'Sweep', shape: sweep({ side: L, radius: 90, degrees: 110, grade: 0.1 }), billboards: 2 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 60, grade: 0.12 }), billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 52, turns: 1, grade: 0.16 }) },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.16 }) },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: L, radius: 85, degrees: 120, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(75, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L37 Cliff ledge (Canyon Series): a long slalom straight (a canyon's ledge road high on the cliff), a sweep, a steep plunge, S-bends, the hairpin, a spin, a drop and pegs and a parked piece at the run-in. */
  'cliff-ledge': (L, R, c) => [
    { key: 'ledge', name: 'Slalom straight', shape: straight(130, { grade: 0.1 }), obstacles: [slalom({ costume: c.slalom, from: 0.35, to: 0.85, count: 3, loss: 0.15 })], billboards: 1 },
    { key: 'ledgeBend', name: 'Sweep', shape: sweep({ side: R, radius: 90, degrees: 130, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'plunge', name: 'Plunge', shape: plunge(60, { grade: 0.3, from: 0.09 }) },
    { key: 'riverBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 90, grade: 0.13 }), billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: L, radius: 56, turns: 1, grade: 0.15 }) },
    { key: 'drop', name: 'Drop', shape: plunge(50, { grade: 0.2, from: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(115, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'left' }), parked({ costume: c.parked, at: 0.4, side: R, length: 6 }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [rumble({ from: 0.75, to: 0.95, count: 3 })],
    },
  ],
  /** L38 Free fall (Canyon Series): a long sweep (no boost: there the slowest marbles took it most), a straight to the lip, a waterfall (the free fall), a peg straight, S-bends, the hairpin, a slalom drop, a second sweep and a parked piece and a peg at the run-in. */
  'free-fall': (L, R, c) => [
    { key: 'highSweep', name: 'Sweep', shape: sweep({ side: R, radius: 85, degrees: 170, grade: 0.09 }), billboards: 2 },
    { key: 'toTheLip', name: 'Straight to the lip', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'freeFall', name: 'Waterfall', shape: waterfall(40, { grade: 0.6 }) },
    {
      key: 'pool', name: 'Peg straight', shape: straight(120, { grade: 0.1 }),
      obstacles: [peg({ costume: c.peg, at: 0.4, line: 'left' }), peg({ costume: c.peg, at: 0.55, line: 'right' }), peg({ costume: c.peg, at: 0.7, line: 'center' })],
    },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 90, grade: 0.12 }), billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(50, { grade: 0.2, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: R, radius: 80, degrees: 160, grade: 0.09 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(110, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L39 Meanders (Canyon Series): tight S-bends twice, a long sweep (a boost; a canyon climbs out here), a drop, the hairpin, S-bends again and pegs and a parked piece at the run-in. */
  meanders: (L, R, c) => [
    { key: 'meander1', name: 'S-bends', shape: sBends({ first: L, radius: 50, degrees: 100, grade: 0.13 }), billboards: 1 },
    { key: 'straight1', name: 'Slalom straight', shape: straight(70, { grade: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.85, count: 3, loss: 0.15 })] },
    { key: 'meander2', name: 'More S-bends', shape: sBends({ first: R, radius: 50, degrees: 100, grade: 0.12 }) },
    { key: 'highSweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 120, grade: 0.085 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.085 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'meander3', name: 'Last S-bends', shape: sBends({ first: L, radius: 55, degrees: 100, grade: 0.12 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'right' }), parked({ costume: c.parked, at: 0.4, side: L, length: 6 }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [rumble({ from: 0.75, to: 0.95, count: 3 })],
    },
  ],
  /** L40 Spawn meadow (Block Series): a long sweep (a boost), S-bends, a peg straight, the hairpin, a second sweep, a drop, a spin and a parked piece and a peg at the run-in. */
  'spawn-meadow': (L, R, c) => [
    { key: 'meadowSweep', name: 'Sweep', shape: sweep({ side: L, radius: 90, degrees: 120, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 60, grade: 0.12 }), billboards: 1 },
    {
      key: 'pegRun', name: 'Peg straight', shape: straight(80, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.3, line: 'left' }), peg({ costume: c.peg, at: 0.5, line: 'right' }), peg({ costume: c.peg, at: 0.7, line: 'center' })],
    },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: L, radius: 85, degrees: 140, grade: 0.09 }), billboards: 1 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.09 }) },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 54, turns: 1, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L41 Speedrun straights (Block Series): a long fast straight (a boost, moguls), a wide sweep, a peg straight (a boost), S-bends, the hairpin, a back straight (a boost, pegs), a drop and a long run to the line (a parked piece, a peg). Boosts on three straights keep the field together. */
  'speedrun-straights': (L, R, c) => [
    { key: 'longStraight', name: 'Long straight', shape: straight(150, { grade: 0.1 }), features: [boost({ at: 0.1 }), moguls({ from: 0.55, to: 0.9, count: 4 })], billboards: 2 },
    { key: 'wideSweep', name: 'Sweep', shape: sweep({ side: R, radius: 95, degrees: 250, grade: 0.085 }), billboards: 1 },
    { key: 'slalomStraight', name: 'Peg straight', shape: straight(150, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.4, line: 'left' }), peg({ costume: c.peg, at: 0.7, line: 'right' })], features: [boost({ at: 0.06 })], billboards: 1 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 80, degrees: 80, grade: 0.12 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    {
      key: 'backStraight', name: 'Back straight', shape: straight(120, { grade: 0.12 }), features: [boost({ at: 0.1 })],
      obstacles: [peg({ costume: c.peg, at: 0.35, line: 'right' }), peg({ costume: c.peg, at: 0.6, line: 'left' })],
    },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.12 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(130, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.75, to: 0.95, count: 3 })],
    },
  ],
  /** L42 Peak beams (Block Series): a long sweep (a boost; out on beams over the cliffs), a drop, a short climb over a crest, a second sweep, S-bends, the hairpin, a slalom drop, a spin and a parked piece and a peg at the run-in. */
  'peak-beams': (L, R, c) => [
    { key: 'beamSweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 150, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.09 }) },
    { key: 'crest', name: 'Climb', shape: climb(14, { grade: -0.05, after: 0.17 }) },
    { key: 'ridgeSweep', name: 'Second sweep', shape: sweep({ side: R, radius: 85, degrees: 110, grade: 0.09 }), billboards: 1 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 70, grade: 0.12 }), billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(50, { grade: 0.2, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: L, radius: 56, turns: 1, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L43 Mine shaft (Block Series): a straight of sleepers (moguls), tight S-bends, a cart straight (pegs), the hairpin, a sweep (a boost), the plunge down the shaft, a peg straight and a parked piece and a peg at the run-in. */
  'mine-shaft': (L, R, c) => [
    { key: 'railRun', name: 'Mogul straight', shape: straight(120, { grade: 0.12 }), features: [moguls({ from: 0.4, to: 0.85, count: 4 })], billboards: 1 },
    { key: 'tightBends', name: 'S-bends', shape: sBends({ first: R, radius: 60, degrees: 90, grade: 0.13 }) },
    {
      key: 'cartRun', name: 'Peg straight', shape: straight(70, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.35, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'right' })], billboards: 1,
    },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'gallerySweep', name: 'Sweep', shape: sweep({ side: R, radius: 85, degrees: 130, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'shaft', name: 'Plunge', shape: plunge(60, { grade: 0.3, from: 0.09 }) },
    {
      key: 'lowerGallery', name: 'Second peg straight', shape: straight(120, { grade: 0.1 }),
      obstacles: [peg({ costume: c.peg, at: 0.4, line: 'right' }), peg({ costume: c.peg, at: 0.6, line: 'left' })],
    },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: L, radius: 80, degrees: 140, grade: 0.1 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(100, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L44 Magma loops (Block Series): a long sweep, a drop, a mogul straight (a boost, a peg), S-bends, a spin, a short climb, the hairpin, a second spin and a boost, a parked piece and a peg at the run-in. */
  'magma-loops': (L, R, c) => [
    { key: 'rimSweep', name: 'Sweep', shape: sweep({ side: R, radius: 85, degrees: 120, grade: 0.085 }), billboards: 2 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.085 }) },
    { key: 'lavaRun', name: 'Mogul straight', shape: straight(80, { grade: 0.12 }), features: [boost({ at: 0.1 }), moguls({ from: 0.5, to: 0.9, count: 4 })], obstacles: [peg({ costume: c.peg, at: 0.3, line: 'center' })], billboards: 1 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 60, grade: 0.12 }), billboards: 1 },
    { key: 'spin1', name: 'Spiral', shape: spiral({ side: R, radius: 56, turns: 0.85, grade: 0.16 }) },
    { key: 'crest', name: 'Climb', shape: climb(14, { grade: -0.05, after: 0.16 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spin2', name: 'Second spiral', shape: spiral({ side: R, radius: 48, turns: 1, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(70, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [boost({ at: 0.05 }), rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L45 Clear rows (Block Series): a slalom straight, S-bends, a straight of steps (the rows), a drop, a spin, the hairpin, a sweep (a boost), a short climb and a parked piece and a peg at the run-in. */
  'clear-rows': (L, R, c) => [
    { key: 'rowRun', name: 'Slalom straight', shape: straight(90, { grade: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 4, loss: 0.15 })], billboards: 1 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 60, grade: 0.12 }), billboards: 1 },
    { key: 'rowSteps', name: 'Steps', shape: straight(100, { grade: 0.14 }), features: [steps({ from: 0.4, to: 0.9, count: 5, drag: 0.01 })] },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.14 }) },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: L, radius: 54, turns: 1, grade: 0.15 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 120, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L46 Combo steps (Block Series): a straight of steps, a steep spin, a drop, a second straight of steps, a long sweep (a boost), the hairpin, a slalom drop and a parked piece (on the right: on the left, a marble riding the wall out of the slalom drop could stick on its end) and a peg at the run-in. */
  'combo-steps': (L, R, c) => [
    { key: 'steps1', name: 'Steps', shape: straight(130, { grade: 0.14 }), features: [steps({ from: 0.35, to: 0.9, count: 5, drag: 0.01 })], billboards: 1 },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: L, radius: 50, turns: 1, grade: 0.19 }) },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.16 }) },
    { key: 'steps2', name: 'More steps', shape: straight(100, { grade: 0.14 }), features: [steps({ from: 0.4, to: 0.9, count: 4, drag: 0.01 })], billboards: 1 },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 85, degrees: 185, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(50, { grade: 0.2, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(85, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.25, side: R, length: 6 }), peg({ costume: c.peg, at: 0.5, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L47 Stack spiral (Block Series): a peg straight, S-bends, a spin, a drop, a sweep (a boost), the hairpin, the long spiral round the stack (a little over one turn) and a parked piece and a peg at the run-in. */
  'stack-spiral': (L, R, c) => [
    {
      key: 'pegRun', name: 'Peg straight', shape: straight(70, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.3, line: 'right' }), peg({ costume: c.peg, at: 0.5, line: 'left' }), peg({ costume: c.peg, at: 0.7, line: 'center' })],
    },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 60, grade: 0.12 }), billboards: 1 },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: L, radius: 48, turns: 1, grade: 0.16 }) },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.16 }) },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 85, degrees: 100, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'stackSpiral', name: 'Long spiral', shape: spiral({ side: R, radius: 54, turns: 1.1, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(70, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L48 Fortress gate (Block Series): a sweep, a short climb over the drawbridge, a drop into the courtyard, a slalom straight (the gate), the hairpin, S-bends, a second sweep (a boost), a spin and a parked piece and a peg at the run-in. */
  'fortress-gate': (L, R, c) => [
    { key: 'moatSweep', name: 'Sweep', shape: sweep({ side: L, radius: 90, degrees: 90, grade: 0.1 }), billboards: 2 },
    { key: 'drawbridge', name: 'Climb', shape: climb(14, { grade: -0.05, after: 0.17 }) },
    { key: 'courtyardDrop', name: 'Drop', shape: plunge(50, { grade: 0.22, from: 0.17 }) },
    { key: 'gateRun', name: 'Slalom straight', shape: straight(70, { grade: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 3, loss: 0.15 })], billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'wallBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 55, grade: 0.12 }) },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: R, radius: 85, degrees: 110, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 1 },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: L, radius: 48, turns: 1, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(70, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L49 Final level (Block Series): S-bends, a sweep (a boost), a drop, the loop (a spin), a mogul straight, the hairpin, a slalom drop, a second sweep and a parked piece and a peg at the run-in. */
  'final-level': (L, R, c) => [
    { key: 'introBends', name: 'S-bends', shape: sBends({ first: R, radius: 80, degrees: 50, grade: 0.13 }), billboards: 1 },
    { key: 'portalSweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 100, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.09 }) },
    { key: 'loop', name: 'Spiral', shape: spiral({ side: R, radius: 52, turns: 1, grade: 0.16 }) },
    { key: 'bonusRun', name: 'Mogul straight', shape: straight(130, { grade: 0.12 }), features: [moguls({ from: 0.45, to: 0.9, count: 4 })] },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(50, { grade: 0.2, from: 0.16 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: R, radius: 80, degrees: 150, grade: 0.09 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L50 Slot canyon (Canyon Series): a peg straight (the light-beam hall), tight S-bends, more tight S-bends, a straight (a peg) and a spin (a canyon climbs out on both, so no banks stand above the spin's last turn), the hairpin, S-bends again, a drop and a parked piece and two pegs at the run-in. */
  'slot-canyon': (L, R, c) => [
    {
      key: 'beamHall', name: 'Peg straight', shape: straight(70, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.3, line: 'right' }), peg({ costume: c.peg, at: 0.5, line: 'left' }), peg({ costume: c.peg, at: 0.7, line: 'center' })],
    },
    { key: 'twist1', name: 'S-bends', shape: sBends({ first: L, radius: 55, degrees: 90, grade: 0.13 }), billboards: 1 },
    { key: 'twist2', name: 'More S-bends', shape: sBends({ first: R, radius: 52, degrees: 100, grade: 0.12 }) },
    { key: 'rimRun', name: 'Second peg straight', shape: straight(45, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })] },
    { key: 'corkscrew', name: 'Spiral', shape: spiral({ side: L, radius: 50, turns: 1, grade: 0.16 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'twist3', name: 'Last S-bends', shape: sBends({ first: L, radius: 55, degrees: 90, grade: 0.12 }), billboards: 1 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.12 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.42, line: 'left' }), peg({ costume: c.peg, at: 0.58, line: 'right' })], features: [rumble({ from: 0.72, to: 0.95, count: 3 })],
    },
  ],
  /** L51 Cliff road (Canyon Series; made for the crest start, which mixes the field before it): a long sweep high on the rim (a boost), a slalom straight past the lookout, a spin down into the gorge, a plunge to the river, a peg straight along it (pegs, not moguls: moguls cost the slowest marbles most and spread the field), the hairpin, a sweep along the river, a drop to the lake and three pegs at the run-in (no parked piece: off the drop a marble could stick on its end for 20 s). */
  'cliff-road': (L, R, c) => [
    { key: 'rimRoad', name: 'Sweep', shape: sweep({ side: L, radius: 95, degrees: 150, grade: 0.085 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'lookout', name: 'Slalom straight', shape: straight(60, { grade: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.35, to: 0.85, count: 3, loss: 0.15 })] },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 54, turns: 1, grade: 0.16 }) },
    { key: 'dive', name: 'Plunge', shape: plunge(50, { grade: 0.24, from: 0.16 }), billboards: 1 },
    {
      key: 'paddleRun', name: 'Peg straight', shape: straight(85, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.3, line: 'center' }), peg({ costume: c.peg, at: 0.5, line: 'left' }), peg({ costume: c.peg, at: 0.7, line: 'right' })],
    },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'riverSweep', name: 'Second sweep', shape: sweep({ side: R, radius: 85, degrees: 140, grade: 0.09 }) },
    { key: 'lakeDrop', name: 'Drop', shape: plunge(45, { grade: 0.2, from: 0.09 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(75, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'left' }), peg({ costume: c.peg, at: 0.42, line: 'right' }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [rumble({ from: 0.75, to: 0.95, count: 3 })],
    },
  ],
  /** L52 Rapids gorge (Canyon Series): a mogul straight (the rapids; two pegs first, to mix the field out of the start), S-bends, a peg straight (the great rock), a cascade (a steep plunge in white water: a waterfall's cliff rocks stood into the channel here), a straight (a peg), a long sweep (a canyon climbs out here on the high trail), the hairpin, three quarters of a spiral (the whirlpool: a full turn passed under the straight before it), a slalom drop and a parked piece and a peg at the run-in. */
  'rapids-gorge': (L, R, c) => [
    {
      key: 'rapids', name: 'Mogul straight', shape: straight(100, { grade: 0.12 }), features: [moguls({ from: 0.6, to: 0.9, count: 3 })], billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'left' }), peg({ costume: c.peg, at: 0.36, line: 'right' })],
    },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 72, degrees: 80, grade: 0.13 }), billboards: 1 },
    {
      key: 'rockRun', name: 'Peg straight', shape: straight(60, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'left' }), peg({ costume: c.peg, at: 0.45, line: 'right' })],
    },
    { key: 'cascade', name: 'Cascade', shape: plunge(45, { grade: 0.32, from: 0.12 }), surface: 'water' },
    { key: 'pool', name: 'Below the falls', shape: straight(40, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })] },
    { key: 'highTrail', name: 'Sweep', shape: sweep({ side: L, radius: 88, degrees: 140, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'whirlpool', name: 'Spiral', shape: spiral({ side: L, radius: 60, turns: 0.75, grade: 0.15 }) },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(50, { grade: 0.2, from: 0.15 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(85, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L53 Long falls (Canyon Series): a sweep along the ridges (a canyon climbs out here), S-bends, the hairpin early, a straight to the lip, the long waterfall, a peg straight (the plunge pool), a spin, a second sweep (a boost) and a parked piece and a peg at the run-in. */
  'long-falls': (L, R, c) => [
    { key: 'ridgeSweep', name: 'Sweep', shape: sweep({ side: R, radius: 90, degrees: 120, grade: 0.1 }), billboards: 2 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 70, grade: 0.12 }), billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'toTheLip', name: 'Straight to the lip', shape: straight(45, { grade: 0.12 }) },
    { key: 'longFall', name: 'Waterfall', shape: waterfall(45, { grade: 0.55 }) },
    {
      key: 'plungePool', name: 'Peg straight', shape: straight(90, { grade: 0.1 }),
      obstacles: [peg({ costume: c.peg, at: 0.4, line: 'right' }), peg({ costume: c.peg, at: 0.55, line: 'left' }), peg({ costume: c.peg, at: 0.7, line: 'center' })],
    },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 54, turns: 1, grade: 0.15 }) },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: L, radius: 85, degrees: 120, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L54 Siq passage (Canyon Series): tight S-bends first, long and deep (they mix the field off the launch: on a straight or gentler bends first the front starting places kept their lead), a peg and slalom straight through the water, a short climb over a boulder, a drop, more tight S-bends, the hairpin, three quarters of a spiral (the pool where the siq widens), a long sweep (a boost; a canyon climbs out here) and pegs and a parked piece at the run-in. */
  'siq-passage': (L, R, c) => [
    { key: 'narrows', name: 'S-bends', shape: sBends({ first: L, radius: 55, degrees: 115, grade: 0.13 }) },
    {
      key: 'siq1', name: 'Slalom straight', shape: straight(75, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.12, line: 'left' }), peg({ costume: c.peg, at: 0.26, line: 'right' }), slalom({ costume: c.slalom, from: 0.45, to: 0.88, count: 3, loss: 0.15 })],
    },
    { key: 'boulder', name: 'Climb', shape: climb(12, { grade: -0.05, after: 0.14 }) },
    { key: 'dropIn', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.14 }), billboards: 1 },
    { key: 'siq2', name: 'More S-bends', shape: sBends({ first: R, radius: 58, degrees: 90, grade: 0.12 }), billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'pool', name: 'Spiral', shape: spiral({ side: R, radius: 60, turns: 0.75, grade: 0.15 }) },
    { key: 'openSweep', name: 'Sweep', shape: sweep({ side: R, radius: 88, degrees: 150, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'right' }), parked({ costume: c.parked, at: 0.4, side: L, length: 6 }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [rumble({ from: 0.75, to: 0.95, count: 3 })],
    },
  ],
  /** L55 Island hops (Block Series): a peg straight (a bridge), a sweep (a boost), a drop, a slalom straight (a second bridge), a spin, the hairpin, a waterfall off an island, a straight (a peg), a second sweep and a parked piece and a peg at the run-in. */
  'island-hops': (L, R, c) => [
    {
      key: 'bridge1', name: 'Peg straight', shape: straight(85, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.35, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'right' })],
    },
    { key: 'island1', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 120, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'hop', name: 'Drop', shape: plunge(40, { grade: 0.24, from: 0.09 }) },
    { key: 'bridge2', name: 'Slalom straight', shape: straight(60, { grade: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.35, to: 0.85, count: 3, loss: 0.15 })] },
    { key: 'island2', name: 'Spiral', shape: spiral({ side: R, radius: 52, turns: 1, grade: 0.16 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'toTheEdge', name: 'Straight to the edge', shape: straight(35, { grade: 0.12 }) },
    { key: 'islandFall', name: 'Waterfall', shape: waterfall(40, { grade: 0.35 }), surface: 'water' },
    { key: 'bridge3', name: 'Straight', shape: straight(45, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })] },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: R, radius: 85, degrees: 170, grade: 0.09 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(70, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L56 Harbour quays (Block Series): tight, deep S-bends first through the warehouses (they mix the field), a long quay straight (a boost, a peg, moguls), a wide part-spiral round the crane (0.6 of a turn: a full turn's end passed under the quay), a pier straight (a parked piece, a peg), a long sweep round the basin, a drop, the hairpin late and pegs at the run-in. */
  'harbour-quays': (L, R, c) => [
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 55, degrees: 115, grade: 0.13 }), billboards: 1 },
    { key: 'quay', name: 'Long straight', shape: straight(120, { grade: 0.1 }), features: [boost({ at: 0.1 }), moguls({ from: 0.55, to: 0.9, count: 4 })], obstacles: [peg({ costume: c.peg, at: 0.3, line: 'center' })], billboards: 2 },
    { key: 'craneSpin', name: 'Spiral', shape: spiral({ side: R, radius: 70, turns: 0.6, grade: 0.15 }) },
    {
      key: 'pier', name: 'Pier straight', shape: straight(85, { grade: 0.12 }),
      obstacles: [parked({ costume: c.parked, at: 0.25, side: R, length: 6 }), peg({ costume: c.peg, at: 0.55, line: 'left' })],
    },
    { key: 'basinSweep', name: 'Sweep', shape: sweep({ side: L, radius: 90, degrees: 180, grade: 0.085 }), billboards: 2 },
    { key: 'dockDrop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.085 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(100, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'right' }), peg({ costume: c.peg, at: 0.42, line: 'left' }), peg({ costume: c.peg, at: 0.58, line: 'center' })], features: [rumble({ from: 0.72, to: 0.95, count: 3 })],
    },
  ],
  /** L57 Temple halls (Block Series): a slalom straight (the entrance hall), the hairpin early, a straight of steps (the stairs), a spin and a quarter (the courtyard), a second straight of steps, S-bends, a sweep (a boost) and a parked piece and a peg at the run-in. */
  'temple-halls': (L, R, c) => [
    { key: 'entryHall', name: 'Slalom straight', shape: straight(60, { grade: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 3, loss: 0.15 })] },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), billboards: 1 },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'stairs1', name: 'Steps', shape: straight(80, { grade: 0.14 }), features: [steps({ from: 0.4, to: 0.9, count: 5, drag: 0.01 })], billboards: 1 },
    { key: 'courtyard', name: 'Spiral', shape: spiral({ side: L, radius: 52, turns: 1.25, grade: 0.16 }) },
    { key: 'stairs2', name: 'More steps', shape: straight(70, { grade: 0.14 }), features: [steps({ from: 0.45, to: 0.9, count: 4, drag: 0.01 })] },
    { key: 'sanctum', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 65, grade: 0.12 }), billboards: 1 },
    { key: 'sunSweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 130, grade: 0.09 }), features: [boost({ at: 0.55 })], billboards: 2 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L58 Cascade rows (Block Series): tight, deep S-bends first (they mix the field), a long straight (the rows: a parked piece, a peg, a slalom), S-bends (a boost), a short climb, a drop, the hairpin, a spiral and a half and a parked piece and a peg at the run-in. */
  'cascade-rows': (L, R, c) => [
    { key: 'firstSweep', name: 'First S-bends', shape: sBends({ first: L, radius: 55, degrees: 115, grade: 0.13 }), billboards: 2 },
    {
      key: 'cascadeRun', name: 'Peg straight', shape: straight(140, { grade: 0.12 }), billboards: 1,
      obstacles: [parked({ costume: c.parked, at: 0.1, side: L, length: 6 }), peg({ costume: c.peg, at: 0.26, line: 'right' }), slalom({ costume: c.slalom, from: 0.45, to: 0.88, count: 3, loss: 0.15 })],
    },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 80, grade: 0.12 }), features: [boost({ at: 0.08 })], billboards: 1 },
    { key: 'crest', name: 'Climb', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'drop', name: 'Drop', shape: plunge(50, { grade: 0.22, from: 0.12 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: L, radius: 50, turns: 1.5, grade: 0.16 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L59 Bonus stages (Block Series): a peg straight (four pegs, two on the inside of the sweep that follows: they even out the twin chutes), a sweep (a boost), S-bends, a slalom straight, a spin, the hairpin, a long last sweep (the final stage) and a parked piece and a peg at the run-in. */
  'bonus-stages': (L, R, c) => [
    {
      key: 'stage1', name: 'Peg straight', shape: straight(90, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'left' }), peg({ costume: c.peg, at: 0.42, line: 'right' }), peg({ costume: c.peg, at: 0.6, line: 'center' }), peg({ costume: c.peg, at: 0.78, line: 'right' })],
    },
    { key: 'bonusSweep', name: 'Sweep', shape: sweep({ side: L, radius: 90, degrees: 130, grade: 0.09 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'checkpointBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 60, grade: 0.13 }) },
    { key: 'stage2', name: 'Slalom straight', shape: straight(70, { grade: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 3, loss: 0.15 })], billboards: 1 },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: L, radius: 50, turns: 0.9, grade: 0.17 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'finalStage', name: 'Last sweep', shape: sweep({ side: L, radius: 88, degrees: 170, grade: 0.09 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L60 Horseshoe sprint (Track and Field): deep, tight S-bends in (they mix the field), the long home straight (pegs) into the hairpin round the stadium's curved end, the back straight (a boost), a sweep out of the open end, a spiral, a drop, S-bends and the run-in. */
  'horseshoe-sprint': (L, R, c) => [
    { key: 'approach', name: 'S-bends', shape: sBends({ first: R, radius: 55, degrees: 115, grade: 0.13 }), billboards: 2 },
    {
      key: 'homeStraight', name: 'Home straight', shape: straight(120, { grade: 0.11 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'left' }), peg({ costume: c.peg, at: 0.36, line: 'right' }), peg({ costume: c.peg, at: 0.52, line: 'center' })],
    },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }) },
    {
      key: 'backStraight', name: 'Back straight', shape: straight(110, { grade: 0.12 }), features: [boost({ at: 0.15 })], billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.5, line: 'left' }), peg({ costume: c.peg, at: 0.68, line: 'right' })],
    },
    { key: 'finalSweep', name: 'Second sweep', shape: sweep({ side: L, radius: 85, degrees: 120, grade: 0.09 }) },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 55, turns: 1, grade: 0.15 }) },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.15 }) },
    { key: 'sBends', name: 'More S-bends', shape: sBends({ first: L, radius: 70, degrees: 55, grade: 0.13 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L61 Blue lanes (Track and Field): deep S-bends (they mix the field), a half-circle bend (the stadium's), the colonnade straight, a short climb and a drop out under the tower, a long sweep, a part-spiral, the hairpin and the run-in. */
  'blue-lanes': (L, R, c) => [
    { key: 'entryBends', name: 'S-bends', shape: sBends({ first: L, radius: 55, degrees: 110, grade: 0.13 }), billboards: 1 },
    { key: 'stadiumBend', name: 'Sweep', shape: sweep({ side: L, radius: 70, degrees: 180, grade: 0.09 }), billboards: 1 },
    {
      key: 'colonnade', name: 'Peg straight', shape: straight(110, { grade: 0.11 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.15, line: 'center' }), peg({ costume: c.peg, at: 0.32, line: 'right' }), peg({ costume: c.peg, at: 0.5, line: 'left' }), slalom({ costume: c.slalom, from: 0.65, to: 0.9, count: 2, loss: 0.15 })],
    },
    { key: 'crest', name: 'Climb', shape: climb(12, { grade: -0.05, after: 0.11 }) },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.13 }) },
    { key: 'longSweep', name: 'Long sweep', shape: sweep({ side: L, radius: 85, degrees: 110, grade: 0.09 }), features: [boost({ at: 0.1 })], billboards: 1 },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 55, turns: 0.85, grade: 0.15 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'left' }), parked({ costume: c.parked, at: 0.42, side: R, length: 6 })], features: [rumble({ from: 0.72, to: 0.95, count: 3 })],
    },
  ],
  /** L62 Bell lap (Track and Field): a long spiral (laps round the inside of the stands), a slalom drop, a peg straight, a sweep, the hairpin, a slalom straight, a second, tighter spiral (the bell lap, the other way), S-bends and the run-in. */
  'bell-lap': (L, R, c) => [
    { key: 'lapSpiral', name: 'Spiral', shape: spiral({ side: L, radius: 58, turns: 0.75, grade: 0.15 }) },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(60, { grade: 0.3, from: 0.15 }), obstacles: [slalom({ costume: c.slalom, from: 0.2, to: 0.95, count: 6, loss: 0.3 })] },
    {
      key: 'backStraight', name: 'Peg straight', shape: straight(70, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'left' }), peg({ costume: c.peg, at: 0.38, line: 'right' }), peg({ costume: c.peg, at: 0.56, line: 'center' }), peg({ costume: c.peg, at: 0.74, line: 'left' })],
    },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 80, degrees: 95, grade: 0.09 }), billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }) , obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'straight2', name: 'Slalom straight', shape: straight(60, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.15, line: 'center' }), slalom({ costume: c.slalom, from: 0.3, to: 0.9, count: 5, loss: 0.15 })] },
    { key: 'bellSpiral', name: 'Second spiral', shape: spiral({ side: R, radius: 48, turns: 0.75, grade: 0.16 }) },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 70, degrees: 38, grade: 0.13 }), billboards: 1, obstacles: [peg({ costume: c.peg, at: 0.35, line: 'left' }), peg({ costume: c.peg, at: 0.7, line: 'right' })] },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.42, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'right' })], features: [rumble({ from: 0.72, to: 0.95, count: 3 })],
    },
  ],
  /** L63 Hurdles straight (Track and Field): deep S-bends (they mix the field), a sweep, a long straight of hurdles (pegs in rows, then a slalom), the hairpin, a sweep, a short climb and a drop, a spiral and the run-in. */
  'hurdles-straight': (L, R, c) => [
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 55, degrees: 100, grade: 0.13 }), billboards: 1 },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 140, grade: 0.09 }), features: [boost({ at: 0.1 })], billboards: 2 },
    {
      key: 'hurdles', name: 'Hurdles straight', shape: straight(150, { grade: 0.12 }),
      obstacles: [
        peg({ costume: c.peg, at: 0.12, line: 'left' }), peg({ costume: c.peg, at: 0.12, line: 'right' }),
        peg({ costume: c.peg, at: 0.32, line: 'center' }),
        peg({ costume: c.peg, at: 0.52, line: 'left' }), peg({ costume: c.peg, at: 0.52, line: 'right' }),
        peg({ costume: c.peg, at: 0.72, line: 'center' }),
        slalom({ costume: c.slalom, from: 0.8, to: 0.97, count: 5, loss: 0.3 }),
      ],
    },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }) },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: R, radius: 80, degrees: 120, grade: 0.09 }), billboards: 1 },
    { key: 'crest', name: 'Climb', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.12 }) },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 55, turns: 0.95, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'left' }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.72, to: 0.95, count: 3 })],
    },
  ],
  /** L64 Nest bend (Track and Field): one long sweeping bend (a half circle) into the home straight, S-bends, the hairpin, more S-bends, a slalom straight, a part-spiral and the run-in (after a start that mixes the field, e.g. the clean drop's S-bends). */
  'nest-bend': (L, R, c) => [
    { key: 'longBend', name: 'Long bend', shape: sweep({ side: L, radius: 72, degrees: 180, grade: 0.085 }), billboards: 2 },
    {
      key: 'homeStraight', name: 'Peg straight', shape: straight(75, { grade: 0.11 }),
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'center' }), peg({ costume: c.peg, at: 0.4, line: 'right' }), peg({ costume: c.peg, at: 0.6, line: 'left' }), peg({ costume: c.peg, at: 0.8, line: 'center' })],
    },
    { key: 'sBends', name: 'More S-bends', shape: sBends({ first: R, radius: 70, degrees: 50, grade: 0.13 }), billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(60, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.15, line: 'left' }), peg({ costume: c.peg, at: 0.35, line: 'right' })] },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }) , obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sweep2', name: 'S-bends after the hairpin', shape: sBends({ first: L, radius: 70, degrees: 45, grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.3, line: 'center' }), peg({ costume: c.peg, at: 0.7, line: 'center' })] },
    {
      key: 'slalomStraight', name: 'Slalom straight', shape: straight(65, { grade: 0.11 }),
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'left' }), peg({ costume: c.peg, at: 0.38, line: 'right' }), slalom({ costume: c.slalom, from: 0.5, to: 0.75, count: 4, loss: 0.15 }), peg({ costume: c.peg, at: 0.08, line: 'right' }), peg({ costume: c.peg, at: 0.86, line: 'center' })],
    },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 55, turns: 0.6, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.38, line: 'right' }), slalom({ costume: c.slalom, from: 0.48, to: 0.64, count: 3, loss: 0.15 })], features: [rumble({ from: 0.74, to: 0.95, count: 3 })],
    },
  ],

  /** L65 Photo finish (Track and Field): S-bends, a slalom drop, a peg straight, a part-spiral (round under the roof), a sweep, the hairpin, a drop, a long sweep and a long run to the line (the photo finish). */
  'photo-finish': (L, R, c) => [
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 55, degrees: 100, grade: 0.13 }), billboards: 1 },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(70, { grade: 0.3, from: 0.13 }), obstacles: [slalom({ costume: c.slalom, from: 0.2, to: 0.95, count: 7, loss: 0.3 })] },
    {
      key: 'pegStraight', name: 'Peg straight', shape: straight(85, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'center' }), peg({ costume: c.peg, at: 0.45, line: 'right' }), peg({ costume: c.peg, at: 0.7, line: 'left' })],
    },
    { key: 'roofSpiral', name: 'Spiral', shape: spiral({ side: R, radius: 55, turns: 0.45, grade: 0.15 }) },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 120, grade: 0.11 }), billboards: 2, obstacles: [peg({ costume: c.peg, at: 0.45, line: 'right' })] },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }) , obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.2, from: 0.16 }) },
    { key: 'longSweep', name: 'Long sweep', shape: sweep({ side: R, radius: 90, degrees: 100, grade: 0.1 }), billboards: 1, obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })] },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(120, { grade: 0.13 }),
      obstacles: [peg({ costume: c.peg, at: 0.15, line: 'left' }), peg({ costume: c.peg, at: 0.3, line: 'right' }), slalom({ costume: c.slalom, from: 0.45, to: 0.7, count: 2, loss: 0.15 })], features: [rumble({ from: 0.78, to: 0.95, count: 3 })],
    },
  ],
  /** L66 Relay legs (Track and Field): four straights (the legs, an exchange zone painted on each) joined by sweeps one way and the other, the hairpin, a sweep, a part-spiral and the run-in. */
  'relay-legs': (L, R, c) => [
    {
      key: 'leg1', name: 'First leg', shape: straight(85, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.15, line: 'center' }), peg({ costume: c.peg, at: 0.3, line: 'left' }), peg({ costume: c.peg, at: 0.45, line: 'right' }), peg({ costume: c.peg, at: 0.6, line: 'center' })], features: [paint({ from: 0.7, to: 0.95, look: 'exchange-zone' }), brake({ at: 0.72, length: 10, drag: 0.01 })],
    },
    { key: 'sweep1', name: 'Sweep', shape: sweep({ side: R, radius: 75, degrees: 150, grade: 0.1 }), billboards: 1 },
    {
      key: 'leg2', name: 'Second leg', shape: straight(85, { grade: 0.12 }),
      obstacles: [slalom({ costume: c.slalom, from: 0.25, to: 0.6, count: 3, loss: 0.15 })], features: [paint({ from: 0.7, to: 0.95, look: 'exchange-zone' })],
    },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: L, radius: 75, degrees: 150, grade: 0.09 }), features: [boost({ at: 0.1 })], billboards: 1 },
    { key: 'leg3', name: 'Third leg', shape: straight(50, { grade: 0.12 }), features: [paint({ from: 0.05, to: 0.4, look: 'exchange-zone' })] },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }) },
    {
      key: 'leg4', name: 'Fourth leg', shape: straight(80, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], features: [paint({ from: 0.05, to: 0.3, look: 'exchange-zone' })],
    },
    { key: 'sweep3', name: 'Third sweep', shape: sweep({ side: L, radius: 80, degrees: 110, grade: 0.11 }) },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 55, turns: 0.8, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L67 Steeple water (Track and Field): a straight with a barrier (a big peg), a sweep, a second barrier and the water jump (a short stretch of water, a light brake), S-bends, a drop, the hairpin, a spiral, a sweep and the run-in. */
  'steeple-water': (L, R, c) => [
    { key: 'barrier1', name: 'Barrier straight', shape: straight(80, { grade: 0.12 }), obstacles: [peg({ costume: c.barrier, at: 0.45, line: 'left', radius: 0.6 }), slalom({ costume: c.slalom, from: 0.6, to: 0.97, count: 5, loss: 0.3 })], billboards: 1 },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 80, degrees: 130, grade: 0.09 }), billboards: 2 },
    { key: 'barrier2', name: 'Second barrier', shape: straight(60, { grade: 0.12 }), obstacles: [peg({ costume: c.barrier, at: 0.55, line: 'right', radius: 0.6 })] },
    { key: 'waterJump', name: 'Water jump', shape: straight(22, { grade: 0.12 }), features: [brake({ at: 0.15, length: 14, drag: 0.01 })] },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 70, degrees: 55, grade: 0.13 }), billboards: 1 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.13 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.2, line: 'left' })] },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }) , obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 55, turns: 1.1, grade: 0.15 }) },
    { key: 'sweep2', name: 'Last sweep', shape: sweep({ side: L, radius: 85, degrees: 100, grade: 0.09 }), features: [boost({ at: 0.1 })] },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'right' }), peg({ costume: c.peg, at: 0.38, line: 'left' }), peg({ costume: c.peg, at: 0.56, line: 'center' })], features: [rumble({ from: 0.72, to: 0.95, count: 3 })],
    },
  ],
  /** L68 Anchor arches (Track and Field): a short straight into a half-pipe, a short climb and a drop (through the arches), a sweep, a peg straight, a spiral, a straight, the hairpin, a sweep and the long final sprint. */
  'anchor-arches': (L, R, c) => [
    { key: 'runIn', name: 'Into the pipe', shape: straight(30, { grade: 0.12 }) },
    { key: 'pipe', name: 'Half-pipe', shape: halfPipe({ first: R, width: 8, swings: 3, radius: 150, degrees: 18, grade: 0.12 }) },
    { key: 'crest', name: 'Climb', shape: climb(12, { grade: -0.05, after: 0.13 }) },
    { key: 'arches', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.13 }), billboards: 1 },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: L, radius: 80, degrees: 70, grade: 0.09 }), billboards: 2, obstacles: [peg({ costume: c.peg, at: 0.35, line: 'center' }), peg({ costume: c.peg, at: 0.75, line: 'center' })] },
    {
      key: 'pegStraight', name: 'Peg straight', shape: straight(70, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.18, line: 'right' }), slalom({ costume: c.slalom, from: 0.35, to: 0.95, count: 6, loss: 0.3 })],
    },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 55, turns: 0.65, grade: 0.15 }) },
    {
      key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(60, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.15, line: 'center' }), peg({ costume: c.peg, at: 0.3, line: 'left' }), peg({ costume: c.peg, at: 0.45, line: 'right' })],
    },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }) , obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: L, radius: 85, degrees: 125, grade: 0.09 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.13 }),
      obstacles: [peg({ costume: c.peg, at: 0.12, line: 'right' }), peg({ costume: c.peg, at: 0.24, line: 'left' }), peg({ costume: c.peg, at: 0.38, line: 'right' }), peg({ costume: c.peg, at: 0.52, line: 'center' }), slalom({ costume: c.slalom, from: 0.6, to: 0.72, count: 2, loss: 0.15 })], features: [rumble({ from: 0.78, to: 0.95, count: 3 })],
    },
  ],
  /** L69 Golden lap (Track and Field): a peg straight, a sweep, a drop, a straight, the hairpin, a part-spiral, the long golden sweep round the stadium, S-bends and the run-in. */
  'golden-lap': (L, R, c) => [
    {
      key: 'leadIn', name: 'Lead-in straight', shape: straight(60, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'center' }), peg({ costume: c.peg, at: 0.45, line: 'left' }), peg({ costume: c.peg, at: 0.65, line: 'right' })],
    },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 80, degrees: 120, grade: 0.09 }), billboards: 2 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.09 }) },
    {
      key: 'pegStraight', name: 'Peg straight', shape: straight(90, { grade: 0.11 }),
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'right' }), peg({ costume: c.peg, at: 0.38, line: 'left' }), slalom({ costume: c.slalom, from: 0.55, to: 0.75, count: 2, loss: 0.15 })],
    },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }) },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 55, turns: 0.8, grade: 0.15 }) },
    { key: 'goldenSweep', name: 'Long sweep', shape: sweep({ side: L, radius: 90, degrees: 170, grade: 0.085 }), features: [boost({ at: 0.08 })], billboards: 1 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 72, degrees: 50, grade: 0.13 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L70 Half-pipe run (the skatepark parts' proving layout): a peg straight, the half-pipe (the field rocking wall to wall down a wide U), a sweep, S-bends, a second peg straight, more S-bends, the hairpin, a spiral and the run-in. */
  'half-pipe-run': (L, R, c) => [
    {
      key: 'leadIn', name: 'Peg straight', shape: straight(60, { grade: 0.12 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'left' }), peg({ costume: c.peg, at: 0.45, line: 'right' }), peg({ costume: c.peg, at: 0.65, line: 'center' })],
    },
    { key: 'halfPipe', name: 'Half-pipe', shape: halfPipe({ first: L, width: 8, swings: 3, radius: 150, degrees: 18, grade: 0.12 }) },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 85, degrees: 130, grade: 0.09 }), features: [boost({ at: 0.1 })], billboards: 2 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 70, degrees: 55, grade: 0.13 }), billboards: 1 },
    {
      key: 'pegStraight', name: 'Second peg straight', shape: straight(90, { grade: 0.11 }),
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'right' }), peg({ costume: c.peg, at: 0.45, line: 'center' }), peg({ costume: c.peg, at: 0.65, line: 'left' }), slalom({ costume: c.slalom, from: 0.78, to: 0.95, count: 2, loss: 0.15 })],
    },
    { key: 'sBends2', name: 'More S-bends', shape: sBends({ first: R, radius: 70, degrees: 50, grade: 0.13 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }) },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: L, radius: 55, turns: 0.9, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.42, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'right' })], features: [rumble({ from: 0.72, to: 0.95, count: 3 })],
    },
  ],
  /** L71 Mid lottery (proving the varied starts): S-bends, then a slalom on a drop further on (the luck a track starting without the pile-up and slalom still needs), a sweep, a peg straight, the hairpin, a spiral and the run-in. Options: `lotteryGates` (5), `lotteryLoss` (0.15). */
  'mid-lottery': (L, R, c, b, o) => [
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 80, grade: 0.13 }), billboards: 3 },
    { key: 'lottery', name: 'Pile-up drop', shape: plunge(70, { grade: 0.3, from: 0.13 }), obstacles: [slalom({ costume: c.slalom, from: 0.2, to: 0.95, count: o.lotteryGates ?? 5, loss: o.lotteryLoss ?? 0.15 })] },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 80, degrees: 130, grade: 0.08 }), billboards: 2 },
    {
      key: 'pegStraight', name: 'Peg straight', shape: straight(70, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'left' }), peg({ costume: c.peg, at: 0.4, line: 'right' }), peg({ costume: c.peg, at: 0.6, line: 'center' }), peg({ costume: c.peg, at: 0.8, line: 'left' })],
    },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(55, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.15, line: 'right' }), peg({ costume: c.peg, at: 0.32, line: 'left' })] },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'spiral', name: 'Spiral', shape: spiral({ side: R, radius: 45, turns: 1.15, grade: 0.17 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(105, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.15, side: L, length: 8 })], features: [rumble({ from: 0.55, to: 0.95, count: 4 })],
    },
  ],
  /** L72 Jib run (the jib parts' proving layout): deep S-bends, a straight with a jib line (rail, box, table top), a straight with a box, a sweep, a peg straight, the hairpin, a spiral and the run-in. */
  'jib-run': (L, R, c) => [
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 55, degrees: 110, grade: 0.13 }), billboards: 2 },
    { key: 'jibs', name: 'Jib line', shape: straight(110, { grade: 0.13 }), features: jibLine({ from: 0.1 }) },
    { key: 'boxStraight', name: 'Box straight', shape: straight(70, { grade: 0.13 }), features: [box({ at: 0.35, length: 12 })], obstacles: [peg({ costume: c.peg, at: 0.8, line: 'left' })] },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 85, degrees: 130, grade: 0.09 }), billboards: 2 },
    {
      key: 'pegStraight', name: 'Peg straight', shape: straight(70, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'center' }), peg({ costume: c.peg, at: 0.4, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'right' }), slalom({ costume: c.slalom, from: 0.72, to: 0.95, count: 3, loss: 0.15 })],
    },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.2, line: 'right' })] },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }) },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 50, turns: 1.1, grade: 0.16 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(95, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.72, to: 0.95, count: 3 })],
    },
  ],
  /** L73 Jump run (the boost-pad jump's proving layout): deep S-bends, a long straight with the boost-pad jump (a peg after it), a sweep, a peg straight, the hairpin, a spiral and the run-in. */
  'jump-run': (L, R, c) => [
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 55, degrees: 110, grade: 0.13 }), billboards: 2 },
    { key: 'jumpStraight', name: 'Jump straight', shape: straight(140, { grade: 0.12 }), features: [boostJump({ at: 0.25 })], obstacles: [peg({ costume: c.peg, at: 0.95, line: 'left' })] },
    { key: 'sweep', name: 'Sweep', shape: sweep({ side: R, radius: 85, degrees: 130, grade: 0.09 }), billboards: 2 },
    {
      key: 'pegStraight', name: 'Peg straight', shape: straight(70, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.2, line: 'center' }), peg({ costume: c.peg, at: 0.4, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'right' }), slalom({ costume: c.slalom, from: 0.72, to: 0.95, count: 3, loss: 0.15 })],
    },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.2, line: 'right' })] },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }) },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 50, turns: 1.1, grade: 0.16 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(95, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.72, to: 0.95, count: 3 })],
    },
  ],
  /** L74 Bridge slalom (Rivers): a quay straight (two pegs, to mix the field out of the launch tunnel), a short climb up to the bridge, a slalom straight between a chain bridge's piers, a long sweep out over the river (a boost; it flies here), a drop back to the bank, the hairpin, a spiral round an island, S-bends along the far bank and a parked piece and a peg at the run-in. */
  'bridge-slalom': (L, R, c) => [
    { key: 'quay', name: 'Quay straight', shape: straight(100, { grade: 0.11 }), obstacles: [peg({ costume: c.peg, at: 0.15, line: 'left' }), peg({ costume: c.peg, at: 0.3, line: 'right' })], billboards: 1 },
    { key: 'rise', name: 'Up to the bridge', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'pillars', name: 'Bridge slalom', shape: straight(100, { grade: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 3, loss: 0.22 })], billboards: 1 },
    { key: 'flyOut', name: 'Sweep over the river', shape: sweep({ side: R, radius: 90, degrees: 150, grade: 0.085 }), features: [boost({ at: 0.08 })], billboards: 2 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.085 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'island', name: 'Spiral', shape: spiral({ side: L, radius: 52, turns: 1, grade: 0.15 }) },
    { key: 'farBank', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 70, grade: 0.12 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(100, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L75 Market maze (Rivers): a long slalom straight low over the water among the boats (the lottery after a peg drop), S-bends along the bank, up a pier ramp (a short climb) and off it (a drop), the hairpin, a sweep along the bank, a spin, a peg under a pier, a peg straight past a pontoon line's floats and a parked piece and a peg at the run-in. */
  'market-maze': (L, R, c) => [
    { key: 'boats', name: 'Market slalom', shape: straight(110, { grade: 0.11 }), obstacles: [slalom({ costume: c.slalom, from: 0.2, to: 0.9, count: 5, loss: 0.22 })] },
    { key: 'bankBends', name: 'Bank S-bends', shape: sBends({ first: L, radius: 70, degrees: 85, grade: 0.13 }), billboards: 1 },
    { key: 'pierRamp', name: 'Up the pier ramp', shape: climb(12, { grade: -0.05, after: 0.13 }) },
    { key: 'pierDrop', name: 'Off the pier', shape: plunge(40, { grade: 0.22, from: 0.13 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'bankSweep', name: 'Bank sweep', shape: sweep({ side: L, radius: 85, degrees: 120, grade: 0.1 }), billboards: 3 },
    { key: 'spin', name: 'Spin', shape: spiral({ side: R, radius: 50, turns: 1, grade: 0.16 }) },
    {
      key: 'underPier', name: 'Under the pier', shape: straight(60, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })],
    },
    { key: 'pontoon', name: 'Pontoon straight', shape: straight(80, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.45, line: 'left' }), peg({ costume: c.peg, at: 0.65, line: 'right' })], billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L76 Steamer pass (Rivers): a straight along the levee (two pegs), a straight through a paddle steamer (a tunnel; a boost), a long sweep out over the bayou (it flies here), a drop, the hairpin, S-bends through the river town, a slalom drop, a sweep to the landing and a parked piece and a peg at the run-in. */
  'steamer-pass': (L, R, c) => [
    { key: 'levee', name: 'Levee straight', shape: straight(120, { grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' }), peg({ costume: c.peg, at: 0.7, line: 'left' })], billboards: 1 },
    { key: 'steamer', name: 'Through the steamer', shape: straight(70, { grade: 0.1 }), features: [boost({ at: 0.1 })] },
    { key: 'bayou', name: 'Bayou sweep', shape: sweep({ side: L, radius: 90, degrees: 140, grade: 0.085 }), billboards: 2 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.085 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'town', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 70, grade: 0.12 }), billboards: 1 },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(50, { grade: 0.2, from: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.4, to: 0.9, count: 3, loss: 0.15 })] },
    { key: 'landing', name: 'Sweep to the landing', shape: sweep({ side: R, radius: 85, degrees: 150, grade: 0.085 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(95, { grade: 0.14 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L77 Falls edge (Rivers): a sweep out to the falls, a long straight along their lip (pegs: rocks in the spray; both fly here), the plunge into the gorge (a waterfall), a slalom straight down the gorge, a spiral, the hairpin, S-bends back upstream and a parked piece and a peg at the run-in. */
  'falls-edge': (L, R, c) => [
    { key: 'lipBend', name: 'Sweep to the lip', shape: sweep({ side: L, radius: 90, degrees: 100, grade: 0.1 }), billboards: 1 },
    {
      key: 'lip', name: 'Along the lip', shape: straight(120, { grade: 0.1 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.25, line: 'left' }), peg({ costume: c.peg, at: 0.42, line: 'right' }), peg({ costume: c.peg, at: 0.58, line: 'center' })],
    },
    { key: 'falls', name: 'The falls', shape: waterfall(45, { grade: 0.55 }) },
    { key: 'gorge', name: 'Gorge slalom', shape: straight(70, { grade: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 3, loss: 0.15 })] },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 54, turns: 1, grade: 0.15 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'upstream', name: 'Upstream S-bends', shape: sBends({ first: L, radius: 80, degrees: 75, grade: 0.11 }), billboards: 2 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L78 Lock staircase (Rivers): a straight down five lock steps, a short climb over the dam crest, a steep slalom drop under a long bridge (the lottery: the clean drop has none at the gate), a river sweep (two pegs), S-bends (a peg), a spiral, the hairpin and a parked piece and a peg at the run-in. */
  'lock-staircase': (L, R, c) => [
    { key: 'locks', name: 'Lock staircase', shape: straight(90, { grade: 0.15 }), features: [steps({ from: 0.36, to: 0.92, count: 5, drag: 0.02 })], billboards: 1 },
    { key: 'damCrest', name: 'Over the dam crest', shape: climb(12, { grade: -0.05, after: 0.1 }) },
    { key: 'bridgeRun', name: 'Bridge slalom', shape: plunge(65, { grade: 0.3, from: 0.09 }), obstacles: [slalom({ costume: c.slalom, from: 0.15, to: 0.95, count: 6, loss: 0.25 })] },
    { key: 'riverSweep', name: 'River sweep', shape: sweep({ side: R, radius: 85, degrees: 100, grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.4, line: 'left' }), peg({ costume: c.peg, at: 0.65, line: 'right' })], billboards: 2 },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 60, grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: L, radius: 50, turns: 1, grade: 0.16 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(75, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L84 Bridge gate (Rivers): an embankment straight (two pegs), a slalom drop between a raised bascule bridge's towers (nine gates: the lottery the pipe drop lacks), a dock spiral, a sweep out under a suspension bridge, the hairpin, S-bends (a peg), a short climb and a drop, the long reach (a sweep) and a parked piece and a peg at the run-in. */
  'bridge-gate': (L, R, c) => [
    { key: 'embankment', name: 'Embankment straight', shape: straight(45, { grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.3, line: 'left' }), peg({ costume: c.peg, at: 0.6, line: 'right' })], billboards: 1 },
    { key: 'bascule', name: 'Bascule slalom', shape: plunge(75, { grade: 0.3, from: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.1, to: 0.97, count: 9, loss: 0.35 })] },
    { key: 'dock', name: 'Dock spiral', shape: spiral({ side: R, radius: 52, turns: 0.6, grade: 0.15 }) },
    { key: 'reach', name: 'Suspension sweep', shape: sweep({ side: L, radius: 85, degrees: 90, grade: 0.09 }), obstacles: [peg({ costume: c.peg, at: 0.4, line: 'left' }), peg({ costume: c.peg, at: 0.65, line: 'right' })], billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 60, grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    { key: 'rise', name: 'Up to the wharf', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'drop', name: 'Off the wharf', shape: plunge(40, { grade: 0.22, from: 0.12 }) },
    { key: 'longReach', name: 'The long reach', shape: sweep({ side: R, radius: 90, degrees: 60, grade: 0.09 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(65, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L85 Arch run (Rivers): a slalom straight under five stone arch bridges in a row (eight gates, alternating sides), a sweep round an island's tip (three pegs), a drop, the hairpin, two sweeps along the quays (three pegs), a short climb up to the upper quay and a drop back down, a spiral and a parked piece and a peg at the run-in. */
  'arch-run': (L, R, c) => [
    { key: 'arches', name: 'Arch slalom', shape: straight(90, { grade: 0.18 }), obstacles: [slalom({ costume: c.slalom, from: 0.08, to: 0.95, count: 8, loss: 0.25 })] },
    { key: 'islandTip', name: 'Round the island tip', shape: sweep({ side: R, radius: 75, degrees: 150, grade: 0.09 }), obstacles: [peg({ costume: c.peg, at: 0.3, line: 'left' }), peg({ costume: c.peg, at: 0.55, line: 'right' }), peg({ costume: c.peg, at: 0.8, line: 'left' })], billboards: 1 },
    { key: 'drop', name: 'Drop', shape: plunge(40, { grade: 0.22, from: 0.09 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'lowQuay', name: 'Lower quay sweep', shape: sweep({ side: L, radius: 85, degrees: 75, grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.35, line: 'left' }), peg({ costume: c.peg, at: 0.65, line: 'right' })], billboards: 2 },
    { key: 'quayBend', name: 'Quay sweep', shape: sweep({ side: R, radius: 85, degrees: 60, grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    { key: 'rise', name: 'Up to the upper quay', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'downQuay', name: 'Back down', shape: plunge(40, { grade: 0.22, from: 0.12 }) },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: L, radius: 52, turns: 0.5, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(65, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L86 Port cranes (Rivers): a slalom drop through the container cranes (eight gates: the lottery the clean drop lacks), a sweep across the plain (three pegs), a sweep by the birch woods (two pegs), the run under a loading gantry, the hairpin, a short climb and a drop, a wide spiral, S-bends along a long many-span bridge (a peg) and a parked piece and a peg at the run-in. */
  'port-cranes': (L, R, c) => [
    { key: 'cranes', name: 'Crane slalom', shape: plunge(70, { grade: 0.3, from: 0.13 }), obstacles: [slalom({ costume: c.slalom, from: 0.12, to: 0.97, count: 8, loss: 0.18 })] },
    { key: 'plain', name: 'Plain sweep', shape: sweep({ side: R, radius: 85, degrees: 115, grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.35, line: 'right' }), peg({ costume: c.peg, at: 0.6, line: 'left' }), peg({ costume: c.peg, at: 0.85, line: 'right' })], billboards: 2 },
    { key: 'birches', name: 'Birch sweep', shape: sweep({ side: L, radius: 80, degrees: 90, grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.4, line: 'left' }), peg({ costume: c.peg, at: 0.65, line: 'right' })], billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'rise', name: 'Up to the quay', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'drop', name: 'Off the quay', shape: plunge(40, { grade: 0.22, from: 0.12 }) },
    { key: 'spin', name: 'Wide spiral', shape: spiral({ side: L, radius: 60, turns: 0.7, grade: 0.15 }) },
    { key: 'bridgeRun', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 60, grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(70, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L87 Flooded forest (Rivers): a slalom straight between the trunks of a flooded forest (five gates; it flies here, low over the water), a drop back to the bank, a sweep under the cliffs, a spiral, the hairpin, a short climb up to a lock and a drop over its weir, S-bends (a peg), a sweep to the landing and a parked piece and a peg at the run-in. */
  'flooded-forest': (L, R, c) => [
    { key: 'trunks', name: 'Trunk slalom', shape: straight(95, { grade: 0.14 }), obstacles: [slalom({ costume: c.slalom, from: 0.15, to: 0.9, count: 5, loss: 0.15 })] },
    { key: 'offStilts', name: 'Drop', shape: plunge(40, { grade: 0.22, from: 0.14 }) },
    { key: 'cliffs', name: 'Cliff sweep', shape: sweep({ side: L, radius: 85, degrees: 100, grade: 0.09 }), billboards: 2 },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 52, turns: 0.8, grade: 0.15 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'lock', name: 'Up to the lock', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'weir', name: 'Over the weir', shape: plunge(40, { grade: 0.22, from: 0.12 }) },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 60, grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    { key: 'landing', name: 'Sweep to the landing', shape: sweep({ side: R, radius: 85, degrees: 100, grade: 0.085 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L88 Balloon plain (Rivers): out of the launch tunnel down a long gentle drop along the sandbank (three pegs, to mix the field), S-bends (two pegs; they fly here, high over the plain), a short climb and a slalom drop (five gates), a spiral, the hairpin, three sweeps down the river to the landing and a parked piece and a peg at the run-in. */
  'balloon-plain': (L, R, c) => [
    { key: 'sandbank', name: 'Down to the sandbank', shape: plunge(90, { grade: 0.14 }), obstacles: [peg({ costume: c.peg, at: 0.15, line: 'left' }), peg({ costume: c.peg, at: 0.3, line: 'right' }), peg({ costume: c.peg, at: 0.45, line: 'center' })], billboards: 1 },
    { key: 'plainBends', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 70, grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.3, line: 'center' }), peg({ costume: c.peg, at: 0.7, line: 'center' })], billboards: 1 },
    { key: 'rise', name: 'Up to the terrace', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'slalomDrop', name: 'Slalom drop', shape: plunge(50, { grade: 0.2, from: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.2, to: 0.92, count: 5, loss: 0.2 })] },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: R, radius: 52, turns: 0.7, grade: 0.15 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sweep1', name: 'River sweep', shape: sweep({ side: L, radius: 85, degrees: 65, grade: 0.09 }), billboards: 1 },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: R, radius: 85, degrees: 80, grade: 0.09 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    { key: 'sweep3', name: 'Sweep to the landing', shape: sweep({ side: L, radius: 90, degrees: 60, grade: 0.085 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(65, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L79 Two waters (Rivers): a long straight on the seam where two rivers meet without mixing (two pegs, two slalom poles and a row of moguls), a sweep along the seam, the lily-pad lagoon (a half-pipe, the field rocking wall to wall), S-bends past the floating houses, a drop, the hairpin, a spiral round a river island, a short climb and a parked piece and a peg at the run-in. */
  'two-waters': (L, R, c) => [
    {
      key: 'seam', name: 'Along the seam', shape: straight(85, { grade: 0.11 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.12, line: 'left' }), peg({ costume: c.peg, at: 0.3, line: 'right' }), slalom({ costume: c.slalom, from: 0.44, to: 0.54, count: 2, loss: 0.15 })], features: [moguls({ from: 0.66, to: 0.92, count: 4 })],
    },
    { key: 'seamSweep', name: 'Seam sweep', shape: sweep({ side: L, radius: 90, degrees: 100, grade: 0.12 }), billboards: 2 },
    { key: 'lagoonRunIn', name: 'Into the lagoon', shape: straight(30, { grade: 0.12 }) },
    { key: 'lagoon', name: 'Lagoon half-pipe', shape: halfPipe({ first: R, width: 8, swings: 3, radius: 150, degrees: 18, grade: 0.12 }) },
    { key: 'village', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 65, grade: 0.12 }), billboards: 1 },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.12 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'island', name: 'Spiral', shape: spiral({ side: L, radius: 52, turns: 0.65, grade: 0.15 }) },
    { key: 'rise', name: 'Short climb', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(75, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L80 Cataract (Rivers): a desert-bank straight (a short slalom, moguls and a peg: granite boulders), the cataract (a waterfall), a slalom straight between the boulder islands, a long sweep out among the sails (it flies here), S-bends along the palm bank, the hairpin, a spiral round a palm island, a short climb, a drop and a parked piece and a peg at the run-in. */
  cataract: (L, R, c) => [
    { key: 'desertBank', name: 'Desert bank', shape: straight(80, { grade: 0.1 }), obstacles: [slalom({ costume: c.slalom, from: 0.1, to: 0.25, count: 2, loss: 0.15 }), peg({ costume: c.peg, at: 0.75, line: 'center' })], features: [moguls({ from: 0.42, to: 0.64, count: 4 })], billboards: 1 },
    { key: 'cataract', name: 'The cataract', shape: waterfall(45, { grade: 0.55 }) },
    { key: 'boulders', name: 'Boulder slalom', shape: straight(60, { grade: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 3, loss: 0.15 })] },
    { key: 'sails', name: 'Sweep among the sails', shape: sweep({ side: R, radius: 90, degrees: 110, grade: 0.085 }), billboards: 2 },
    { key: 'palmBank', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 55, grade: 0.12 }), billboards: 1 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'palmIsland', name: 'Spiral', shape: spiral({ side: L, radius: 52, turns: 0.75, grade: 0.15 }) },
    { key: 'rise', name: 'Short climb', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'drop', name: 'Drop', shape: plunge(40, { grade: 0.22, from: 0.12 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(75, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L81 Rapids ladder (Rivers): a straight above the rapids, three short rapid drops with a pool between each, a slalom straight out over the white water (it flies here), a sweep along the forest bank, the hairpin, S-bends, a spiral and a parked piece and a peg at the run-in. */
  'rapids-ladder': (L, R, c) => [
    { key: 'aboveRapids', name: 'Above the rapids', shape: straight(50, { grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    { key: 'rapid1', name: 'First rapid', shape: plunge(35, { grade: 0.24, from: 0.1 }) },
    { key: 'pool1', name: 'First pool', shape: straight(35, { grade: 0.1 }) },
    { key: 'rapid2', name: 'Second rapid', shape: plunge(35, { grade: 0.24, from: 0.1 }) },
    { key: 'pool2', name: 'Second pool', shape: straight(35, { grade: 0.1 }) },
    { key: 'rapid3', name: 'Third rapid', shape: plunge(35, { grade: 0.24, from: 0.1 }) },
    { key: 'whiteWater', name: 'White-water slalom', shape: straight(90, { grade: 0.12 }), obstacles: [slalom({ costume: c.slalom, from: 0.3, to: 0.85, count: 3, loss: 0.22 })] },
    { key: 'forestSweep', name: 'Forest sweep', shape: sweep({ side: R, radius: 85, degrees: 120, grade: 0.09 }), billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'landingBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 65, grade: 0.12 }), billboards: 1 },
    { key: 'spin', name: 'Spiral', shape: spiral({ side: L, radius: 52, turns: 0.9, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L82 Island castle (Rivers): a straight down to the river (a peg, two slalom poles and a peg), a spiral round the castle island, a sweep along the barge reach, a short climb up to the vineyards, S-bends up the vineyard terraces, a drop under a rail bridge, the hairpin, a long sweep past the barges and a parked piece and a peg at the run-in. */
  'island-castle': (L, R, c) => [
    {
      key: 'toTheRiver', name: 'Down to the river', shape: straight(60, { grade: 0.12 }),
      obstacles: [peg({ costume: c.peg, at: 0.15, line: 'center' }), slalom({ costume: c.slalom, from: 0.4, to: 0.52, count: 2, loss: 0.15 }), peg({ costume: c.peg, at: 0.8, line: 'right' })],
    },
    { key: 'island', name: 'Spiral', shape: spiral({ side: L, radius: 58, turns: 0.75, grade: 0.15 }) },
    { key: 'bargeReach', name: 'Barge reach', shape: sweep({ side: R, radius: 85, degrees: 100, grade: 0.1 }), billboards: 2 },
    { key: 'vineyardClimb', name: 'Short climb', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'switchbacks', name: 'S-bends', shape: sBends({ first: L, radius: 70, degrees: 70, grade: 0.13 }), billboards: 1 },
    { key: 'railBridge', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.13 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'bargeSweep', name: 'Barge sweep', shape: sweep({ side: L, radius: 85, degrees: 100, grade: 0.1 }), billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L83 River steps (Rivers): a straight down five stone river steps, a slalom straight low over the water among the floating lamps (the lottery after a peg drop), a sweep, part of a spiral round a moored boat, S-bends along the steps, a short climb and a drop to the water, the hairpin, a sweep and a parked piece and a peg at the run-in. */
  'river-steps': (L, R, c) => [
    { key: 'riverSteps', name: 'River steps', shape: straight(80, { grade: 0.15 }), features: [steps({ from: 0.36, to: 0.92, count: 5, drag: 0.02 })], billboards: 1 },
    { key: 'lamps', name: 'Lamp slalom', shape: straight(85, { grade: 0.11 }), obstacles: [slalom({ costume: c.slalom, from: 0.2, to: 0.9, count: 5, loss: 0.22 })] },
    { key: 'lampSweep', name: 'Sweep', shape: sweep({ side: L, radius: 85, degrees: 110, grade: 0.11 }), billboards: 2 },
    { key: 'boatTurn', name: 'Spiral', shape: spiral({ side: R, radius: 50, turns: 0.6, grade: 0.15 }) },
    { key: 'alongSteps', name: 'S-bends', shape: sBends({ first: L, radius: 75, degrees: 65, grade: 0.12 }), billboards: 1 },
    { key: 'rise', name: 'Short climb', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'drop', name: 'Drop', shape: plunge(45, { grade: 0.22, from: 0.12 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sweep2', name: 'Second sweep', shape: sweep({ side: R, radius: 85, degrees: 90, grade: 0.1 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(75, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  // ── Peaks (25 Oct 2026; plan: project doc claude/rivers-and-peaks-plan.md, section 2) ─────────────────
  /** L89 Icefall ladders (Peaks): three short drops down a staircase of seracs, the first a slalom between them (four gates: the lottery the clean drop's waves need further on), each followed by a straight over a crevasse (a peg; the ladder and ice-arch bridges, looks only) and tight S-bends between the steps, alternating; a long glacier sweep (two pegs) down to the base camp, the hairpin and the run-in past the tents (a parked supply sled and a peg). */
  'icefall-ladders': (L, R, c) => [
    { key: 'icefall1', name: 'First icefall step', shape: plunge(40, { grade: 0.26, from: 0.13 }), obstacles: [slalom({ costume: c.slalom, from: 0.2, to: 0.92, count: 4, loss: 0.22 })] },
    { key: 'ladder1', name: 'First ladder', shape: straight(30, { grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.55, line: 'left' })] },
    { key: 'bends1', name: 'Serac S-bends', shape: sBends({ first: R, radius: 65, degrees: 70, grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    { key: 'icefall2', name: 'Second icefall step', shape: plunge(35, { grade: 0.24, from: 0.12 }) },
    { key: 'ladder2', name: 'Second ladder', shape: straight(30, { grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.55, line: 'right' })] },
    { key: 'bends2', name: 'Lower serac S-bends', shape: sBends({ first: L, radius: 65, degrees: 70, grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    { key: 'icefall3', name: 'Third icefall step', shape: plunge(35, { grade: 0.24, from: 0.12 }) },
    { key: 'ladder3', name: 'Ice-arch bridge', shape: straight(35, { grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })] },
    { key: 'glacier', name: 'Glacier sweep', shape: sweep({ side: L, radius: 95, degrees: 140, grade: 0.09 }), obstacles: [peg({ costume: c.peg, at: 0.35, line: 'left' }), peg({ costume: c.peg, at: 0.65, line: 'right' })], billboards: 2 },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(110, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L90 Needle ridge (Peaks): a long, almost straight traverse along a knife-edge ridge (two pegs and a slalom between them, five gates; it flies on high supports over drops on both sides), the plunge off the ridge onto the glacier (a slalom drop, five gates), S-bends (a peg), a wide double sweep down the glacier under the cable car (a peg), the hairpin, a short climb over a moraine and a drop, and a parked piece and a peg at the run-in (110 m: at 100 m Mont Blanc's winner took 47.9 s, under the 48 s floor). (Its first draft had the hairpin at the ridge's end: the field then reached it strung out in starting order, the front starting places finished ahead and the gap ran to 21 s.) */
  'needle-ridge': (L, R, c) => [
    {
      key: 'ridge', name: 'The ridge', shape: straight(130, { grade: 0.08 }), billboards: 1,
      obstacles: [peg({ costume: c.peg, at: 0.12, line: 'left' }), slalom({ costume: c.slalom, from: 0.25, to: 0.62, count: 5, loss: 0.16 }), peg({ costume: c.peg, at: 0.72, line: 'right' })],
    },
    { key: 'hairpin', name: 'Corniced hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'offRidge', name: 'Off the ridge', shape: plunge(60, { grade: 0.26, from: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.35, line: 'left' }), peg({ costume: c.peg, at: 0.7, line: 'right' })] },
    { key: 'glacier1', name: 'Glacier sweep', shape: sweep({ side: L, radius: 95, degrees: 110, grade: 0.1 }), billboards: 1 },
    { key: 'glacier2', name: 'Second glacier sweep', shape: sweep({ side: R, radius: 95, degrees: 110, grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    { key: 'moraine', name: 'Over the moraine', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'drop', name: 'Moraine drop', shape: plunge(45, { grade: 0.22, from: 0.12 }) },
    { key: 'sBends', name: 'S-bends', shape: sBends({ first: R, radius: 75, degrees: 65, grade: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(110, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L91 Blue-ice plain (Peaks): a long open double sweep over wind-polished ice, a slalom between nunataks (five gates: the lottery the peg drop's waves need further on), the hairpin, a straight over sastrugi (a row of moguls), a short climb and a drop, and a spiral round the camp before a parked piece and a peg at the run-in. */
  'blue-ice-plain': (L, R, c) => [
    { key: 'sweep1', name: 'Blue-ice sweep', shape: sweep({ side: L, radius: 100, degrees: 90, grade: 0.1 }), billboards: 2 },
    { key: 'sweep2', name: 'Second blue-ice sweep', shape: sweep({ side: R, radius: 100, degrees: 90, grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    { key: 'nunataks', name: 'Nunatak slalom', shape: straight(80, { grade: 0.14 }), obstacles: [slalom({ costume: c.slalom, from: 0.12, to: 0.92, count: 5, loss: 0.22 })] },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sastrugi', name: 'Sastrugi straight', shape: straight(90, { grade: 0.12 }), features: [moguls({ from: 0.4, to: 0.85, count: 5 })], billboards: 1 },
    { key: 'rise', name: 'Over the drift', shape: climb(12, { grade: -0.05, after: 0.12 }) },
    { key: 'drop', name: 'Drift drop', shape: plunge(45, { grade: 0.22, from: 0.12 }) },
    { key: 'campSpin', name: 'Spiral round the camp', shape: spiral({ side: R, radius: 54, turns: 1, grade: 0.15 }) },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: L, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'right' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L92 Zone descent (Peaks): down a mountain's climate zones in one run, each zone a change of rhythm: an ice terrace (two pegs, two slalom poles: the field mixed after the funnel), S-bends on the ice, a long sweep across the alpine desert, a slalom straight among giant groundsels on the moorland (four gates), a spiral through the heath, a dive into the forest (a drop), the hairpin, a last sweep (a peg) and a parked piece and a peg at the run-in. */
  'zone-descent': (L, R, c) => [
    {
      key: 'iceTerrace', name: 'Ice terrace', shape: straight(70, { grade: 0.11 }),
      obstacles: [peg({ costume: c.peg, at: 0.12, line: 'left' }), peg({ costume: c.peg, at: 0.3, line: 'right' })], features: [steps({ from: 0.45, to: 0.92, count: 4, drag: 0.01 })],
    },
    { key: 'ice', name: 'Ice S-bends', shape: sBends({ first: R, radius: 70, degrees: 70, grade: 0.12 }), billboards: 2 },
    { key: 'desert', name: 'Alpine desert sweep', shape: sweep({ side: R, radius: 95, degrees: 85, grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'left' })], billboards: 2 },
    { key: 'moorland', name: 'Groundsel slalom', shape: straight(70, { grade: 0.14 }), obstacles: [slalom({ costume: c.slalom, from: 0.15, to: 0.85, count: 4, loss: 0.12 })] },
    { key: 'heath', name: 'Heath spiral', shape: spiral({ side: L, radius: 54, turns: 0.75, grade: 0.15 }) },
    { key: 'forest', name: 'Into the forest', shape: plunge(50, { grade: 0.24, from: 0.12 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: L }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'sweep2', name: 'Forest sweep', shape: sweep({ side: R, radius: 85, degrees: 75, grade: 0.1 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 1 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(65, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
  /** L93 Ice-cave run (Peaks): a drop into a long cave under the ice cap (two pegs), S-bends through it, out onto black sand, a slalom across braided meltwater streams (five gates), a spiral round a gravel bar, the hairpin, a drop over the outwash terrace, a long sweep (a peg) and a parked piece and a peg at the run-in. */
  'ice-cave-run': (L, R, c) => [
    { key: 'caveDrop', name: 'Into the cave', shape: plunge(55, { grade: 0.2, from: 0.12 }), obstacles: [peg({ costume: c.peg, at: 0.4, line: 'left' }), peg({ costume: c.peg, at: 0.7, line: 'right' })] },
    { key: 'cave', name: 'The blue cave', shape: sBends({ first: R, radius: 75, degrees: 60, grade: 0.12 }) },
    { key: 'streams', name: 'Braided streams', shape: straight(80, { grade: 0.14 }), obstacles: [slalom({ costume: c.slalom, from: 0.15, to: 0.9, count: 5, loss: 0.18 })] },
    { key: 'gravelBar', name: 'Gravel-bar spiral', shape: spiral({ side: L, radius: 54, turns: 0.9, grade: 0.15 }) },
    { key: 'brakingStraight', name: 'Run to the hairpin', shape: straight(50, { grade: 0.12 }) },
    { key: 'hairpin', name: 'Hairpin', shape: hairpin({ side: R }), obstacles: [swipe({ costume: c.swipe, side: 'high' })] },
    { key: 'terrace', name: 'Outwash drop', shape: plunge(45, { grade: 0.22, from: 0.12 }), billboards: 1 },
    { key: 'outwash', name: 'Outwash sweep', shape: sweep({ side: L, radius: 90, degrees: 110, grade: 0.09 }), obstacles: [peg({ costume: c.peg, at: 0.5, line: 'center' })], billboards: 3 },
    {
      key: 'lastStraight', name: 'Last straight', shape: straight(80, { grade: 0.15 }),
      obstacles: [parked({ costume: c.parked, at: 0.2, side: R, length: 6 }), peg({ costume: c.peg, at: 0.45, line: 'left' })], features: [rumble({ from: 0.7, to: 0.95, count: 3 })],
    },
  ],
};

const LAYOUT_KINDS = Object.keys(LAYOUTS);
// Dressing a layout's section: looks only, and the splitter's proven channel settings (`balance`) once batches say so.
const DRESS = ['name', 'scenery', 'landmarks', 'billboards', 'billboardFrame', 'surface', 'figures', 'overhead', 'tunnel', 'bridge', 'around', 'height', 'water', 'waterCurtain', 'walls', 'stadium', 'river', 'peak'];

/**
 * A layout from the library, as a track's `sections`. `mirror`: every bend the
 * other way (the first bend turns right). `costumes`: { block, slalom, peg, swipe,
 * curtain, parked }. `dress`: { <key>: { name, scenery, landmarks, billboards, … } }. `bumps` (lower playfield, maze corridors, bullet spirals, up up down down, co-op street): its bumps' look ('reels', 'dots', 'bunkers', 'platforms', 'chicken').
 */
function layout(kind, { mirror = false, costumes = {}, dress = {}, ...o } = {}) {
  const make = LAYOUTS[kind];
  if (!make) throw new Error(`unknown layout ${JSON.stringify(kind)} (${LAYOUT_KINDS.join(', ')})`);
  const [L, R] = mirror ? ['right', 'left'] : ['left', 'right'];
  const sections = make(L, R, costumes, (side) => BALANCE[side], o).map(({ key, ...sec }) => {
    const extra = dress[key] ?? {};
    const { balance, addObstacles, ...looks } = extra;
    for (const k of Object.keys(looks)) if (!DRESS.includes(k)) throw new Error(`layout ${kind}: "${k}" cannot be changed on its ${key} section (only ${DRESS.join(', ')}, addObstacles, and balance on a splitter)`);
    if (!balance && !addObstacles) return { ...sec, ...looks, layoutKey: key };
    // Retuned for this track once its batches say so: a splitter's channel settings
    // (`balance`), and pegs (`addObstacles`) on a section that is not a spiral or the
    // hairpin, to mix the lanes before a splitter or add overtakes where a layout runs
    // at the edge. Given for the unmirrored layout; `mirror` swaps channels and lines
    // as it does the layout's own.
    if (balance && sec.shape?.shape !== 'splitter') throw new Error(`layout ${kind}: balance can only be set on a splitter (not ${key})`);
    if (addObstacles && ['spiral', 'hairpin'].includes(sec.shape?.shape)) throw new Error(`layout ${kind}: no pegs added to a ${sec.shape.shape} (${key}): the layouts keep them clear`);
    const flip = (line) => (typeof line === 'number' ? -line : { left: 'right', right: 'left' }[line] ?? line);
    const added = (addObstacles ?? []).map((o) => {
      if (o.obstacle !== 'peg') throw new Error(`layout ${kind}: only pegs can be added (not ${o.obstacle})`);
      return mirror ? { ...o, line: flip(o.line) } : o;
    });
    const obstacles = [...(sec.obstacles ?? []), ...added];
    if (!balance) return { ...sec, ...looks, ...(obstacles.length && { obstacles }), layoutKey: key };
    const b = mirror ? { ...balance, tipOffset: balance.tipOffset == null ? undefined : -balance.tipOffset, left: balance.right, right: balance.left } : balance;
    const fork = { ...sec.shape.fork, ...(b.tipOffset == null ? {} : { tipOffset: b.tipOffset }), left: { ...sec.shape.fork.left, ...b.left }, right: { ...sec.shape.fork.right, ...b.right } };
    return { ...sec, shape: { ...sec.shape, fork }, ...looks, ...(obstacles.length && { obstacles }), layoutKey: key };
  });
  for (const k of Object.keys(dress)) if (!sections.some((s) => s.layoutKey === k)) throw new Error(`layout ${kind} has no section "${k}" (${sections.map((s) => s.layoutKey).join(', ')})`);
  sections.layout = kind;
  return sections;
}

module.exports = { layout, LAYOUT_KINDS };
