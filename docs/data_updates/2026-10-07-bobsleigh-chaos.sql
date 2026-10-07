-- One-time data update: Bobsleigh Run's obstacles rebuilt for chaos.
--
-- The obstacles now stand where the pack actually rides, and marbles really
-- slam into them and ricochet (physics-preview-4): three ice blocks across the
-- start plunge for the first pile-up, a curtain of icicles across the high line
-- on the drop to the corkscrew, a busier polar bear at the hairpin and a
-- snowman in the middle of the final plunge. Three wide boost pads give a
-- burst you can see; the speed bumps stay.
--
-- The pile-ups change who reaches the splitter on which line, so its settings
-- are re-balanced (on thousands of races): the wedge stands 0.7 m towards the
-- inside, the inside channel's ice is smooth (insideScrub 1) and the outside's
-- draggier (outsideDrag 1.7), so each channel wins its fair share.
--
-- Changes only these settings of Bobsleigh Run (in tracks.physics). Races
-- already decided keep the replay stored when they were decided. Nothing else
-- is touched.

UPDATE tracks
   SET physics = jsonb_set(jsonb_set(jsonb_set(jsonb_set(physics,
         '{fork,tipOffset}', '0.7'::jsonb),
         '{fork,insideScrub}', '1'::jsonb),
         '{fork,outsideDrag}', '1.7'::jsonb),
         '{features}', '[{"type":"ice_block","at":0.056,"l":-0.35,"radius":0.75,"height":1.2},{"type":"ice_block","at":0.056,"l":0.35,"radius":0.75,"height":1.2},{"type":"ice_block","at":0.068,"l":0,"radius":0.8,"height":1.2},{"type":"bump","at":0.13},{"type":"boost","at":0.21,"l":0,"length":8,"halfWidth":3.6},{"type":"boost","at":0.445,"l":-0.15,"length":8,"halfWidth":2.2},{"type":"polar_bear","at":0.675,"l":-1.25,"reach":-0.55,"radius":0.7,"height":1.5},{"type":"icicles","at":0.718,"l":-1,"l2":-0.5,"radius":0.35},{"type":"boost","at":0.73,"l":-0.5,"length":8,"halfWidth":2.6},{"type":"snowman","at":0.9,"l":-0.1,"radius":0.9,"height":2.4},{"type":"bump","at":0.95}]'::jsonb, true)
 WHERE slug = 'bobsleigh-run'
   AND physics IS NOT NULL;

SELECT count(*) AS bobsleigh_chaos_features
  FROM tracks
 WHERE slug = 'bobsleigh-run' AND jsonb_array_length(physics -> 'features') > 0;
