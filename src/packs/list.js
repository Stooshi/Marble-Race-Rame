'use strict';

/**
 * The track packs and the free set (Moses, 11 Nov 2026; project doc claude/wildness-and-free-set-proposal.md).
 * The data update 2027-06-10-wildness-and-track-packs.sql was made from this (scripts/wildness-sql.js);
 * change a pack or the free set with a new data update, and here.
 *
 * Every live track of a series (not the season tracks, not the Classic ones) is in its series' pack;
 * the free ones (FREE) race for everyone always. Blocks is two packs: Blocks 1 (the first fifteen,
 * Oct 2026) and Blocks 2 (Blocks Series 2, BLOCKS_2).
 */

const PACKS = [
  { key: 'grand-prix', name: 'Grand Prix', series: 'Grand Prix' },
  { key: 'world-tour', name: 'World Tour', series: 'World Tour' },
  { key: 'coasters', name: 'Coasters', series: 'Coasters' },
  { key: 'canyons', name: 'Canyons', series: 'Canyons' },
  { key: 'blocks-1', name: 'Blocks 1', series: 'Blocks' },
  { key: 'blocks-2', name: 'Blocks 2', series: 'Blocks' },
  { key: 'track-and-field', name: 'Track and Field', series: 'Track and Field' },
  { key: 'rivers', name: 'Rivers', series: 'Rivers' },
  { key: 'peaks', name: 'Peaks', series: 'Peaks' },
  { key: 'pinball', name: 'Pinball', series: 'Pinball' },
  { key: 'arcade', name: 'Arcade', series: 'Arcade' },
];

/** Blocks Series 2 (data updates 2027-05-10 to 2027-05-29): the Blocks 2 pack. */
const BLOCKS_2 = [
  'li-river-karst-run', 'venice-cube-canals', 'niagara-cube-falls', 'tre-cime-cube-towers', 'abisko-aurora-run',
  'kyoto-block-gardens', 'marrakesh-cube-souk', 'singapore-block-gardens', 'lisbon-cube-hills', 'douro-block-terraces',
  'loire-chateau-run', 'vltava-bridges-run', 'torres-del-paine-block-run', 'rainier-ice-block-run', 'kinabalu-cube-summit',
  'kirkjufell-block-falls', 'baikal-clear-ice', 'svalbard-glacier-run', 'yellowstone-frost-run', 'abraham-lake-frost',
];

/**
 * The free set: four or five per series, the best-looking, about half Easy and half Wild, with most of
 * the Extreme tracks kept in the packs (Moses, 11 Nov 2026).
 */
const FREE = {
  'Grand Prix': ['dubai-marble-grand-prix', 'nairobi-marble-grand-prix', 'delhi-red-fort-marble-grand-prix', 'sydney-marble-grand-prix'],
  'World Tour': ['are-run', 'paris-eiffel-tower-run', 'amazon-water-run', 'china-wall-twister', 'saint-tropez'],
  Coasters: ['chiang-mai', 'collserola-run', 'hong-kong-crossing', 'ha-long-bay-spins'],
  Canyons: ['antelope-slot-spins', 'indus-spins', 'copper-spins', 'verdon-burst', 'grand-canyon-burst'],
  Blocks: ['magma-core', 'spawn-point', 'singapore-block-gardens', 'niagara-cube-falls', 'lisbon-cube-hills'],
  'Track and Field': ['bislett-mile', 'marble-stadium-sprint', 'beijing-nest-200', 'london-steeplechase'],
  Rivers: ['danube-night-run', 'volga-port-burst', 'irrawaddy-balloon-dawn', 'rhine-castle-run', 'ganges-dawn-run'],
  Peaks: ['everest-icefall-run', 'aconcagua-penitentes', 'vatnajokull-blue-cave', 'kilimanjaro-five-zones', 'mont-blanc-needle-ridge'],
  Pinball: ['tilt', 'multiball-manor', 'flipper-spins', 'slingshot-spins'],
  Arcade: ['bullet-hell', 'final-round-spin', 'checkpoint-rush', 'kill-screen'],
};

/** The pack key of a live track of `series`. */
function packFor(slug, series) {
  if (series === 'Blocks') return BLOCKS_2.includes(slug) ? 'blocks-2' : 'blocks-1';
  return PACKS.find((p) => p.series === series)?.key ?? null;
}

const isFree = (slug) => Object.values(FREE).some((l) => l.includes(slug));

module.exports = { PACKS, BLOCKS_2, FREE, packFor, isFree };
