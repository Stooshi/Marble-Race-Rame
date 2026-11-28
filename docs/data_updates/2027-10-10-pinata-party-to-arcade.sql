-- One-time data update: Pinata Party's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 48 (extreme), from its full report's first 1,000 races
-- (overtakes 67.02, lead changes 2.41, obstacle hits 60.08, gap 12.71 s; loops 0,
-- splitters 0, drops 4), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 48, wildness = 'extreme' WHERE slug = 'pinata-party';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'pinata-party';
