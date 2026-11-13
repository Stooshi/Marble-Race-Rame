'use strict';

/**
 * The track packs and the free set (Moses, 11 Nov 2026; project doc claude/wildness-and-free-set-proposal.md).
 * The data update 2027-06-10-wildness-and-track-packs.sql was made from this (scripts/wildness-sql.js, with
 * the first free set of 45); the free set of 30 by 2027-06-11-free-set-of-30.sql, of 15 by 2027-06-23-free-set-of-15.sql. Change a pack or the free set
 * with a new data update, and here.
 *
 * Every live track of a series (not the season tracks, not the Classic ones) is in its series' pack;
 * the free ones (FREE) race for everyone always. Blocks is two packs: Blocks 1 (the first fifteen,
 * Oct 2026, less Voxel Peaks) and Blocks 2 (Blocks Series 2 and Voxel Peaks, BLOCKS_2).
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

/**
 * The Blocks 2 pack: Blocks Series 2 (data updates 2027-05-10 to 2027-05-29) and Voxel Peaks from Blocks 1, a
 * real-looking landscape of cubes like the Series 2 tracks, so the pack has 20 tracks besides its free one
 * (Moses, 12 Nov 2026; data update 2027-06-13-voxel-peaks-to-blocks-2.sql).
 */
const BLOCKS_2 = [
  'li-river-karst-run', 'venice-cube-canals', 'niagara-cube-falls', 'tre-cime-cube-towers', 'abisko-aurora-run',
  'kyoto-block-gardens', 'marrakesh-cube-souk', 'singapore-block-gardens', 'lisbon-cube-hills', 'douro-block-terraces',
  'loire-chateau-run', 'vltava-bridges-run', 'torres-del-paine-block-run', 'rainier-ice-block-run', 'kinabalu-cube-summit',
  'kirkjufell-block-falls', 'baikal-clear-ice', 'svalbard-glacier-run', 'yellowstone-frost-run', 'abraham-lake-frost',
  'voxel-peaks',
];

/**
 * The free set: 15 (Moses, 13 Nov 2026, by voice: "15 free now", Claude to pick the best 15 of the 30). One per
 * series where the pack is nearest 20 (Grand Prix, World Tour, Canyons, Rivers, Peaks: two each back in the
 * pack, so Grand Prix reaches 20 with its motorsport tracks), two in the others (Coasters, Track and Field,
 * Pinball, Arcade, Blocks: one each back; Blocks keeps Lisbon so Blocks 2 stays at exactly 20). Each series'
 * best-looking track (the one on its landing-page card) stays free; 7 Easy, 6 Wild, 2 Extreme. Data update
 * 2027-06-23-free-set-of-15.sql. (Before: 30, three per series, 2027-06-11-free-set-of-30.sql; first 45.)
 */
const FREE = {
  'Grand Prix': ['frostmere-marble-grand-prix'],
  'World Tour': ['san-francisco'],
  Coasters: ['hong-kong-crossing', 'chiang-mai'],
  Canyons: ['grand-canyon-burst'],
  Blocks: ['spawn-point', 'lisbon-cube-hills'],
  'Track and Field': ['marble-stadium-sprint', 'london-steeplechase'],
  Rivers: ['danube-night-run'],
  Peaks: ['everest-icefall-run'],
  Pinball: ['flipper-spins', 'tilt'],
  Arcade: ['checkpoint-rush', 'bullet-hell'],
};

/** The pack key of a live track of `series`. */
function packFor(slug, series) {
  if (series === 'Blocks') return BLOCKS_2.includes(slug) ? 'blocks-2' : 'blocks-1';
  return PACKS.find((p) => p.series === series)?.key ?? null;
}

const isFree = (slug) => Object.values(FREE).some((l) => l.includes(slug));

module.exports = { PACKS, BLOCKS_2, FREE, packFor, isFree };
