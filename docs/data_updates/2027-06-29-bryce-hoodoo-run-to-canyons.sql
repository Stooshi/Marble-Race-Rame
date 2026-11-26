-- One-time data update: Bryce Hoodoo Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'canyons' pack, not free. Wildness 12 (easy), from its full report's first 1,000 races
-- (overtakes 62.9, lead changes 1.372, obstacle hits 37.41, gap 14.65 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'canyons', is_free = false, wildness_score = 12, wildness = 'easy' WHERE slug = 'bryce-hoodoo-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'bryce-hoodoo-run';
