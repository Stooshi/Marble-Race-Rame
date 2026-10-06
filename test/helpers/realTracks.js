'use strict';

// The real tracks and marbles, read straight from the seed SQL and data updates.
const fs = require('fs');
const path = require('path');

const DOCS = path.resolve(__dirname, '../../docs');
const sqlText = () => [path.join(DOCS, 'database_schema.sql'), ...fs.readdirSync(path.join(DOCS, 'data_updates')).sort().map((f) => path.join(DOCS, 'data_updates', f))]
  .map((f) => fs.readFileSync(f, 'utf8')).join('\n');

/** The classic tracks (those on the new physics, like Bobsleigh Run, are left out: see physicsTracks.js). */
function realTracks() {
  const re = /\('([a-z-]+)',\s*'[^']*',\s*(?:'[^']*',\s*)?'(easy|medium|hard|extreme)',\s*(\d+),\s*(\d+),\s*(?:'(?:[^']|'')*',\s*)?'(\[[^']*\])',\s*'(\[[^']*\])'/g;
  const tracks = new Map();
  for (const m of sqlText().matchAll(re)) {
    tracks.set(m[1], { slug: m[1], difficulty: m[2], length_m: Number(m[3]), lane_count: Number(m[4]), waypoints: JSON.parse(m[5]), obstacles: JSON.parse(m[6]) });
  }
  const { PHYSICS_TRACKS } = require('../../src/game/physicsTracks');
  return [...tracks.values()].filter((t) => !PHYSICS_TRACKS.some((p) => p.slug === t.slug));
}

/** The seeded marble catalog: { slug, topSpeed, acceleration, handling, luck }. */
function realMarbles() {
  const re = /\('([a-z-]+)',\s*'[^']*',\s*'(?:[^']|'')*',\s*'#[0-9A-Fa-f]{6}',\s*(?:'#[0-9A-Fa-f]{6}'|NULL),\s*'[a-z-]+',\s*'[a-z]+',\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/g;
  const marbles = new Map();
  for (const m of sqlText().matchAll(re)) {
    marbles.set(m[1], { slug: m[1], topSpeed: Number(m[2]), acceleration: Number(m[3]), handling: Number(m[4]), luck: Number(m[5]) });
  }
  return [...marbles.values()];
}

module.exports = { realTracks, realMarbles };
