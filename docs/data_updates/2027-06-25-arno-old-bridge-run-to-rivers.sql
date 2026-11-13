-- One-time data update: Arno Old Bridge Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'rivers' pack, not free. Wildness 42 (wild), from its full report's first 1,000 races
-- (overtakes 70.82, lead changes 1.483, obstacle hits 53.37, gap 16.6 s; loops 0,
-- splitters 1, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'rivers', is_free = false, wildness_score = 42, wildness = 'wild' WHERE slug = 'arno-old-bridge-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'arno-old-bridge-run';
