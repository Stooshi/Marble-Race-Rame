-- One-time data update: Cappadocia Balloon Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'world-tour' pack, not free. Wildness 34 (wild), from its full report's first 1,000 races
-- (overtakes 61.65, lead changes 1.839, obstacle hits 47.26, gap 17.17 s; loops 0,
-- splitters 0, drops 3), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'world-tour', is_free = false, wildness_score = 34, wildness = 'wild' WHERE slug = 'cappadocia-balloon-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'cappadocia-balloon-run';
