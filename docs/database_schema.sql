-- =============================================================================
-- Marble Race — PostgreSQL schema
-- =============================================================================
-- The backend applies this file automatically on every start
-- (src/db/migrate.js), inside one transaction. It can also be applied with
--   npm run db:migrate      or      psql "$DATABASE_URL" -1 -f docs/database_schema.sql
-- (by hand, -1 runs it as one transaction; only the backend also applies the
-- one-time data updates in docs/data_updates/).
--
-- The script is idempotent and safe for a database that already holds data:
--  * tables, columns, types and indexes are only created when missing;
--  * no statement drops, deletes or updates stored rows (the views are
--    rebuilt, but views hold no data);
--  * seed marbles and tracks are inserted only when no row with the same slug
--    or name exists, so existing rows are never overwritten or duplicated.
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

-- skill: how strong the player's marbles race (1-100). Skill belongs to the
--        player, not the marble: every marble in their Marble Bag races at it,
--        whichever one is their Shooter. Everyone starts at 50, the middle of
--        the house field.
-- skill_refund_coins: coins refunded when marbles stopped carrying strength
--        (2026-10-12), shown once on the dashboard; NULL once seen.
ALTER TABLE users ADD COLUMN IF NOT EXISTS skill smallint NOT NULL DEFAULT 50 CHECK (skill BETWEEN 1 AND 100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS skill_refund_coins integer CHECK (skill_refund_coins > 0);

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
    physics         jsonb,
    thumbnail_url   text,
    is_active       boolean          NOT NULL DEFAULT true,
    created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at      timestamptz      NOT NULL DEFAULT now(),
    updated_at      timestamptz      NOT NULL DEFAULT now()
);

-- physics: settings for the new physics engine (src/game/physicsSimulator.js:
-- ice channel, splitter, starting gate, catch area). NULL = the track races on
-- the classic engine (src/game/simulator.js), as every track did before.
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS physics jsonb;

CREATE INDEX IF NOT EXISTS idx_tracks_active ON tracks (is_active);

DROP TRIGGER IF EXISTS trg_tracks_updated_at ON tracks;
CREATE TRIGGER trg_tracks_updated_at BEFORE UPDATE ON tracks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- marbles (catalog)
-- -----------------------------------------------------------------------------
-- Marbles are looks only: skill belongs to the player (users.skill). The stat
-- columns (top_speed, acceleration, handling, luck) are no longer read by any
-- race; they stay only as a record of the old catalog. Past races keep their
-- own copy of the stats they ran with (race_entries.snap_*).
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
-- target_duration_ms total race length: on the classic engine the simulation is
--                    scaled to it (50–90 s; the server defaults to fixed 90 s
--                    races); on the new physics it is however long the race
--                    takes (a ceiling of 90 s), so 20–90 s overall
-- countdown_ms       pre-start countdown streamed to clients
-- decided_at         moment the outcome was computed (lobby -> countdown)
-- track_snapshot     copy of the track geometry/obstacles used for the decision,
--                    so later track edits never change a past race or its replay;
--                    on the new physics it also holds the physics settings and
--                    the engine version ("engine"); without them it is a classic race
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
        target_duration_ms IS NULL OR target_duration_ms BETWEEN 20000 AND 90000
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

