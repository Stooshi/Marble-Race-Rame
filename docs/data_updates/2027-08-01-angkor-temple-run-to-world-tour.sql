-- One-time data update: Angkor Temple Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'world-tour' pack, not free. Wildness 51 (extreme), from its full report's first 1,000 races
-- (overtakes 66.88, lead changes 2.057, obstacle hits 55.43, gap 16.65 s; loops 0,
-- splitters 0, drops 4), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'world-tour', is_free = false, wildness_score = 51, wildness = 'extreme' WHERE slug = 'angkor-temple-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'angkor-temple-run';
