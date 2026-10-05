-- One-time data update: add the San Francisco track (the fourth track).
--
-- A hard, steep downhill city run: two hill-crest jumps, a crooked street of
-- hairpins, a cable car crossing (a moving hazard on a timetable; see
-- OBSTACLE_EFFECTS.cable_car in src/game/simulator.js), cobblestones, the
-- Powell Street cable-car turntable and a narrow pier entrance to the finish.
-- Waypoints are {x, y, z}; z is the height above the finish line, stepped like
-- real SF streets: steep blocks with flat intersections.
--
-- Inserted only if no track with this slug or name exists yet. Nothing else is
-- touched: the other tracks, marbles, users and race history stay as they are.
-- The visual look of the city comes later (Phase 2); this is the race data.

WITH added AS (
    INSERT INTO tracks (slug, name, description, difficulty, length_m, lane_count, waypoints, obstacles)
    SELECT v.slug, v.name, v.description, v.difficulty::track_difficulty, v.length_m, v.lane_count,
           v.waypoints::jsonb, v.obstacles::jsonb
    FROM (VALUES
        ('san-francisco', 'San Francisco',
         'Plunge down the steepest streets in the city. Hill-crest jumps, a crooked hairpin street and a cable car that waits for no marble.',
         'hard', 800, 5,
         '[{"x":0,"y":0,"z":220},{"x":53,"y":2,"z":219},{"x":120,"y":5,"z":210},{"x":181,"y":8,"z":191},{"x":240,"y":12,"z":181},{"x":293,"y":14,"z":174},{"x":340,"y":20,"z":161},{"x":394,"y":35,"z":149},{"x":420,"y":55,"z":146},{"x":352,"y":81,"z":141},{"x":290,"y":110,"z":137},{"x":355,"y":138,"z":132},{"x":420,"y":165,"z":127},{"x":355,"y":193,"z":122},{"x":290,"y":220,"z":118},{"x":341,"y":249,"z":114},{"x":420,"y":275,"z":108},{"x":472,"y":290,"z":105},{"x":520,"y":300,"z":103},{"x":571,"y":306,"z":102},{"x":620,"y":310,"z":100},{"x":668,"y":312,"z":97},{"x":710,"y":320,"z":94},{"x":740,"y":346,"z":91},{"x":760,"y":380,"z":88},{"x":771,"y":415,"z":87},{"x":770,"y":450,"z":86},{"x":748,"y":481,"z":48},{"x":730,"y":510,"z":48},{"x":752,"y":540,"z":47},{"x":770,"y":570,"z":44},{"x":744,"y":602,"z":35},{"x":700,"y":630,"z":23},{"x":654,"y":650,"z":12},{"x":600,"y":665,"z":5},{"x":529,"y":675,"z":2},{"x":470,"y":680,"z":0}]',
         '[{"type":"ramp","at":0.05,"span":0.03,"intensity":0.6},{"type":"ramp","at":0.14,"span":0.03,"intensity":0.6},{"type":"funnel","at":0.22,"span":0.04,"intensity":0.7},{"type":"bumper","at":0.35,"span":0.04,"intensity":0.6},{"type":"bumper","at":0.47,"span":0.04,"intensity":0.6},{"type":"cable_car","at":0.59,"span":0.03,"intensity":0.9,"period":18,"duty":0.3},{"type":"sand","at":0.72,"span":0.035,"intensity":0.5},{"type":"ramp","at":0.76,"span":0.03,"intensity":0.7},{"type":"spinner","at":0.79,"span":0.04,"intensity":0.7},{"type":"funnel","at":0.9,"span":0.04,"intensity":0.6},{"type":"bumper","at":0.95,"span":0.03,"intensity":0.5}]')
    ) AS v(slug, name, description, difficulty, length_m, lane_count, waypoints, obstacles)
    WHERE NOT EXISTS (
        SELECT 1 FROM tracks t WHERE t.slug = v.slug OR lower(t.name) = lower(v.name)
    )
    ON CONFLICT DO NOTHING
    RETURNING 1
)
SELECT count(*) AS "track added (San Francisco)" FROM added;
