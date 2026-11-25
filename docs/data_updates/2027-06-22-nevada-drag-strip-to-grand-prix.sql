-- One-time data update: Nevada Drag Strip's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'grand-prix' pack, not free. Wildness 63 (extreme), from its full report's first 1,000 races
-- (overtakes 67.9, lead changes 1.873, obstacle hits 88.56, gap 16.92 s; loops 1,
-- splitters 0, drops 3), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'grand-prix', is_free = false, wildness_score = 63, wildness = 'extreme' WHERE slug = 'nevada-drag-strip';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'nevada-drag-strip';
