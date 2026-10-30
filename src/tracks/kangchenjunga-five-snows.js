'use strict';

// Kangchenjunga Five Snows: Peaks track 14, "where climbers turn back": the run begins on the snowfields far
// below the summit, faces the five summits across the glacier, then drops through rhododendron forest in bloom. A
// table top on a snow terrace (the field spreads out on the flat: the first big feature), the drop off its end (the
// second), a moraine drop and S-bends through the rhododendrons. No summit, no cairn, no religious objects.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'kangchenjunga-five-snows',
  name: 'Kangchenjunga Five Snows',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Far below the five summits, where climbers turn back: a traverse facing the five snows, a table top on a snow terrace and the drop off its end, then down through rhododendron forest in bloom.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'dawn',
  variants: ['day'],
  peak: { palette: 'kangchenjunga' },
  coaster: { style: 'alpine', colours: { support: '#80868c', rail: '#eef2f6', tie: '#4f555a' } },
  signature: 'The snow terrace',
  tvCameras: [
    { section: 'Off the terrace', at: 0.9, side: 'left', distance: 10, height: 12 },
    { section: 'Lower rhododendrons', at: 0.5, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'serac-field', type: 'straight-lift', gate: 'stalls', shots: { countdown: 'front', launch: 'overhead' } },
  finish: { landmark: 'rhododendrons' },
  designChanges: [
    'Built from the crest start and the rhododendron drop, the library layout made for this track (L102): a long straight facing the five summits (a peg and a rough patch that slows the leaders; its first draft, a sweep, started too like Sognefjord\'s and Chiang Mai\'s), the hairpin, a terrace straight with a table top (the field spreads out on the flat: the first big feature), the drop off its end (the second, Moses\'s rule of 27 Oct 2026), a moraine slalom and drop, S-bends both ways through the rhododendrons and the run-in.',
    'The crest start is used once in the family; if the report shows it favouring a group, the peg drop is the fallback (the plan\'s lesson from Colca and Mekong).',
    'The summits are scenery only, far in the backdrop: no cairn, no religious objects (the Peaks rules).',
    'The lower rhododendron S-bends and the terrace-field sweep shortened (45° and 90°): the slowest of 3,000 races\' last marbles came home at 88.6 s (target under 85 s).',
  ],
  opening: opening('crest-start', {
    names: { plunge: 'Over the crest' },
  }),
  sections: layout('rhododendron-drop', {
    costumes: { slalom: 'serac', peg: 'serac', swipe: 'falcon', parked: 'kick-sled' },
    dress: {
      traverse: { peak: { zone: 'snow' } },
      brakingStraight: { peak: { zone: 'snow' } },
      hairpin: { peak: { zone: 'snow' } },
      terrace: { peak: { zone: 'snow' } },
      terraceDrop: { peak: { zone: 'rock' } },
      moraine: { peak: { zone: 'rock' } },
      moraineDrop: { peak: { zone: 'cloud-forest' } },
      rhodo1: { peak: { zone: 'cloud-forest' }, landmarks: [{ name: 'rhododendrons', at: 0.5, side: 'left', distance: 24 }] },
      rhodo2: { peak: { zone: 'cloud-forest' } },
      gully: { peak: { zone: 'cloud-forest' } },
      lastStraight: { name: 'Through the rhododendrons', peak: { zone: 'cloud-forest' } },
    },
  }),
});
