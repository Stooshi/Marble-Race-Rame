-- One-time data update: Dubai Twister's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'world-tour' pack, not free. Wildness 39 (wild), from its full report's first 1,000 races
-- (overtakes 70.27, lead changes 1.795, obstacle hits 35.7, gap 16 s; loops 0,
-- splitters 0, drops 4), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'world-tour', is_free = false, wildness_score = 39, wildness = 'wild' WHERE slug = 'dubai-twister';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'dubai-twister';
