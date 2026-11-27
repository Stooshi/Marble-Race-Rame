-- One-time data update: Jungle Ruins's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'blocks-1' pack, not free. Wildness 45 (wild), from its full report's first 1,000 races
-- (overtakes 78.23, lead changes 2.052, obstacle hits 28.75, gap 10.59 s; loops 0,
-- splitters 0, drops 6), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'blocks-1', is_free = false, wildness_score = 45, wildness = 'wild' WHERE slug = 'jungle-ruins';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'jungle-ruins';
