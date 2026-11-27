-- One-time data update: Amalfi Coast Run's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'coasters' pack, not free. Wildness 51 (extreme), from its full report's first 1,000 races
-- (overtakes 78.77, lead changes 2.049, obstacle hits 46.46, gap 15.26 s; loops 0,
-- splitters 0, drops 3), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'coasters', is_free = false, wildness_score = 51, wildness = 'extreme' WHERE slug = 'amalfi-coast-run';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'amalfi-coast-run';
