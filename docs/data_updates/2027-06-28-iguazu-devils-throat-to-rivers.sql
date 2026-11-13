-- One-time data update: Iguazú Devil's Throat's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'rivers' pack, not free. Wildness 52 (extreme), from its full report's first 1,000 races
-- (overtakes 69.01, lead changes 1.543, obstacle hits 63.62, gap 15.16 s; loops 0,
-- splitters 1, drops 9), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'rivers', is_free = false, wildness_score = 52, wildness = 'extreme' WHERE slug = 'iguazu-devils-throat';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'iguazu-devils-throat';
