'use strict';

/**
 * The images on a track's billboards (drawing only: the race never sees them).
 * The 3D view asks when it loads a track and shows a built-in promotion on any
 * slot this leaves out, or whose image fails to load, so a billboard is never
 * blank and a missing image never holds up a race.
 */
const express = require('express');
const db = require('../db');
const { validate } = require('../utils/validate');

const router = express.Router();
const SLOTS = 6;

/**
 * Picks each slot's image from the rows that apply now: the most specific
 * (this track and this slot, then this track, then this slot on every track,
 * then everywhere), then the newest.
 */
function pickImages(rows, slug) {
  const rank = (r) => (r.track_slug === slug ? 2 : 0) + (r.slot != null ? 1 : 0);
  const out = [];
  for (let slot = 1; slot <= SLOTS; slot += 1) {
    const best = rows
      .filter((r) => (r.track_slug == null || r.track_slug === slug) && (r.slot == null || Number(r.slot) === slot))
      .filter((r) => /^https:\/\/\S+$/.test(r.image_url))
      .sort((a, b) => rank(b) - rank(a) || new Date(b.starts_at) - new Date(a.starts_at))[0];
    if (best) out.push({ slot, image_url: best.image_url, kind: best.kind });
  }
  return out;
}

/** GET /api/billboards?track=slug → { billboards: [{ slot, image_url, kind }] } */
router.get('/', async (req, res) => {
  const q = validate(req.query, { track: { type: 'string', required: true, pattern: /^[a-z0-9-]{2,64}$/ } });
  let rows = [];
  try {
    ({ rows } = await db.query(
      `SELECT track_slug, slot, image_url, kind, starts_at
         FROM billboards
        WHERE (track_slug = $1 OR track_slug IS NULL)
          AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())`,
      [q.track],
    ));
  } catch (err) {
    // Never an error for the game: no images just means the built-in promotions.
    console.error('[billboards] lookup failed:', err.message);
  }
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ billboards: pickImages(rows, q.track) });
});

module.exports = router;
module.exports.pickImages = pickImages;
