-- One-time data update: Fishing Frenzy's pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the 'arcade' pack, not free. Wildness 45 (wild), from its full report's first 1,000 races
-- (overtakes 66.92, lead changes 2.588, obstacle hits 68.68, gap 14.89 s; loops 0,
-- splitters 0, drops 0), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = 'arcade', is_free = false, wildness_score = 45, wildness = 'wild' WHERE slug = 'fishing-frenzy';

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = 'fishing-frenzy';
