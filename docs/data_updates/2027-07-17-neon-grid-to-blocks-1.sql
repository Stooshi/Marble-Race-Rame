-- One-time data update: Neon Grid's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'blocks-1' pack, not free. Wildness 57 (extreme), from its full report's first 1,000 races
-- (overtakes 70.78, lead changes 2.179, obstacle hits 50.3, gap 8.47 s; loops 1,
-- splitters 0, drops 3), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'blocks-1', is_free = false, wildness_score = 57, wildness = 'extreme' WHERE slug = 'neon-grid';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'neon-grid';
