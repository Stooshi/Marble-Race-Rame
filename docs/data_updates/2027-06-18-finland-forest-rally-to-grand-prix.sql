-- One-time data update: Finland Forest Rally's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'grand-prix' pack, not free. Wildness 41 (wild), from its full report's first 1,000 races
-- (overtakes 68.96, lead changes 2.051, obstacle hits 39.17, gap 14.23 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'grand-prix', is_free = false, wildness_score = 41, wildness = 'wild' WHERE slug = 'finland-forest-rally';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'finland-forest-rally';
