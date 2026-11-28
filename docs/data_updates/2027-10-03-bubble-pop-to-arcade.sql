-- One-time data update: Bubble Pop's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 62 (extreme), from its full report's first 1,000 races
-- (overtakes 65.84, lead changes 2.468, obstacle hits 59.96, gap 16.33 s; loops 1,
-- splitters 0, drops 4), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 62, wildness = 'extreme' WHERE slug = 'bubble-pop';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'bubble-pop';
