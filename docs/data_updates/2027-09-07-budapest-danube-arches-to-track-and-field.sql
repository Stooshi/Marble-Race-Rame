-- One-time data update: Budapest Danube Arches's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'track-and-field' pack, not free. Wildness 45 (wild), from its full report's first 1,000 races
-- (overtakes 61.53, lead changes 2.733, obstacle hits 77.69, gap 16.92 s; loops 1,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'track-and-field', is_free = false, wildness_score = 45, wildness = 'wild' WHERE slug = 'budapest-danube-arches';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'budapest-danube-arches';
