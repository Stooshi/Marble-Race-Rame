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
npm run db:migrate              # optional: the server also does this on every start

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
| `PAYMENTS_TEST` | – | `true`: an instant test payment provider (never in production) |
| `STRIPE_SECRET_KEY` | – | Stripe secret key. `sk_test_…` works at once; a live key (`sk_live_…`) is refused unless `STRIPE_ALLOW_LIVE=true` |
| `STRIPE_WEBHOOK_SECRET` | – | The signing secret (`whsec_…`) of the webhook endpoint `/api/payments/stripe/webhook` |
| `PUBLIC_SITE_URL` | `http://localhost:5173` | The website, where Stripe sends players back (`/purchases`, `/checkout`) |
| `STRIPE_ALLOW_LIVE` | – | `true` only when going live with real money |
| `STRIPE_TAX` | on | `off` turns Stripe Tax off (only if the Stripe account has no tax set up) |
| `STRIPE_TAX_CODE` | `txcd_10000000` | Stripe tax code for coin packs (electronically supplied services) |
| `STRIPE_TOS_IN_CHECKOUT` | – | `true`: Stripe's page also asks to accept the terms (needs the terms URL set in Stripe) |

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
| POST | `/auth/guest` | – | "Play free": a guest account to race with at once → `{ token, user }` (`is_guest: true`) |
| POST | `/auth/claim` | ✔ guest | A guest saves their marble: `{ username, email, password, marketing_opt_in? }`, keeping coins and marbles |

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

`waypoints` is an ordered polyline `[{ "x": 0, "y": 0 }, …]` in track units. Clients map `progress` (0–1) along this line. `obstacles` are placed by progress: `{ "type": "bumper|ramp|sand|spinner|funnel", "at": 0.35, "span": 0.04, "intensity": 0.6 }`. A `cable_car` is a moving hazard on a timetable: `{ "type": "cable_car", "at": 0.59, "span": 0.03, "intensity": 0.9, "period": 18, "duty": 0.3 }` sends a car every `period` seconds of simulated time, blocking the street for `duty` of that time. Each race starts the timetable at a different point, drawn from the race seed. Four tracks ship today: Meadow Loop (easy), Canyon Drop (medium), San Francisco (hard, with a cable car) and Volcano Run (extreme).

### Marble appearance

A player's look is purely cosmetic: it never affects how their marble races. Only curated options are accepted.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/appearance/options` | – | The active curated `colors` (key, name, hex), `surfaces` and `effects` |
| GET | `/users/me/appearance` | ✔ | Your look, plus `displayLabel` (your username) |
| PUT | `/users/me/appearance` | ✔ | `{ color?, surface?, effect? }` as option keys. Setting a custom `label` is refused until a word filter exists |

Every player gets a starting look on sign-up: a solid marble with no effect, in a colour picked from their account ID.

### Marble collection, payments and scoreboards

The collection (Collection 1 · Schoolyard Classics: 10 designs in 5 shades, 50 items, plus the monthly limited edition) is defined once in `client/src/shared/marbles/catalog.json`, which the server, the website and the phone apps all read. Its 3D looks are in `client/src/shared/marbles/materials.js` (three.js only, no React or DOM). Looks only: the race engine never reads any of it.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/collection` | optional | Every item with its live First Edition count and whether it's on sale; `owned` slugs when signed in |
| GET | `/collection/bag` | ✔ | The Marble Bag: collection copies, Originals (old plain marbles), sets, Shooter |
| PUT | `/collection/shooter` | ✔ | `{ item }` or `{ original }`: the look the player races in |
| POST | `/collection/:slug/buy` | ✔ | Buy one copy with coins. Copies 1–500 are the numbered First Edition |
| GET | `/collection/certificate/:code` | – | A copy's certificate by its code: the Marble ID and copy number, e.g. `SC105-000037` |
| GET | `/collection/bags` | optional | `?shade=`: the Starter Bag and Full Collection Bag in one shade (Classic by default), what's in them and their price for you |
| POST | `/collection/bags/:bag/buy` | ✔ | `{ shade }`: buy a bag (`starter` or `full`): every marble in it in that shade, each a numbered copy |
| GET | `/collection/id/:id` | – | The marble a Marble ID names: `SC105`, `sc105`, `SC 105` or `#SC105` |
| GET | `/payments` | – | Coin packs and which payment providers are live |
| POST | `/payments/checkout` | ✔ | `{ productId, provider }`: start buying a coin pack (Stripe on the web; placeholder until there are keys) |
| POST | `/payments/receipt` | ✔ | `{ provider: 'apple' \| 'google', receipt }`: an app store purchase (placeholder until the apps exist) |
| GET | `/scoreboard` | optional | `?board=season\|all\|friends`: players ranked by coins earned racing (places, personal bests, daily goals, streaks) |
| GET | `/races/showcase` | – | A recent close race for the landing page's replay |

