-- One-time data update: Lapland Ice Race's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'grand-prix' pack, not free. Wildness 29 (easy), from its full report's first 1,000 races
-- (overtakes 61.84, lead changes 1.934, obstacle hits 70.36, gap 13.22 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'grand-prix', is_free = false, wildness_score = 29, wildness = 'easy' WHERE slug = 'lapland-ice-race';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'lapland-ice-race';
