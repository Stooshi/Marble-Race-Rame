'use strict';

// Vatnajökull Blue Cave: Peaks track 15 (test five), Europe's greatest ice cap. Off a spiral tower, a banked
// first turn, then a drop into a long cave of translucent blue ice under the ice cap, S-bends through it, out
// onto black volcanic sand, a slalom across braided meltwater streams, a spiral round a gravel bar, the hairpin,
// a drop over the outwash terrace and a long sweep under the grey arctic sky that makes the blue glow.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'vatnajokull-blue-cave',
  name: 'Vatnajökull Blue Cave',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Europe\'s greatest ice cap under a grey arctic sky: through a long cave of glowing blue ice, out onto black volcanic sand and across braided meltwater streams, round a gravel bar and down the outwash.',
  surface: 'ice',
  biome: 'arctic',
  lighting: 'fog',
  variants: ['day', 'snow'],
  peak: { palette: 'vatnajokull' },
  coaster: { style: 'alpine', colours: { support: '#3a3836', rail: '#e8eef4', tie: '#2b2826' } },
  signature: 'The blue cave',
  tvCameras: [
    { section: 'The blue cave', at: 0.8, side: 'right', distance: 6, height: 12 },
    { section: 'Gravel-bar spiral', at: 0.8, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'glacier-tongue', type: 'spiral-tower', gate: 'barrier', shots: { countdown: 'chase', launch: 'look-back' } },
  finish: { landmark: 'peak-camp' }, // (the research huts on the ice cap; the streams, 50 m across, reached into the catch area)
  designChanges: [
    'Built from the banked turn and the ice-cave run, the library layout made for this track (L93): a drop into the cave (two pegs), S-bends through it, a slalom across braided streams (five gates), a spiral round a gravel bar, the hairpin, a drop over the outwash terrace, a long sweep (a peg) and the run-in.',
    'The cave is the tunnel `blue-ice`: opaque, its ice bright where the light comes through (no see-through, for the phones); the streams are drawn on the black sand (looks only).',
  ],
  opening: opening('banked-turn', {
    side: 'right',
    costumes: { block: 'arctic-fox', slalom: 'river-stake' },
    names: { plunge: 'Off the tower', turn: 'Banked turn' },
    dress: { plunge: { peak: { zone: 'ice' } } },
  }),
  sections: layout('ice-cave-run', {
    costumes: { slalom: 'river-stake', peg: 'cairn', swipe: 'snow-troll', parked: 'snowmobile' },
    dress: {
      caveDrop: { peak: { zone: 'ice' }, landmarks: [{ name: 'glacier-tongue', at: 0.5, side: 'left', distance: 70 }] },
      cave: { tunnel: 'blue-ice', peak: { zone: 'ice' } },
      streams: { peak: { zone: 'black-sand' }, landmarks: [{ name: 'meltwater-streams', at: 0.5, side: 'right', distance: 50 }] },
      gravelBar: { peak: { zone: 'black-sand' } },
      brakingStraight: { peak: { zone: 'black-sand' } },
      hairpin: { name: 'Outwash hairpin', peak: { zone: 'black-sand' } },
      terrace: { peak: { zone: 'black-sand' } },
      outwash: { peak: { zone: 'black-sand' } },
      lastStraight: { peak: { zone: 'black-sand' } },
    },
  }),
});
