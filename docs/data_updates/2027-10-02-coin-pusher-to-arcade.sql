-- One-time data update: Coin Pusher's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 48 (extreme), from its full report's first 1,000 races
-- (overtakes 66.25, lead changes 2.637, obstacle hits 66.82, gap 12.55 s; loops 0,
-- splitters 0, drops 4), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 48, wildness = 'extreme' WHERE slug = 'coin-pusher';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'coin-pusher';
