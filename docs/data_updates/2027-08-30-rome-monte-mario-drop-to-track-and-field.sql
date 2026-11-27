-- One-time data update: Rome Monte Mario Drop's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'track-and-field' pack, not free. Wildness 41 (wild), from its full report's first 1,000 races
-- (overtakes 81.46, lead changes 2.275, obstacle hits 37.76, gap 13 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'track-and-field', is_free = false, wildness_score = 41, wildness = 'wild' WHERE slug = 'rome-monte-mario-drop';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'rome-monte-mario-drop';
