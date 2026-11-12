-- One-time data update: the free set of 30 (Moses, 12 Nov 2026; claude/free-set-30-proposal.md).
--
-- Three free tracks per series instead of four or five (2027-06-10-wildness-and-track-packs set 45): a good
-- sample of looks and places, mostly Easy and Wild, two Extreme in all. Every other series track is its pack's.
-- Locks nothing: locking is the TRACK_PACKS switch, off. Season tracks (no pack) are not touched.

UPDATE tracks SET is_free = (slug IN (
  'frostmere-marble-grand-prix',
  'sydney-marble-grand-prix',
  'sahara-marble-grand-prix',
  'san-francisco',
  'are-run',
  'amazon-water-run',
  'hong-kong-crossing',
  'chiang-mai',
  'pyramid-run',
  'grand-canyon-burst',
  'antelope-slot-spins',
  'waimea-free-fall',
  'spawn-point',
  'magma-core',
  'lisbon-cube-hills',
  'marble-stadium-sprint',
  'beijing-nest-200',
  'london-steeplechase',
  'danube-night-run',
  'irrawaddy-balloon-dawn',
  'congo-rapids-burst',
  'everest-icefall-run',
  'vatnajokull-blue-cave',
  'roraima-cloud-falls',
  'flipper-spins',
  'tilt',
  'multiball-manor',
  'checkpoint-rush',
  'bullet-hell',
  'joystick-spins'
))
 WHERE pack_key IS NOT NULL;

SELECT p.name AS pack, count(t.*) FILTER (WHERE t.is_free) AS free, count(t.*) FILTER (WHERE NOT t.is_free) AS in_pack
  FROM track_packs p LEFT JOIN tracks t ON t.pack_key = p.key GROUP BY p.name, p.sort ORDER BY p.sort;
