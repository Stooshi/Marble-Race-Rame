'use strict';

// Prints the data update that adds a new-physics track to the database, from
// its definition in src/game/physicsTracks.js (the single source of truth).
//   node scripts/physics-track-sql.js bobsleigh-run > docs/data_updates/<date>-add-bobsleigh-run.sql
// test/bobsleigh.test.js checks the committed file still matches the code.
const { physicsTrack } = require('../src/game/physicsTracks');

const slug = process.argv[2];
const track = physicsTrack(slug);
if (!track) {
  console.error(`No physics track "${slug}"`);
  process.exit(1);
}
process.stdout.write(trackSql(track));

function trackSql(t) {
  const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
  return `-- One-time data update: add ${t.name}, the first track on the new physics.
--
-- An icy bobsleigh run built for speed: the field waits side by side behind a
-- paddle gate on a steep starting ramp, then bumps and slipstreams down an ice
-- channel with a splitter, a banked sweep, a hairpin and a corkscrew, and
-- finishes into a catch area. Races on it run on the new physics
-- (src/game/physicsSimulator.js) because the track has "physics" settings; the
-- other tracks have none and stay on the classic engine.
--
-- Generated from src/game/physicsTracks.js by scripts/physics-track-sql.js.
--
-- Also: races on the new physics take as long as they take (about 45-55 s
-- here) with 90 s as a ceiling, so the shortest race the database accepts goes
-- from 50 s to 20 s. Loosening the rule changes no existing race.
--
-- The track is inserted only if no track with this slug or name exists yet.
-- Nothing else is touched: the other tracks, marbles, users and races stay as
-- they are.

ALTER TABLE races DROP CONSTRAINT IF EXISTS races_duration_bounds;
ALTER TABLE races ADD CONSTRAINT races_duration_bounds CHECK (
    target_duration_ms IS NULL OR target_duration_ms BETWEEN 20000 AND 90000
);

WITH added AS (
    INSERT INTO tracks (slug, name, description, difficulty, length_m, lane_count, waypoints, obstacles, physics)
    SELECT v.slug, v.name, v.description, v.difficulty::track_difficulty, v.length_m, v.lane_count,
           v.waypoints::jsonb, v.obstacles::jsonb, v.physics::jsonb
    FROM (VALUES
        (${q(t.slug)}, ${q(t.name)},
         ${q(t.description)},
         ${q(t.difficulty)}, ${t.length_m}, ${t.lane_count},
         ${q(JSON.stringify(t.waypoints))},
         ${q(JSON.stringify(t.obstacles))},
         ${q(JSON.stringify(t.physics))})
    ) AS v(slug, name, description, difficulty, length_m, lane_count, waypoints, obstacles, physics)
    WHERE NOT EXISTS (
        SELECT 1 FROM tracks t WHERE t.slug = v.slug OR lower(t.name) = lower(v.name)
    )
    ON CONFLICT DO NOTHING
    RETURNING 1
)
SELECT count(*) AS ${JSON.stringify(`track added (${t.name})`)} FROM added;
`;
}
