-- One-time data update: Gold Rush's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 37 (wild), from its full report's first 1,000 races
-- (overtakes 64.19, lead changes 2.463, obstacle hits 67.43, gap 12.48 s; loops 0,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 37, wildness = 'wild' WHERE slug = 'gold-rush';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'gold-rush';
