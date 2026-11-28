-- One-time data update: Taroko Marble Gorge's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'canyons' pack, not free. Wildness 46 (wild), from its full report's first 1,000 races
-- (overtakes 71.51, lead changes 2.225, obstacle hits 44.63, gap 11.21 s; loops 0,
-- splitters 1, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'canyons', is_free = false, wildness_score = 46, wildness = 'wild' WHERE slug = 'taroko-marble-gorge';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'taroko-marble-gorge';
