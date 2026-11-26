-- One-time data update: Tokyo Night Street Race's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'grand-prix' pack, not free. Wildness 37 (wild), from its full report's first 1,000 races
-- (overtakes 63.22, lead changes 1.66, obstacle hits 54.31, gap 14.33 s; loops 0,
-- splitters 1, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'grand-prix', is_free = false, wildness_score = 37, wildness = 'wild' WHERE slug = 'tokyo-night-street-race';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'tokyo-night-street-race';
