-- One-time data update: São Paulo Rain Circuit's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'grand-prix' pack, not free. Wildness 35 (wild), from its full report's first 1,000 races
-- (overtakes 62.1, lead changes 2.096, obstacle hits 54.57, gap 12.38 s; loops 0,
-- splitters 0, drops 2), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'grand-prix', is_free = false, wildness_score = 35, wildness = 'wild' WHERE slug = 'sao-paulo-rain-circuit';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'sao-paulo-rain-circuit';
