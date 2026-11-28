'use strict';

// Chobe River Run: Rivers track 16, the Chobe in Botswana at sunset: a wide river across the floodplain, elephants
// and hippos on the banks, riverboats on the water. Down from a lift by the bank, a floodplain straight, the splitter
// round a river island (the track's big feature: two channels curving round it), S-bends past the
// elephants, a drop to the water, the hairpin by the hippos, a spiral round a sandbank and the run-in to the landing.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'chobe-river-run',
  name: 'Chobe River Run',
  family: 'river',
  difficulty: 'extreme',
  description: 'The Chobe in Botswana at sunset: across the floodplain, splitting round a river island, past elephants on the bank, down to the water by the hippos and round a sandbank to the riverboat landing.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'sunset',
  variants: ['day'],
  river: { palette: 'chobe', side: 'left', width: 150, banks: 'grass', slope: 0.8, gap: 10 },
  coaster: { colours: { support: '#5a4a3a', rail: '#f2e8d4', tie: '#3a3028' } },
  signature: 'Round the island',
  tvCameras: [
    { section: 'Round the island', at: 0.95, side: 'right', distance: 10, height: 12 },
    { section: 'Sandbank spiral', at: 0.8, side: 'right', distance: 10, height: 12 },
  ],
  start: { landmark: 'hippo-pool', type: 'spiral-tower', gate: 'barrier', shots: { countdown: 'side', launch: 'side' } },
  finish: { landmark: 'river-cruiser' },
  designChanges: [
    'Built from the funnel drop and the island channels, the library layout made for this track (L104): a floodplain straight (two pegs, a short slalom), the splitter round a river island (the track\'s big feature, Moses\'s rule of 27 Oct 2026: two channels curving round it), S-bends past the elephants, a drop to the water, the hairpin, a spiral round a sandbank and the run-in.',
    'The riverboats and the animals on the banks are looks only; the island\'s two channels are proven to share the field and the wins (its test track).',
    'The island\'s channels curve 40° round it (first drafts 150°, 110°, 90°): on a longer curve the outside channel lost places on average yet won more than its share, the leaders taking it; at 40°, with its ice a little faster and the inside one\'s rougher, both lines pass.',
    'A longer run-in to the landing (105 m): with the island at 40° the finish came beside another stretch, whose bank stood in the catch area.',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'log', slalom: 'river-stake' },
    names: { plunge: 'Down to the river' },
    dress: { plunge: { height: 0, river: 'left' } },
  }),
  sections: layout('island-channels', {
    costumes: { slalom: 'river-stake', peg: 'mooring-pole', swipe: 'elephant', parked: 'safari-jeep' },
    dress: {
      floodplain: { name: 'Across the floodplain', height: 0, river: 'left', landmarks: [{ name: 'river-cruiser', at: 0.5, river: true, distance: 40 }] },
      splitter: { height: 8, river: 'under', landmarks: [{ name: 'hippo-pool', at: 0.5, river: true, distance: 30 }] },
      elephants: { height: 0, river: 'left', landmarks: [{ name: 'elephant-herd', at: 0.5, side: 'right', distance: 22 }] },
      drop: { height: 0, river: 'left' },
      brakingStraight: { height: 0, river: 'left' },
      hairpin: { height: 0, river: 'none' },
      sandbank: { height: 0, river: 'right' },
      lastStraight: { name: 'To the landing', height: 0, river: 'left', landmarks: [{ name: 'river-cruiser', at: 0.4, river: true, distance: 40 }] },
    },
  }),
});
