-- One-time data update: Gold Coast Surf Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'coasters' pack, not free. Wildness 52 (extreme), from its full report's first 1,000 races
-- (overtakes 76.89, lead changes 2.449, obstacle hits 71.74, gap 17.4 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'coasters', is_free = false, wildness_score = 52, wildness = 'extreme' WHERE slug = 'gold-coast-surf-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'gold-coast-surf-run';
