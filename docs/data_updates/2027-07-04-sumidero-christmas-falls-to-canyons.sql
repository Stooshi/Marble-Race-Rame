-- One-time data update: Sumidero Christmas Falls's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'canyons' pack, not free. Wildness 61 (extreme), from its full report's first 1,000 races
-- (overtakes 81.74, lead changes 2.312, obstacle hits 52.86, gap 9.75 s; loops 0,
-- splitters 1, drops 8), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'canyons', is_free = false, wildness_score = 61, wildness = 'extreme' WHERE slug = 'sumidero-christmas-falls';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'sumidero-christmas-falls';
