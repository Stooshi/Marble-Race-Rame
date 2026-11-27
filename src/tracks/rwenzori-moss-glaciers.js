'use strict';

// Rwenzori Moss Glaciers: Peaks track 11, equatorial glaciers melting straight into a cloud forest of
// moss-hung giant heathers and lobelias, in mist and shafts of sun. A funnel drop off the glacier snout (the
// first big feature), a waterfall drop through the curtain of a meltwater fall (the second), a slalom in the mossy
// forest, a boardwalk sweep over the bog, a spiral, the hairpin and S-bends to the finish.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'rwenzori-moss-glaciers',
  name: 'Rwenzori Moss Glaciers',
  family: 'peak',
  difficulty: 'extreme',
  description: 'Equatorial glaciers melting into a misty cloud forest of giant heathers and lobelias: a funnel off the glacier snout, a drop straight through the curtain of a meltwater fall and a slalom in the mossy forest.',
  surface: 'snow',
  biome: 'alpine',
  lighting: 'fog',
  variants: ['day'],
  peak: { palette: 'rwenzori' },
  coaster: { style: 'alpine', colours: { support: '#6a6a5a', rail: '#eef0e4', tie: '#3a3a30' } },
  signature: 'Through the meltwater fall',
  tvCameras: [
    { section: 'Mossy forest slalom', at: 0.3, side: 'left', distance: 10, height: 12 },
    { section: 'Heather spiral', at: 0.9, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'glacier-tongue', type: 'stepped-platform', gate: 'trapdoor', shots: { countdown: 'above', launch: 'side' } },
  finish: { landmark: 'giant-lobelias' },
  designChanges: [
    'Built from the funnel drop (off the glacier snout: the first big feature) and the moss glacier, the library layout made for this track (L99): a straight below the snout (two pegs), a waterfall drop through the curtain of a meltwater fall (the second, Moses\'s rule of 27 Oct 2026), a slalom in the mossy forest, a boardwalk sweep, a spiral, the hairpin, S-bends and the run-in.',
    'Different from Kilimanjaro Five Zones (the other funnel drop): it opens on a waterfall drop, not S-bends on ice.',
    'A longer run-in (105 m): with 90 m the banks of the S-bends reached into the catch area beyond the line. Three kinds of plants and rocks, and on phones the falls\' rocks in one piece: the phone\'s drawing load was 37 calls (target 35).',
  ],
  opening: opening('funnel-drop', {
    names: { plunge: 'Off the glacier snout' },
    dress: { plunge: { peak: { zone: 'ice' } } },
  }),
  sections: layout('moss-glacier', {
    costumes: { slalom: 'groundsel', peg: 'groundsel', swipe: 'falcon', parked: 'kick-sled' },
    dress: {
      snout: { peak: { zone: 'ice' } },
      falls: { peak: { zone: 'rock' } },
      forest: { peak: { zone: 'cloud-forest' }, landmarks: [{ name: 'giant-lobelias', at: 0.5, side: 'left', distance: 22 }] },
      boardwalk: { peak: { zone: 'moorland' } },
      clearing: { peak: { zone: 'cloud-forest' } },
      bogSweep: { peak: { zone: 'moorland' } },
      spin: { peak: { zone: 'cloud-forest' } },
      brakingStraight: { peak: { zone: 'cloud-forest' } },
      hairpin: { peak: { zone: 'cloud-forest' } },
      sBends: { peak: { zone: 'moorland' } },
      lastStraight: { name: 'Through the lobelias', peak: { zone: 'moorland' } },
    },
  }),
});
