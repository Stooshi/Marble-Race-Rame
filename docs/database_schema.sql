-- =============================================================================
-- Marble Race — PostgreSQL schema
-- =============================================================================
-- Apply with:   psql "$DATABASE_URL" -f docs/database_schema.sql
--          or:   npm run db:migrate
--
-- The script is idempotent: it can be run repeatedly against the same
-- database without failing or duplicating seed data.
--
-- Design notes
--  * A race is decided exactly once, on the server, when it leaves the lobby.
--    The PRNG seed and a snapshot of every entrant's marble stats are stored,
--    so the full race (every frame) can be regenerated deterministically for
--    replays without storing the frames themselves.
--  * Finish positions are written at decision time but are only exposed by the
--    API once the race status is 'finished'.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive username/email

-- -----------------------------------------------------------------------------
-- Enumerated types
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('player', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE race_status AS ENUM ('lobby', 'countdown', 'running', 'finished', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE marble_rarity AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE track_difficulty AS ENUM ('easy', 'medium', 'hard', 'extreme');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- updated_at trigger helper
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username        citext      NOT NULL UNIQUE
                    CHECK (username ~ '^[A-Za-z0-9_]{3,24}$'),
    email           citext      NOT NULL UNIQUE
                    CHECK (position('@' IN email) > 1),
    password_hash   text        NOT NULL,
    display_name    varchar(40),
    avatar_url      text,
    role            user_role   NOT NULL DEFAULT 'player',
    coins           integer     NOT NULL DEFAULT 500 CHECK (coins >= 0),
    last_login_at   timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- tracks
-- -----------------------------------------------------------------------------
-- waypoints: ordered polyline the marbles follow, e.g. [{"x":0,"y":0}, ...]
--            in abstract track units; clients scale it to the viewport.
-- obstacles: features along the track, each positioned by fractional progress
--            (0..1) e.g. {"type":"bumper","at":0.35,"span":0.04,"intensity":0.6}
--            Supported types: bumper, ramp, sand, spinner, funnel.
CREATE TABLE IF NOT EXISTS tracks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            varchar(64)      NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
    name            varchar(80)      NOT NULL,
    description     text,
    difficulty      track_difficulty NOT NULL DEFAULT 'medium',
    length_m        numeric(8,2)     NOT NULL CHECK (length_m > 0),
    lane_count      smallint         NOT NULL DEFAULT 4 CHECK (lane_count BETWEEN 1 AND 20),
    waypoints       jsonb            NOT NULL DEFAULT '[]'::jsonb
                    CHECK (jsonb_typeof(waypoints) = 'array'),
    obstacles       jsonb            NOT NULL DEFAULT '[]'::jsonb
                    CHECK (jsonb_typeof(obstacles) = 'array'),
    thumbnail_url   text,
    is_active       boolean          NOT NULL DEFAULT true,
    created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at      timestamptz      NOT NULL DEFAULT now(),
    updated_at      timestamptz      NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tracks_active ON tracks (is_active);

DROP TRIGGER IF EXISTS trg_tracks_updated_at ON tracks;
CREATE TRIGGER trg_tracks_updated_at BEFORE UPDATE ON tracks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- marbles (catalog)
-- -----------------------------------------------------------------------------
-- Stats are 1..100. They bias the simulation but never guarantee a result:
--   top_speed     cruising speed on open track
--   acceleration  recovery speed after obstacles / slow-downs
--   handling      resistance to losing speed on obstacles
--   luck          chance of favourable random events (boosts, clean lines)
CREATE TABLE IF NOT EXISTS marbles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            varchar(64)   NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
    name            varchar(60)   NOT NULL,
    description     text,
    color_primary   char(7)       NOT NULL CHECK (color_primary   ~ '^#[0-9A-Fa-f]{6}$'),
    color_secondary char(7)                CHECK (color_secondary ~ '^#[0-9A-Fa-f]{6}$'),
    pattern         varchar(24)   NOT NULL DEFAULT 'solid',
    rarity          marble_rarity NOT NULL DEFAULT 'common',
    top_speed       smallint      NOT NULL DEFAULT 50 CHECK (top_speed    BETWEEN 1 AND 100),
    acceleration    smallint      NOT NULL DEFAULT 50 CHECK (acceleration BETWEEN 1 AND 100),
    handling        smallint      NOT NULL DEFAULT 50 CHECK (handling     BETWEEN 1 AND 100),
    luck            smallint      NOT NULL DEFAULT 50 CHECK (luck         BETWEEN 1 AND 100),
    price_coins     integer       NOT NULL DEFAULT 0  CHECK (price_coins >= 0),
    is_starter      boolean       NOT NULL DEFAULT false,  -- usable by every player for free
    is_active       boolean       NOT NULL DEFAULT true,
    created_at      timestamptz   NOT NULL DEFAULT now(),
    updated_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marbles_active ON marbles (is_active);

DROP TRIGGER IF EXISTS trg_marbles_updated_at ON marbles;
CREATE TRIGGER trg_marbles_updated_at BEFORE UPDATE ON marbles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- user_marbles (ownership / collection)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_marbles (
    user_id         uuid        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    marble_id       uuid        NOT NULL REFERENCES marbles(id) ON DELETE CASCADE,
    is_favorite     boolean     NOT NULL DEFAULT false,
    acquired_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, marble_id)
);

CREATE INDEX IF NOT EXISTS idx_user_marbles_marble ON user_marbles (marble_id);

-- -----------------------------------------------------------------------------
-- races
-- -----------------------------------------------------------------------------
-- seed               PRNG seed used by the simulator (set when decided)
-- target_duration_ms total race length the simulation was scaled to (50–90 s;
--                    the server defaults to fixed 90 s races)
-- countdown_ms       pre-start countdown streamed to clients
-- decided_at         moment the outcome was computed (lobby -> countdown)
-- track_snapshot     copy of the track geometry/obstacles used for the decision,
--                    so later track edits never change a past race or its replay
CREATE TABLE IF NOT EXISTS races (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id            uuid        NOT NULL REFERENCES tracks(id) ON DELETE RESTRICT,
    name                varchar(80),
    status              race_status NOT NULL DEFAULT 'lobby',
    min_marbles         smallint    NOT NULL DEFAULT 20,
    max_marbles         smallint    NOT NULL DEFAULT 20,
    entry_fee_coins     integer     NOT NULL DEFAULT 0 CHECK (entry_fee_coins >= 0),
    fill_with_bots      boolean     NOT NULL DEFAULT true,
    seed                bigint,
    target_duration_ms  integer,
    tick_rate_hz        smallint    NOT NULL DEFAULT 10 CHECK (tick_rate_hz BETWEEN 1 AND 60),
    countdown_ms        integer     NOT NULL DEFAULT 5000 CHECK (countdown_ms BETWEEN 0 AND 60000),
    track_snapshot      jsonb,
    created_by          uuid REFERENCES users(id) ON DELETE SET NULL,
    scheduled_at        timestamptz,
    decided_at          timestamptz,
    started_at          timestamptz,
    finished_at         timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT races_marble_bounds CHECK (
        min_marbles BETWEEN 10 AND 20
        AND max_marbles BETWEEN 10 AND 20
        AND min_marbles <= max_marbles
    ),
    CONSTRAINT races_duration_bounds CHECK (
        target_duration_ms IS NULL OR target_duration_ms BETWEEN 50000 AND 90000
    ),
    CONSTRAINT races_decided_has_seed CHECK (
        status IN ('lobby', 'cancelled')
        OR (seed IS NOT NULL AND target_duration_ms IS NOT NULL AND track_snapshot IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_races_status       ON races (status);
CREATE INDEX IF NOT EXISTS idx_races_track        ON races (track_id);
CREATE INDEX IF NOT EXISTS idx_races_created_at   ON races (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_races_scheduled_at ON races (scheduled_at)
    WHERE status = 'lobby' AND scheduled_at IS NOT NULL;

DROP TRIGGER IF EXISTS trg_races_updated_at ON races;
CREATE TRIGGER trg_races_updated_at BEFORE UPDATE ON races
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- race_entries (one marble per row; user_id NULL = house bot)
-- -----------------------------------------------------------------------------
-- The stat columns snapshot the marble at decision time so later catalog edits
-- never change a historical race or its replay.
CREATE TABLE IF NOT EXISTS race_entries (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    race_id           uuid        NOT NULL REFERENCES races(id)   ON DELETE CASCADE,
    marble_id         uuid        NOT NULL REFERENCES marbles(id) ON DELETE RESTRICT,
    user_id           uuid                 REFERENCES users(id)   ON DELETE SET NULL,
    is_bot            boolean     NOT NULL DEFAULT false,
    lane              smallint    CHECK (lane BETWEEN 0 AND 19),
    snap_top_speed    smallint,
    snap_acceleration smallint,
    snap_handling     smallint,
    snap_luck         smallint,
    finish_position   smallint    CHECK (finish_position BETWEEN 1 AND 20),
    finish_time_ms    integer     CHECK (finish_time_ms > 0),
    split_time_ms     integer     CHECK (split_time_ms > 0),   -- time at the halfway point
    coins_awarded     integer     NOT NULL DEFAULT 0 CHECK (coins_awarded >= 0),
    joined_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT race_entries_unique_marble UNIQUE (race_id, marble_id),
    CONSTRAINT race_entries_unique_lane   UNIQUE (race_id, lane),
    CONSTRAINT race_entries_unique_pos    UNIQUE (race_id, finish_position),
    CONSTRAINT race_entries_bot_xor_user  CHECK (is_bot = (user_id IS NULL))
);

-- Upgrade path for databases created before split times were tracked.
ALTER TABLE race_entries ADD COLUMN IF NOT EXISTS split_time_ms integer CHECK (split_time_ms > 0);

-- A player may enter at most one marble per race.
CREATE UNIQUE INDEX IF NOT EXISTS uq_race_entries_race_user
    ON race_entries (race_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_race_entries_user   ON race_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_race_entries_marble ON race_entries (marble_id);
CREATE INDEX IF NOT EXISTS idx_races_track_finished ON races (track_id, finished_at) WHERE status = 'finished';

-- -----------------------------------------------------------------------------
-- Views
-- -----------------------------------------------------------------------------
-- Per-player aggregate stats over finished races.
CREATE OR REPLACE VIEW user_stats AS
SELECT
    u.id                                                         AS user_id,
    u.username,
    COUNT(e.id)                                                  AS races_played,
    COUNT(e.id) FILTER (WHERE e.finish_position = 1)             AS wins,
    COUNT(e.id) FILTER (WHERE e.finish_position <= 3)            AS podiums,
    MIN(e.finish_time_ms) FILTER (WHERE e.finish_position = 1)   AS best_win_time_ms,
    ROUND(AVG(e.finish_position)::numeric, 2)                    AS avg_position,
    COALESCE(SUM(e.coins_awarded), 0)                            AS coins_won,
    MIN(e.split_time_ms)                                         AS best_split_ms,
    MIN(e.finish_time_ms)                                        AS best_finish_time_ms
FROM users u
LEFT JOIN (race_entries e
           JOIN races r ON r.id = e.race_id AND r.status = 'finished')
       ON e.user_id = u.id
GROUP BY u.id, u.username;

-- Per-marble aggregate stats over finished races (bots included).
CREATE OR REPLACE VIEW marble_stats AS
SELECT
    m.id                                                AS marble_id,
    m.name,
    COUNT(e.id)                                         AS races_run,
    COUNT(e.id) FILTER (WHERE e.finish_position = 1)    AS wins,
    ROUND(AVG(e.finish_position)::numeric, 2)           AS avg_position
FROM marbles m
LEFT JOIN (race_entries e
           JOIN races r ON r.id = e.race_id AND r.status = 'finished')
       ON e.marble_id = m.id
GROUP BY m.id, m.name;

-- -----------------------------------------------------------------------------
-- Seed data (idempotent)
-- -----------------------------------------------------------------------------
INSERT INTO marbles (slug, name, description, color_primary, color_secondary, pattern, rarity,
                     top_speed, acceleration, handling, luck, price_coins, is_starter)
VALUES
    ('ruby',        'Ruby',        'A balanced starter marble.',          '#E0115F', NULL,      'solid',   'common',    50, 50, 50, 50,    0, true),
    ('sapphire',    'Sapphire',    'Slightly quicker on the straights.',  '#0F52BA', NULL,      'solid',   'common',    56, 48, 46, 50,    0, true),
    ('emerald',     'Emerald',     'Steady through the rough stuff.',     '#50C878', NULL,      'solid',   'common',    46, 50, 58, 48,    0, true),
    ('topaz',       'Topaz',       'Bounces back quickly.',               '#FFC87C', NULL,      'solid',   'common',    48, 58, 46, 48,    0, true),
    ('onyx',        'Onyx',        'Dark horse with a lucky streak.',     '#353839', '#AAAAAA', 'swirl',   'uncommon',  52, 50, 50, 62,  250, false),
    ('pearl',       'Pearl',       'Smooth and consistent.',              '#F0EAD6', '#D4C4A8', 'pearl',   'uncommon',  54, 54, 56, 46,  250, false),
    ('amethyst',    'Amethyst',    'Grippy and graceful.',                '#9966CC', '#E6E6FA', 'swirl',   'uncommon',  50, 52, 64, 50,  300, false),
    ('citrine',     'Citrine',     'Explodes out of corners.',            '#E4D00A', '#FF8C00', 'striped', 'rare',      55, 66, 52, 50,  600, false),
    ('cobalt-comet','Cobalt Comet','Built for long straights.',           '#0047AB', '#FFFFFF', 'striped', 'rare',      66, 52, 48, 50,  600, false),
    ('jade-dragon', 'Jade Dragon', 'Ancient and fortunate.',              '#00A86B', '#FFD700', 'cat-eye', 'epic',      60, 58, 58, 64, 1200, false),
    ('solar-flare', 'Solar Flare', 'Burns hot from start to finish.',     '#FF4500', '#FFD700', 'galaxy',  'legendary', 70, 64, 60, 58, 2500, false),
    ('nebula',      'Nebula',      'Drifts through chaos untouched.',     '#2E0854', '#FF69B4', 'galaxy',  'legendary', 62, 62, 70, 66, 2500, false),
    -- Extra commons so bots can always fill a 20-marble race with distinct marbles.
    ('garnet',      'Garnet',      'Deep red and dependable.',            '#733635', NULL,      'solid',   'common',    50, 52, 48, 50,  100, false),
    ('aquamarine',  'Aquamarine',  'Cool under pressure.',                '#7FFFD4', NULL,      'solid',   'common',    48, 50, 54, 48,  100, false),
    ('opal',        'Opal',        'Shimmers when it counts.',            '#A8C3BC', '#F8C8DC', 'swirl',   'common',    49, 49, 49, 55,  100, false),
    ('quartz',      'Quartz',      'Clear-headed and quick.',             '#F7F7F7', NULL,      'clear',   'common',    53, 49, 47, 49,  100, false),
    ('obsidian',    'Obsidian',    'Heavy and hard to knock off line.',   '#0B1304', NULL,      'solid',   'common',    47, 46, 58, 48,  100, false),
    ('amber',       'Amber',       'Warm, steady, unhurried.',            '#FFBF00', NULL,      'solid',   'common',    50, 48, 52, 50,  100, false),
    ('coral',       'Coral',       'Springs off every bumper.',           '#FF7F50', NULL,      'solid',   'common',    48, 56, 48, 48,  100, false),
    ('turquoise',   'Turquoise',   'A traveller''s lucky charm.',         '#40E0D0', NULL,      'solid',   'common',    47, 50, 48, 58,  100, false),
    ('peridot',     'Peridot',     'Sharp on the straights.',             '#B4C424', NULL,      'solid',   'common',    55, 47, 47, 49,  100, false),
    ('moonstone',   'Moonstone',   'Glides quietly to the front.',        '#E3E4FA', '#B0C4DE', 'pearl',   'common',    50, 50, 51, 51,  100, false)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tracks (slug, name, description, difficulty, length_m, lane_count, waypoints, obstacles)
VALUES
    ('meadow-loop', 'Meadow Loop', 'A gentle rolling course for beginners.', 'easy', 600, 6,
     '[{"x":0,"y":0},{"x":200,"y":40},{"x":400,"y":0},{"x":520,"y":160},{"x":400,"y":320},{"x":200,"y":280},{"x":40,"y":360},{"x":0,"y":520}]',
     '[{"type":"ramp","at":0.18,"span":0.03,"intensity":0.4},
       {"type":"bumper","at":0.42,"span":0.04,"intensity":0.3},
       {"type":"sand","at":0.71,"span":0.06,"intensity":0.3}]'),
    ('canyon-drop', 'Canyon Drop', 'Steep drops and tight funnels.', 'medium', 750, 5,
     '[{"x":0,"y":0},{"x":120,"y":160},{"x":-40,"y":320},{"x":160,"y":480},{"x":0,"y":640},{"x":200,"y":800},{"x":40,"y":980}]',
     '[{"type":"ramp","at":0.10,"span":0.05,"intensity":0.6},
       {"type":"funnel","at":0.30,"span":0.04,"intensity":0.6},
       {"type":"bumper","at":0.48,"span":0.05,"intensity":0.5},
       {"type":"spinner","at":0.66,"span":0.04,"intensity":0.6},
       {"type":"funnel","at":0.86,"span":0.04,"intensity":0.5}]'),
    ('volcano-run', 'Volcano Run', 'Chaos from top to bottom. Only the lucky survive.', 'extreme', 900, 4,
     '[{"x":0,"y":0},{"x":300,"y":60},{"x":80,"y":220},{"x":360,"y":380},{"x":60,"y":540},{"x":340,"y":700},{"x":100,"y":860},{"x":300,"y":1020},{"x":160,"y":1200}]',
     '[{"type":"spinner","at":0.08,"span":0.04,"intensity":0.8},
       {"type":"sand","at":0.22,"span":0.07,"intensity":0.6},
       {"type":"bumper","at":0.37,"span":0.05,"intensity":0.8},
       {"type":"ramp","at":0.50,"span":0.04,"intensity":0.8},
       {"type":"funnel","at":0.63,"span":0.04,"intensity":0.9},
       {"type":"spinner","at":0.78,"span":0.04,"intensity":0.9},
       {"type":"bumper","at":0.91,"span":0.04,"intensity":0.7}]')
ON CONFLICT (slug) DO NOTHING;
