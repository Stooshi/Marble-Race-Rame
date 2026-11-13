-- One-time data update: Tokyo Night Street Race's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'grand-prix' pack, not free. Wildness 34 (wild), from its full report's first 1,000 races
-- (overtakes 63.84, lead changes 1.589, obstacle hits 52.73, gap 14.74 s; loops 1,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'grand-prix', is_free = false, wildness_score = 34, wildness = 'wild' WHERE slug = 'tokyo-night-street-race';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'tokyo-night-street-race';
