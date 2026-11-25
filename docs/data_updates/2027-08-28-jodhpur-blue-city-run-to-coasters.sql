-- One-time data update: Jodhpur Blue City Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'coasters' pack, not free. Wildness 27 (easy), from its full report's first 1,000 races
-- (overtakes 61.4, lead changes 2.03, obstacle hits 31.85, gap 16.17 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'coasters', is_free = false, wildness_score = 27, wildness = 'easy' WHERE slug = 'jodhpur-blue-city-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'jodhpur-blue-city-run';
