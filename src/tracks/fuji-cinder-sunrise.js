'use strict';

// Fuji Cinder Sunrise: Peaks track 6, down the volcano's flank of black and red cinder below the snowcap at
// sunrise, above a sea of clouds. Three pairs of steep banked switchbacks, each pair wider than the last (the
// track's big feature), a fly-out over the sea of clouds and the plunge off its end into the pine forest, then a
// lakeside run-in. The summit, its crater and shrines are never shown up close: a smooth far cone; no torii.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'fuji-cinder-sunrise',
  name: 'Fuji Cinder Sunrise',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Down the volcano\'s black and red cinder at sunrise: three pairs of steep banked switchbacks, each wider than the last, a fly-out over the sea of clouds, the plunge into the pine forest and a run-in by the lake.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'dawn',
  variants: ['day'],
  peak: { palette: 'fuji' },
  coaster: { style: 'alpine', colours: { support: '#6a5a52', rail: '#f0e6dc', tie: '#3a2e2a' } },
  signature: 'First switchbacks',
  tvCameras: [
    { section: 'Third switchbacks', at: 0.85, side: 'right', distance: 10, height: 12 },
    { section: 'Pine forest sweep', at: 0.6, side: 'left', distance: 10, height: 12 },
  ],
  start: { landmark: 'cinder-cones', type: 'curving-lift', gate: 'paddle', shots: { countdown: 'front', launch: 'look-back' } },
  finish: { landmark: 'glacial-lake', scenery: ['sea-of-clouds'] },
  designChanges: [
    'Built from the staggered drop and the cinder switchbacks, the library layout made for this track (L94): a short straight across the cinder field (a peg), three pairs of steep banked switchbacks down the cinder, each wider than the last (the track\'s big feature, Moses\'s rule of 27 Oct 2026), a straight flying out over the sea of clouds (a short slalom), the plunge off its end into the forest, the hairpin, a forest sweep and the run-in by the lake.',
    'The summit is a smooth far cone only: its crater and shrines are never shown up close; no torii, no religious objects anywhere (the Peaks rules).',
  ],
  opening: opening('staggered-drop', {
    names: { plunge: 'Off the lift' },
    dress: { plunge: { peak: { zone: 'black-sand' }, landmarks: [{ name: 'cinder-cones', at: 0.5, side: 'right', distance: 45 }] } },
  }),
  sections: layout('cinder-switchbacks', {
    costumes: { slalom: 'nunatak', peg: 'nunatak', swipe: 'falcon', parked: 'kick-sled' },
    dress: {
      switch1: { peak: { zone: 'black-sand' } },
      switch2: { peak: { zone: 'black-sand' } },
      switch3: { peak: { zone: 'black-sand' }, landmarks: [{ name: 'cinder-cones', at: 0.5, side: 'left', distance: 50 }] },
      cloudSea: { height: 12, peak: { zone: 'black-sand' }, scenery: ['sea-of-clouds'] },
      plunge: { peak: { zone: 'cloud-forest' } },
      brakingStraight: { peak: { zone: 'cloud-forest' } },
      hairpin: { name: 'Forest hairpin', peak: { zone: 'cloud-forest' } },
      forest: { name: 'Pine forest sweep', peak: { zone: 'cloud-forest' } },
      lastStraight: { name: 'By the lake', peak: { zone: 'cloud-forest' }, landmarks: [{ name: 'glacial-lake', at: 0.5, side: 'right', distance: 50 }] },
    },
  }),
});
