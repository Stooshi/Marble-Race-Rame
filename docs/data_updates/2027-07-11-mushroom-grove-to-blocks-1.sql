-- One-time data update: Mushroom Grove's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'blocks-1' pack, not free. Wildness 24 (easy), from its full report's first 1,000 races
-- (overtakes 63.7, lead changes 1.838, obstacle hits 25.45, gap 12.17 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'blocks-1', is_free = false, wildness_score = 24, wildness = 'easy' WHERE slug = 'mushroom-grove';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'mushroom-grove';
