-- One-time data update: Kraken Deep's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'pinball' pack, not free. Wildness 35 (wild), from its full report's first 1,000 races
-- (overtakes 63.28, lead changes 2.192, obstacle hits 45.24, gap 10.32 s; loops 0,
-- splitters 0, drops 6), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'pinball', is_free = false, wildness_score = 35, wildness = 'wild' WHERE slug = 'kraken-deep';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'kraken-deep';
