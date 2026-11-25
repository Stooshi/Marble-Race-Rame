-- One-time data update: Mexico City Stadium Section's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'grand-prix' pack, not free. Wildness 32 (easy), from its full report's first 1,000 races
-- (overtakes 64.05, lead changes 1.995, obstacle hits 48.8, gap 16.41 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'grand-prix', is_free = false, wildness_score = 32, wildness = 'easy' WHERE slug = 'mexico-city-stadium-section';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'mexico-city-stadium-section';
