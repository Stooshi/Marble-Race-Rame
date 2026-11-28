-- One-time data update: Air Hockey Rink's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 44 (wild), from its full report's first 1,000 races
-- (overtakes 72.33, lead changes 2.483, obstacle hits 61.25, gap 13 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 44, wildness = 'wild' WHERE slug = 'air-hockey-rink';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'air-hockey-rink';
