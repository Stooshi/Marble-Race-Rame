-- One-time data update: Kart Kingdom's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 55 (extreme), from its full report's first 1,000 races
-- (overtakes 70.1, lead changes 2.487, obstacle hits 74.59, gap 12.33 s; loops 1,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 55, wildness = 'extreme' WHERE slug = 'kart-kingdom';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'kart-kingdom';