**Marble IDs.** Every item has one: the collection's two letters (SC = Schoolyard Classics; later collections get their own, e.g. HH, MG, AG; LE for the limited editions), the design's number 01–10 and the shade's 1–5 (Classic, Ocean, Forest, Berry, Sunset), no dashes: SC105 is the Champion Shooter in Sunset. The shop finds a marble by ID however it's typed. The next collections and their dates are in `catalog.json` → `comingSoon`.

**Showcase marbles.** In beginner races (every player in the race has finished fewer than 20 races) the computer players race in designed marbles from the collection: about 6 Common/Uncommon, 3 Rare/Epic and 1 Legendary, different each race; the rest stay plain. The mix lives in `catalog.json` → `showcase`. They are drawn after the race is set up, stored apart (`house_looks`), and never given to the race engine, so they can't change a result; the track report's Fairness part checks that every marble tier wins its share. Computer players carry a small "CPU" tag; after a race, tapping any marble shows its name, rarity and a way to the shop.

Every payment provider ends in the same server step (`src/payments/index.js` → `grant`), which adds a pack's coins exactly once, as bought coins. `PAYMENTS_TEST=true` turns on an instant test provider outside production.

**Stripe (the website)** — `src/payments/stripe.js`. The checkout asks for immediate delivery + the loss of the 14-day withdrawal right and the terms (the exact text is stored with the payment; `client/src/shared/payments/consent.json`), gives the order a number (MS-1001…) and sends the player to Stripe Checkout: the pack's USD price shown in their own currency (Adaptive Pricing), VAT included (Stripe Tax, `tax_behavior: inclusive`), with card / Apple Pay / Google Pay as the Stripe dashboard allows. Coins are added **only** by the webhook (`POST /api/payments/stripe/webhook`, signature checked against the raw body): each event id is recorded in `stripe_events` in the same transaction, and `grant` pays a payment once. Refunds (from the back office's Payments page or the Stripe dashboard) and disputes take the coins back in proportion (`payment_refunds`, once per refund; coins already spent are recorded as short), logged in the coin ledger (`pack-refund`) and the audit log. Players see their orders, amounts charged and Stripe receipts on `/purchases`. Webhook events to send: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `refund.created`, `refund.updated`, `charge.dispute.created`. Local testing: `stripe listen --forward-to localhost:5000/api/payments/stripe/webhook`.

### The coin economy

Every number is in `client/src/shared/economy.json` (the server and the website read it); the logic is `src/economy/index.js`.

One currency: **coins**, earned by racing or bought in coin packs; never cashed out.

