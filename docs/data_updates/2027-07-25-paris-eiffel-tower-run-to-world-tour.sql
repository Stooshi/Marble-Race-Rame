-- One-time data update: Paris Eiffel Tower Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'world-tour' pack, not free. Wildness 32 (easy), from its full report's first 1,000 races
-- (overtakes 66.15, lead changes 1.748, obstacle hits 49.37, gap 15.24 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'world-tour', is_free = false, wildness_score = 32, wildness = 'easy' WHERE slug = 'paris-eiffel-tower-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'paris-eiffel-tower-run';
