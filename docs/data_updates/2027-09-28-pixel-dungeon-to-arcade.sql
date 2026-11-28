-- One-time data update: Pixel Dungeon's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 37 (wild), from its full report's first 1,000 races
-- (overtakes 64.37, lead changes 2.575, obstacle hits 63.25, gap 12.32 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 37, wildness = 'wild' WHERE slug = 'pixel-dungeon';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'pixel-dungeon';
