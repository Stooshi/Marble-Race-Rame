-- One-time data update: Hudson Highlands Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'rivers' pack, not free. Wildness 32 (easy), from its full report's first 1,000 races
-- (overtakes 66.63, lead changes 1.452, obstacle hits 25.15, gap 17.54 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'rivers', is_free = false, wildness_score = 32, wildness = 'easy' WHERE slug = 'hudson-highlands-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'hudson-highlands-run';
