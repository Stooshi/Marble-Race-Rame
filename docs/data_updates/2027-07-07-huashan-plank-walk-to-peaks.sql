-- One-time data update: Huashan Plank Walk's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'peaks' pack, not free. Wildness 20 (easy), from its full report's first 1,000 races
-- (overtakes 62.68, lead changes 1.369, obstacle hits 33.38, gap 15.89 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'peaks', is_free = false, wildness_score = 20, wildness = 'easy' WHERE slug = 'huashan-plank-walk';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'huashan-plank-walk';
