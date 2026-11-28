-- One-time data update: Rio Jungle Rumble's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'world-tour' pack, not free. Wildness 47 (extreme), from its full report's first 1,000 races
-- (overtakes 75.11, lead changes 2.078, obstacle hits 37.35, gap 15.35 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'world-tour', is_free = false, wildness_score = 47, wildness = 'extreme' WHERE slug = 'rio-jungle-rumble';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'rio-jungle-rumble';
