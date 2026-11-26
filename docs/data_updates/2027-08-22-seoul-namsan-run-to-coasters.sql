-- One-time data update: Seoul Namsan Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'coasters' pack, not free. Wildness 63 (extreme), from its full report's first 1,000 races
-- (overtakes 85.49, lead changes 2.206, obstacle hits 57.44, gap 16.5 s; loops 0,
-- splitters 1, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'coasters', is_free = false, wildness_score = 63, wildness = 'extreme' WHERE slug = 'seoul-namsan-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'seoul-namsan-run';
