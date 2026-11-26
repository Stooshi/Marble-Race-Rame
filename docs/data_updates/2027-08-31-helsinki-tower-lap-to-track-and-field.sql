-- One-time data update: Helsinki Tower Lap's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'track-and-field' pack, not free. Wildness 51 (extreme), from its full report's first 1,000 races
-- (overtakes 82.37, lead changes 2.628, obstacle hits 50.56, gap 15.24 s; loops 0,
-- splitters 1, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'track-and-field', is_free = false, wildness_score = 51, wildness = 'extreme' WHERE slug = 'helsinki-tower-lap';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'helsinki-tower-lap';
