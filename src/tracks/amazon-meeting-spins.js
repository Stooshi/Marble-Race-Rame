'use strict';

// Amazon Meeting Spins: Rivers track 6, where a black-water river meets a sandy one and the two run side
// by side for miles without mixing. Down from a pier, out on stilts along the line between the two
// waters, a lagoon of giant lily pads, a village of floating houses, round a river island and in to the dock.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'amazon-meeting-spins',
  name: 'Amazon Meeting Spins',
  family: 'river',
  difficulty: 'extreme',
  description: 'The meeting of the waters: out on stilts along the line where a dark river and a sandy one run side by side without mixing, rocking through a lagoon of giant lily pads, past a village of floating houses and round a river island.',
  surface: 'ice',
  biome: 'jungle',
  lighting: 'day',
  variants: ['sunset'],
  river: { palette: 'amazon', side: 'left', width: 150, banks: 'reeds' },
  coaster: { colours: { support: '#5a4632', rail: '#f2e8d4', tie: '#3a2c20' } },
  signature: 'On the meeting of the waters',
  start: { landmark: 'toucan-tree', type: 'pier', gate: 'trapdoor', shots: { countdown: 'above', launch: 'low-chase' } },
  finish: { landmark: 'river-dock' },
  designChanges: [
    'Built from the funnel drop (down from the pier) and the two waters, the library layout made for this track: a straight and a sweep flying along the seam between the dark and the sandy river, the lily-pad lagoon (a half-pipe), S-bends past the floating houses, a drop, the hairpin, a spiral round a river island, a short climb and the run-in.',
    'The river is two colours side by side, black water and sandy water, a pale line of swirls where they meet and wavelets across both, so it reads as water from the follow camera; where the track flies over it the line runs right under the track (looks only). Reed-brown banks, not sand, so the sandy water never reads as a beach.',
    'No stilt houses or waterfalls (Amazon Water Run has those): the floating houses ride on log rafts on the river.',
    'Tuned on the layout\'s test track: the first draft raced a 55.1 s winner and the front starting group finished too high (10.1), so the seam straight is shorter (85 m) with two pegs and two slalom poles early and the moguls after them (three pegs there made its first 20 seconds the same as Kali Gandaki Burst\'s), the island spiral is 0.65 of a turn (0.85), the seam sweep steeper (0.12) and the run-in 75 m (85).',
  ],
  opening: opening('funnel-drop', {
    costumes: { block: 'log', slalom: 'river-stake' },
    names: { plunge: 'Down from the pier' },
    dress: { plunge: { height: 0, river: 'left' } },
  }),
  sections: layout('two-waters', {
    costumes: { slalom: 'river-stake', peg: 'mooring-pole', swipe: 'falcon', parked: 'river-raft' },
    dress: {
      seam: { name: 'On the meeting of the waters', height: 8, river: 'under' },
      seamSweep: { name: 'Along the line', height: 8, river: 'under', landmarks: [{ name: 'lily-pads', at: 0.6, river: true, distance: 30 }] },
      lagoonRunIn: { name: 'Into the lagoon', height: 0, river: 'right' },
      lagoon: { name: 'Lily-pad lagoon', height: 0, river: 'right', landmarks: [{ name: 'lily-pads', at: 0.25, river: true, distance: 50 }, { name: 'lily-pads', at: 0.7, river: true, distance: 50 }] },
      village: { name: 'Floating village', height: 0, river: 'right', landmarks: [{ name: 'floating-houses', at: 0.5, river: true, distance: 40 }] },
      drop: { name: 'Down to the channel', height: 0, river: 'right' },
      brakingStraight: { name: 'Run to the hairpin', height: 0, river: 'right' },
      hairpin: { name: 'Falcon hairpin', height: 0, river: 'none' },
      island: { name: 'Round the river island', height: 0, river: 'right', scenery: ['river-palms'] },
      rise: { name: 'Up the bank', height: 0, river: 'left' },
      lastStraight: { name: 'Run to the dock', height: 0, river: 'left', landmarks: [{ name: 'floating-houses', at: 0.4, river: true, distance: 40 }] },
    },
  }),
});
