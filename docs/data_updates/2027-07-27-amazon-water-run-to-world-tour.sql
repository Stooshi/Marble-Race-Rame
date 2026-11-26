-- One-time data update: Amazon Water Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'world-tour' pack, not free. Wildness 30 (easy), from its full report's first 1,000 races
-- (overtakes 61.49, lead changes 1.469, obstacle hits 56.05, gap 17.44 s; loops 0,
-- splitters 0, drops 4), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'world-tour', is_free = false, wildness_score = 30, wildness = 'easy' WHERE slug = 'amazon-water-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'amazon-water-run';
