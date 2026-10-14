# 2. Code map

*Last updated 14 Oct 2026 (Main 69b4a58).* Where everything is, and where to look to fix something. Paths are relative to the repository root.

## Find it fast

| I want to… | Look in |
|---|---|
| Change how much a race pays, the daily goal, starting coins or bag discounts | `client/src/shared/economy.json` (read by server and website) |
| Change marble prices, designs, shades or the collection | `client/src/shared/marbles/catalog.json`, then `client/src/shared/marbles/badge.js` for how a design looks |
| Change coin packs (amounts and prices) | `client/src/shared/payments/packs.json` |
| Change the checkout consent wording | `client/src/shared/payments/consent.json` (and bump its `version`) |
| Fix how a race is decided | `src/game/raceService.js` (`decide`), `src/game/runSimulation.js`, `src/game/physicsSimulator.js` (new engine), `src/game/simulator.js` (classic engine). **Read [Game rules](04-game-rules.md) first: results must never change** |
| Fix live streaming, countdowns or the rematch | `src/game/raceManager.js` |
| Fix coins not added or wrong | `src/economy/index.js` (`change`, `payRace`) and the `coin_ledger` table |
| Fix the shop or First Edition numbers | `src/marbles/collection.js` |
| Fix a Stripe payment | `src/payments/stripe.js`, `src/payments/index.js`, `src/routes/payments.js` |
| Fix a back-office page | `client/src/admin/AdminApp.jsx` (pages), `src/routes/admin.js` (data and actions), `src/admin/session.js` (login) |
| Fix friend rooms | `src/routes/rooms.js`, `client/src/site/pages/RoomPage.jsx` |
| Fix how a track looks | `client/src/three/` (see the 3D section below). Drawing only, never the race |
| Add a new track | `src/tracks/README.md` (the kit guide), then `scripts/physics-track-sql.js` and a data update |
| Fix sound or music | `client/src/sound/engine.js`, `client/src/sound/settings.js`, files in `client/public/audio/` |
| Change legal text | `client/src/site/pages/LegalPage.jsx` |
| Change an email's text | `src/email/templates.js` |
| Change the app icon or splash | `client/assets/*.png`, then `npx capacitor-assets generate --ios --android` |
| Change the database | Add columns or tables to `docs/database_schema.sql` (additions only). To change existing rows, add a new file in `docs/data_updates/` |

---

## Repository root

| Path | What it is |
|---|---|
| `package.json` | The server's dependencies and scripts: `npm start`, `npm run dev`, `npm run db:migrate`, `npm run report -- <slug>`, `npm test` |
| `README.md` | Server REST and socket API reference, quick start, scaling notes |
| `src/` | **The game server** (see below) |
| `client/` | **The website and the apps** (see below) |
| `docs/` | This documentation, `database_schema.sql` (the schema) and `data_updates/` (one-time SQL changes) |
| `scripts/` | Command-line tools: track reports, fingerprints, track SQL, audio conversion, the clear-track check |
| `test/` | Server tests (`node --test`) |
| `reports/` | Committed output of the track reports (one folder per track: `index.html`, JSON, screenshots) |
| `music-inbox/` | Moses's original audio files. `scripts/convert-audio.sh` turns them into `client/public/audio/` |
| `vercel.json` | (root) Vercel settings for the website project |

## The server: `src/`

**Starting up:**
- `server.js`: builds the app and socket server, checks the database, then runs `migrate()`, `raceManager.recover()`, the race scheduler and the daily IP trimming. Shuts down cleanly on SIGTERM.
- `app.js`: Express setup (helmet, CORS, `/health`). The Stripe webhook is mounted **before** the JSON parser, because it needs the raw body. The `/api/*` routers come after.
- `version.js`: `VERSION` (commit, `codeFingerprint`, engine versions, start time), shown on `/health`.
- `config/index.js`: every environment setting in one frozen object, including CORS (`isSiteOrigin`) and Stripe. It refuses to start in production without a `JWT_SECRET` of at least 32 characters.

