-- One-time data update: Half Dome Granite Slabs's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'peaks' pack, not free. Wildness 31 (easy), from its full report's first 1,000 races
-- (overtakes 68.32, lead changes 1.976, obstacle hits 34.54, gap 13.22 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'peaks', is_free = false, wildness_score = 31, wildness = 'easy' WHERE slug = 'half-dome-granite-slabs';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'half-dome-granite-slabs';
