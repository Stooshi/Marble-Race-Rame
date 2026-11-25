-- One-time data update: Bobsleigh Run's starting places, re-tuned for a clean start.
--
-- The new physics (physics-preview-2) no longer jiggles marbles from side to
-- side as they leave the gate: they roll straight down the starting slope,
-- moving sideways only when they really knock into each other. The outer
-- starting places used to start 2.2 m further on, to make up for their longer
-- way in through a scrambling start; with the clean start that would give them
-- an edge, so they now start 0.2 m further on. Checked on 3,000 races: every
-- group of starting places wins about 20% of races.
--
-- Changes only that one setting of Bobsleigh Run (in tracks.physics). Races
-- already decided keep the replay stored when they were decided, so no past
-- race changes. Nothing else is touched.

UPDATE tracks
   SET physics = jsonb_set(physics, '{channel,funnel,stagger}', '0.2'::jsonb)
 WHERE slug = 'bobsleigh-run'
   AND physics #> '{channel,funnel}' IS NOT NULL;

SELECT count(*) AS bobsleigh_starts_retuned
  FROM tracks
 WHERE slug = 'bobsleigh-run' AND physics #>> '{channel,funnel,stagger}' = '0.2';
