-- One-time data update: Eiger North Face's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'peaks' pack, not free. Wildness 43 (wild), from its full report's first 1,000 races
-- (overtakes 84.59, lead changes 2.252, obstacle hits 44.42, gap 11.28 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'peaks', is_free = false, wildness_score = 43, wildness = 'wild' WHERE slug = 'eiger-north-face';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'eiger-north-face';
