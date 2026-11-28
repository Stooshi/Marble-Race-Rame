-- One-time data update: Rhythm Rush's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 51 (extreme), from its full report's first 1,000 races
-- (overtakes 66.53, lead changes 2.311, obstacle hits 66.9, gap 11.11 s; loops 1,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 51, wildness = 'extreme' WHERE slug = 'rhythm-rush';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'rhythm-rush';
