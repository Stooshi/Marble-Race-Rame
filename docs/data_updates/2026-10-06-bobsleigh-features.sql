-- One-time data update: Bobsleigh Run's boost pads, speed bumps and obstacles.
--
-- Adds the track's features (physics.features): two speed bumps that make the
-- field hop, two boost pads with yellow-and-black chevrons, and four themed
-- obstacles marbles really collide with: two ice blocks, a snowman, icicles
-- hanging from a frosty beam and a polar bear swiping its paw into the
-- channel on a fixed timetable (the same for everyone). They run on the new
-- physics from physics-preview-3 (src/game/trackFeatures.js); placed where
-- marbles' lines actually run, measured on hundreds of races, and checked on
-- 3,000 races for fairness.
--
-- With the ice blocks knocking marbles about just before the splitter, its
-- wedge moves to dead centre (fork.tipOffset 0, was -1.2 m) so the field still
-- splits evenly between the two channels, and the inside channel's ice is a
-- little less rough (fork.insideScrub 8.25, was 11) so marbles from either
-- channel win their fair share.
--
-- Changes only these settings of Bobsleigh Run (in tracks.physics). Races
-- already decided keep the replay stored when they were decided. Nothing else
-- is touched.

UPDATE tracks
   SET physics = jsonb_set(jsonb_set(jsonb_set(physics, '{fork,tipOffset}', '0'::jsonb), '{fork,insideScrub}', '8.25'::jsonb), '{features}', '[{"type":"bump","at":0.06},{"type":"ice_block","at":0.19,"l":0.75,"radius":0.7,"height":1.1},{"type":"ice_block","at":0.205,"l":-0.85,"radius":0.7,"height":1.1},{"type":"boost","at":0.445,"l":-0.2,"length":8,"halfWidth":1.3},{"type":"snowman","at":0.52,"l":0.45,"radius":0.8,"height":2.2},{"type":"polar_bear","at":0.675,"l":-1.25,"reach":-0.75,"radius":0.6,"height":1.5},{"type":"icicles","at":0.718,"l":-0.62,"radius":0.35},{"type":"icicles","at":0.721,"l":-0.42,"radius":0.35},{"type":"boost","at":0.73,"l":-0.85,"length":8,"halfWidth":1.3},{"type":"bump","at":0.93}]'::jsonb, true)
 WHERE slug = 'bobsleigh-run'
   AND physics IS NOT NULL;

SELECT count(*) AS bobsleigh_features_added
  FROM tracks
 WHERE slug = 'bobsleigh-run' AND jsonb_array_length(physics -> 'features') > 0;
