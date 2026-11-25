-- One-time data update: Clockwork Works's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'blocks-1' pack, not free. Wildness 39 (wild), from its full report's first 1,000 races
-- (overtakes 67.6, lead changes 2.143, obstacle hits 45.91, gap 14.01 s; loops 0,
-- splitters 1, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'blocks-1', is_free = false, wildness_score = 39, wildness = 'wild' WHERE slug = 'clockwork-works';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'clockwork-works';
