-- One-time data update: Moon Base's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'blocks-1' pack, not free. Wildness 60 (extreme), from its full report's first 1,000 races
-- (overtakes 88.18, lead changes 2.143, obstacle hits 72.69, gap 15.53 s; loops 0,
-- splitters 0, drops 3), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'blocks-1', is_free = false, wildness_score = 60, wildness = 'extreme' WHERE slug = 'moon-base';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'moon-base';
