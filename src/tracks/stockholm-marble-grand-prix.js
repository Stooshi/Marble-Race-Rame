'use strict';

// Stockholm Marble Grand Prix, its own layout (Moses, 6 Nov 2026: approved as planned in
// claude/grand-prix-relayout-plan.md). Until then it was the same track as Sydney and Lagos
// (the Grand Prix recipe of 10 Oct 2026, mirrored); now a split start down the Södermalm cliffs,
// over the Katarina crest and down the Slussen drop (the big feature), through Gamla Stan and round
// it by the splitter, past City Hall and round Djurgården to the steamboats on Strandvägen. Its
// records started again with the new layout (tracks.records_since).
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'stockholm-marble-grand-prix',
  name: 'Stockholm Marble Grand Prix',
  difficulty: 'extreme',
  description: 'A home race across Stockholm\'s islands and bridges: twin chutes down the Södermalm cliffs, over the Katarina crest and down the Slussen drop to the water, round Gamla Stan on both sides, past City Hall and round Djurgården to the steamboats on Strandvägen.',
  surface: 'asphalt',
  biome: 'city',
  lighting: 'day',
  variants: ['sunset', 'midnight-sun'],
  grandPrix: true,
  signature: 'Slussen drop',
  tvCameras: [
    // (At the foot of the drop, looking back up it with Södermalm behind.)
    { section: 'Slussen drop', at: 0.95, side: 'right', distance: 6, height: 6 },
    { section: 'Gamla Stan splitter', at: 0.6, side: 'right', distance: 6, height: 5 },
  ],
  billboardFrame: 'plain',
  start: { scenery: ['colourful-houses'], gate: 'paddle', shots: { countdown: 'chase', launch: 'low-chase' } },
  finish: { landmark: 'steamboats', scenery: ['grandstand'] },
  designChanges: [
    'A new layout (6 Nov 2026): until then Stockholm was physically the same track as Sydney and Lagos Marble Grand Prix (the Grand Prix recipe, mirrored), so on one seed the three ran the same race. Its old signature, the Bridge sweep, was the same piece as Lagos\'s Lagoon bridge and goes.',
    'The split start (twin chutes down the Södermalm cliffs, merging again at Slussen): no other Grand Prix track opens this way, and its start shots (a chase, then a low chase) are its own.',
    'The rest is the library\'s climb-drop layout, mirrored, as proven on its test track: no live track uses it. Its big feature is the Slussen drop, a short climb over the Katarina crest and a 60 m drop with a slalom down to the water; its second, a splitter round Gamla Stan, its tip moved so its two channels share the wins fairly.',
  ],
  opening: opening('split-start', {
    costumes: { block: 'tyre-stack', slalom: 'traffic-cone' },
    names: { plunge: 'Södermalm plunge', chutes: 'Södermalm twin chutes', after: 'Down to Slussen' },
    dress: { plunge: { scenery: ['colourful-houses'] }, chutes: { scenery: ['colourful-houses'] } },
  }),
  sections: layout('climb-drop', {
    mirror: true,
    costumes: { peg: 'traffic-cone', slalom: 'traffic-cone', swipe: 'camera-crane' },
    dress: {
      sweep: { name: 'Riddarfjärden sweep', scenery: ['crowd'] },
      approach: { name: 'Run to the climb' },
      climb: { name: 'Katarina crest', scenery: ['colourful-houses'] },
      drop: { name: 'Slussen drop', scenery: ['colourful-houses'] },
      sBends: { name: 'Gamla Stan S-bends', scenery: ['merchant-houses', 'crowd'], landmarks: [{ name: 'royal-palace', at: 0.7, side: 'right', distance: 34 }] },
      // (The tip moved: the field comes out of the Gamla Stan S-bends on the left and the leaders took the right-hand
      // channel more often than their share; -1.6 here, given for the unmirrored layout, evened it out over 600 races.)
      splitter: { name: 'Gamla Stan splitter', balance: { tipOffset: -1.6, left: { drag: 2.9, scrub: 2.9 }, right: { drag: 0.42, scrub: 0.72 } }, around: 'river-island', landmarks: [{ name: 'harbour', at: 0.5, side: 'left', distance: 24 }] },
      brakingStraight: { name: 'Run to City Hall', landmarks: [{ name: 'city-hall', at: 0.9, side: 'right', distance: 36 }] },
      hairpin: { name: 'City Hall hairpin' },
      spiral: { name: 'Djurgården spiral', scenery: ['birches'], landmarks: [{ name: 'vasa-museum', at: 0.6, side: 'left', distance: 30 }] },
      lastStraight: { name: 'Strandvägen', scenery: ['grandstand', 'haussmann'] },
    },
  }),
});
