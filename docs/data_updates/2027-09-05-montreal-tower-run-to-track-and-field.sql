-- One-time data update: Montreal Tower Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'track-and-field' pack, not free. Wildness 63 (extreme), from its full report's first 1,000 races
-- (overtakes 76.89, lead changes 2.497, obstacle hits 66, gap 12.32 s; loops 1,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'track-and-field', is_free = false, wildness_score = 63, wildness = 'extreme' WHERE slug = 'montreal-tower-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'montreal-tower-run';
