'use strict';

// Roraima Cloud Falls: Peaks track 13, along the sheer wall of the great flat-topped table mountain on high
// supports, passing behind its ribbon falls, then the talus plunge, the series' longest straight drop (the track's
// big feature), through the cloud forest at its foot to the open savanna. The plateau top stays untouched (held
// sacred by the Pemón): no track, cairn or prop on it; no border markers or flags. The series' only track without
// snow or ice.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'roraima-cloud-falls',
  name: 'Roraima Cloud Falls',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Along the sheer wall of a great flat-topped table mountain behind its ribbon waterfalls, a hairpin in the cloud, then the longest plunge of the series down the talus into the cloud forest and out to the savanna.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'rain',
  variants: ['day'],
  peak: { palette: 'roraima' },
  coaster: { style: 'alpine', colours: { support: '#5a4a3a', rail: '#ece4d8', tie: '#3a2e24' } },
  signature: 'The talus plunge',
  tvCameras: [
    { section: 'The talus plunge', at: 0.95, side: 'left', distance: 10, height: 12 },
    { section: 'Along the wall', at: 0.7, side: 'right', distance: 10, height: 12 },
  ],
  start: { type: 'elevator', gate: 'paddle', shots: { countdown: 'chase', launch: 'low-chase' } },
  finish: { landmark: 'tepui-falls' },
  designChanges: [
    'Built from the pipe drop (off a timber lift tower against the wall) and the tepui wall, the library layout made for this track (L101): a long traverse along the wall on high supports, passing behind three ribbon falls (looks only; two pegs and a hard slalom), the hairpin in the cloud, S-bends, the talus plunge (the track\'s big feature, Moses\'s rule of 27 Oct 2026: the series\' longest straight drop), a shelf (a peg), a drop through the cloud forest, a wide savanna sweep and the run-in.',
    'The plateau top is scenery only (held sacred by the Pemón): nothing of ours on it, no border markers, no flags.',
    'A hard slalom along the wall (six gates, not four light ones: with those the strongest five won 52% of 3,000 races, target 35 to 50%). The ribbon falls stand beyond the finish, not by the lift (there they stood over the finish line, the lift tower being beside it), and no cairn: the mountain is sacred.',
  ],
  opening: opening('pipe-drop', {
    names: { plunge: 'Down the lift tower' },
  }),
  sections: layout('tepui-wall', {
    costumes: { slalom: 'groundsel', peg: 'groundsel', swipe: 'falcon', parked: 'kick-sled' },
    dress: {
      wall: { height: 10, peak: { zone: 'rock' }, landmarks: [{ name: 'tepui-falls', at: 0.25, side: 'left', distance: 14 }, { name: 'tepui-falls', at: 0.55, side: 'right', distance: 14 }, { name: 'tepui-falls', at: 0.85, side: 'left', distance: 14 }] },
      hairpin: { peak: { zone: 'cloud-forest' } },
      sBends: { peak: { zone: 'cloud-forest' } },
      talus: { peak: { zone: 'rock' } },
      shelf: { peak: { zone: 'cloud-forest' } },
      forestDrop: { peak: { zone: 'cloud-forest' } },
      savanna: { peak: { zone: 'moorland' } },
      spin: { peak: { zone: 'moorland' } },
      lastStraight: { name: 'Across the savanna', peak: { zone: 'moorland' } },
    },
  }),
});