-- -----------------------------------------------------------------------------
-- race_replays: the stored replay of each race on the new physics
-- -----------------------------------------------------------------------------
-- Classic races are replayed by re-running the simulator from their seed. Races
-- on the new physics are saved as they were decided (gzipped JSON of the frames,
-- events and starting gate), so later tuning of the physics never changes a past
-- race's replay. Results and coins live in race_entries as for every race.
CREATE TABLE IF NOT EXISTS race_replays (
    race_id     uuid        PRIMARY KEY REFERENCES races(id) ON DELETE CASCADE,
    engine      text        NOT NULL,
    data        bytea       NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Upgrade path for databases created before these columns existed (including
-- tables created by hand from an earlier version of this file).
ALTER TABLE race_entries ADD COLUMN IF NOT EXISTS split_time_ms integer CHECK (split_time_ms > 0);
ALTER TABLE races        ADD COLUMN IF NOT EXISTS track_snapshot jsonb;
-- The rematch: the follow-up race on the same track that the group moves on to
-- after this one (POST /api/races/:id/next creates it once and everyone joins it).
ALTER TABLE races        ADD COLUMN IF NOT EXISTS next_race_id uuid REFERENCES races(id) ON DELETE SET NULL;

-- A player may enter at most one marble per race.
CREATE UNIQUE INDEX IF NOT EXISTS uq_race_entries_race_user
    ON race_entries (race_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_race_entries_user   ON race_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_race_entries_marble ON race_entries (marble_id);
CREATE INDEX IF NOT EXISTS idx_races_track_finished ON races (track_id, finished_at) WHERE status = 'finished';

-- -----------------------------------------------------------------------------
-- Marble appearance: each player's cosmetic look (no effect on racing)
-- -----------------------------------------------------------------------------
-- A look is PURELY COSMETIC and completely separate from physics. Races are
-- decided only from the catalog marble's stats (marbles.top_speed etc.,
-- snapshotted into race_entries); the race engine never reads these tables, so
-- no look can ever give a gameplay advantage. A spiky or flaming marble moves
-- exactly like a plain one. (test/appearance.test.js enforces this.)
--
-- Players choose from curated lists only. Each list is a table of keys seeded
-- below (insert-if-missing), so options can be added later with one line and
-- no code change, and retired by setting is_active = false (players who chose
-- them keep them).
--
-- STORED NOW, RENDERED LATER: every surface and effect below is stored now,
-- but only some will be drawn in Phase 2 (expected: solid, swirl, striped,
-- dotted, glowing, sparkle, galaxy). Spiky, bumpy, star and flaming need
-- dedicated 3D work in a later phase. We store the ambition, not the rendering.
--
-- Planned, not built: uploaded images or logos will live in their own table
-- (e.g. marble_images, with a moderation status: pending / approved /
-- rejected) and marble_appearances will gain a nullable link to an approved
-- image. That is purely additive; nothing here changes.

CREATE TABLE IF NOT EXISTS marble_colors (
    key         varchar(24) PRIMARY KEY CHECK (key ~ '^[a-z0-9-]+$'),
    name        varchar(24) NOT NULL,
    hex         char(7)     NOT NULL CHECK (hex ~ '^#[0-9A-Fa-f]{6}$'),
    sort_order  smallint    NOT NULL DEFAULT 0,
    is_active   boolean     NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS marble_surfaces (
    key         varchar(24) PRIMARY KEY CHECK (key ~ '^[a-z0-9-]+$'),
    name        varchar(24) NOT NULL,
    description text,
    sort_order  smallint    NOT NULL DEFAULT 0,
    is_active   boolean     NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS marble_effects (
    key         varchar(24) PRIMARY KEY CHECK (key ~ '^[a-z0-9-]+$'),
    name        varchar(24) NOT NULL,
    description text,
    sort_order  smallint    NOT NULL DEFAULT 0,
    is_active   boolean     NOT NULL DEFAULT true
);

INSERT INTO marble_colors (key, name, hex, sort_order) VALUES
    ('cherry-red',   'Cherry Red',   '#E0115F',  1),
    ('tangerine',    'Tangerine',    '#FF7A1A',  2),
    ('sunflower',    'Sunflower',    '#FFD21F',  3),
    ('lime',         'Lime',         '#8BD448',  4),
    ('forest-green', 'Forest Green', '#1FA35B',  5),
    ('teal',         'Teal',         '#13A8A8',  6),
    ('sky-blue',     'Sky Blue',     '#3DB5FF',  7),
    ('royal-blue',   'Royal Blue',   '#2F5BEA',  8),
    ('violet',       'Violet',       '#8E5CF5',  9),
    ('magenta',      'Magenta',      '#E040C8', 10),
    ('bubblegum',    'Bubblegum',    '#FF8FC8', 11),
    ('chocolate',    'Chocolate',    '#7A4A2A', 12),
    ('sand',         'Sand',         '#D9B77E', 13),
    ('snow',         'Snow',         '#F4F4F2', 14),
    ('silver',       'Silver',       '#A8AFB8', 15),
    ('midnight',     'Midnight',     '#23252B', 16)
ON CONFLICT (key) DO NOTHING;

INSERT INTO marble_surfaces (key, name, description, sort_order) VALUES
    ('solid',   'Solid',   'Smooth and glossy, one colour',  1),
    ('swirl',   'Swirl',   'Colour swirled with white',      2),
    ('striped', 'Striped', 'Bands of colour and white',      3),
    ('dotted',  'Dotted',  'Covered in light polka dots',    4),
    ('spiky',   'Spiky',   'Studded with soft spikes',       5),
    ('bumpy',   'Bumpy',   'Knobbly, pebble-like surface',   6),
    ('star',    'Star',    'Covered in small star shapes',   7)
ON CONFLICT (key) DO NOTHING;

INSERT INTO marble_effects (key, name, description, sort_order) VALUES
    ('none',     'None',     'No effect',                               1),
    ('flaming',  'Flaming',  'A trail of flames',                       2),
    ('glowing',  'Glowing',  'A soft halo of light',                    3),
    ('sparkle',  'Sparkle',  'Twinkling glints',                        4),
    ('galaxy',   'Galaxy',   'A starfield swirling inside the marble',  5)
ON CONFLICT (key) DO NOTHING;

-- One look per player, used for whichever catalog marble they race.
-- label: the name shown above the marble. Kept for later but always NULL for
-- now (the username is shown instead): custom text needs a word filter first,
-- since public rooms are planned. The API refuses to set it.
CREATE TABLE IF NOT EXISTS marble_appearances (
    user_id     uuid        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    color_key   varchar(24) NOT NULL REFERENCES marble_colors(key) ON UPDATE CASCADE,
    surface_key varchar(24) NOT NULL DEFAULT 'solid' REFERENCES marble_surfaces(key) ON UPDATE CASCADE,
    effect_key  varchar(24) NOT NULL DEFAULT 'none'  REFERENCES marble_effects(key)  ON UPDATE CASCADE,
    label       varchar(16)
                CHECK (label IS NULL OR (label ~ '^[A-Za-z0-9_ -]{1,16}$' AND label = btrim(label))),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_marble_appearances_updated_at ON marble_appearances;
CREATE TRIGGER trg_marble_appearances_updated_at BEFORE UPDATE ON marble_appearances
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Starting colour for a player: picked from the active colours by a hash of
-- their id, so a group of friends doesn't start out identical. Used by the
-- backfill below and by registration (src/game/appearance.js).
CREATE OR REPLACE FUNCTION default_marble_color(p_user_id uuid) RETURNS varchar AS $$
    SELECT key FROM marble_colors
     WHERE is_active
     ORDER BY sort_order, key
    OFFSET ((hashtext(p_user_id::text)::bigint % GREATEST(1, (SELECT count(*) FROM marble_colors WHERE is_active)))
            + (SELECT count(*) FROM marble_colors WHERE is_active))
           % GREATEST(1, (SELECT count(*) FROM marble_colors WHERE is_active))
     LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Every player gets a starting look (solid, no effect). Runs on each boot and
-- only adds rows for players who don't have one yet; existing looks are kept.
INSERT INTO marble_appearances (user_id, color_key)
SELECT u.id, default_marble_color(u.id)
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM marble_appearances a WHERE a.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- data_updates: one-time changes to existing rows (docs/data_updates/*.sql)
-- -----------------------------------------------------------------------------
-- The backend runs each file once, in name order, and records it here so it is
-- never applied twice.
CREATE TABLE IF NOT EXISTS data_updates (
    id          text        PRIMARY KEY,
    applied_at  timestamptz NOT NULL DEFAULT now(),
    summary     text
);

-- -----------------------------------------------------------------------------
-- Views
-- -----------------------------------------------------------------------------
-- Dropped and recreated rather than CREATE OR REPLACE, which refuses to change
-- an existing view's columns. Views store no data, so this loses nothing.
DROP VIEW IF EXISTS user_stats;
DROP VIEW IF EXISTS marble_stats;

-- Per-player aggregate stats over finished races.
CREATE VIEW user_stats AS
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
CREATE VIEW marble_stats AS
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
-- The catalog is staged in temporary tables (dropped when the transaction ends)
-- so that both the inserts below and the one-time data updates in
-- docs/data_updates/ read the same values. Apply this file inside a single
-- transaction: the backend does, and by hand use `psql -1 -f`.
--
-- Marbles are looks only now (skill belongs to the player); the stats below are
-- kept only as a record. They were balanced by simulating thousands of 20-marble
-- races per track: top speed matters most, then handling (more on rough tracks), then
-- luck, then acceleration.
CREATE TEMP TABLE seed_marbles ON COMMIT DROP AS
SELECT * FROM (VALUES
    -- Free starters, in every Marble Bag.
    ('ruby',        'Ruby',        'Deep red and classic: the marble everyone remembers from their first race.', '#E0115F', NULL, 'solid', 'common', 50, 50, 50, 50, 0, true),
    ('sapphire',    'Sapphire',    'Ocean blue with a cool, glassy shine.', '#0F52BA', NULL, 'solid', 'common', 52, 48, 46, 50, 0, true),
    ('emerald',     'Emerald',     'Rich forest green that glows when the light catches it.', '#50C878', NULL, 'solid', 'common', 49, 48, 55, 48, 0, true),
    ('topaz',       'Topaz',       'Warm honey gold, like late afternoon sun.', '#FFC87C', NULL, 'solid', 'common', 49, 60, 50, 49, 0, true),
    -- Uncommon to legendary: rarer looks.
    ('onyx',        'Onyx',        'Midnight black with silver swirls: the dark horse of any field.', '#353839', '#AAAAAA', 'swirl', 'uncommon', 50, 50, 49, 62, 250, false),
    ('pearl',       'Pearl',       'Soft, creamy lustre that shimmers as it rolls.', '#F0EAD6', '#D4C4A8', 'pearl', 'uncommon', 51, 53, 52, 50, 250, false),
    ('amethyst',    'Amethyst',    'Violet swirls over pale lavender: graceful in every bend.', '#9966CC', '#E6E6FA', 'swirl', 'uncommon', 49, 52, 56, 50, 300, false),
    ('citrine',     'Citrine',     'Lemon yellow striped with blazing orange.', '#E4D00A', '#FF8C00', 'striped', 'rare', 50, 64, 51, 51, 600, false),
    ('cobalt-comet','Cobalt Comet','Electric blue with a white streak, like a comet''s tail.', '#0047AB', '#FFFFFF', 'striped', 'rare', 52, 56, 49, 53, 600, false),
    ('jade-dragon', 'Jade Dragon', 'Jade green with a gold cat''s eye: an ancient charm.', '#00A86B', '#FFD700', 'cat-eye', 'epic', 51, 55, 51, 55, 1200, false),
    ('solar-flare', 'Solar Flare', 'A swirling galaxy of fire orange and gold.', '#FF4500', '#FFD700', 'galaxy', 'legendary', 51, 62, 51, 54, 2500, false),
    ('nebula',      'Nebula',      'Deep space purple dusted with pink starlight.', '#2E0854', '#FF69B4', 'galaxy', 'legendary', 50, 57, 53, 57, 2500, false),
    -- Commons sold in the shop.
    ('garnet',      'Garnet',      'Dark wine red, quietly elegant.', '#733635', NULL, 'solid', 'common', 50, 54, 51, 48, 100, false),
    ('aquamarine',  'Aquamarine',  'Pale sea green, cool and clear as a lagoon.', '#7FFFD4', NULL, 'solid', 'common', 49, 50, 54, 50, 100, false),
    ('opal',        'Opal',        'Misty green swirled with blush pink; no two glances look the same.', '#A8C3BC', '#F8C8DC', 'swirl', 'common', 49, 48, 48, 62, 100, false),
    ('quartz',      'Quartz',      'Crystal clear: you can see the track right through it.', '#F7F7F7', NULL, 'clear', 'common', 52, 52, 45, 49, 100, false),
    ('obsidian',    'Obsidian',    'Volcanic black glass, born on Volcano Run.', '#0B1304', NULL, 'solid', 'common', 48, 44, 58, 50, 100, false),
    ('amber',       'Amber',       'Warm, glowing amber, like sunlight through honey.', '#FFBF00', NULL, 'solid', 'common', 50, 50, 51, 51, 100, false),
    ('coral',       'Coral',       'Bright reef coral, cheerful from start to finish.', '#FF7F50', NULL, 'solid', 'common', 49, 62, 49, 48, 100, false),
    ('turquoise',   'Turquoise',   'A traveller''s lucky charm in vivid turquoise.', '#40E0D0', NULL, 'solid', 'common', 49, 48, 50, 60, 100, false),
    ('peridot',     'Peridot',     'Zesty lime green with a fresh, bright sparkle.', '#B4C424', NULL, 'solid', 'common', 52, 47, 47, 49, 100, false),
    ('moonstone',   'Moonstone',   'Pale moonlight with a soft blue sheen.', '#E3E4FA', '#B0C4DE', 'pearl', 'common', 50, 51, 50, 52, 100, false)
) AS v(slug, name, description, color_primary, color_secondary, pattern, rarity,
       top_speed, acceleration, handling, luck, price_coins, is_starter);

-- Waypoints are {x, y, z}: x/y the ground plan and z the height above the finish
-- line, in track units. Obstacles sit at a fraction (0..1) of the way along.
-- Tracks added after launch come in their own data updates instead, e.g.
-- San Francisco in docs/data_updates/2026-10-05-add-san-francisco.sql.
CREATE TEMP TABLE seed_tracks ON COMMIT DROP AS
SELECT * FROM (VALUES
    ('meadow-loop', 'Meadow Loop', 'easy', 600, 6,
     'A gentle, wide course through rolling grass. Small ramps, a soft sand patch and room to overtake: the place to learn.',
     '[{"x":0,"y":0,"z":40},{"x":36,"y":10,"z":41},{"x":88,"y":24,"z":42},{"x":140,"y":30,"z":41},{"x":187,"y":19,"z":39},{"x":233,"y":-1,"z":35},{"x":280,"y":-10,"z":31},{"x":328,"y":-2,"z":28},{"x":376,"y":16,"z":25},{"x":420,"y":40,"z":25},{"x":462,"y":71,"z":26},{"x":499,"y":110,"z":27},{"x":520,"y":150,"z":28},{"x":518,"y":195,"z":29},{"x":499,"y":243,"z":27},{"x":470,"y":280,"z":25},{"x":430,"y":303,"z":21},{"x":380,"y":315,"z":17},{"x":330,"y":320,"z":13},{"x":283,"y":311,"z":12},{"x":235,"y":295,"z":11},{"x":190,"y":290,"z":12},{"x":145,"y":304,"z":14},{"x":103,"y":329,"z":15},{"x":70,"y":360,"z":15},{"x":48,"y":398,"z":14},{"x":36,"y":441,"z":12},{"x":40,"y":480,"z":9},{"x":65,"y":513,"z":5},{"x":105,"y":541,"z":2},{"x":150,"y":560,"z":0},{"x":203,"y":566,"z":0},{"x":260,"y":563,"z":0},{"x":300,"y":560,"z":0}]',
     '[{"type":"ramp","at":0.12,"span":0.03,"intensity":0.35},{"type":"bumper","at":0.27,"span":0.04,"intensity":0.3},{"type":"sand","at":0.4,"span":0.05,"intensity":0.3},{"type":"ramp","at":0.55,"span":0.03,"intensity":0.4},{"type":"funnel","at":0.68,"span":0.04,"intensity":0.3},{"type":"bumper","at":0.8,"span":0.04,"intensity":0.35},{"type":"sand","at":0.9,"span":0.04,"intensity":0.25}]'),
    ('canyon-drop', 'Canyon Drop', 'medium', 750, 5,
     'Switchbacks down a red-rock canyon. Steep drops launch marbles off ramps into tight funnels and gravel.',
     '[{"x":0,"y":0,"z":160},{"x":58,"y":8,"z":160},{"x":138,"y":20,"z":160},{"x":200,"y":40,"z":147},{"x":234,"y":74,"z":132},{"x":250,"y":115,"z":127},{"x":240,"y":150,"z":126},{"x":185,"y":169,"z":123},{"x":104,"y":180,"z":120},{"x":40,"y":200,"z":118},{"x":6,"y":237,"z":116},{"x":-10,"y":283,"z":115},{"x":0,"y":320,"z":113},{"x":55,"y":340,"z":111},{"x":136,"y":351,"z":108},{"x":200,"y":370,"z":106},{"x":234,"y":404,"z":104},{"x":250,"y":446,"z":89},{"x":240,"y":480,"z":77},{"x":185,"y":499,"z":68},{"x":104,"y":510,"z":64},{"x":40,"y":530,"z":60},{"x":6,"y":567,"z":58},{"x":-10,"y":613,"z":55},{"x":0,"y":650,"z":53},{"x":55,"y":669,"z":50},{"x":136,"y":681,"z":46},{"x":200,"y":700,"z":43},{"x":233,"y":737,"z":40},{"x":249,"y":782,"z":38},{"x":240,"y":820,"z":36},{"x":187,"y":842,"z":33},{"x":110,"y":858,"z":29},{"x":60,"y":880,"z":25},{"x":64,"y":920,"z":15},{"x":96,"y":967,"z":0},{"x":120,"y":1000,"z":0}]',
     '[{"type":"ramp","at":0.08,"span":0.05,"intensity":0.6},{"type":"funnel","at":0.18,"span":0.04,"intensity":0.6},{"type":"sand","at":0.28,"span":0.05,"intensity":0.5},{"type":"bumper","at":0.38,"span":0.05,"intensity":0.5},{"type":"ramp","at":0.46,"span":0.05,"intensity":0.7},{"type":"spinner","at":0.58,"span":0.04,"intensity":0.6},{"type":"funnel","at":0.7,"span":0.04,"intensity":0.6},{"type":"sand","at":0.79,"span":0.05,"intensity":0.5},{"type":"bumper","at":0.87,"span":0.04,"intensity":0.5},{"type":"ramp","at":0.93,"span":0.05,"intensity":0.5}]'),
    ('volcano-run', 'Volcano Run', 'extreme', 900, 4,
     'From the crater rim, spiral down the burning slopes. Spinners, ash and lava-rock bumpers everywhere: only the lucky survive.',
     '[{"x":510,"y":400,"z":260},{"x":505,"y":441,"z":254},{"x":489,"y":489,"z":247},{"x":450,"y":524,"z":240},{"x":400,"y":543,"z":233},{"x":342,"y":538,"z":225},{"x":287,"y":513,"z":217},{"x":246,"y":463,"z":209},{"x":224,"y":400,"z":200},{"x":232,"y":330,"z":191},{"x":264,"y":264,"z":182},{"x":325,"y":216,"z":172},{"x":400,"y":191,"z":162},{"x":483,"y":202,"z":152},{"x":559,"y":241,"z":142},{"x":614,"y":312,"z":131},{"x":641,"y":400,"z":120},{"x":628,"y":495,"z":109},{"x":582,"y":582,"z":98},{"x":500,"y":644,"z":87},{"x":400,"y":674,"z":76},{"x":292,"y":659,"z":65},{"x":194,"y":606,"z":54},{"x":126,"y":513,"z":43},{"x":93,"y":400,"z":33},{"x":111,"y":280,"z":23},{"x":171,"y":171,"z":14},{"x":290,"y":101,"z":5},{"x":400,"y":60,"z":0}]',
     '[{"type":"spinner","at":0.06,"span":0.04,"intensity":0.8},{"type":"sand","at":0.15,"span":0.06,"intensity":0.6},{"type":"bumper","at":0.24,"span":0.05,"intensity":0.8},{"type":"ramp","at":0.33,"span":0.04,"intensity":0.8},{"type":"funnel","at":0.42,"span":0.04,"intensity":0.9},{"type":"sand","at":0.51,"span":0.06,"intensity":0.7},{"type":"spinner","at":0.6,"span":0.04,"intensity":0.9},{"type":"ramp","at":0.69,"span":0.04,"intensity":0.8},{"type":"bumper","at":0.77,"span":0.05,"intensity":0.8},{"type":"funnel","at":0.85,"span":0.04,"intensity":0.9},{"type":"spinner","at":0.93,"span":0.04,"intensity":0.7}]')
) AS v(slug, name, difficulty, length_m, lane_count, description, waypoints, obstacles);

-- Each row is inserted only if no existing row has the same slug OR the same
-- name (case-insensitive). Existing rows are left exactly as they are.
INSERT INTO marbles (slug, name, description, color_primary, color_secondary, pattern, rarity,
                     top_speed, acceleration, handling, luck, price_coins, is_starter)
SELECT s.slug, s.name, s.description, s.color_primary, s.color_secondary, s.pattern,
       s.rarity::marble_rarity, s.top_speed, s.acceleration, s.handling, s.luck,
       s.price_coins, s.is_starter
FROM seed_marbles s
WHERE NOT EXISTS (
    SELECT 1 FROM marbles m WHERE m.slug = s.slug OR lower(m.name) = lower(s.name)
)
ON CONFLICT DO NOTHING;

INSERT INTO tracks (slug, name, description, difficulty, length_m, lane_count, waypoints, obstacles)
SELECT s.slug, s.name, s.description, s.difficulty::track_difficulty, s.length_m, s.lane_count,
       s.waypoints::jsonb, s.obstacles::jsonb
FROM seed_tracks s
WHERE NOT EXISTS (
    SELECT 1 FROM tracks t WHERE t.slug = s.slug OR lower(t.name) = lower(s.name)
)
ON CONFLICT DO NOTHING;
