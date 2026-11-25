-- One-time data update: Greenland Expedition's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'world-tour' pack, not free. Wildness 44 (wild), from its full report's first 1,000 races
-- (overtakes 74.5, lead changes 1.788, obstacle hits 37.11, gap 14.81 s; loops 0,
-- splitters 0, drops 5), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'world-tour', is_free = false, wildness_score = 44, wildness = 'wild' WHERE slug = 'greenland-expedition';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'greenland-expedition';
