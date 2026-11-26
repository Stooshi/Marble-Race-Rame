-- One-time data update: the free set of 15 (Moses, 13 Nov 2026: "15 free now"; Claude picked the 15 of the 30).
--
-- One free track in the series whose pack is nearest 20 (Grand Prix, World Tour, Canyons, Rivers, Peaks), two in
-- the others (Coasters, Track and Field, Pinball, Arcade, Blocks); each series' landing-page track stays free.
-- The 15 others go back into their packs: Sydney and Sahara (Grand Prix), Åre Run and Amazon Water Run (World
-- Tour), Antelope Slot Spins and Waimea Free Fall (Canyons), Irrawaddy Balloon Dawn and Congo Rapids Burst
-- (Rivers), Vatnajökull Blue Cave and Roraima Cloud Falls (Peaks), Pyramid Run (Coasters), Beijing Nest 200
-- (Track and Field), Multiball Manor (Pinball), Joystick Spins (Arcade), Magma Core (Blocks 1).
-- Locks nothing: locking is the TRACK_PACKS switch, off. Season tracks (no pack) are not touched.
-- (Runs after 2027-06-11-free-set-of-30, which it replaces; src/packs/list.js FREE.)

UPDATE tracks SET is_free = (slug IN (
  'frostmere-marble-grand-prix',
  'san-francisco',
  'hong-kong-crossing',
  'chiang-mai',
  'grand-canyon-burst',
  'spawn-point',
  'lisbon-cube-hills',
  'marble-stadium-sprint',
  'london-steeplechase',
  'danube-night-run',
  'everest-icefall-run',
  'flipper-spins',
  'tilt',
  'checkpoint-rush',
  'bullet-hell'
))
 WHERE pack_key IS NOT NULL;

SELECT p.name AS pack, count(t.*) FILTER (WHERE t.is_free) AS free, count(t.*) FILTER (WHERE NOT t.is_free) AS in_pack
  FROM track_packs p LEFT JOIN tracks t ON t.pack_key = p.key GROUP BY p.name, p.sort ORDER BY p.sort;
