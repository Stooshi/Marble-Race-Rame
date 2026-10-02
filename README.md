# Marble Race — Backend

Backend and frontend for **Marble Race**, a multiplayer marble racing game. Players collect marbles, enter them into races on different tracks, and watch the race play out live with everyone else.

**Stack:** Node.js (≥ 20) · Express 5 · PostgreSQL (≥ 13) · Socket.io 4 · JWT auth. The React frontend lives in [`client/`](client/README.md).

## How a race works

1. **Lobby.** A player creates a race on a track (`POST /api/races`). Others join with one of their marbles (`POST /api/races/:id/join`). By default a race has **20 marbles** (races can be set to 10–20).
2. **Decided once, on the server.** When the creator starts the race (or its `scheduled_at` time arrives), the server:
   - fills any empty slots up to `min_marbles` with house bot marbles,
   - draws lanes at random and snapshots each marble's stats and the track layout,
   - picks a random seed and runs the deterministic simulator (`src/game/simulator.js`),
   - sets the total race length (**90 seconds** by default; configurable between 50 and 90) and scales the timeline so the last marble crosses the line at exactly that time,
   - records each marble's **halfway split time** on the same timeline,
   - stores the seed, duration and finishing order in one transaction.
3. **Streamed to everyone.** After a short countdown the server sends the same frames to every client in the race room over Socket.io (10 frames per second by default). Clients only draw what they receive; they can't change the result.
4. **Finished.** At the end the race is marked `finished`, coins are paid out, and the results become visible through the REST API.

The outcome is stored when the race is decided, but the API hides finishing positions until the race has finished. Because the simulation is deterministic (seeded PRNG, no `Math.random`, no wall clock), the server can:

- **resume a race after a restart.** On boot it re-simulates any race in `countdown` or `running` and carries on streaming from the right point, or finalizes the race if its end time has already passed.
- **serve replays without storing frames.** `GET /api/races/:id/replay` re-creates every frame from the seed plus the stored snapshots.

## Quick start

```bash
cp .env.example .env            # then edit DATABASE_URL and JWT_SECRET
npm install

createdb marble_race            # or create it however you like
npm run db:migrate              # applies docs/database_schema.sql (safe to re-run)

npm run dev                     # node --watch; or `npm start`
curl localhost:5000/health
```

`npm test` runs the unit tests for the simulator and the stream timing. They don't need a database.

### Environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `5000` | The frontend expects `http://localhost:5000` by default |
| `NODE_ENV` | `development` | `production` requires a `JWT_SECRET` of at least 32 characters |
| `CORS_ORIGIN` | `*` | Comma-separated origins, used for both HTTP and Socket.io |
| `DATABASE_URL` | `postgres://localhost:5432/marble_race` | |
| `DATABASE_SSL` | `false` | `true` for managed Postgres that requires TLS |
| `DATABASE_POOL_MAX` | `10` | |
| `JWT_SECRET` | dev-only fallback | **Required in production** |
| `JWT_EXPIRES_IN` | `7d` | Any [`ms`](https://github.com/vercel/ms) string |
| `BCRYPT_ROUNDS` | `12` | |
| `RACE_COUNTDOWN_MS` | `5000` | Time between the race being decided and the start |
| `RACE_MIN_DURATION_MS` / `RACE_MAX_DURATION_MS` | `90000` / `90000` | Race length range, within 50000–90000. Equal values give fixed-length races |
| `RACE_DEFAULT_MARBLES` | `20` | Field size when a race is created without `min_marbles` / `max_marbles` |
| `RACE_TICK_RATE_HZ` | `10` | Frames streamed per second |
| `REWARD_COINS_PODIUM` | `100,50,25` | Coins for 1st, 2nd, 3rd (human players only) |
| `REWARD_COINS_PARTICIPATION` | `10` | Coins for every human finisher |

### Making an admin

Admins can create and edit tracks and marbles. To make a user an admin, update the database directly:

```sql
UPDATE users SET role = 'admin' WHERE username = 'your_name';
```

## Project layout

```
client/                    React frontend (see client/README.md)
docs/database_schema.sql   Full PostgreSQL schema + seed data (12+10 marbles, 3 tracks)
scripts/migrate.js         Applies the schema file
src/server.js              Entry point: HTTP + Socket.io, recovery, scheduler, shutdown
src/app.js                 Express app (middleware + routes)
src/config/                Environment parsing
src/db/                    pg Pool + transaction helper
src/middleware/            JWT auth (required/optional/admin), error handler
src/routes/                auth, users, races, tracks, marbles
src/game/rng.js            Seedable PRNG (mulberry32)
src/game/simulator.js      Deterministic race simulation → results + frames + events
src/game/raceService.js    Race lifecycle in the database (decide, finalize, cancel)
src/game/raceManager.js    Timers, streaming, late-join snapshots, crash recovery, scheduler
src/sockets/               Socket.io server and client events
test/                      node:test unit tests
```

## REST API

All endpoints are under `/api`. Request and response bodies are JSON. Authenticated endpoints need `Authorization: Bearer <token>`. Errors look like `{ "error": "message", "details"?: {...} }`.

### Auth

| Method | Path | Auth | Body / notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | – | `{ username, email, password, display_name? }` → `{ token, user }` (users start with 500 coins) |
| POST | `/auth/login` | – | `{ login, password }`, where `login` is a username or email → `{ token, user }` |
| GET | `/auth/me` | ✔ | The current user |

The auth endpoints are rate-limited to 20 requests per 15 minutes per IP.

### Users

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/users/me` | ✔ | Private profile + stats |
| PATCH | `/users/me` | ✔ | `{ display_name?, avatar_url?, email?, password?, current_password? }`. Changing email or password needs `current_password` |
| GET | `/users/me/marbles` | ✔ | Owned marbles plus the free starter marbles |
| PUT | `/users/me/marbles/:marbleId/favorite` | ✔ | `{ is_favorite }` |
| GET | `/users/leaderboard` | – | `?sort=wins\|podiums\|races_played\|coins_won&limit&offset` |
| GET | `/users/:id` | – | Public profile + stats |
| GET | `/users/:id/races` | – | Finished race history with halfway splits (`limit`, `offset`) |
| GET | `/users/:id/track-records` | – | Per track: races, wins, podiums, best/average position, best finish, best halfway split, and the overall track record |

### Races

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/races` | – | `?status=lobby\|countdown\|running\|finished\|cancelled&track_id&limit&offset` |
| POST | `/races` | ✔ | `{ track_id \| random_track: true, name?, min_marbles? (10–20, default 20), max_marbles? (10–20, default 20), entry_fee_coins?, fill_with_bots? (default true), scheduled_at?, marble_id? }`. With `random_track` the server picks an active track. With `marble_id`, the creator joins straight away |
| GET | `/races/:id` | – | Race + entries. Positions and times are only included once the race is `finished`. Includes `live` progress while running |
| POST | `/races/:id/join` | ✔ | `{ marble_id }`. You must own the marble (or it is a starter). One entry per player, charges the entry fee |
| DELETE | `/races/:id/join` | ✔ | Leave a lobby race. The entry fee is refunded |
| POST | `/races/:id/start` | ✔ creator/admin | Decides the race and starts the countdown → `202` |
| POST | `/races/:id/cancel` | ✔ creator/admin | Lobby races only. Entry fees are refunded |
| GET | `/races/:id/results` | – | `409` until the race is finished. Each result includes `split_time_ms`, `gap_to_winner_ms` and a `comparison` (see below) |
| GET | `/races/:id/replay` | – | Full frames, events and results for a finished race |

If `fill_with_bots` is `false`, starting a race with fewer than `min_marbles` entries fails with `400`.

Each result's `comparison` compares the race with earlier finished races on the same track:

| Field | Meaning |
| --- | --- |
| `previous_races_on_track` | How many times the player had raced this track before |
| `previous_best_time_ms` / `previous_best_split_ms` | The player's best finish and halfway split before this race (`null` on a first run) |
| `previous_best_position` / `previous_avg_position` | Best and average finishing position before this race |
| `previous_track_record_ms` / `previous_track_record_split_ms` | Fastest finish and split on the track by anyone, before this race |
| `is_personal_best` / `is_split_personal_best` | This race beat the player's previous best (always true on a first run) |
| `is_track_record` | The winner beat the previous track record |

### Tracks

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/tracks` | – | `?difficulty=easy\|medium\|hard\|extreme` |
| GET | `/tracks/:idOrSlug` | – | Full geometry (`waypoints`, `obstacles`) + record time |
| POST | `/tracks` | admin | `{ slug, name, length_m, lane_count?, difficulty?, description?, waypoints?, obstacles?, thumbnail_url? }` |
| PATCH | `/tracks/:id` | admin | Partial update. Races already decided keep their snapshot |
| DELETE | `/tracks/:id` | admin | Soft delete (`is_active = false`) |

`waypoints` is an ordered polyline `[{ "x": 0, "y": 0 }, …]` in track units. Clients map `progress` (0–1) along this line. `obstacles` are placed by progress: `{ "type": "bumper|ramp|sand|spinner|funnel", "at": 0.35, "span": 0.04, "intensity": 0.6 }`.

### Marbles

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/marbles` | optional | `?rarity=`. Signed-in users also get an `owned` flag on each marble |
| GET | `/marbles/:id` | – | Marble + lifetime race stats |
| POST | `/marbles/:id/purchase` | ✔ | Buy with coins |
| POST | `/marbles` | admin | Create a marble (stats `top_speed`, `acceleration`, `handling`, `luck` from 1 to 100) |
| PATCH | `/marbles/:id` | admin | Partial update |
| DELETE | `/marbles/:id` | admin | Soft delete |

Marble stats shift the odds; they don't decide the race. `top_speed` sets cruising speed, `acceleration` sets how fast a marble recovers after slowing down, `handling` reduces speed lost on obstacles, and `luck` makes bad bounces rarer and boosts more likely.

## Real-time API (Socket.io)

Connect to the same host and port. Authentication is optional; spectators can watch anonymously.

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000', { auth: { token } });

socket.emit('race:watch', { raceId }, (state) => {
  // state.status: 'lobby' | 'countdown' | 'running' | 'finished' | 'cancelled'
  // If the race is live, state.meta is the stream header and state.p/l/s is the current frame,
  // so a client that joins late can draw straight away.
});

socket.on('race:start', (meta) => { /* track, entries[index], durationMs, tickMs */ });
socket.on('race:frame', ({ frame, t, p, l, s, events }) => { /* draw */ });
socket.on('race:finished', ({ results }) => { /* podium */ });
```

**Client → server** (each takes an optional ack callback)

| Event | Payload | Purpose |
| --- | --- | --- |
| `lobby:subscribe` / `lobby:unsubscribe` | – | Receive updates to the race list |
| `race:watch` | `{ raceId }` | Join a race room. The ack returns the current state |
| `race:unwatch` | `{ raceId }` | Leave the race room |

**Server → client**

| Event | Payload |
| --- | --- |
| `lobby:race_created` | Race summary |
| `lobby:race_updated` | `{ raceId, status, … }` |
| `race:updated` | Entries changed in the lobby |
| `race:countdown` | `{ raceId, startsAt, countdownMs, meta }` |
| `race:start` | `meta`: `{ raceId, track, entries[], durationMs, tickMs, tickRateHz, startsAt }` |
| `race:frame` | `{ raceId, frame, t, p[], l[], s[], events? }` |
| `race:finished` | `{ raceId, durationMs, results[] }` |
| `race:cancelled` | `{ raceId }` |

Frame arrays are indexed by `meta.entries[i].index`:

- `t`: milliseconds since the start
- `p[i]`: progress along the track, from 0 to 1 (exactly `1` once finished)
- `l[i]`: lateral offset, from −1 to 1
- `s`: current standings as entry indexes, leader first
- `events`: `{ t, i, type: 'bounce' | 'boost' | 'stumble', obstacle? }`, for effects and commentary

Frames are sent as volatile messages: a client that falls behind skips frames instead of buffering them. Clients should interpolate between frames. The final frame is always delivered.

## Database

`docs/database_schema.sql` is the source of truth. It is idempotent and seeds 22 marbles and 3 tracks.

| Table / view | Purpose |
| --- | --- |
| `users` | Accounts, roles, coin balance |
| `marbles` | Marble catalog with stats, rarity and price. `is_starter` marbles are free for everyone |
| `user_marbles` | Ownership and favourites |
| `tracks` | Geometry (`waypoints`) and `obstacles` as JSONB |
| `races` | Lifecycle state, seed, chosen duration, track snapshot. Checks enforce 10–20 marbles and 50–90 s |
| `race_entries` | One marble per row (bots have `user_id NULL`), lane, stat snapshot, result, halfway split, coins awarded |
| `user_stats` (view) | Races played, wins, podiums, average position, coins won, best finish and best halfway split |

Running `npm run db:migrate` again upgrades an existing database. For example, it adds the `split_time_ms` column if it is missing.
| `marble_stats` (view) | Per-marble win record |

## Scaling notes

Race timers live in the memory of the process that started the race, so run **one instance** of the server. Running several instances would need:

- the [`@socket.io/redis-adapter`](https://socket.io/docs/v4/redis-adapter/), so that broadcasts reach sockets connected to other instances, and
- a single owner for each race's timers (for example a Postgres advisory lock taken in `raceManager.track` and in the scheduler), so that only one instance streams each race.

Because the race result is fixed by its seed, moving a race to another instance is safe. That instance re-simulates the race and carries on streaming, the same way it does after a restart.
