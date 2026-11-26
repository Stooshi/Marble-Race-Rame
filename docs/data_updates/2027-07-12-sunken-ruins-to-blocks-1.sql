-- One-time data update: Sunken Ruins's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'blocks-1' pack, not free. Wildness 17 (easy), from its full report's first 1,000 races
-- (overtakes 65.14, lead changes 1.543, obstacle hits 23.16, gap 11.86 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'blocks-1', is_free = false, wildness_score = 17, wildness = 'easy' WHERE slug = 'sunken-ruins';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'sunken-ruins';
