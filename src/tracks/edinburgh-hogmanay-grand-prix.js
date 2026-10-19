'use strict';

// Edinburgh Hogmanay Grand Prix: Holiday Season 2026 track (Grand Prix), Track of the Day on 30 December.
// New Year's Eve night under the castle on its crag, fireworks bursting over the castle all race long:
// down the castle esplanade's bowl, through the old town's narrow wynds of tall stone houses, round the
// castle rock and down the long street to a finish under the fireworks.
const { track, opening, halfPipe, straight, sBends, sweep, spiral, splitter, hairpin, plunge, runIn, peg, slalom, swipe, rumble } = require('../trackKit');

module.exports = track({
  slug: 'edinburgh-hogmanay-grand-prix',
  name: 'Edinburgh Hogmanay Grand Prix',
  season: 'holiday-2026',
  difficulty: 'extreme',
  description: 'New Year\'s Eve night under the castle on its crag, fireworks bursting over it all race long: through the old town\'s narrow wynds of tall stone houses, round the castle rock and down the long street to a finish under the fireworks.',
  surface: 'stone',
  biome: 'city',
  lighting: 'fireworks-night',
  variants: ['snow'],
  grandPrix: { crowd: 'fans', barrier: 'stone', groupsEvery: 600 },
  signature: 'Royal mile half-pipe',
  billboardFrame: 'plain',
  tvCameras: [
    { section: 'Castle rock sweep', at: 0.5, side: 'left', distance: 8, height: 14 },
    { section: 'Old town wynds', at: 0.5, side: 'right', distance: 8, height: 14 },
  ],
  start: { landmark: 'church', gate: 'stalls', shots: { countdown: 'side', launch: 'side' } },
  finish: { scenery: ['grandstand', 'stone-houses'] },
  designChanges: [
    'A funnel drop down the castle esplanade at the gate (a bowl with a pile-up and a slalom) rather than the planned clean drop, which leaves the field too spread out for its overtakes.',
    'The castle is a generic castle on a crag of dark rock (no flags or emblems); the fireworks burst over it all race long (the fireworks-night sky, looks only). No names on anything drawn.',
  ],
  opening: opening('funnel-drop', { costumes: { block: 'stone-block', slalom: 'street-lamp' }, names: { plunge: 'Esplanade bowl' } }),
  sections: [
    { name: 'Royal mile half-pipe', shape: halfPipe({ first: 'right', width: 8, swings: 3, radius: 70, degrees: 30, grade: 0.12 }), scenery: ['stone-houses'], landmarks: [{ name: 'castle-rock', side: 'left', at: 0.5, distance: 70 }] },
    { name: 'Wynd straight', shape: straight(70, { grade: 0.12 }), scenery: ['stone-houses'], billboards: 1 },
    {
      name: 'Castle rock sweep', shape: sweep({ side: 'right', radius: 90, degrees: 130, grade: 0.09 }), billboards: 2,
    },
    { name: 'Run to the hairpin', shape: straight(45, { grade: 0.12 }), obstacles: [peg({ costume: 'street-lamp', at: 0.15, line: 'center' }), peg({ costume: 'street-lamp', at: 0.32, line: 'left' }), peg({ costume: 'street-lamp', at: 0.5, line: 'right' })] },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [swipe({ costume: 'camera-crane', side: 'high' })] },
    { name: 'Old town wynds', shape: sBends({ first: 'left', radius: 60, degrees: 85, grade: 0.12 }), scenery: ['stone-houses'], billboards: 2 },
    { name: 'Close spiral', shape: spiral({ side: 'right', radius: 44, turns: 1.1, grade: 0.19 }), around: 'clocktower' },
    { name: 'Long street', shape: straight(100, { grade: 0.13 }), scenery: ['stone-houses', 'grandstand'], obstacles: [peg({ costume: 'street-lamp', at: 0.1, line: 'center' }), peg({ costume: 'street-lamp', at: 0.22, line: 'left' }), peg({ costume: 'street-lamp', at: 0.34, line: 'right' })], features: [rumble({ from: 0.6, to: 0.95, count: 3 })] },
    { name: 'Finish', shape: runIn(), scenery: ['grandstand'] },
  ],
});
