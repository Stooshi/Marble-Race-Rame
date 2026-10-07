'use strict';

// Prints the data update that adds a new-physics track to the database, from
// its definition in src/game/physicsTracks.js (the single source of truth).
//   node scripts/physics-track-sql.js bobsleigh-run > docs/data_updates/<date>-add-bobsleigh-run.sql
// With --rebuild it prints the update that moves an existing classic track
// onto the new physics instead (its old races keep replaying as they ran):
//   node scripts/physics-track-sql.js san-francisco --rebuild > docs/data_updates/<date>-san-francisco-rebuild.sql
// With --retune it prints a later re-tune of a track already on the new physics
// (an update that has run is never edited: a new one is added), with what
// changed in its header:
//   node scripts/physics-track-sql.js san-francisco --retune "What changed." > docs/data_updates/<date>-san-francisco-<what>.sql
// The tests check the committed files still match the code.
const { physicsTrack } = require('../src/game/physicsTracks');

const slug = process.argv[2];
const track = physicsTrack(slug);
if (!track) {
  console.error(`No physics track "${slug}"`);
  process.exit(1);
}
const mode = process.argv[3];
process.stdout.write(mode === '--rebuild' ? rebuildSql(track) : mode === '--retune' ? retuneSql(track, process.argv[4]) : trackSql(track));

// A later re-tune of a track already on the new physics: its shape and settings as now in code.
function retuneSql(t, note = 'Its shape and settings as now in code.') {
  const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
  // The note, wrapped into comment lines of up to 80 characters.
  const lines = [];
  for (const word of `${note} Races already run keep their stored replays and play back exactly as they ran.`.split(/\s+/)) {
    if (lines.length && `${lines[lines.length - 1]} ${word}`.length <= 77) lines[lines.length - 1] += ` ${word}`;
    else lines.push(word);
  }
  return `-- One-time data update: ${t.name} re-tuned.
--
${lines.map((l) => `-- ${l}`).join('\n')}
--
-- Generated from src/game/physicsTracks.js by scripts/physics-track-sql.js --retune.
-- Only the ${t.name} track row changes.

UPDATE tracks
   SET description = ${q(t.description)},
       length_m = ${t.length_m},
       lane_count = ${t.lane_count},
       waypoints = ${q(JSON.stringify(t.waypoints))}::jsonb,
       obstacles = ${q(JSON.stringify(t.obstacles))}::jsonb,
       physics = ${q(JSON.stringify(t.physics))}::jsonb
 WHERE slug = ${q(t.slug)};
`;
}

function rebuildSql(t) {
  const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
  return `-- One-time data update: ${t.name} rebuilt on the new physics.
--
-- The classic ${t.name} becomes a racing channel dressed as a city street,
-- as fast as Bobsleigh Run: a paddle gate on a steep start, long plunges, two
-- short climbs with crest jumps, banked hairpins, boost pads, a cable car
-- crossing on a timetable and street obstacles. Races on it now run on the
-- new physics (src/game/physicsSimulator.js) because the track has "physics"
-- settings.
--
-- Races already run keep replaying exactly as they ran: each race keeps its
-- own copy of the track as it was when it was decided (races.track_snapshot,
-- required for every decided race), and the old copies have no physics
-- settings, so they stay on the classic engine.
--
-- Generated from src/game/physicsTracks.js by scripts/physics-track-sql.js.
--
-- Only the ${t.name} track row changes (and only while it is still classic).
-- Nothing else is touched: the other tracks, marbles, users and races stay as
-- they are.

UPDATE tracks
   SET description = ${q(t.description)},
       length_m = ${t.length_m},
       lane_count = ${t.lane_count},
       waypoints = ${q(JSON.stringify(t.waypoints))}::jsonb,
       obstacles = ${q(JSON.stringify(t.obstacles))}::jsonb,
       physics = ${q(JSON.stringify(t.physics))}::jsonb
 WHERE slug = ${q(t.slug)} AND physics IS NULL;
`;
}

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
