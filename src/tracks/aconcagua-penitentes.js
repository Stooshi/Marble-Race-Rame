'use strict';

// Aconcagua Penitentes: Peaks track 7, the dry red high desert of the Andes below the peak, a lenticular cloud
// on its top. A banked first turn, a straight down the scree steps, then a half-pipe through a field of penitentes, tall blade-like
// spikes of snow (the track's big feature: the channel widens and the field rocks wall to wall between the
// blades), a drop, a spiral round a red-rock tower, the hairpin and the dry wash to the finish.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'aconcagua-penitentes',
  name: 'Aconcagua Penitentes',
  family: 'peak',
  difficulty: 'extreme',
  description: 'The red Andean high desert below the peak: down the scree steps, a half-pipe rocking wall to wall through a field of penitentes, tall blades of snow, a spiral round a red-rock tower and the dry wash to the finish.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'high-altitude',
  variants: ['day'],
  peak: { palette: 'aconcagua' },
  coaster: { style: 'alpine', colours: { support: '#7a5a4a', rail: '#f2e6da', tie: '#4a3228' } },
  signature: 'Penitente half-pipe',
  tvCameras: [
    { section: 'Penitente half-pipe', at: 0.9, side: 'left', distance: 10, height: 12 },
    { section: 'Dry-wash S-bends', at: 0.5, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'penitentes', type: 'cliff', gate: 'barrier', shots: { countdown: 'above', launch: 'low-chase' } },
  finish: { landmark: 'pass-cairn' },
  designChanges: [
    'Built from the banked first turn and the penitente maze, the library layout made for this track (L95): a straight down the scree (steps and moguls), a straight into the penitentes (a short slalom), the half-pipe through them (the track\'s big feature, Moses\'s rule of 27 Oct 2026), a drop, a spiral round a red-rock tower, the hairpin, a short climb, a drop into the dry wash, S-bends and the run-in.',
    'The penitentes stand beside the half-pipe, never in it (nothing in or over a half-pipe); a pass cairn at the finish, far below the summit, which stays scenery only.',
  ],
  opening: opening('banked-turn', {
    side: 'left',
    names: { plunge: 'Off the red cliff' },
    dress: { plunge: { peak: { zone: 'alpine-desert' } } },
  }),
  sections: layout('penitente-maze', {
    costumes: { slalom: 'nunatak', peg: 'nunatak', swipe: 'falcon', parked: 'kick-sled' },
    dress: {
      scree: { peak: { zone: 'alpine-desert' } },
      intoField: { peak: { zone: 'snow' } },
      halfPipe: { peak: { zone: 'snow' }, landmarks: [{ name: 'penitentes', at: 0.3, side: 'left', distance: 30 }, { name: 'penitentes', at: 0.75, side: 'right', distance: 30 }] },
      drop: { peak: { zone: 'alpine-desert' } },
      tower: { peak: { zone: 'alpine-desert' } },
      brakingStraight: { peak: { zone: 'alpine-desert' } },
      hairpin: { name: 'Condor hairpin', peak: { zone: 'alpine-desert' } },
      rise: { peak: { zone: 'alpine-desert' } },
      washDrop: { peak: { zone: 'alpine-desert' } },
      wash: { peak: { zone: 'alpine-desert' } },
      lastStraight: { name: 'Down the dry wash', peak: { zone: 'alpine-desert' } },
    },
  }),
});
