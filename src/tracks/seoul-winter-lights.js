'use strict';

// Seoul Winter Lights: Holiday Season 2026 track (Arcade), Track of the Day on 10 December and again
// on 3 January. The city stream on a snowy night drawn as a glowing light-tunnel world: a clean drop
// at the gate, a sweep along the bank, down past snowy stepping stones, a half-pipe along the stream beside a lantern-lit
// bridge, through a tunnel of lights, the hairpin, the lantern bends and
// the last straight to the line.
const { track, opening, straight, sweep, halfPipe, hairpin, sBends, runIn, peg, swipe, curtain, rumble } = require('../trackKit');

module.exports = track({
  slug: 'seoul-winter-lights',
  name: 'Seoul Winter Lights',
  family: 'arcade',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'The city stream on a snowy night as a glowing light-tunnel world: along the bank, past snowy stepping stones, along the stream beside a lantern-lit bridge, through a tunnel of lights and round the hairpin to the line.',
  surface: 'ice',
  biome: 'circuit-board',
  lighting: 'neon-night',
  billboardFrame: 'marquee',
  arcade: { art: 'light-stream', finish: 'WINTER LIGHTS!' },
  signature: 'Stream half-pipe',
  tvCameras: [
    { section: 'Lantern bends', at: 0.5, side: 'right', distance: 8, height: 14 },
    { section: 'Bank sweep', at: 0.4, side: 'left', distance: 8, height: 14 },
  ],
  start: { landmark: 'lantern-bridge', gate: 'stalls', shots: { countdown: 'above', launch: 'high-behind' } },
  finish: { landmark: 'stepping-stones' },
  designChanges: [
    'The stream runs beside the track with snowy stepping stones across it and a low bridge lit with lanterns, all in pixel blocks; the half-pipe runs along the stream beside the bridge (a tunnel cannot close over a half-pipe) and the tunnel of lights comes after it. No named bridges, streets or buildings.',
    'No splitter: every place for one after the hairpin sent the leaders down the same channel (the fairness check), so the lantern bends, under a laser curtain, take its place.',
  ],
  opening: opening('clean-drop', { side: 'left', names: { plunge: 'Light drop', bends: 'Stream bends' } }),
  sections: [
    {
      name: 'Bank sweep', shape: sweep({ side: 'right', radius: 85, degrees: 110, grade: 0.075 }), billboards: 2,
      obstacles: [curtain({ costume: 'laser-curtain', at: 0.5, side: 'left' })],
    },
    {
      name: 'Down to the stream', shape: straight(30, { grade: 0.12 }), billboards: 1,
      landmarks: [{ name: 'stepping-stones', side: 'right', at: 0.5, distance: 16 }],
    },
    {
      name: 'Stream half-pipe', shape: halfPipe({ first: 'left', width: 8, swings: 3, radius: 70, degrees: 30, grade: 0.12 }),
      landmarks: [{ name: 'lantern-bridge', side: 'right', at: 0.5, distance: 20 }],
    },
    { name: 'Tunnel of lights', shape: straight(60, { grade: 0.1 }), tunnel: 'lit-tunnel' },
    {
      name: 'Run to the hairpin', shape: straight(45, { grade: 0.11 }),
      obstacles: [peg({ costume: 'street-lamp', at: 0.2, line: 'center' }), peg({ costume: 'street-lamp', at: 0.45, line: 'left' }), peg({ costume: 'street-lamp', at: 0.7, line: 'right' })],
    },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'toll-boom', side: 'high' })] },
    { name: 'Lantern bends', shape: sBends({ first: 'right', radius: 70, degrees: 100, grade: 0.11 }), obstacles: [curtain({ costume: 'laser-curtain', at: 0.5, side: 'left' })] },
    {
      name: 'Last straight', shape: straight(90, { grade: 0.09 }), billboards: 1,
      obstacles: [peg({ costume: 'street-lamp', at: 0.15, line: 'right' }), peg({ costume: 'street-lamp', at: 0.3, line: 'left' }), peg({ costume: 'street-lamp', at: 0.45, line: 'center' })],
      features: [rumble({ from: 0.65, to: 0.95, count: 3 })],
    },
    { name: 'Finish', shape: runIn() },
  ],
});
