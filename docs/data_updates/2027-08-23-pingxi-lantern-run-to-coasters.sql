-- One-time data update: Pingxi Lantern Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'coasters' pack, not free. Wildness 40 (wild), from its full report's first 1,000 races
-- (overtakes 63.09, lead changes 2.311, obstacle hits 55.7, gap 12.73 s; loops 0,
-- splitters 0, drops 7), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'coasters', is_free = false, wildness_score = 40, wildness = 'wild' WHERE slug = 'pingxi-lantern-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'pingxi-lantern-run';