- **Races** pay 15 for taking part, plus a finishing bonus: 50 for 1st, 30 for 2nd, 20 for 3rd, 5 for 4th–10th, nothing for 11th–20th.
- **Daily limit**: full coins for the first 10 races a day, then 5 coins a race. Days run midnight to midnight UTC.
- **Daily goal**: 5 races in a day pays a flat 35. The streak (days in a row the goal was met) is shown but pays nothing.
- **Starting bag**: 650 coins, guests too.
- **Prices** by rarity (`catalog.json`): Common 1,000, Uncommon 2,500, Rare 6,000, Epic 12,000, Legendary 25,000. Limited editions are priced in coins too.
- **Bags**, one shade the buyer picks: Full Collection Bag 30% off the 10 marbles (41,700), Starter Bag 15% off the 3 Commons (2,600), rounded to the nearest 100; owning some makes the rest cheaper at the same discount.
- **Coin packs** for real money (`client/src/shared/payments/packs.json`): $5 = 5,000, $10 = 10,500, $25 = 27,500, $50 = 57,500.
- Target: 5 races a day buys the first Common on day 2–3, then about one Common a week (checked in `test/economy.test.js`).
- **Earned and bought coins** are counted apart (`users.coins_earned`, `users.coins_bought`); scoreboards count earned coins only.
- **The coin ledger** (`coin_ledger`) records every change to a player's coins, with the balance after it. `docs/data_updates/2027-01-03-coins-only.sql` multiplied every coin amount from before by 10, turned credits into coins (1 credit = 1,000 coins, as bought coins) and wrote the history from before.

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/economy` | – | The economy's numbers and the coin packs |
| GET | `/economy/me` | ✔ | Today: races, the daily goal, the streak, full-pay races left, coins (earned and bought) |
| GET | `/economy/races/:id` | ✔ | What you earned in one race, line by line |
| GET | `/economy/ledger` | ✔ | Your last 100 ledger lines |

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
| `marble_appearances` | One cosmetic look per player: colour, surface, effect and a label kept empty for now |
| `marble_colors`, `marble_surfaces`, `marble_effects` | Curated look options. Add one with a line in the schema file; retire one with `is_active = false` |
| `data_updates` | One-time data changes already applied |
| `user_stats` (view) | Races played, wins, podiums, average position, coins won, best finish and best halfway split |

The backend applies this file automatically on every start (`src/db/migrate.js`), so a new database sets itself up on the first deploy. It runs in one transaction and only adds what is missing: tables, columns, indexes, and seed marbles and tracks whose slug and name are not already taken. Existing rows are never changed or deleted. If applying the file fails, everything is rolled back, the error is logged, and the server keeps running on the existing database. `npm run db:migrate` runs the same step by hand.

Changes to rows that already exist go in `docs/data_updates/*.sql` instead. Each file runs once, in name order, inside the same transaction, and is recorded in the `data_updates` table so it never runs again. For example, `2026-10-04-restore-marbles-tracks.sql` copied the catalog's stats, descriptions and track layouts onto the production rows.

Every boot writes a short report to the logs, with each line starting `[db-setup]`:

```
[db-setup] Applying docs/database_schema.sql
[db-setup] OK in 30 ms
[db-setup] Data update 2026-10-04-restore-marbles-tracks: already applied on 2026-10-04
[db-setup] Rows: users 2, marbles 22, tracks 3, user_marbles 1, races 1, race_entries 20, marble_appearances 2
[db-setup] Appearance options: 16 colours, 7 surfaces, 5 effects
[db-setup] Columns: all 106 expected columns present
[db-setup] Race statuses: lobby, countdown, running, finished, cancelled [enum race_status] — match the code
```
| `marble_stats` (view) | Per-marble win record |

## Scaling notes

Race timers live in the memory of the process that started the race, so run **one instance** of the server. Running several instances would need:

- the [`@socket.io/redis-adapter`](https://socket.io/docs/v4/redis-adapter/), so that broadcasts reach sockets connected to other instances, and
- a single owner for each race's timers (for example a Postgres advisory lock taken in `raceManager.track` and in the scheduler), so that only one instance streams each race.

Because the race result is fixed by its seed, moving a race to another instance is safe. That instance re-simulates the race and carries on streaming, the same way it does after a restart.

## Deployment

The backend deploys to Railway automatically on every push to the `Main` branch.
Pushes to other branches do not deploy.
