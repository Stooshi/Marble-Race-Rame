-- One-time data update: Doha Desert Sprint's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'track-and-field' pack, not free. Wildness 34 (wild), from its full report's first 1,000 races
-- (overtakes 69.89, lead changes 2.015, obstacle hits 39.95, gap 15.36 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'track-and-field', is_free = false, wildness_score = 34, wildness = 'wild' WHERE slug = 'doha-desert-sprint';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'doha-desert-sprint';
