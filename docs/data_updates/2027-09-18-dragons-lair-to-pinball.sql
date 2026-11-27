-- One-time data update: Dragon's Lair's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 61 (extreme), from its full report's first 1,000 races
-- (overtakes 75.02, lead changes 2.675, obstacle hits 59.79, gap 10.76 s; loops 1,
-- splitters 0, drops 1), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 61, wildness = 'extreme' WHERE slug = 'dragons-lair';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'dragons-lair';
