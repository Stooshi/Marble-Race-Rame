-- One-time data update: Sydney Harbour Relay's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'track-and-field' pack, not free. Wildness 42 (wild), from its full report's first 1,000 races
-- (overtakes 63.6, lead changes 2.326, obstacle hits 67.11, gap 15.87 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'track-and-field', is_free = false, wildness_score = 42, wildness = 'wild' WHERE slug = 'sydney-harbour-relay';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'sydney-harbour-relay';
