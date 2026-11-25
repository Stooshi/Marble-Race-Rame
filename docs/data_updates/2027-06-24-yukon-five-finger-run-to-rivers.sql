-- One-time data update: Yukon Five Finger Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'rivers' pack, not free. Wildness 46 (wild), from its full report's first 1,000 races
-- (overtakes 71.53, lead changes 1.938, obstacle hits 53.7, gap 13.04 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'rivers', is_free = false, wildness_score = 46, wildness = 'wild' WHERE slug = 'yukon-five-finger-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'yukon-five-finger-run';
