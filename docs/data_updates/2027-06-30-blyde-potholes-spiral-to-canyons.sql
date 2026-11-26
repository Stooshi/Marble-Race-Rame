-- One-time data update: Blyde Potholes Spiral's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'canyons' pack, not free. Wildness 46 (wild), from its full report's first 1,000 races
-- (overtakes 69.42, lead changes 1.716, obstacle hits 51.11, gap 16.03 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'canyons', is_free = false, wildness_score = 46, wildness = 'wild' WHERE slug = 'blyde-potholes-spiral';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'blyde-potholes-spiral';
