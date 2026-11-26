-- One-time data update: Bavarian Castle Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'coasters' pack, not free. Wildness 34 (wild), from its full report's first 1,000 races
-- (overtakes 63.86, lead changes 1.477, obstacle hits 51.21, gap 14.24 s; loops 0,
-- splitters 1, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'coasters', is_free = false, wildness_score = 34, wildness = 'wild' WHERE slug = 'bavarian-castle-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'bavarian-castle-run';
