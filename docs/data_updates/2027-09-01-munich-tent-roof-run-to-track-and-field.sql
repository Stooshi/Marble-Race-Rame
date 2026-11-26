-- One-time data update: Munich Tent Roof Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'track-and-field' pack, not free. Wildness 60 (extreme), from its full report's first 1,000 races
-- (overtakes 80.42, lead changes 2.446, obstacle hits 60.46, gap 11.61 s; loops 1,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'track-and-field', is_free = false, wildness_score = 60, wildness = 'extreme' WHERE slug = 'munich-tent-roof-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'munich-tent-roof-run';
