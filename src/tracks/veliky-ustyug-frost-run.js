'use strict';

// Veliky Ustyug Frost Run: Holiday Season 2026 track (World Tour), Track of the Day on 28 December and
// again on 2 January. A deep-frost day under a low sun in the old wooden town: down to the river, a jib
// line along the frozen river, past troikas and the white church's onion domes, to the carved wooden
// residence with its towers (shown as a building only).
const { track, opening, straight, sBends, sweep, spiral, hairpin, plunge, runIn, peg, slalom, swipe, rumble, jibLine, curtain } = require('../trackKit');

module.exports = track({
  slug: 'veliky-ustyug-frost-run',
  name: 'Veliky Ustyug Frost Run',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'A deep-frost day under a low sun in an old wooden town: a jib line along the frozen river, past troikas and a white church\'s onion domes, to a carved wooden residence with tall towers.',
  surface: 'snow',
  biome: 'arctic',
  lighting: 'sunset',
  variants: ['snow'],
  signature: 'Frozen river jib line',
  tvCameras: [
    { section: 'Frozen river jib line', at: 0.6, side: 'left', distance: 8, height: 14 },
    { section: 'Bell tower spiral', at: 0.5, side: 'left', distance: 9, height: 14 },
  ],
  start: { landmark: 'onion-dome-church', gate: 'paddle', shots: { countdown: 'side', launch: 'side' } },
  finish: { landmark: 'wooden-residence', scenery: ['wooden-houses'] },
  designChanges: [
    'A clean drop at the gate (the field let go in waves) and bends down to the river, then the jib line along the frozen river, as planned.',
    'The residence is a carved wooden house with towers, shown as a building only (no characters); the church is generic architecture (onion domes, a bell tower) with no symbols or figures. No names on anything drawn.',
    'Banner gantries hang over the wooden street bends and the church sweep (they give the weakest marbles their chances).',
  ],
  opening: opening('clean-drop', { side: 'left', names: { plunge: 'Town hill drop', bends: 'Down to the river' } }),
  sections: [
    {
      name: 'Frozen river jib line', shape: straight(120, { grade: 0.115 }), billboards: 1,
      obstacles: [peg({ costume: 'ice-lantern', at: 0.05, line: 'left' })],
      features: [jibLine({ from: 0.15 })], landmarks: [{ name: 'troika', side: 'right', at: 0.5, distance: 8 }],
    },
    { name: 'Wooden street bends', shape: sBends({ first: 'right', radius: 65, degrees: 80, grade: 0.12 }), scenery: ['wooden-houses'], billboards: 2, obstacles: [curtain({ costume: 'banner-gantry', at: 0.5, side: 'left' })] },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), obstacles: [peg({ costume: 'ice-lantern', at: 0.15, line: 'center' }), peg({ costume: 'ice-lantern', at: 0.32, line: 'left' }), peg({ costume: 'ice-lantern', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'stag', side: 'high' })] },
    {
      name: 'Church sweep', shape: sweep({ side: 'left', radius: 85, degrees: 80, grade: 0.09 }), billboards: 2,
      landmarks: [{ name: 'onion-dome-church', side: 'high', at: 0.5, distance: 28 }],
      obstacles: [curtain({ costume: 'banner-gantry', at: 0.5, side: 'right' })],
    },
    { name: 'Bell tower spiral', shape: spiral({ side: 'right', radius: 48, turns: 1, grade: 0.16 }), around: 'bell-tower' },
    { name: 'Frost drop', shape: plunge(50, { grade: 0.2, from: 0.1 }), obstacles: [peg({ costume: 'ice-lantern', at: 0.4, line: 'left' }), peg({ costume: 'ice-lantern', at: 0.6, line: 'right' }), peg({ costume: 'ice-lantern', at: 0.8, line: 'center' })] },
    { name: 'Run to the residence', shape: straight(90, { grade: 0.15 }), scenery: ['wooden-houses'], obstacles: [peg({ costume: 'ice-lantern', at: 0.15, line: 'center' }), peg({ costume: 'ice-lantern', at: 0.3, line: 'left' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })], landmarks: [{ name: 'troika', side: 'left', at: 0.45, distance: 9 }] },
    { name: 'Finish', shape: runIn() },
  ],
});
