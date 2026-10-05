'use strict';

/**
 * Physics preview (beta): a race on the new physics, run on demand for any
 * track and seed, to watch in 3D. Nothing is saved and real races are not
 * affected: they still use the classic simulator.
 */
const zlib = require('zlib');
const express = require('express');
const db = require('../db');
const { validate } = require('../utils/validate');
const { notFound } = require('../utils/httpError');
const { createRng } = require('../game/rng');
const { subSeed } = require('../game/simulator');
const { simulatePhysicsRace, PHYSICS_VERSION } = require('../game/physicsSimulator');
const { PREVIEW_TRACKS, previewTrack } = require('../game/previewTracks');

const router = express.Router();
const FIELD = 20;
const cache = new Map(); // a few recent previews, so replays and reloads are instant

/** GET /api/physics/tracks — tracks that exist only in the physics preview. */
router.get('/tracks', (_req, res) => {
  res.json({
    tracks: PREVIEW_TRACKS.map((t) => ({
      slug: t.slug, name: t.name, difficulty: t.difficulty, description: t.description,
      length_m: t.length_m, lane_count: t.lane_count, preview: true,
    })),
  });
});

/** GET /api/physics/preview?track=slug&seed=123&level=3 */
router.get('/preview', async (req, res) => {
  const q = validate(req.query, {
    track: { type: 'string', required: true, pattern: /^[a-z0-9-]{2,64}$/ },
    seed: { type: 'int', min: 0, max: 2_147_483_647 },
    level: { type: 'int', min: 2, max: 3 },
  });
  const seed = q.seed ?? 1;
  const level = q.level ?? 3;
  const key = `${q.track}:${seed}:${level}`;
  if (!cache.has(key)) {
    // Preview-only tracks live in code; the real tracks come from the database.
    let track = previewTrack(q.track);
    if (!track) {
      ({ rows: [track] } = await db.query(
        `SELECT id, slug, name, difficulty, length_m, lane_count, waypoints, obstacles
           FROM tracks WHERE slug = $1 AND is_active`, [q.track],
      ));
    }
    if (!track) throw notFound('Track not found');
    const { rows: catalog } = await db.query(
      `SELECT id, slug, name, color_primary, color_secondary, pattern, top_speed, acceleration, handling, luck
         FROM marbles WHERE is_active ORDER BY slug`,
    );
    // A field of house marbles drawn from the catalog, and their lanes, from the seed.
    const rng = createRng(subSeed(seed, 3));
    const picked = rng.shuffle([...catalog]).slice(0, FIELD);
    const lanes = rng.shuffle(picked.map((_, i) => i));
    const field = picked.map((m, i) => ({ marble: m, lane: lanes[i] })).sort((a, b) => a.lane - b.lane);
    const sim = simulatePhysicsRace({
      seed,
      level,
      track: { ...track, length_m: Number(track.length_m) },
      entries: field.map(({ marble: m, lane }) => ({
        id: m.id, lane, topSpeed: m.top_speed, acceleration: m.acceleration, handling: m.handling, luck: m.luck,
      })),
    });
    const body = {
      preview: true,
      physics: PHYSICS_VERSION,
      level,
      raceId: null,
      name: 'Physics preview',
      track: {
        id: track.id, slug: track.slug, name: track.name, difficulty: track.difficulty,
        length_m: Number(track.length_m), lane_count: track.lane_count, waypoints: track.waypoints, obstacles: track.obstacles,
        ...(track.physics && { physics: track.physics, sections: track.sections, preview: true }),
      },
      entries: field.map(({ marble: m, lane }, index) => ({
        index, entryId: m.id, lane, isBot: true, user: null,
        marble: { id: m.id, slug: m.slug, name: m.name, color_primary: m.color_primary, color_secondary: m.color_secondary, pattern: m.pattern },
      })),
      seed,
      durationMs: sim.durationMs,
      tickMs: sim.tickMs,
      tickRateHz: sim.tickRateHz,
      results: sim.results,
      events: sim.events,
      frames: sim.frames,
      stats: sim.stats,
    };
    const json = Buffer.from(JSON.stringify(body));
    if (cache.size >= 24) cache.delete(cache.keys().next().value);
    cache.set(key, { json, gzip: zlib.gzipSync(json) }); // ~650 KB of frames squeeze to ~150 KB
  }
  const { json, gzip } = cache.get(key);
  res.set('Cache-Control', 'no-store'); // the physics changes while we tune it
  res.set('Vary', 'Accept-Encoding');
  res.type('application/json');
  if (/\bgzip\b/.test(req.get('Accept-Encoding') || '')) {
    res.set('Content-Encoding', 'gzip');
    res.send(gzip);
  } else {
    res.send(json);
  }
});

module.exports = router;
