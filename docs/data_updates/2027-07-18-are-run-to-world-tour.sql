-- One-time data update: Åre Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'world-tour' pack, not free. Wildness 43 (wild), from its full report's first 1,000 races
-- (overtakes 72.98, lead changes 2.129, obstacle hits 36.74, gap 9.99 s; loops 0,
-- splitters 0, drops 4), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'world-tour', is_free = false, wildness_score = 43, wildness = 'wild' WHERE slug = 'are-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'are-run';
