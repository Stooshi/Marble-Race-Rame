'use strict';

// Yukon Five Finger Run (Moses, 13 Nov 2026: five more Rivers tracks, the pack filled to 20; one of the two Wild ones).
// The Yukon in late summer: down an old gold-rush trail over the gravel (the rumble start), a sweep along the gravel
// bars, through the narrow basalt walls of Miles Canyon (a half-pipe, the field rocking wall to wall), over the canyon
// rim, then Five Finger Rapids (the track's big feature: a drop down the rapids, the field threading between the rock
// pillars that stand in the river like fingers), the hairpin by the sternwheeler, S-bends through the spruce, a last
// drop and the last straight. Generic river life only; no real ship's, company's or building's name.
const {
  track, opening, straight, plunge, climb, sBends, sweep, hairpin, halfPipe, runIn, peg, slalom,
} = require('../trackKit');

module.exports = track({
  slug: 'yukon-five-finger-run',
  name: 'Yukon Five Finger Run',
  family: 'river',
  difficulty: 'hard',
  description: 'The Yukon in late summer: down an old gold-rush trail, along the gravel bars, through the narrow basalt walls of Miles Canyon, down Five Finger Rapids between the rock pillars standing in the river and past the sternwheeler, through the spruce and down a last drop to the line.',
  surface: 'ice',
  biome: 'alpine',
  lighting: 'day',
  variants: ['sunset'],
  river: { palette: 'yukon', side: 'right', width: 130, banks: 'sand', slope: 0.8, gap: 10 },
  coaster: { colours: { support: '#5a4a3a', rail: '#ece4d4', tie: '#3a3028' } },
  signature: 'Five Finger Rapids',
  tvCameras: [
    // (At the foot of the rapids, looking back up them at the field coming down between the pillars.)
    { section: 'Five Finger Rapids', at: 0.85, side: 'left', distance: 10, height: 11 },
    { section: 'Through the spruce', at: 0.85, side: 'right', distance: 10, height: 11 },
  ],
  start: { landmark: 'rock-fingers', type: 'straight-lift', gate: 'trapdoor', shots: { countdown: 'chase', launch: 'side' } },
  finish: { landmark: 'paddle-steamer' },
  opening: opening('rumble-start', {
    costumes: { slalom: 'river-stake' },
    names: { plunge: 'Down the trail' },
    dress: { plunge: { height: 0, river: 'right', scenery: ['pines'] } },
  }),
  sections: [
    {
      name: 'Along the gravel bars', shape: sweep({ side: 'left', radius: 80, degrees: 110, grade: 0.12 }), height: 0, river: 'right', billboards: 1,
      obstacles: [slalom({ costume: 'river-stake', from: 0.25, to: 0.6, count: 4, loss: 0.2 }), peg({ costume: 'cairn', at: 0.75, line: 'right' })],
    },
    { name: 'Into the canyon', shape: straight(30, { grade: 0.12 }), height: 0, river: 'left' },
    {
      name: 'Miles Canyon', shape: halfPipe({ first: 'right', width: 8, swings: 4, radius: 150, degrees: 18, grade: 0.12 }), height: 0, river: 'left',
      landmarks: [{ name: 'basalt-columns', at: 0.5, side: 'right', distance: 22 }],
    },
    { name: 'Over the canyon rim', shape: climb(14, { grade: -0.06, after: 0.3 }), height: 0, river: 'left' },
    { name: 'To the rapids', shape: straight(40, { grade: 0.11 }), height: 0, river: 'right', billboards: 1 },
    {
      name: 'Five Finger Rapids', shape: plunge(60, { grade: 0.34, from: 0.11 }), height: 6, river: 'under',
      landmarks: [{ name: 'rock-fingers', at: 0.5, river: true, distance: 20 }],
      obstacles: [peg({ costume: 'cairn', at: 0.3, line: 'left' }), peg({ costume: 'cairn', at: 0.45, line: 'right' }), peg({ costume: 'cairn', at: 0.6, line: 'center' }), peg({ costume: 'cairn', at: 0.75, line: 'left' })],
    },
    {
      name: 'Below the rapids', shape: straight(55, { grade: 0.12 }), height: 0, river: 'right',
      obstacles: [peg({ costume: 'cairn', at: 0.25, line: 'right' }), peg({ costume: 'cairn', at: 0.5, line: 'left' })],
    },
    { name: 'Sternwheeler hairpin', shape: hairpin({ side: 'right' }), height: 0, river: 'none' },
    {
      name: 'Through the spruce', shape: sBends({ first: 'left', radius: 70, degrees: 75, grade: 0.15 }), height: 0, river: 'right', scenery: ['pines'],
      obstacles: [slalom({ costume: 'river-stake', from: 0.3, to: 0.7, count: 4, loss: 0.15 })],
    },
    {
      name: 'Whitehorse drop', shape: plunge(45, { grade: 0.2, from: 0.15 }), height: 0, river: 'right',
      obstacles: [peg({ costume: 'cairn', at: 0.6, line: 'center' })],
    },
    {
      name: 'Last straight', shape: straight(60, { grade: 0.12 }), height: 0, river: 'right', billboards: 2,
      landmarks: [{ name: 'paddle-steamer', at: 0.5, river: true, distance: 40 }],
      obstacles: [peg({ costume: 'cairn', at: 0.3, line: 'left' })],
    },
    { name: 'Finish', shape: runIn(), height: 0, river: 'right' },
  ],
});
