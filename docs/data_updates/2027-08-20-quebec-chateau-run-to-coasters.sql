-- One-time data update: Quebec Château Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'coasters' pack, not free. Wildness 49 (extreme), from its full report's first 1,000 races
-- (overtakes 73.74, lead changes 2.008, obstacle hits 48.04, gap 9.41 s; loops 0,
-- splitters 0, drops 3), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'coasters', is_free = false, wildness_score = 49, wildness = 'extreme' WHERE slug = 'quebec-chateau-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'quebec-chateau-run';
