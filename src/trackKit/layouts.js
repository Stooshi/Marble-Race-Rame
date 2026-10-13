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
  straight, plunge, climb, sBends, sweep, spiral, hairpin, splitter, waterfall,
  pileUp, block, curtain, swipe, parked, slalom, peg, boost, moguls, rumble,
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
};

const LAYOUT_KINDS = Object.keys(LAYOUTS);
// Dressing a layout's section: looks only, and the splitter's proven channel settings (`balance`) once batches say so.
const DRESS = ['name', 'scenery', 'landmarks', 'billboards', 'billboardFrame', 'surface', 'figures', 'overhead', 'tunnel', 'bridge', 'around', 'height', 'water', 'waterCurtain'];

/**
 * A layout from the library, as a track's `sections`. `mirror`: every bend the
 * other way (the first bend turns right). `costumes`: { block, slalom, peg, swipe,
 * curtain, parked }. `dress`: { <key>: { name, scenery, landmarks, billboards, … } }. `bumps` (lower playfield, maze corridors): its bumps' look ('reels', 'dots').
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
