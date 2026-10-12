'use strict';

// Nanjing: a coaster sweeping down from Purple Mountain past Nanjing's monuments to the
// Yangtze. Launched from its station below the Sun Yat-sen Mausoleum's long stairway, swoops
// through the golden ginkgo woods, a dive through the old city wall at the Zhonghua Gate, a
// long sweep high over Xuanwu Lake, a spin over the lantern-lit Confucius Temple quarter, a
// temple guardian at the hairpin and the run-in to the river by the great bridge.
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'nanjing',
  name: 'Nanjing',
  family: 'coaster',
  difficulty: 'extreme',
  description: 'A coaster launched from below the Sun Yat-sen Mausoleum on Purple Mountain: through golden ginkgo woods, diving through the old city wall at the Zhonghua Gate, high over Xuanwu Lake, round the lantern-lit Confucius Temple and down to the Yangtze by the great river bridge.',
  surface: 'ice',
  biome: 'meadow',
  lighting: 'sunset',
  coaster: { height: 16, colours: { support: '#a8322a', rail: '#ece6d6', tie: '#3a3d44' } },
  signature: 'Zhonghua Gate',
  start: { landmark: 'sun-yat-sen-mausoleum', scenery: ['pines'], type: 'station-launch', gate: 'paddle', shots: { countdown: 'side', launch: 'overhead' } },
  finish: { landmark: 'yangtze-bridge', billboards: 0 },
  designChanges: [
    'Launched from the station rather than off a lift hill (the varied starts: a station launch, with the boost-launch opening): the field drops from the gate past fallen stone lions, is fired along the launch strip and plunges through a slalom of ginkgo trees. The mausoleum\'s stairway climbs the mountain behind the station.',
    'Built from the boost-launch opening and wall dive, the library layout made for this track. The design\'s seven fixed sections are replaced by the layout, as decided for the coaster series; its landmark moments stay: the mausoleum behind the start, the swoops through the ginkgo woods, the dive through the old city wall at the Zhonghua Gate, the sweep high over Xuanwu Lake, the spin over the Confucius Temple quarter, the temple guardian at the hairpin and the river bridge at the finish.',
    'The spin comes before the hairpin, not after it: the layout keeps the sharp bend late.',
    'The river ferry is a small boat tied up at the edge of the run-in, beside the Yangtze; the great bridge is a stylised backdrop, not a copy of its engineering.',
  ],
  opening: opening('boost-launch', {
    costumes: { block: 'stone-lion', slalom: 'ginkgo' },
    names: { drop: 'Out of the station', launch: 'Launch', plunge: 'Down the mountain' },
    dress: { drop: { height: 14 }, launch: { height: 16 }, plunge: { height: 22 } },
  }),
  sections: layout('wall-dive', {
    costumes: { slalom: 'ginkgo', swipe: 'temple-guardian', parked: 'river-ferry', peg: 'ginkgo' },
    dress: {
      swoops: { name: 'Purple Mountain swoops', height: 8, landmarks: [{ name: 'ginkgo-grove', at: 0.5, side: 'right', distance: 32 }] },
      slalomRun: { name: 'Ginkgo slalom', height: 6 },
      tunnelRun: { name: 'Zhonghua Gate', tunnel: 'city-wall', height: 0, billboards: 0, landmarks: [{ name: 'zhonghua-gate', at: 0.5, side: 'left', distance: 40 }] },
      sBends: { name: 'City streets', height: 12 },
      sweep: { name: 'Xuanwu Lake sweep', height: 28, water: true, landmarks: [{ name: 'lake-pagodas', at: 0.5, side: 'right', distance: 70 }] },
      spiral: { name: 'Confucius spin', height: 14, around: 'confucius-temple' },
      brakingStraight: { name: 'Run to the hairpin', height: 8 },
      hairpin: { name: 'Guardian hairpin', height: 10 },
      lastStraight: { name: 'Run-in to the river', height: 3 },
    },
  }),
});
