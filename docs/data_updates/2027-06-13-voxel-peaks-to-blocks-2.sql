-- One-time data update: Voxel Peaks moves from the Blocks 1 pack to Blocks 2 (Moses, 12 Nov 2026).
--
-- Snowy mountains built of cubes: a real-looking landscape like the Blocks Series 2 tracks (Tre Cime, Rainier,
-- Kinabalu, Svalbard), where the rest of Blocks 1 is the game-world look (score walls, line clears, portals).
-- Blocks 2 then has 20 tracks in its pack (Lisbon free besides) and Blocks 1 has 12. Locks nothing: locking is
-- the TRACK_PACKS switch, off. No one owns a pack yet, so no owner is moved. src/packs/list.js (BLOCKS_2) matches.

UPDATE tracks SET pack_key = 'blocks-2' WHERE slug = 'voxel-peaks' AND pack_key = 'blocks-1';

SELECT p.name AS pack, count(t.*) FILTER (WHERE t.is_free) AS free, count(t.*) FILTER (WHERE NOT t.is_free) AS in_pack
  FROM track_packs p LEFT JOIN tracks t ON t.pack_key = p.key WHERE p.series = 'Blocks' GROUP BY p.name, p.sort ORDER BY p.sort;
