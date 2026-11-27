'use strict';

// Zambezi Falls Run: Rivers track 4, at a great waterfall in southern Africa. Off a cliff top, a sweep
// out to the falls, a long run on stilts along their lip in the spray, the plunge down into the gorge,
// a slalom down its rapids under a steel arch bridge high above, and S-bends back upstream past a
// hippo pool.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'zambezi-falls-run',
  name: 'Zambezi Falls Run',
  family: 'river',
  difficulty: 'extreme',
  description: 'A great waterfall in southern Africa: a long run on stilts along the lip of the falls in their spray, the plunge into the gorge, a slalom down its rapids under a steel arch bridge, and S-bends back upstream past a hippo pool.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  variants: ['sunset'],
  river: { palette: 'zambezi', side: 'right', width: 140, banks: 'rock', slope: 0.8, gap: 10 },
  coaster: { colours: { support: '#5a4a3a', rail: '#f2e8d4', tie: '#3a3028' } },
  signature: 'Along the lip',
  tvCameras: [
    { section: 'Along the lip', at: 0.8, side: 'right', distance: 10, height: 12 },
    { section: 'Spiral', at: 0.8, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'hippo-pool', scenery: ['savannah'], type: 'cliff', gate: 'barrier', shots: { countdown: 'chase', launch: 'look-back' } },
  finish: { landmark: 'hippo-pool' },
  designChanges: [
    'Built from the classic opening and the falls edge, the library layout made for this track: a sweep out to the falls, a long straight along their lip (pegs: rocks in the spray), the falls (a waterfall), a slalom down the gorge, a spiral, the hairpin, S-bends back upstream and the run-in.',
    'The steel arch bridge crosses the gorge high over the slalom (looks only).',
    'Looks, from the portrait review (approved 23 Oct 2026): the river 10 m from the track beside the ground stretches with a low, gentle shore (`gap`), the land rising at most 0.8 beside another stretch (`slope`), green hills in patches away from the water (`hillside`), wavelets on the water and white water only at real rapids; the falls, the gorge rapids and the spiral fly on supports, so no rock fill stands as a wall where the gorge crosses over the spiral (looks only).',
  ],
  opening: opening('classic', {
    costumes: { block: 'mossy-boulder', slalom: 'river-stake' },
    names: { plunge: 'Off the cliff' },
    dress: { plunge: { height: 0, river: 'right' } },
  }),
  sections: layout('falls-edge', {
    mirror: true,
    costumes: { slalom: 'river-stake', peg: 'cairn', swipe: 'hippo', parked: 'safari-jeep' },
    dress: {
      lipBend: { name: 'Out to the falls', height: 14, river: 'under', scenery: ['savannah'] },
      lip: { name: 'Along the lip', height: 14, river: 'left', landmarks: [{ name: 'falls-lip', at: 0.5, side: 'left', distance: 30 }] },
      falls: { name: 'Into the gorge', height: 10, river: 'none' },
      gorge: { name: 'The gorge rapids', height: 12, river: 'right', overhead: ['steel-arch-bridge'], scenery: ['rocks'] },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'right' },
      hairpin: { name: 'Hippo hairpin', height: 0, river: 'right' },
      upstream: { name: 'Back upstream', height: 0, river: 'left', scenery: ['savannah'], landmarks: [{ name: 'hippo-pool', at: 0.5, river: true, distance: 20 }] },
      spin: { name: 'Spiral', height: 12, river: 'none', scenery: ['savannah'] },
      lastStraight: { name: 'Run to the pool', height: 0, river: 'left' },
    },
  }),
});
