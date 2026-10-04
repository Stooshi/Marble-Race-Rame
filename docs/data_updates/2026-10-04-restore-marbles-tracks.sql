-- One-time data update: restore the full catalog data on existing rows.
--
-- The production marbles were created by hand with placeholder stats (all 50)
-- and no descriptions, and Meadow Loop with an empty layout. This copies the
-- seed values from docs/database_schema.sql (staged there in the temporary
-- tables seed_marbles and seed_tracks) onto the matching existing rows.
--
-- Only these fields change:
--   marbles: description, top_speed, acceleration, handling, luck
--   tracks:  description, difficulty, length_m, lane_count, waypoints, obstacles
-- Colours, prices, ownership, users and race history are untouched. Past races
-- keep their own snapshot of stats and layout, so their results and replays do
-- not change.
--
-- Rows are matched by slug, or by name when their slug is not a catalog slug.
-- The last statement returns the summary recorded in data_updates.

WITH changed_marbles AS (
    UPDATE marbles m
       SET description  = s.description,
           top_speed    = s.top_speed,
           acceleration = s.acceleration,
           handling     = s.handling,
           luck         = s.luck
      FROM seed_marbles s
     WHERE m.slug = s.slug
        OR (lower(m.name) = lower(s.name) AND m.slug NOT IN (SELECT slug FROM seed_marbles))
    RETURNING 1
),
changed_tracks AS (
    UPDATE tracks t
       SET description = s.description,
           difficulty  = s.difficulty::track_difficulty,
           length_m    = s.length_m,
           lane_count  = s.lane_count,
           waypoints   = s.waypoints::jsonb,
           obstacles   = s.obstacles::jsonb
      FROM seed_tracks s
     WHERE t.slug = s.slug
        OR (lower(t.name) = lower(s.name) AND t.slug NOT IN (SELECT slug FROM seed_tracks))
    RETURNING 1
)
SELECT (SELECT count(*) FROM changed_marbles) AS marbles,
       (SELECT count(*) FROM changed_tracks)  AS tracks;
