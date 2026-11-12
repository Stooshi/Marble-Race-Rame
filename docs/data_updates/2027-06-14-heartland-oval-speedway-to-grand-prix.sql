-- One-time data update: Heartland Oval Speedway's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'grand-prix' pack, not free. Wildness 26 (easy), from its full report's first 1,000 races
-- (overtakes 61.48, lead changes 2.085, obstacle hits 53.57, gap 15.32 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'grand-prix', is_free = false, wildness_score = 26, wildness = 'easy' WHERE slug = 'heartland-oval-speedway';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'heartland-oval-speedway';
