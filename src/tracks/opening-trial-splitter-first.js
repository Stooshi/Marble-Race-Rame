'use strict';

// Opening trial: Splitter First (Moses, 4 Nov 2026). A test track for a new kind of opening, "like the
// loop": never raced for real (not in the database, in no series), at the preview link
// /preview/physics?track=opening-trial-splitter-first. Today every track opens the same way: the start
// slope, then the pile-up and slalom that separate the pack. This one tries:
//   1. the start slope, then a splitter at once (exciting from the first second, but not the usual obstacles);
//   2. a sweeping bend and a second slope;
//   3. the pack separator (the classic pile-up of three blocks and the slalom) about 15-20 s in, once the
//      field has bunched up again;
//   4. straight after it a narrow channel (the U at 2.1 m instead of 3.6 m) onto a speed pad;
//   5. then a normal rest of a track: the falls (the big feature) and the finish.
// Not written into the track kit's opening library yet: if the trial works, it becomes an opening there.
const {
  track, plunge, straight, sBends, sweep, spiral, hairpin, splitter, waterfall,
  pileUp, slalom, swipe, parked, boost, rumble,
} = require('../trackKit');

// The splitter off the start runs straight (its two channels the same length, the same ice): the field
// reaches it still in its starting order across the track, so a bend's shorter inside channel would hand
// one side of the gate the lead (tried: a 70-degree left-hand splitter, the inside channel 71% of the
// marbles and 89% of the wins; rougher ice there evened the wins but never the places gained).
const SPLIT_BALANCE = { tipOffset: 0, left: { drag: 1, scrub: 1 }, right: { drag: 1, scrub: 1 } };
// The narrow channel: the U's radius in metres (the usual channel's is 3.6), easing in and out over its ends.
const NARROW_RADIUS = 2.1;
const narrows = (length, { grade = 0.12 } = {}) => ({ shape: 'narrows', wide: { radius: NARROW_RADIUS }, parts: [{ kind: 'straight', length, grade }] });

module.exports = track({
  slug: 'opening-trial-splitter-first',
  family: 'test',
  name: 'Opening Trial: Splitter First',
  difficulty: 'extreme',
  description: 'A test track for a new opening: a splitter straight off the start, the pack separator about 15-20 s in, then a narrow channel onto a speed pad.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'day',
  signature: 'The falls',
  start: { landmark: 'mountain-hut' },
  finish: { landmark: 'church' },
  tvCameras: [
    { section: 'Second slope', at: 0.75, side: 'right', distance: 10, height: 8 },
    { section: 'The falls', at: 0.95, side: 'left', distance: 10, height: 9 },
  ],
  sections: [
    { name: 'Start slope', shape: plunge(60, { grade: 0.55 }) },
    { name: 'First splitter', shape: splitter({ approach: 40, degrees: 0, merge: 40, balance: SPLIT_BALANCE }) },
    { name: 'Sweeping bend', shape: sweep({ side: 'right', radius: 80, degrees: 130, grade: 0.09 }), billboards: 2 },
    {
      name: 'Second slope', shape: plunge(80, { grade: 0.42, from: 0.12 }),
      obstacles: [pileUp({ at: 0.42 }), slalom({ from: 0.55, to: 0.97, count: 6, loss: 0.3 })],
    },
    { name: 'The narrows', shape: narrows(50, { grade: 0.12 }), features: [boost({ at: 0.86, halfWidth: 3.0, length: 8 })] },
    { name: 'S-bends', shape: sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }), billboards: 2 },
    { name: 'Above the falls', shape: straight(35, { grade: 0.12 }) },
    { name: 'The falls', shape: waterfall(40, { grade: 0.35 }), surface: 'water' },
    { name: 'Below the falls', shape: straight(60, { grade: 0.12 }), obstacles: [slalom({ from: 0.25, to: 0.85, count: 4, loss: 0.3 })] },
    { name: 'Run to the hairpin', shape: straight(60, { grade: 0.12 }) },
    { name: 'Hairpin', shape: hairpin({ side: 'right' }), obstacles: [swipe({ side: 'high' })] },
    { name: 'Spiral', shape: spiral({ side: 'left', radius: 45, grade: 0.17 }) },
    {
      name: 'Last straight', shape: straight(90, { grade: 0.15 }),
      obstacles: [parked({ at: 0.15, side: 'right', length: 8 })], features: [rumble({ from: 0.55, to: 0.95, count: 4 })],
    },
  ],
});
