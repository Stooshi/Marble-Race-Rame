# 2. Code map

*Last updated 16 Oct 2026.* Where everything is, and where to look to fix something. Paths are relative to the repository root.

## Find it fast

| I want to… | Look in |
|---|---|
| Change how much a race pays, the daily goal, starting coins or bag discounts | `client/src/shared/economy.json` (read by server and website) |
| Start a scoreboard season | `client/src/shared/economy.json` → `season`: `number`, `startsAt`, `endsAt` (ISO dates), `badgeTop`. Until all three are set no season is shown anywhere (no "This season" board, no season name or days left) |
| Change the social media links | `client/src/shared/socialLinks.json` (icons from the `simple-icons` package, CC0) |
| Show the App Store / Google Play buttons on the website | `client/src/shared/storeLinks.json` (`appStore`, `googlePlay`: the store page's https link; empty hides the button). Never shown inside the apps |
| Change marble prices, designs, shades or the collection | `client/src/shared/marbles/catalog.json`, then `client/src/shared/marbles/badge.js` for how a design looks |
| Change coin packs (amounts and prices) | `client/src/shared/payments/packs.json` |
| Change the checkout consent wording | `client/src/shared/payments/consent.json` (and bump its `version`) |
| Fix how a race is decided | `src/game/raceService.js` (`decide`), `src/game/runSimulation.js`, `src/game/physicsSimulator.js` (new engine), `src/game/simulator.js` (classic engine). **Read [Game rules](04-game-rules.md) first: results must never change** |
| Fix live streaming, countdowns or the rematch | `src/game/raceManager.js` |
| Fix coins not added or wrong | `src/economy/index.js` (`change`, `payRace`) and the `coin_ledger` table |
| Fix the shop or First Edition numbers | `src/marbles/collection.js` |
| Fix a Stripe payment | `src/payments/stripe.js`, `src/payments/index.js`, `src/routes/payments.js` |
| Fix a Google Play (Android) payment | `src/payments/google.js` (server checks with Google), `client/src/site/payments/index.js` (the app's purchase sheet), `src/routes/payments.js` |
| Build the Android release | `client/scripts/android-upload-key.mjs`, `client/scripts/android-release.mjs`, `client/app-version.json`, `client/android/app/build.gradle` (signing) |
| Fix a back-office page | `client/src/admin/AdminApp.jsx` (pages), `src/routes/admin.js` (data and actions), `src/admin/session.js` (login) |
| Fix friend rooms | `src/routes/rooms.js`, `client/src/site/pages/RoomPage.jsx` |
| Fix how a track looks | `client/src/three/` (see the 3D section below). Drawing only, never the race |
| Add a new track | `src/tracks/README.md` (the kit guide), then `scripts/physics-track-sql.js` and a data update |
| Fix sound or music | `client/src/sound/engine.js` (the race's sound: countdown beeps, one race track, the ceremony song), `client/src/sound/settings.js`, files in `client/public/audio/`; the race page calls `raceCountdown`/`raceGo`/`raceCeremony`/`raceEnd` (`pages/Race.jsx`, `components/LiveRaceViewer3D.jsx`, `components/RaceViewer.jsx`) |
| Change legal text | `client/src/site/pages/LegalPage.jsx`; the company's name, org.nr, VAT no., address, support and privacy email in `client/src/shared/company.json` (used by the legal pages, cookie page, footer, Help Centre, emails and Stripe's checkout) |
| Change a page's title, description or share picture, or what search engines index | `client/src/site/pageMeta.js` (used by the site and the pre-rendering), `client/public/robots.txt`; pages in the sitemap: `client/scripts/prerender.mjs` |
| Change the cookie banner, the cookie list, or what Analytics / the Pixel receive | `client/src/site/consent/` (`consent.js`: categories, `STORAGE_LIST` shown on `/cookies`; `tracking.js`: loading and events; `ConsentManager.jsx`: banner and settings). A new browser storage key must be added to `STORAGE_LIST` (a test checks) |
| Redo a track's picture in the track picker | `node scripts/track-banners.js <slug>` (a moment and side in `scripts/track-banners.json` if the automatic one isn't good); review at `/preview/banners`; switch the pictures on with `enabled` in `client/src/shared/trackBanners.json` |
| Change a Help Centre answer, or the search's synonyms | `client/src/site/help/faq.js` (texts from the project doc `claude/help-faq-draft.md`; numbers come from the settings files), `client/src/site/help/search.js` (`SYNONYMS`) |
| Change an email's text | `src/email/templates.js` |
| Fix the contact form or the support inbox | `client/src/site/help/ContactForm.jsx`, `src/routes/support.js`, `src/support/index.js`, `src/routes/admin.js` (`/support…`); categories and limits in `client/src/shared/support.json` |
| Change the app icon or splash | `client/assets/*.png`, then `npx capacitor-assets generate --ios --android`. The website's icons follow it: redo `public/apple-touch-icon.png`, `icon-192.png` and `icon-512.png` from `assets/icon-only.png`, and the small `favicon.svg` / `favicon.ico` by hand (check them at 16 px on light and dark tabs) |
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
- `app.js`: Express setup (helmet, CORS, `/health`). The Stripe webhook is mounted **before** the JSON parser, because it needs the raw body; so is `/api/support`, which reads its own larger body (a screenshot). The `/api/*` routers come after.
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
  - `openings.js`, `layouts.js`: proven starts and section orders (L30–L34 were made for the Canyon Series, L40–L49 for the Block Series);
  - `recipe.js`: the rules. Families: `world-tour`, `grand-prix`, `coaster`, `pinball`, `arcade`, `canyon`, `block`, `test`. A **Block Series** track (`family: 'block'`, `block: { world }`) is built the same way, on voxel land, with block-pillar supports (`coaster.style: 'blocks'`); A **canyon** (`family: 'canyon'`, `canyon: { palette, depth, river }`, sections' `walls`) is built as a coaster whose sections run on the canyon floor unless they give a `height`;
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
- `index.js`: providers (stripe, apple, google, test). `grant()` adds a pack's coins once. Also `checkout()` (with consent and order number), `stripeEvent()`, `refund()`, `ordersOf`/`orderOf`, and for Google Play `googleAccountId`, `googlePurchase`, `googleSync`, `startGoogleJobs` (hourly: consume leftovers; every 6 hours: voided purchases). Apple is a placeholder.
- `stripe.js`: Checkout sessions, webhook verification, `handleEvent()` (paid, expired, refund, dispute), `revoke()` (takes coins back in proportion), `requestRefund()`. Live keys are refused unless `STRIPE_ALLOW_LIVE`.
- `google.js`: Google Play Billing on the server. Signs in to the Android Publisher API as the service account (`GOOGLE_PLAY_SERVICE_ACCOUNT`, RS256 JWT with node's crypto, no Google library). `redeem()` checks a purchase with Google (paid, the right product, the player's `store_account_id`), records it once (`provider_ref` = order id, `store_token`), grants the coins, then consumes it; `syncVoided()` takes back refunded and charged-back purchases through `stripe.revoke()` (same ledger lines and `payment_refunds`); `refundOrder()` asks Google to refund and revoke; `decodeRtdn()`/`rtdnTokenOk()` read Google's Pub/Sub notifications. Tests: `test/googlePlay.test.js` (a fake Google that checks the signed token).

**Back office and accounts:**
- `admin/session.js`: the back-office login (separate admin token, TOTP 2-step code, 30-minute idle timeout, 5 wrong codes give a 15-minute pause kept in memory).
- `admin/totp.js`: RFC 6238 codes and the encrypted secret.
- `security/index.js`: `record()` stores IP and country for sign-up, login and purchase. `trimIps()` blanks IPs older than 90 days (security events and support messages) and runs daily. Countries are looked up offline (geoip-country).
- `account/index.js`: `exportData()` ("Download my data", support messages and replies included) and `deleteAccount()` (anonymises, deletes support messages, keeps payments and race results).
- `support/index.js`: support messages. The form token (`formToken`, `checkFormToken`: under 3 s is a bot, over 12 h asks for a fresh form), `readScreenshot` (PNG, JPEG, WebP or GIF by their first bytes, at most 4 MB), `create` (links the account, keeps a repeat within 10 minutes once, emails `SUPPORT_EMAIL`), `reply` (saves and emails a back-office reply).
- `email/index.js`: sends email through Brevo when `BREVO_API_KEY` is set (`enabled()`, `send()`). Tests swap the transport.
- `email/templates.js`: the emails' HTML (password reset, support notification, support reply).
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
| `users.js` | Profile, settings, news-by-email, unsubscribe, cookie consent record (`POST /me/cookie-consent`), data export, delete account, appearance, the old marble bag, leaderboard, public profiles |
| `races.js` | Lobby list, create, join and leave (free), next race, start, cancel, results, replay, showcase race |
| `rooms.js` | Friend rooms (create, join, leave, track, remove, start, close) and `afterRace` |
| `collection.js` | Collection, Marble Bag, Shooter, bags, buy, find by ID, certificates |
| `payments.js` | Packs, checkout, my orders, the Stripe webhook; Google Play: `GET /google/account` (the player's Play account id, and whether purchases are on), `POST /google/verify` (a purchase token from the app), `POST /google/rtdn?token=` (Google's notifications) |
| `admin.js` | The back office: players (with their support messages), coins, items, suspend, rename, delete, consent, payments and refunds, audit, economy, email list, the support inbox (list, message, screenshot, status, reply) |
| `support.js` | The Help Centre's contact form: `GET /form` (a form token), `POST /` (a message; rate-limited to 6 an hour per address) |
| `economy.js` | Economy numbers, my day, race payouts, my ledger |
| `scoreboard.js` | Season, all-time and friends boards (earned coins only); the season comes from `economy.json` → `season` (`seasonFrom`), `null` until set, and the season board then counts all time |
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
| `node scripts/track-banners.js <slug…> \| --all \| --missing` | The track picker's pictures: each track drawn from its own scene in a headless browser (`client/report/banners.mjs`, `kitView.banner` in `client/dev/kitView.js`), saved as WebP in `client/public/tracks/`, listed in `client/src/shared/trackBanners.json`. Looks only: one race is simulated to put marbles on the track; nothing is stored. The track report runs it for its track |
| `bash scripts/convert-audio.sh` | Converts `music-inbox/` into small Opus and AAC files in `client/public/audio/` (`race-1`…`race-8`, `ceremony`, `start-beeps`, and the three race sounds; `SKIP_EFFECTS=1` leaves the race sounds alone), levelled with one steady gain per file so loops match |
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
- **Platform:** `account`, `passwordReset`, `admin`, `support` (contact form spam checks, screenshots, account linking, inbox, statuses, replies, audit), `origins`, `migrate` (the table list is fixed here), `appearance`.

---

## The website and apps: `client/`

**Top-level files:**

| Path | What it is |
|---|---|
| `package.json` | `npm run dev`, `npm run build` (`vite build`, then `scripts/prerender.mjs`; output `dist/`, which Vercel serves), `npm test` (vitest, about 8 minutes), `npm run app:sync` |
| `vite.config.js`, `vercel.json` | Build settings. `vercel.json`: `cleanUrls` (so `/help` serves the pre-rendered `help.html`), every other route is rewritten to `/app-shell` (written without `.html`: with clean URLs that file is served at `/app-shell`, and a rewrite to `/app-shell.html` finds nothing, which made every in-game address answer 404 on 16 Oct 2026; a test checks), `noindex` headers on `/admin` |
| `.vercelignore` | Keeps the app projects out of Vercel uploads |
| `index.html` | The single page: meta, canonical, Open Graph and share-picture tags |
| `scripts/serve-vercel-output.mjs` | Serves a local `npx vercel build` output with Vercel's own routing (`.vercel/output/config.json`), to check routes before pushing (see the runbook) |
| `scripts/prerender.mjs` | Build step 2: renders the public pages to HTML (through `src/prerender/entry.jsx`, the real app with `StaticRouter`), writes `dist/<path>.html`, `dist/app-shell.html` and `dist/sitemap.xml`. The page's copy is wrapped in `<div data-ms-prerender>`; a small script in each page hides only that copy at once when it isn't the page asked for, when logged in, or in the apps, and `src/main.jsx` removes any copy left once the app has drawn (never hide the app itself: `#root > *` did, and logged-in players got a blank page, 16 Oct 2026) |
| `public/` | The tab and home-screen icons (linked from `index.html`, so on every page, pre-rendered or not, and `/admin`): `favicon.svg` and `favicon.ico` (16, 32 px: the app icon's marble alone on its navy tile, simplified to read at tab size; 48 px with the orbit arcs), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` (the app icon itself, `client/assets/icon-only.png`), `site.webmanifest` (name, icons, theme colour `#0E1320`); `robots.txt` (blocks `/admin`, `/preview`, checkout and account pages), `audio/`, `tracks/` (the track pictures, `<slug>.webp` and `<slug>@2x.webp`), `share/` (link-preview pictures, 1200 × 630: `marble-spins-1200x630.png` and `tracks/<slug>.jpg`; a track without one uses its `@2x.webp`). `sitemap.xml` is generated by the build |
| `capacitor.config.json` | App id, name, splash and status-bar settings |
| `ios/`, `android/` | The native app projects (see "Apps" below) |
| `assets/` | Source images for the app icons and splash screens |
| `scripts/app-sync.mjs` | Builds the site against the live server and copies it into both apps |
| `scripts/android-upload-key.mjs` | `npm run android:key`: makes the Google Play upload key once, in `MarbleSpins-keys` in your home folder (outside the project), and `android/keystore.properties` (gitignored, no password) |
| `scripts/android-release.mjs` | `npm run android:release`: the signed `.aab` for Google Play, copied to `MarbleSpins-releases` in your home folder |
| `app-version.json` | The apps' `versionCode` (raise by 1 for every Play upload) and `versionName` |
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
  - `LiveRaceViewer3D.jsx`: live 3D race; FPS button, corner view, finish show, skip. On phones (CSS in `styles.css`, "The race on phones"): the camera buttons share the row with short labels (Leader, My marble), the clock hides once the winner is across so it can't sit under the medals or the winner banner, and the "home" list sits bottom right, clear of the corner view;
  - `RaceReplayViewer.jsx`: 3D replay;
  - `RaceViewer.jsx`: the 2D viewer;
  - `FinishShow.jsx`, `Confetti.jsx`, `StartLights.jsx`, `CornerView.jsx`, `FrameMeter.jsx`, `SceneFailure.jsx`;
  - marble and track pickers, `NextRace.jsx` (rematch and room), `ErrorBoundary.jsx`, and others.
- `pages/`: the original game pages:
  - `Home` (lobby), `Race` (lobby, countdown, live), `Results`, `Dashboard`;
  - the previews `TrackPreview3D`, `Replay3D`, `PhysicsPreview`.
- `site/`: the Marble Spins website:
  - `SiteHeader.jsx`, `SiteFooter.jsx`, `Logo.jsx`, `SoundControl.jsx`, `canonical.js`, `TrackBanner.jsx` (a track's picture on its picker card: lazy-loaded, over the series gradient, which stays when a picture is missing or still loading; `SERIES_PIC`);
  - `company.js` (the company details formatted, `CONTACT_PATH` = `/help#contact`: where every "Contact us" link goes) and `ProtectedEmail.jsx` (an email address shown as "support (at) marblespins.com" in the page HTML, so the pre-rendered pages hold no address for spam bots, and as a normal mailto link once the page runs);
  - `pageMeta.js`: every page's title, description, canonical address, share picture and indexing (`metaFor`, `applyMeta`), set on every page change and used by the pre-rendering;
  - `consent/`: the cookie banner and the trackers (website only, never in the apps): `consent.js` (the choice in local storage `marble-consent`, version `CONSENT_VERSION`; `STORAGE_LIST`), `ConsentManager.jsx` (banner with REJECT ALL and ACCEPT ALL side by side, Settings per category with nothing ticked, reopened by "Cookie settings" in the footer and on `/cookies`; logs the choice to the account when logged in), `tracking.js` (Google Analytics 4 with Consent Mode v2 after statistics consent, the Meta Pixel after marketing consent and never under 13; `track()` events: `sign_up`, `first_race`, `race_finished`, `shop_view`, `checkout_started`, `purchase`);
  - `landing/` (landing page, 3D hero replay; `SERIES`: the series cards, each with one of its tracks' pictures; the tracks-and-series heading is counted from the live track list);
  - `marbles/` (badge, 3D turntable, certificate, `useCollection`);
  - `payments/index.js`: `buyCoins()` for every screen: Stripe on the website; Google Play Billing in the Android app (`@capgo/native-purchases`: purchase with the player's Play account id, then `api.googleVerify`); `resumeStorePurchases()` (unconfirmed purchases resent at login, from `App.jsx`); `useStorePrices()` (Play's prices in the player's currency, on the shop and checkout); the App Store is a placeholder;
  - `pages/` (every website page; see the routes below);
  - `help/` (the Help Centre at `/help`): `ContactForm.jsx` ("Still need help?": name, email, topic, order number, message, screenshot scaled down before sending, a hidden spam field), `faq.js` (the 12 categories of questions and answers, numbers read from `economy.json`, `packs.json` and `catalog.json`, `[bracket]` placeholders kept; the FAQPage structured data), `search.js` (type-ahead search: any word order, typos, synonyms, highlighting), `HelpPage.jsx`.
- `admin/`: the back office (`AdminApp.jsx`, `adminApi.js`, `admin.css`). The support inbox (`SupportInbox`, `SupportMessage`, `SupportTable`) lives in `AdminApp.jsx` too.
- `app/`: the native app shell:
  - `native.js`: splash, status bar, Android back button, sound in the background, network watch, and on iPhone an "ambient" audio session (`preferAmbientAudio`: the silent switch mutes the game, the player's own music keeps playing);
  - `OfflineScreen.jsx` (links to the Help Centre; on `/help` itself it shrinks to a bar so the answers stay readable offline).
- `shared/`: data and code **shared with the server**:
  - `economy.json` (also the scoreboard `season`);
  - `storeLinks.json` (the website footer's App Store and Google Play links; empty = hidden);
  - `socialLinks.json` (YouTube, Instagram, TikTok profile links: the footer's icon links via `site/SocialLinks.jsx`, the Help Centre's "Follow Marble Spins", and `sameAs` in the landing page's Organization data; website only, an empty link hides its icon);
  - `company.json` (who runs Marble Spins: Voltron Robotics AB, org.nr, VAT no., address, support and privacy email, the legal texts' date; `client/src/site/company.js` formats it);
  - `trackBanners.json` (the track pictures: `enabled` in the picker, and per track its version, sizes, name and series);
  - `support.json` (contact-form categories and limits, checked by the server too; "Privacy and your data" is the topic for data requests);
  - `payments/packs.json`, `payments/consent.json`;
  - `marbles/catalog.json`;
  - `marbles/badge.js`: the master look of each design;
  - `marbles/paint.js`: draws the badge as CSS for the shop and as textures for 3D;
  - `marbles/materials.js`: the 3D marble material;
  - `marbles/index.js`.
- `sound/`:
  - `engine.js` (Web Audio): nothing before the first tap; no music outside races. A race: the start beeps over the 3-2-1 (the last beep on GO), one of 8 race tracks from GO (shuffled rounds, never the previous race's), looping, mixed under the effects; at the finish ceremony the ceremony song instead, looping, fading out after 45 s; silence when the player leaves. The three race sounds as before; pauses in the background.
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
| `/legal` | Terms, terms of sale, privacy, contact |
| `/cookies` | Cookie policy: everything the site stores, by category, and the visitor's choice (`site/pages/CookiesPage.jsx`) |
| `/tracks`, `/tracks/:slug` | Public track pages: every live track by series; one track's name, series, picture, description and "Race it" (`site/pages/TrackPages.jsx`) |
| `/help`, `/help/<question-slug>`, `/help#<question-slug>` | Help Centre: every question has its own link (the slug is the question in lowercase with dashes, e.g. `/help#i-forgot-my-password`); `#contact` is the contact form. Linked from the header, footer, Settings, shop, checkout, Purchases, the offline screen, the error box and the 404 page |
| `/dashboard`, `/profile/:userId` | Dashboard and public profiles |
| `/race/:raceId`, `/results/:raceId` | Live race and results |
| `/preview/3d`, `/preview/3d/race/:raceId`, `/preview/marbles`, `/preview/marbles/compare`, `/preview/marbles/roll`, `/preview/physics`, `/preview/banners` | Preview and check pages (not linked); `/preview/banners`: every track picture as a picker card, for review |
| `/admin/*` | Back office: Players, Player detail (tabs: Coins, Races, Marbles, Payments, Messages, Security, Emails, Audit), Payments, Support messages (`/admin/support`, `/admin/support/:id`), Economy, Email list, Audit log |

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
  - series looks: `coaster.js` (steel A-frames, or timber trestle bents with `coaster.style: 'timber'`), `arcade.js`, `pinball.js`, `grandPrix.js`;
  - canyons: `canyon.js` (the canyon shaped into the land around the track: floor, stepped walls in the palette's bands, plateau, river ribbon; the palettes; what grows there), `canyonSpans.js` (prayer flags, arch bridge, railway trestle and footbridge from rim to rim), `kitLandmarksCanyon.js` (the series' landmarks and the condor). `terrain.js` draws the walls finer (`detail`, at `detailFine`) and in their colours (`colorAt`);
  - the Block Series: `blocks.js` (the eight worlds: voxel land stepped in terraces away from the track, only ever lowering it; tiles and terrace tones through `colorAt`; cube dressing), `kitLandmarksBlock.js` (the series' landmarks, their unlit `glow` parts, and `buildBlockEffects`: rows clearing, lamp rows lighting, blocks settling on the stack, the split board, the gate's blocks dropping, the drawbridge, the portal's glow, the GG; all on the race clock and the leader's progress, undone when a replay rewinds). Block-pillar supports are `coaster.style: 'blocks'` in `coaster.js`; the lighting presets `dawn`, `cave` and `magma` (with drifting embers, computers only) are in `lighting.js`; a Block Series world's lit parts are one draw call, and its still scenery is merged in bigger squares on phones;
  - hand-built worlds: `sanFrancisco.js`, `alpine.js`, `capeTown.js`;
  - checks: `clearCheck.js` (nothing inside the track, and nothing within 0.5 m of the camera) and `groundCheck.js`.
- `costumes/`: what obstacles look like, sized to their real footprint so marbles hit what you see.

### Apps: `client/ios`, `client/android`

- Capacitor 8, app id `com.marblespins.app`. iPhone test builds use `com.marblespins.app.dev`.
- **Never edit these** (written by `npx cap sync`, and gitignored): `ios/App/App/public` and `android/app/src/main/assets/public`.
- **Generated from `client/assets/`:** the icons and splash screens.
- **Edited by hand:**
  - iPhone: `Info.plist`, `AppDelegate.swift` (sets the `.ambient` audio category at launch, for the silent switch), `project.pbxproj`;
  - Android: `AndroidManifest.xml` (removes the advertising-ID permission: no ads or tracking), `res/values/*.xml`, the Gradle files (`app/build.gradle`: version from `client/app-version.json`, release signing from `android/keystore.properties` or `MS_UPLOAD_*` variables).
- Plugins: `@capacitor/app`, `network`, `splash-screen`, `status-bar`, and `@capgo/native-purchases` (Google Play Billing 9; StoreKit on iPhone, not used yet). `npx cap sync` lists them in `android/capacitor.settings.gradle`.
- In-app purchases: Google Play in the Android app (`client/src/site/payments/index.js`); the iPhone App Store is still a placeholder.

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
- **Other:** `finishShow`, `confetti`, `utils`, `sound`, `appShell`, `staleCode`, `canonical`, `trackBanners` (every track has a picture, both sizes, under 40 kB), `help` (the Help Centre's texts, numbers from the settings files, placeholders kept, the search).

## Known stale comments

- `src/game/physicsSimulator.js` and `src/routes/physics.js` describe the physics engine as preview-only. It runs real races now.
- The `user_collection` comment in `docs/database_schema.sql` shows an old Marble ID format (`MS-SUN-SOL-000037`). Today's format is `SC105-000037`.
- The root `README.md` "Database" table describes the first version of the database. [Data model](03-data-model.md) is the current one.
