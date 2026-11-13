-- One-time data update: Rocky Mountain Hill Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'grand-prix' pack, not free. Wildness 42 (wild), from its full report's first 1,000 races
-- (overtakes 69.97, lead changes 1.492, obstacle hits 68.71, gap 16.56 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'grand-prix', is_free = false, wildness_score = 42, wildness = 'wild' WHERE slug = 'rocky-mountain-hill-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'rocky-mountain-hill-run';
