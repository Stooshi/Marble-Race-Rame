-- One-time data update: Prize Wheel's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 47 (extreme), from its full report's first 1,000 races
-- (overtakes 65.54, lead changes 2.31, obstacle hits 60.53, gap 13.38 s; loops 0,
-- splitters 0, drops 4), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 47, wildness = 'extreme' WHERE slug = 'prize-wheel';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'prize-wheel';