**`db/`:**
- `index.js`: the Postgres pool, `query`, and `withTransaction(fn)`.
- `migrate.js`: `migrate()` runs at every start (see the [runbook](05-runbook.md#data-updates)). It applies `docs/database_schema.sql`, then any `docs/data_updates/*.sql` not yet in the `data_updates` table, all in one transaction under an advisory lock. Afterwards it logs `[db-setup]` health lines.

**`game/`: races.**
- `rng.js`: the seeded random-number generator (mulberry32). The engines never use `Math.random` or the clock.
- `skill.js`: skill is the player's, not the marble's. `skillStats(skill)` sets all four engine stats to the skill. Also `HOUSE_SKILLS` (the computer players, 45–55) and `STARTING_SKILL` (50).
- `simulator.js`: the **classic** 1-D engine (`SIMULATOR_VERSION = 'solid-marbles-1'`). Old races are **re-simulated** from their seed, so this file must never change behaviour.
- `physicsSimulator.js`: the **new physics** engine (`PHYSICS_VERSION`), used by every track with `tracks.physics`. Its races are stored as replays (`race_replays`), so tuning it never changes a past race. The comments at the top of this file and `routes/physics.js` still say real races use the classic engine; that is no longer true.
- `runSimulation.js`: picks the engine; `packReplay` gzips a physics race.
- `simulationPool.js` + `simulationWorker.js`: run simulations in a worker thread, falling back to the main thread.
- `raceService.js`: the database side of a race:
  - `decide()` fills CPU players, sets lanes and skills, dresses showcase looks, picks lighting, simulates, writes results, and sets `countdown`;
  - `finalize()` marks the race finished and pays coins;
  - `cancel()`;
  - `getResults()`.
- `raceManager.js`: the live side (a singleton):
  - countdown timers and frame streaming over socket.io;
  - the scheduler (every 5 s);
  - recovery after a restart;
  - the rematch (`next_race_id`);
  - `afterFinish`, a hook that `routes/rooms.js` sets when it loads.
- `raceSession.js`: solo or group race; whether "race again" is allowed early.
- `raceStatus.js`: the statuses. They must match the `race_status` enum.
- Track shapes:
  - `physicsTracks.js`: the hand-built physics tracks plus every kit track from `src/tracks`. It is the single list of physics tracks.
  - `trackShape.js`, `trackGeometry.js`: centre lines; must match the client's `three/trackModel.js` (a test checks this).
  - `trackFeatures.js`: moving obstacles and their timetables.
- `appearance.js`: the old colour, surface and effect look. Cosmetic only.

**`tracks/` and `trackKit/`: building tracks.**
- `src/tracks/<slug>.js`: one file per kit track, listed in `src/tracks/index.js`. `src/tracks/variety/` holds test tracks that are never in the database.
- `src/tracks/README.md`: the guide for building a track.
- `trackKit/`: the kit itself:
  - `index.js`: `track(spec)`, plus a recipe check that throws an error naming the broken rule;
  - `parts.js`: shapes, obstacles and features, with proven numbers;
  - `openings.js`, `layouts.js`: proven starts and section orders;
  - `recipe.js`: the rules;
  - `mirror.js`;
  - `lighting.js`: lighting chosen per race from its seed; looks only.

**`report/`: the track reports** (see [Game rules: fairness](04-game-rules.md#fairness-checks)).
- `analyze.js`: measures one race.
- `batch.js`: runs batches of races on worker threads.
- `summarize.js`: pass/fail lines; `TARGETS` holds every threshold.
- `overtakes.js`, `variety.js` (sameness check), `startLook.js` + `startLooks.json` (first-3-seconds check).
- `html.js`: writes the report page.

**`marbles/`: the collection.**
- `catalog.js`: reads `catalog.json`. Builds items (design × shade), IDs like `SC105` and certificate codes like `SC105-000037` (gifts: `SC105-G00012`).
- `collection.js`:
  - buying (`buy`, which hands out First Edition numbers), gifts (`grantCopy`) and bags;
  - the Marble Bag, the Shooter, certificates, find by ID;
  - `pickRacingMarble`.
- `showcase.js`: dresses computer players in collection looks in beginner races. It uses its own randomness, never the race seed.

**`economy/index.js`: coins.**
- `change()` is the **only** way coins move: it updates the balance and writes a `coin_ledger` line.
- Also: `payRace`, `spend`, `opening`, `placeCoins`, `raceLines`, `streakAfter`, `bagPrice`, and `refundEntryFee` (for fees paid before entry fees were switched off).

**`payments/`:**
- `index.js`: providers (stripe, apple, google, test). `grant()` adds a pack's coins once. Also `checkout()` (with consent and order number), `stripeEvent()`, `refund()`, `ordersOf`/`orderOf`. Apple and Google are placeholders.
- `stripe.js`: Checkout sessions, webhook verification, `handleEvent()` (paid, expired, refund, dispute), `revoke()` (takes coins back in proportion), `requestRefund()`. Live keys are refused unless `STRIPE_ALLOW_LIVE`.

**Back office and accounts:**
- `admin/session.js`: the back-office login (separate admin token, TOTP 2-step code, 30-minute idle timeout, 5 wrong codes give a 15-minute pause kept in memory).
- `admin/totp.js`: RFC 6238 codes and the encrypted secret.
- `security/index.js`: `record()` stores IP and country for sign-up, login and purchase. `trimIps()` blanks IPs older than 90 days and runs daily. Countries are looked up offline (geoip-country).
- `account/index.js`: `exportData()` ("Download my data") and `deleteAccount()` (anonymises, keeps payments and race results).
- `email/index.js`: sends email through Brevo when `BREVO_API_KEY` is set (`enabled()`, `send()`). Tests swap the transport.
- `email/templates.js`: the emails' HTML (password reset).
- `email/unsubscribe.js`: signed unsubscribe links and RFC 8058 one-click headers.
- `account/passwordReset.js`: "Forgot your password?":
  - `request()` emails a one-time link, says nothing about whether the account exists, and sends at most 3 an hour;
  - `reset()` sets the new password, ends older logins and back-office sessions.

**`middleware/` and `utils/`:**
- `auth.js`: `requireAuth`, `optionalAuth`, `requireAdmin`, `loadUser` (rejects suspended, deleted and back-office tokens).
- `errorHandler.js`: 404s and JSON errors; maps Postgres errors to 4xx.
- `utils/httpError.js`, `utils/jwt.js`, `utils/validate.js` (unknown keys are dropped).

**`routes/`** (everything under `/api`):

| File | Covers |
|---|---|
| `auth.js` | Sign-up (refuses under-13s), guest, claim (guest → account), login, me; password reset (`GET /password-reset`, `POST /forgot`, `POST /reset`) |
| `users.js` | Profile, settings, news-by-email, unsubscribe, data export, delete account, appearance, the old marble bag, leaderboard, public profiles |
| `races.js` | Lobby list, create, join and leave (free), next race, start, cancel, results, replay, showcase race |
| `rooms.js` | Friend rooms (create, join, leave, track, remove, start, close) and `afterRace` |
| `collection.js` | Collection, Marble Bag, Shooter, bags, buy, find by ID, certificates |
| `payments.js` | Packs, checkout, store receipts (placeholder), my orders, the Stripe webhook |
| `admin.js` | The back office: players, coins, items, suspend, rename, delete, consent, payments and refunds, audit, economy, email list |
| `economy.js` | Economy numbers, my day, race payouts, my ledger |
| `scoreboard.js` | Season, all-time and friends boards (earned coins only); `SEASON` is a placeholder |
| `tracks.js`, `marbles.js` | Public lists; admin edits |
| `physics.js` | On-demand physics preview (nothing saved) |
| `billboards.js`, `appearance.js` | Billboard images; look options |

### Sockets

Defined in `src/sockets/index.js`. The client may send a JWT in `auth.token`; anonymous connections can watch.

- **Client → server:**
  - `lobby:subscribe`, `lobby:unsubscribe`
  - `race:watch {raceId}`: the reply carries the live snapshot, or the results if the race has finished
  - `race:unwatch`
  - `room:watch {code}`, `room:unwatch`
- **Server → client:**
  - `lobby:race_created`, `lobby:race_updated`
  - `race:updated`, `race:countdown`, `race:start`, `race:frame`, `race:finished`, `race:next`, `race:cancelled`
  - `room:updated`

## Scripts: `scripts/`

| Command | What it does |
|---|---|
| `npm run report -- <slug>` (`--quick` for a short run) | The full track report: 3 × 1,000 races plus view checks and screenshots. Output goes to `reports/<slug>/` |
| `node scripts/race-fingerprints.js [--check \| --write]` | Hashes whole races to prove nothing changed. **Use `--write` only for a deliberate change, and say so in the commit** |
| `node scripts/physics-track-sql.js <slug> --add-hidden "…"` (or `--rebuild`, `--retune "…"`) | Prints the data update that adds or updates a physics track |
| `node scripts/clear-check.js [slug…] [--all]` | Scenery-inside-the-track and camera check only |
| `node scripts/variety-table.js [--matrix]` | How alike the tracks are |
| `node scripts/start-looks.js` | Records how each start looks (first 3 seconds) |
| `node scripts/dump-kit-track.js <slug>` | Writes a track for the development kit view (`client/dev/kit-view.html`) |
| `bash scripts/convert-audio.sh` | Converts `music-inbox/` into small Opus and AAC files in `client/public/audio/` |
| `npm run db:migrate` | Runs the same schema and data-update step as server start |

## Server tests: `test/`

- **Running them:** `npm test`, about 5 minutes. Set `ROOMS_TEST_DATABASE_URL=postgres://…` to also run the tests that need a database (rooms, admin, Stripe, account, entry fees).
- **Engines and protecting results:**
  - `raceFingerprints` with `fingerprints/races.json`;
  - `simulator`, `physics`, `simulationPool`, `version`, `skill`.
- **Tracks:**
  - `bobsleigh`, `sanFrancisco`, `tableMountain`, `trackKit`, `variety`, `pinball`, `arcade`, `startLook`, `report`;
  - the track tests also check that data-update SQL matches the generator.
- **Races:** `raceManager`, `raceSession`, `rooms`.
- **Money and items:** `economy`, `entryFees`, `collection`, `showcase`, `payments`, `stripe`.
- **Platform:** `account`, `passwordReset`, `admin`, `origins`, `migrate` (the table list is fixed here), `appearance`.

---

## The website and apps: `client/`

**Top-level files:**

| Path | What it is |
|---|---|
| `package.json` | `npm run dev`, `npm run build` (output `dist/`, which Vercel serves), `npm test` (vitest, about 8 minutes), `npm run app:sync` |
| `vite.config.js`, `vercel.json` | Build settings. `vercel.json` sends every route to `index.html` and adds `noindex` headers on `/admin` |
| `.vercelignore` | Keeps the app projects out of Vercel uploads |
| `index.html` | The single page: meta, canonical and Open Graph tags |
| `public/` | `marble.svg`, `robots.txt`, `sitemap.xml`, `audio/` |
| `capacitor.config.json` | App id, name, splash and status-bar settings |
| `ios/`, `android/` | The native app projects (see "Apps" below) |
| `assets/` | Source images for the app icons and splash screens |
| `scripts/app-sync.mjs` | Builds the site against the live server and copies it into both apps |
| `APP-TESTING.md` | Running the apps on your own phone |
| `dev/` | The development "kit view": draws a track straight from its file, with no server |
| `report/` | Browser-based report checks (view checks, screenshots), run by the root report script |
| `test/` | Client tests (vitest) |

**`src/` folders:**
- `main.jsx`: loads the self-hosted fonts and CSS, router and login context. Reloads once if a new deploy removed old code files.
- `App.jsx`: every route (table below), plus the offline screen, the app shell start, sound unlock and canonical links.
- `api/`:
  - `client.js`: every REST call; `API_URL` comes from `VITE_API_URL`; the token is in localStorage.
  - `socket.js`: the shared socket.io connection.
  - `billboards.js`.
- `context/AuthContext.jsx`: the signed-in player, token and socket; login, register, guest, claim, refresh.
- `hooks/`:
  - `useRaceStream.js`: live frames, buffered 400 ms behind and interpolated, so motion is smooth;
  - `useReplay.js`: playback of a finished race;
  - `useTrackScene.js`: loads the 3D scene and reports failures;
  - `useAsync.js`, `useLobby.js`.
- `components/`: the race viewers and shared UI:
  - `LiveRaceViewer3D.jsx`: live 3D race; FPS button, corner view, finish show, skip;
  - `RaceReplayViewer.jsx`: 3D replay;
  - `RaceViewer.jsx`: the 2D viewer;
  - `FinishShow.jsx`, `Confetti.jsx`, `StartLights.jsx`, `CornerView.jsx`, `FrameMeter.jsx`, `SceneFailure.jsx`;
  - marble and track pickers, `NextRace.jsx` (rematch and room), `ErrorBoundary.jsx`, and others.
- `pages/`: the original game pages:
  - `Home` (lobby), `Race` (lobby, countdown, live), `Results`, `Dashboard`;
  - the previews `TrackPreview3D`, `Replay3D`, `PhysicsPreview`.
- `site/`: the Marble Spins website:
  - `SiteHeader.jsx`, `SiteFooter.jsx`, `Logo.jsx`, `SoundControl.jsx`, `canonical.js`;
  - `landing/` (landing page, 3D hero replay);
  - `marbles/` (badge, 3D turntable, certificate, `useCollection`);
  - `payments/index.js` (Stripe on the web, app-store placeholder);
  - `pages/` (every website page; see the routes below).
- `admin/`: the back office (`AdminApp.jsx`, `adminApi.js`, `admin.css`).
- `app/`: the native app shell:
  - `native.js`: splash, status bar, Android back button, sound in the background, network watch;
  - `OfflineScreen.jsx`.
- `shared/`: data and code **shared with the server**:
  - `economy.json`;
  - `payments/packs.json`, `payments/consent.json`;
  - `marbles/catalog.json`;
  - `marbles/badge.js`: the master look of each design;
  - `marbles/paint.js`: draws the badge as CSS for the shop and as textures for 3D;
  - `marbles/materials.js`: the 3D marble material;
  - `marbles/index.js`.
- `sound/`:
  - `engine.js` (Web Audio): nothing before the first tap; music shuffled with crossfades and mixed under the effects; three race sounds; pauses in the background.
  - `settings.js`: volumes and mute, saved on the device and in the account.
- `three/`: the 3D renderer (next section).
- `utils/`: formatting, splits, the 2D track geometry, finish-show timing, confetti, `staleCode.js` (reload after deploy).

### Routes (`client/src/App.jsx`)

| Path | Page |
|---|---|
| `/` | Landing page (visitors) or `HomeHub` (signed in) |
| `/home`, `/lobby` | Home hub / lobby |
| `/play/friends`, `/play/track`, `/play/shooter`, `/play/start` | The race flow (`site/pages/RaceFlow.jsx`) |
| `/r/:code` | Friend room |
| `/shop`, `/collection`, `/collection/:design` | Shop |
| `/bag` | Marble Bag |
| `/certificate/:code` | Marble certificate |
| `/checkout?pack=` | Coin-pack checkout |
| `/purchases?paid=` | Orders and receipts |
| `/settings` | News by email, purchases, download my data, delete my account |
| `/unsubscribe?u=&t=` | Unsubscribe link from emails (no login) |
| `/forgot-password`, `/reset-password?token=` | Password reset (`site/pages/PasswordPages.jsx`) |
| `/scores` | Scoreboards |
| `/signup` (`?mode=login`) | Sign up / log in |
| `/legal` | Terms, terms of sale, privacy, cookies, contact |
| `/dashboard`, `/profile/:userId` | Dashboard and public profiles |
| `/race/:raceId`, `/results/:raceId` | Live race and results |
| `/preview/3d`, `/preview/3d/race/:raceId`, `/preview/marbles`, `/preview/marbles/compare`, `/preview/marbles/roll`, `/preview/physics` | Preview and check pages (not linked) |
| `/admin/*` | Back office: Players, Player detail, Payments, Economy, Email list, Audit log |

### 3D: `client/src/three/`

**Drawing never affects a race.** The server decides everything; the client only places marbles where the frames say.

**`TrackScene.js` is the core of the 3D view:**
- It builds the track, the scenery, structures (tunnels, bridges), billboards, lighting, the start gate and the finish.
- It places marbles from each frame and runs the cameras: follow, countdown, and the corner view.
- **Phone mode ("lite")** turns on for touch screens up to 900 px wide, or with `?lite=1`. It lowers the detail and switches off antialiasing.
- **Frame rate:** phones draw at most 60 frames a second. `keepPace()` lowers the resolution step by step on a phone that can't keep up (down to 0.75). `frameStats()` feeds the FPS counter.

**Other files:**
- `trackModel.js`: pure geometry, matching the server's.
- `iceChannel.js`, `marbles.js`, `startGate.js`, `startCamera.js`, `trackFeatures.js`, `structures.js`, `billboards.js`, `lighting.js`, `themes.js`, `winnerGlow.js`, `movers.js`, `diagnostics.js`.
- `scenery/`: the worlds:
  - kit scenery: `kit.js`, `kitGround.js`, `kitProps.js`, `kitPlaces.js`, `kitLandmarks*.js`;
  - series looks: `coaster.js`, `arcade.js`, `pinball.js`, `grandPrix.js`;
  - hand-built worlds: `sanFrancisco.js`, `alpine.js`, `capeTown.js`;
  - checks: `clearCheck.js` (nothing inside the track, and nothing within 0.5 m of the camera) and `groundCheck.js`.
- `costumes/`: what obstacles look like, sized to their real footprint so marbles hit what you see.

### Apps: `client/ios`, `client/android`

- Capacitor 8, app id `com.marblespins.app`. iPhone test builds use `com.marblespins.app.dev`.
- **Never edit these** (written by `npx cap sync`, and gitignored): `ios/App/App/public` and `android/app/src/main/assets/public`.
- **Generated from `client/assets/`:** the icons and splash screens.
- **Edited by hand:**
  - iPhone: `Info.plist`, `AppDelegate.swift`, `project.pbxproj`;
  - Android: `AndroidManifest.xml`, `res/values/*.xml`, the Gradle files.
- In-app purchases are a placeholder in `client/src/site/payments/index.js`.

### Client tests: `client/test`

- **Running them:** `npm test` in `client/`, about 8 minutes.
- **Geometry and 3D:**
  - `trackModel`, `sharedGeometry` (the server shape equals the 3D shape);
  - `iceChannel`, `layout`, `marbles`, `startGate`, `startCamera`, `followCamera`, `trackFeatures`, `trackKit`, `structures`.
- **Scenery and looks:**
  - `scenery`, `sanFrancisco`, `alpine`, `capeTown`, `kitScenery`;
  - `grandPrix`, `lighting`, `billboards`, `costumes`;
  - `clearTrack`, `sceneFingerprints`.
- **Marbles:** `marbleLooks`, `marbleQuality` (every look against its shop picture).
- **Other:** `finishShow`, `confetti`, `utils`, `sound`, `appShell`, `staleCode`, `canonical`.

## Known stale comments

- `src/game/physicsSimulator.js` and `src/routes/physics.js` describe the physics engine as preview-only. It runs real races now.
- The `user_collection` comment in `docs/database_schema.sql` shows an old Marble ID format (`MS-SUN-SOL-000037`). Today's format is `SC105-000037`.
- The root `README.md` "Database" table describes the first version of the database. [Data model](03-data-model.md) is the current one.
