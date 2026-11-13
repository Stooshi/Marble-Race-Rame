-- One-time data update: Chao Phraya Dawn Spiral's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'rivers' pack, not free. Wildness 28 (easy), from its full report's first 1,000 races
-- (overtakes 70.74, lead changes 1.681, obstacle hits 27.01, gap 12.84 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'rivers', is_free = false, wildness_score = 28, wildness = 'easy' WHERE slug = 'chao-phraya-dawn-spiral';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'chao-phraya-dawn-spiral';
