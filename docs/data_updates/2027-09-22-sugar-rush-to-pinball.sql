-- One-time data update: Sugar Rush's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 59 (extreme), from its full report's first 1,000 races
-- (overtakes 69.03, lead changes 2.53, obstacle hits 69.18, gap 12.48 s; loops 1,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 59, wildness = 'extreme' WHERE slug = 'sugar-rush';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'sugar-rush';
