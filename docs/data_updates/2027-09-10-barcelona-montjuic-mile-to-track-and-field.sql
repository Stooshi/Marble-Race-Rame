-- One-time data update: Barcelona Montjuïc Mile's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'track-and-field' pack, not free. Wildness 48 (extreme), from its full report's first 1,000 races
-- (overtakes 68.25, lead changes 1.916, obstacle hits 57.42, gap 13.79 s; loops 0,
-- splitters 0, drops 6), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'track-and-field', is_free = false, wildness_score = 48, wildness = 'extreme' WHERE slug = 'barcelona-montjuic-mile';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'barcelona-montjuic-mile';
