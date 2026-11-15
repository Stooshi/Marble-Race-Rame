-- One-time data update: Etna Valle del Bove's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'peaks' pack, not free. Wildness 50 (extreme), from its full report's first 1,000 races
-- (overtakes 79.16, lead changes 1.965, obstacle hits 54.73, gap 13.78 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'peaks', is_free = false, wildness_score = 50, wildness = 'extreme' WHERE slug = 'etna-valle-del-bove';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'etna-valle-del-bove';
