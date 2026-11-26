-- One-time data update: Portes du Soleil Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'world-tour' pack, not free. Wildness 45 (wild), from its full report's first 1,000 races
-- (overtakes 65.33, lead changes 1.767, obstacle hits 51.73, gap 16.73 s; loops 0,
-- splitters 0, drops 4), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'world-tour', is_free = false, wildness_score = 45, wildness = 'wild' WHERE slug = 'portes-du-soleil-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'portes-du-soleil-run';
