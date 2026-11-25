-- One-time data update: Tianmen Heaven's Gate's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'peaks' pack, not free. Wildness 41 (wild), from its full report's first 1,000 races
-- (overtakes 69.86, lead changes 2.116, obstacle hits 37.3, gap 8.65 s; loops 1,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'peaks', is_free = false, wildness_score = 41, wildness = 'wild' WHERE slug = 'tianmen-heavens-gate';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'tianmen-heavens-gate';
