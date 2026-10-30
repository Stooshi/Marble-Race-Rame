'use strict';

// Elbrus Twin Saddle: Peaks track 9, across the snow saddle between the mountain's two old volcanic summits,
// one on each side, at golden hour. From the roof of a barrel hut through a snow tunnel, a long sweep across the
// saddle, over the col and a ridge drop, then twin banked spirals down the rime-coated rocks, one each way (the
// track's big feature), the hairpin and the run-in. A pass cairn on the saddle; nothing on either summit.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'elbrus-twin-saddle',
  name: 'Elbrus Twin Saddle',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Across the snow saddle between two old volcanic summits at golden hour: through a snow tunnel, a long sweep over the saddle, a ridge drop and twin banked spirals down the rime-coated rocks, one each way.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'sunset',
  variants: ['high-altitude'],
  peak: { palette: 'elbrus' },
  coaster: { style: 'alpine', colours: { support: '#8a8278', rail: '#f2ece4', tie: '#4a423c' } },
  signature: 'First rime spiral',
  tvCameras: [
    { section: 'Between the spirals', at: 0.6, side: 'left', distance: 10, height: 12 },
    { section: 'The saddle', at: 0.7, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'barrel-hut', type: 'rooftop', gate: 'paddle', shots: { countdown: 'chase', launch: 'side' } },
  finish: { landmark: 'barrel-hut' },
  designChanges: [
    'Built from the tunnel launch (a short snow tunnel) and the saddle traverse, the library layout made for this track (L97): a long sweep across the saddle (a peg: it spreads the field after the tunnel, the plan\'s lesson from Berlin; its first draft, S-bends, started too like Danube Night Run\'s and Yarlung Tsangpo Spins\'), a slalom straight, a short climb over the col, a ridge drop, then twin banked spirals one each way with a straight between them (the track\'s big feature, Moses\'s rule of 27 Oct 2026), the hairpin and a long run-in.',
    'A pass cairn on the saddle, far below both summits, which stay scenery only.',
    'The parked hut sledge on the run-in further from the hairpin (35% along, not 20%): a slow marble could stop against it coming out of the hairpin (one race in 3,000 lost 15 s there).',
  ],
  opening: opening('tunnel-launch', {
    names: { plunge: 'Through the snow tunnel' },
  }),
  sections: layout('saddle-traverse', {
    costumes: { slalom: 'nunatak', peg: 'nunatak', swipe: 'falcon', parked: 'kick-sled' },
    dress: {
      saddle: { peak: { zone: 'snow' }, landmarks: [{ name: 'pass-cairn', at: 0.5, side: 'left', distance: 25 }] },
      saddleStraight: { peak: { zone: 'snow' } },
      rise: { peak: { zone: 'snow' } },
      ridgeDrop: { peak: { zone: 'rock' } },
      spiral1: { peak: { zone: 'rock' } },
      between: { peak: { zone: 'rock' } },
      spiral2: { peak: { zone: 'rock' } },
      brakingStraight: { peak: { zone: 'snow' } },
      hairpin: { peak: { zone: 'snow' } },
      lastStraight: { name: 'To the barrel huts', peak: { zone: 'snow' } },
    },
  }),
});
