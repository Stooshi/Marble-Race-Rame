'use strict';

// Hong Kong Crossing: off Victoria Peak above the skyline, low over the harbour, then the
// longest flight of the series high across the sea on the tallest supports, alongside the
// great sea bridge (a backdrop only, not a copy of its engineering), round a sea islet,
// past the port cranes and through a lit tunnel to the Zhuhai waterfront.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'hong-kong-crossing',
  name: 'Hong Kong Crossing',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster from Victoria Peak across the sea to the mainland: low over the harbour, then high across the open sea on the tallest supports of the series beside the great sea bridge, round a green islet and in to the Zhuhai waterfront.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'day',
  coaster: { height: 20, colours: { support: '#5a6a7a', rail: '#e8eef2', tie: '#2a2d32' } },
  signature: 'Sea crossing',
  start: { landmark: 'victoria-peak', type: 'rooftop', gate: 'barrier', shots: { countdown: 'front', launch: 'side' } },
  finish: { landmark: 'zhuhai-waterfront', billboards: 1 },
  designChanges: [
    'Built from the split start (the first drop off the Peak through tumbling shipping containers and harbour bollards, down two chutes that merge) and sea crossing, the library layout made for this track: harbour S-bends, the long crossing, the island spin, the hairpin, a drop through the bridge tunnel, the waterfront bends, a sweep along the Pearl River estuary and a run home past harbour bollards. Its landmark moments are the design\'s: Victoria Peak and the skyline behind the lift hill, the harbour swoops, the sea crossing on the tallest supports beside the sea bridge with cargo ships below, the spin round a green islet, the container crane at the hairpin, the lit bridge tunnel and the Zhuhai waterfront station.',
    'The sea bridge is a backdrop far out to the side, a long deck with three cable-stayed towers, not a copy of the real bridge.',
    'The junk boat\'s sail is not a swipe on the harbour swoops (the layout puts its one swipe at the hairpin, the crane); the tour coach is parked on the promenade, not on the track.',
    'No splitter: one late on this layout could not be balanced (the leaders all took one channel), and the design asks for none. Harbour bollards stand on the run home instead.',
  ],
  opening: opening('split-start', {
    costumes: { block: 'shipping-container', slalom: 'bollard' },
    names: { plunge: 'Lift hill and first drop', chutes: 'Twin chutes', after: 'Down to the harbour' },
    dress: { plunge: { height: 22 }, chutes: { height: 18 }, after: { height: 12 } },
  }),
  sections: layout('sea-crossing', {
    costumes: { swipe: 'container-crane', peg: 'bollard' },
    dress: {
      sBends: { name: 'Harbour swoops', height: 6, water: true },
      crossing: { name: 'Sea crossing', height: 45, water: true, landmarks: [{ name: 'sea-bridge', at: 0.5, side: 'right', distance: 160 }] },
      spiral: { name: 'Island spin', height: 22, water: true, around: 'sea-islet' },
      brakingStraight: { name: 'Port run', height: 14, landmarks: [{ name: 'port-cranes', at: 0.5, side: 'left', distance: 45 }] },
      hairpin: { name: 'Crane hairpin', height: 12 },
      tunnelRun: { name: 'Bridge tunnel', tunnel: 'lit-tunnel' },
      sBends2: { name: 'Waterfront bends', height: 16 },
      sweep: { name: 'Pearl River sweep', height: 20, water: true },
      lastStraight: { name: 'Zhuhai run', height: 3 },
    },
  }),
});
