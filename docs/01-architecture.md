# 1. Architecture

*Last updated 25 Oct 2026.*

## The parts

```
                         players (browser, iPhone app, Android app)
                                   │                  │
            https://marblespins.com│(website files)   │ REST + live races (socket.io)
                                   ▼                  ▼
  ┌──────────────────────────────┐        ┌────────────────────────────────────┐
  │ Vercel: the website          │        │ Railway: the game server (Node)    │
  │ client/ built by Vite        │        │ src/ — Express API + socket.io     │
  │ static files only, no logic  │        │ races decided and streamed here    │
  │ /admin pages (noindex)       │        │ coins, shop, payments, back office │
  └──────────────────────────────┘        └───────────────┬────────────────────┘
                                                          │ SQL (pg pool)
  ┌──────────────────────────────┐        ┌───────────────▼────────────────────┐
  │ Capacitor apps (iOS/Android) │        │ Railway: PostgreSQL                │
  │ client/ios, client/android   │        │ schema: docs/database_schema.sql   │
  │ the same website, bundled    │        │ one-time changes: docs/data_updates│
  └──────────────────────────────┘        └────────────────────────────────────┘
                                                          ▲
  ┌──────────────────────────────┐   webhook (signed)     │
  │ Stripe: Checkout, Tax,       │────────────────────────┘ coins only after Stripe confirms
  │ (Brevo: email, called by the │
  │  server when the key is set) │
  │ receipts, refunds (web only) │◄── server creates Checkout sessions / refunds (API)
  └──────────────────────────────┘
```

| Part | Where it runs | Code | Deploys |
|---|---|---|---|
| **Website** | Vercel project `marble-race-rame-client`; domains marblespins.com, www.marblespins.com and the vercel.app address | `client/` (React 19, Vite, three.js) | **Automatically** on every push to `Main` |
| **Game server** | Railway service; public address https://marble-race-rame-production.up.railway.app (planned: **https://api.marblespins.com**, the Railway address kept as the fallback; [runbook](05-runbook.md#the-servers-own-address-apimarblespinscom-prepared-22-oct-2026-not-switched-yet)) | `src/` (Node 20 or later, Express 5, socket.io 4) | **By hand** by Moses (see the [runbook](05-runbook.md)). Pushing to `Main` does **not** deploy the server |
| **Database** | Railway PostgreSQL | `docs/database_schema.sql` + `docs/data_updates/*.sql` | Applied automatically by the server at every start |
| **Payments** | Stripe (website only); Google Play Billing (Android app) | `src/payments/` | Settings in the Stripe dashboard and Google Play Console |
| **Apps** | iPhone and Android (Capacitor 8), app id `com.marblespins.app` | `client/ios`, `client/android` (wrapping `client/`) | Built on Moses's computer: version with `npm run app:version`, Android with `npm run android:release` (signed `.aab` for Google Play, [runbook](05-runbook.md#android-release-google-play)), iPhone with `npm run ios:release` on a Mac (archive for TestFlight, [runbook](05-runbook.md#iphone-release-app-store)); iPhone not released yet |

**Note on the shared data files:** the server reads data files from inside the client folder: `client/src/shared/economy.json`, `client/src/shared/marbles/catalog.json` and `client/src/shared/payments/*.json`. Website and server therefore always use the same numbers. It also means the server must be deployed from the **whole repository**, not from `src/` alone.

## How the parts talk to each other

**Website or app → server (REST).**
- Every call goes to `${VITE_API_URL}/api/...` as JSON.
- A player is identified by a JWT in the `Authorization: Bearer` header. On the website it is stored in localStorage under `marble-race-token`. A login lasts 180 days after the player's last visit, a guest's 90 (21 Oct 2026): on each visit `GET /api/auth/me` sends a fresh token when the current one is over a day old, and the app stores it (sliding expiry, since 20 Oct 2026; before, 7 days from the login, which lost guests after a week). A password reset ends every older login. Every new account (guest or saved) gets its own 4 starter marbles (`src/marbles/starters.js`). Guests see the "Save your marble" pop-up after every 3rd finished race (client `site/account/SavePrompt.jsx`); sign-up asks for birth year and month, and once email is set up sends a "Confirm your email" link (`src/account/emailConfirm.js`).
- Guests ("Play free") get a real account with `is_guest = true` (username `guest_<10 hex>`). Saving the account turns it into a normal one.
- Every list shows a player by the same rule (25 Oct 2026): the name they chose (`users.display_name`; guests can choose one too), else the username, else for a guest `guest_<5 digits>`. Server `src/names/shown.js`, website and apps `client/src/shared/playerName.js`; a test keeps the two the same.
- The API reference is in the root `README.md`.

**Website or app → server (live races).**
- socket.io runs on the same address. The client sends `race:watch` with a race id.
- The server streams `race:countdown`, `race:start`, `race:frame` (10–20 a second), `race:finished` and `race:next`.
- A room page sends `room:watch` with the room code and gets `room:updated` whenever the room changes (players, track, start timer, the next race).
- The full event list is in the [code map](02-code-map.md#sockets).

**The race's sound (28 Oct 2026).**
- Everything a race needs (the start beeps, the gate sound, the crowd, the ceremony song and the next 2 race tunes) is loaded into memory as soon as the player opens the race page, a room, Quick race, the starting line or League Night; never during the countdown.
- The website plays it through Web Audio (started on the player's first tap, Safari's rule, and resumed whenever Safari suspends it). The iPhone/iPad and Android apps play it through the native audio plugin (`@capacitor-community/native-audio`; no tap needed; the iPhone's silent switch mutes it).
- Every sound is timed on the race clock as shown on that screen (the server's `startsAt`, plus the viewer's 0.4 s buffer and any hold). A sound that isn't loaded in time starts when it arrives, part-way in, in step; never late from its start.
- Readiness: a solo race starts its countdown only once the track, the marbles, the scenery and the sound are in ("Loading…", at most 12 s for the sound). A shared race (rooms, Quick race, League Night) never waits for anyone: a screen that isn't ready joins in step. Each screen reports once per race whether it was ready by GO (`POST /api/races/:id/readiness`, table `race_readiness`, the back office's Race readiness page).

**How a race is run.**
- Every race is decided entirely on the server before its countdown, from a random seed.
- The result is written to the database at that point, but the API keeps it hidden until the race has finished.
- The client only draws the positions it is sent. Nothing on the client can change a result.
- A race with a start time (`races.scheduled_at`: a friend room's start timer, a quick race's 15 s) is started by the server to the second, even if nobody's app is open; a check every 5 s is the safety net after a restart (25 Oct 2026, `src/game/raceManager.js`).

**Back office.**
- The `/admin` pages are on Vercel. They aren't linked from the site, and search engines are told not to index them.
- All data and actions go through `/api/admin/*` on the server. The server checks on every request:
  - that the account is an admin;
  - that the 2-step code was given;
  - that the admin session was used within the last 30 minutes.

**Payments (web).**
1. The server creates a Stripe Checkout session.
2. The player pays on Stripe's page.
3. Stripe calls the server's webhook at `/api/payments/stripe/webhook`. The call is signed and the server checks the signature.
4. **Only then** are the coins added, once per payment.
5. Refunds and disputes arrive the same way and remove the coins.

**Payments (Android app): Google Play Billing.** Google's rules require its billing for digital items in the app, so Stripe is never used there.
1. The app asks the server for the player's Play account id (`GET /api/payments/google/account`, a random `users.store_account_id`, never the user id or email) and opens Google's purchase sheet for the pack (`coins-5000`, `coins-10500`, `coins-27500`, `coins-57500`) with that id.
2. It sends the purchase token to `POST /api/payments/google/verify`. The server asks Google (Android Publisher API, with a service account) whether the purchase is paid, for this product, and made by this player's account id.
3. **Only then** are the coins added, once per purchase (unique Google order id and purchase token), through `economy.change()` like a Stripe payment. Then the server *consumes* the purchase at Google so the pack can be bought again.
4. Google also tells the server about purchases by itself (real-time developer notifications, a Pub/Sub push to `/api/payments/google/rtdn`), so coins arrive even if the app closed mid-purchase; the app also resends unconfirmed purchases at the next login.
5. Refunds and chargebacks: Google's list of voided purchases (checked every 6 hours, on each notification, and a minute after a refund from the back office) takes the coins back once, in the same way and with the same ledger and refund rows as Stripe refunds and disputes.

**Payments (iPhone app).** App Store in-app purchases with StoreKit 2: the app buys with the player's App Store account token and sends the signed transaction; the server checks Apple's signature itself (the certificate chain to Apple Root CA - G3, Apple's marker extensions, ES256) before adding coins or the season pass, once per transaction, and the app then finishes the transaction. Apple's signed Server Notifications v2 bring refunds and revocations. Switched on with `APPLE_IAP_ENABLED=true` (`src/payments/apple.js`).

**CORS.**
- The server accepts calls from:
  - https://marblespins.com and https://www.marblespins.com (always);
  - the addresses listed in `CORS_ORIGIN` (for example the vercel.app address; an entry may use one `*` for a subdomain, e.g. `https://*.vercel.app` for preview builds);
  - `PUBLIC_SITE_URL`;
  - the apps' own addresses (`capacitor://localhost`, `https://localhost`, `http://localhost`).
- `CORS_ORIGIN=*` (the default) accepts every address.

**Support messages.**
- The Help Centre's contact form (`/help#contact`) posts to `POST /api/support` (logged in or not), after fetching a signed form token from `GET /api/support/form`.
- The route reads its own JSON body (up to 7 MB, for a screenshot of at most 4 MB) before the app's 1 MB parser.
- Each message is saved in `support_messages`, linked to the player's account (their login, guests too; else the account with the email they typed), and shows in the back office's **Support messages** inbox and on the player's **Messages** tab.

**Email.**
- Sent through **Brevo** (EU), and switched off until `BREVO_API_KEY` is set on Railway.
- Today it sends **password-reset** links (`/forgot-password` → email → `/reset-password?token=…`), a **notification to the support address** for each new contact-form message (when `SUPPORT_EMAIL` is set; replying to it goes straight to the player), and **replies from the back office** to players. Once it is on it also sends a **confirmation of each website purchase** (with the words agreed to at checkout) and an **acknowledgement of each withdrawal** (`src/payments/emails.js`).
- News emails will use the same sender; signed unsubscribe links are ready (`src/email/unsubscribe.js`).
- Stripe sends its own receipts.

## Environments

| | Local development | Production |
|---|---|---|
| Website | `cd client && npm run dev` → http://localhost:5173 | Vercel → https://marblespins.com |
| Server | `npm run dev` → http://localhost:5000 | Railway |
| Database | Local Postgres (`DATABASE_URL`) | Railway Postgres |
| Stripe | Test keys, or `PAYMENTS_TEST=true` (instant fake payments, refused in production) | Test keys now; live keys only when Moses decides (`STRIPE_ALLOW_LIVE=true`) |

There is no separate staging server. Vercel makes a preview build for every branch; those previews talk to the production server unless their `VITE_API_URL` points elsewhere.

## Variables (names only)

### Railway (server)

| Variable | Needed | What it does |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection (Railway sets it) |
| `DATABASE_SSL` | depends on the database | `true` for managed Postgres that requires TLS |
| `DATABASE_POOL_MAX` | no | Pool size (default 10) |
| `JWT_SECRET` | **yes** (at least 32 characters in production) | Signs login tokens. Also the fallback key for the admin 2-step secrets and email links, so changing it logs everyone out |
| `JWT_EXPIRES_IN` | no | How long a login lasts after the player's last visit (default 180 days; `GET /api/auth/me` renews it once a day). Leave unset |
| `GUEST_JWT_EXPIRES_IN` | no | The same for a guest (default 90 days). Leave unset |
| `GUEST_RETENTION_MODE` | no | `delete`: guests not seen for 90 days are anonymised (daily). Unset: a **dry run** that only logs how many it would anonymise (`[retention] DRY RUN …`). Set to `delete` once the log has been checked |
| `BCRYPT_ROUNDS` | no | Password hashing cost (default 12) |
| `ADMIN_2FA_KEY` | recommended | Encrypts the admin 2-step secrets. Changing it forces every admin to set up the 2-step login again |
| `EMAIL_LINK_SECRET` | recommended | Signs unsubscribe links. Changing it breaks links in emails already sent |
| `BREVO_API_KEY` | to send email | Brevo API key (v3). Without it, email is off and "Forgot your password?" is hidden |
| `EMAIL_FROM` | with Brevo | Sender address, verified in Brevo (default `no-reply@marblespins.com`) |
| `EMAIL_FROM_NAME` | no | Sender name (default "Marble Spins") |
| `SUPPORT_EMAIL` | no | Overrides the support address (default: the company's, `client/src/shared/company.json`, support@marblespins.com): new contact-form messages are emailed here (with Brevo on), and it is the reply-to address on replies sent from the back office |
| `CORS_ORIGIN` | no | `*`, or a comma-separated list of extra website addresses (e.g. the vercel.app one) |
| `PUBLIC_SITE_URL` | no | The website's main address (default https://marblespins.com). Stripe returns players here if their own address isn't recognised |
| `NODE_ENV` | yes (`production`) | Turns on the production checks |
| `PORT` | set by Railway | |
| `STRIPE_SECRET_KEY` | for payments | `sk_test_…` now |
| `STRIPE_WEBHOOK_SECRET` | for payments | `whsec_…` from the webhook endpoint in Stripe |
| `STRIPE_ALLOW_LIVE` | **only when going live** | `true` lets a `sk_live_…` key work |
| `PASS_REMINDERS_SENDING` | no | `on` switches on sending the pass reminders (the confirmation emails, the reminder email when the sale opens, the in-game notice); also needs `BREVO_API_KEY`. Unset or anything else: nothing is sent (Moses says go) |
| `PUBLIC_API_URL` | no | The server's own public address, for the one-click unsubscribe header in emails; on Railway `RAILWAY_PUBLIC_DOMAIN` is used when it isn't set. `https://api.marblespins.com` once that address works |
| `PASS_TESTERS` | no | Tester accounts' emails, comma-separated: they may test-buy the season pass before its sale starts (App Review, our testers) |
| `STRIPE_TAX` | no | `off` turns off Stripe Tax |
| `STRIPE_TAX_CODE` | no | Default `txcd_10000000` (to be confirmed by the accountant) |
| `STRIPE_TOS_IN_CHECKOUT` | no | `true` also asks for the terms on Stripe's page |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | for Android coin purchases | The Google Cloud service account's JSON key (the whole JSON, or base64 of it). Without it the Android app says buying coins isn't switched on yet |
| `GOOGLE_PLAY_RTDN_TOKEN` | with the above | A long random secret; the Pub/Sub push address ends in `?token=` + this. Notifications with another token are refused |
| `GOOGLE_PLAY_PACKAGE` | no | Default `com.marblespins.app` |
| `PUSH_SENDING` | no | `on` switches on sending push notifications to the apps (`src/push`). Unset: every push is a **dry run** that only logs (`[push] DRY RUN …`). Also needs the keys below |
| `FCM_SERVICE_ACCOUNT` | for Android pushes | The Firebase project's service account JSON key (the whole JSON, or base64 of it), with the role "Firebase Cloud Messaging API Admin". Not the Google Play one |
| `APNS_KEY` | for iPhone pushes | The text of Apple's push key file (`AuthKey_XXXXXXXXXX.p8`, or base64 of it) |
| `APNS_KEY_ID`, `APNS_TEAM_ID` | with `APNS_KEY` | The key's 10-character id and the Apple Developer team id |
| `APNS_BUNDLE_ID` | no | Default `com.marblespins.app` (the phone tells the server its own app id; the `.dev` test app goes to Apple's sandbox) |
| `APPLE_IAP_ENABLED` | for iPhone purchases | `true` switches on App Store purchases (`src/payments/apple.js`). No secret is needed: Apple's signature is checked with Apple's public certificates |
| `APPLE_BUNDLE_ID` | no | Default `com.marblespins.app` |
| `APPLE_ACCEPT_SANDBOX` | no | Default: sandbox purchases accepted (App Review and TestFlight buy in Apple's sandbox, even against the live server). `false` refuses them |
| `LEAGUES` | no | Leagues (Leagues v1 part 1, 27 Oct 2026): `off` (the default; unset or anything else is off too): the leagues API answers 404 except `GET /api/leagues/status`, and the website shows no leagues; `admins`: only admin accounts see and use leagues (to test in production); `on`: everyone. Changed with `railway variables --set … --skip-deploys` and then `railway up` (never the dashboard's Deploy button: it brings up an old build, `docs/05-runbook.md`); no new code needed |
| `REPLAY_TRIM` | no | Replays kept 30 days (`src/game/replayRetention.js`, 27 Oct 2026): unset (the default) the daily job only logs what it would delete (`[replays] DRY RUN: … would be deleted`); `on` deletes them. Results are never deleted |
| `PAYMENTS_TEST` | never in production | `true`: instant fake payments, for local development |
| `RACE_COUNTDOWN_MS`, `RACE_START_SHOW_MS` (4000: the start show's extra countdown in rooms and Quick race, the flyover's 4 s; 26 Oct 2026), `RACE_MIN_DURATION_MS`, `RACE_MAX_DURATION_MS`, `RACE_DEFAULT_MARBLES`, `RACE_TICK_RATE_HZ`, `RACE_NEXT_DELAY_MS` | no | Race timing defaults (see the root README) |
| `RAILWAY_GIT_COMMIT_SHA`, `SOURCE_COMMIT` | set by the platform | Shown on `/health` as the commit, when known |

### Vercel (website)

| Variable | What it does |
|---|---|
| `VITE_API_URL` | The server's address (the Railway URL; https://api.marblespins.com after the switch). Built into the website at build time |
| `VITE_SITE_URL` | Optional; canonical address, default https://marblespins.com |
| `VITE_PAYMENTS_TEST` | Development only: `true` uses the fake payment provider |
| `VITE_MARBLES_HUB` | Never set on Vercel. For a local review build of the marbles hub: `preview` shows `/marbles` even with the hub off (noindex), `drafts` also shows the review drafts from `content/marbles-drafts/`. Whether the hub is on for everyone is `client/src/shared/marblesHub.json`, not a variable |
| `VITE_GA4_ID` | Optional. Google Analytics 4 measurement ID (`G-…`). Empty: no Analytics and, with `VITE_META_PIXEL_ID` also empty, no cookie banner. Loads only after the visitor allows statistics cookies |
| `VITE_META_PIXEL_ID` | Optional. Meta Pixel ID (digits). Empty: no Pixel. Loads only after the visitor allows marketing cookies, and never for an account under 13 |

### The apps

The apps are built with `npm run app:sync`. This sets `VITE_API_URL` to the address in `client/app-api.json` (`api`: the Railway address now, api.marblespins.com after the switch; `fallback`: the Railway address) unless another https address is given, and refuses to build if that address's `/health` doesn't answer. They need no other settings. The apps never show the cookie banner and never load Analytics or the Pixel, even if those IDs are set.

`npm run build` (what Vercel runs) also **pre-renders** the public pages (`client/scripts/prerender.mjs`): `/`, `/shop`, `/scores`, `/help` and each `/help/<question>`, `/legal`, `/cookies`, `/tracks` and each live `/tracks/<slug>` are written as plain HTML (a Help question's own page holds only that question, its topic's other questions as links and the way back, since 28 Oct 2026; `QuestionPage` in `HelpPage.jsx`; in the browser the full Help Centre draws over it with the question open) with their own title, description, canonical link and share picture, so search engines and link previews read them without running the game. It reads the live track list from `VITE_API_URL` at build time (so a newly switched-on track gets its page at the next website build) and writes `sitemap.xml`. Structured data for search engines: the FAQ (FAQPage) on `/help`, and on `/` the Organization (Marble Spins, run by Voltron Robotics AB) with its social profiles as `sameAs`. Every other address gets `app-shell.html`. **The track count** in the meta descriptions, share previews (`index.html`'s `__TRACKS_PHRASE__`), the landing page and the Help answers is the live count at build time, rounded down to ten ("110+ tracks" with 110 live): `vite.config.js` reads it from `VITE_API_URL/api/tracks` (or `VITE_TRACK_COUNT`, if set, for a local build) together with the live series (`VITE_TRACK_SERIES`, for the Help Centre's "in nine series: …", worked out from the live tracks; nine since the Rivers were switched on, 25 Oct 2026), and `src/site/trackCount.js` rounds it; without the server it says "dozens of tracks" (never a fixed number). A track switched on shows in the count at the next website build. A season's tracks are left out of `/api/tracks` until the season starts (switched on early, they still don't show), so the holiday tracks join the pages and the count at the first website build after 1 Dec 00:00: a GitHub Actions workflow starts one at 00:05 through a Vercel Deploy Hook (`.github/workflows/season-start-rebuild.yml`). **Push notifications** (`src/push`, `/api/push`, room invites in `/api/rooms/:code/invite`; in the apps `client/src/app/push.js`) are built but switched off twice: the apps don't ask for permission until `client/src/shared/push.json` is on, and the server sends nothing until `PUSH_SENDING=on` with the Firebase (Android) and Apple (iPhone) keys. The server talks to Firebase Cloud Messaging (HTTP v1) and Apple's push service (HTTP/2) directly, without SDKs. **Gift codes** (`src/giftCodes`, `/api/gift-codes`, the website's `/redeem`) are built but switched off (`client/src/shared/giftCodes.json`); the back office can make codes already. Every other address than the site's own answers HTTP 404 with the app's "Lost the marble" page (`dist/404.html`). **The marbles hub** (`/marbles`, `/marbles/<section>`, `/marbles/<section>/<article>`; `client/src/hub/`) is **on** since 26 Oct 2026 (`client/src/shared/marblesHub.json` `enabled: true`; built hidden from 21 Oct), with five articles, and linked from the site footer ("Marbles"). Set to false, every `/marbles` address is the 404 page again and none is pre-rendered. The build pre-renders the hub, its sections that have articles and each published article (with Article / CollectionPage and BreadcrumbList structured data in the page) and adds them to the sitemap; Vercel serves those files directly, so `vercel.json` needs no rewrite for it. The hub's code is its own chunk, loaded only on `/marbles` addresses.

### Google Play Console (settings, not variables)

- The four coin packs as one-time products with the same ids as `client/src/shared/payments/packs.json`.
- API access through a Google Cloud project; a service account with "View financial data" and "Manage orders and subscriptions".
- Real-time developer notifications: a Pub/Sub topic with a push subscription to `https://<server>/api/payments/google/rtdn?token=<GOOGLE_PLAY_RTDN_TOKEN>`.
- Step by step: the [runbook](05-runbook.md#google-play-billing-coins-in-the-android-app).

### Stripe dashboard (settings, not variables)

- **Webhook endpoint:** `https://<server>/api/payments/stripe/webhook`. The events are listed in the [runbook](05-runbook.md#stripe).
- **Also turn on:**
  - Stripe Tax;
  - Adaptive Pricing;
  - Apple Pay and Google Pay;
  - email receipts.

## Checking what is live

- `GET https://marble-race-rame-production.up.railway.app/health` returns a JSON object with:
  - `status` and `db`;
  - `version.commit` (when the platform provides it);
  - `version.codeFingerprint`: a hash of all server code, so a deploy uploaded by hand can still be identified;
  - `version.simulator` and `version.physics`: the race engines' versions.
- To compare with a checkout of the code: `node -e "console.log(require('./src/version').VERSION.codeFingerprint)"`.
- The website's version is whatever Vercel last built from `Main` (see the Vercel dashboard).

## Scaling limits (today)

- **One server instance only.** Race timers (and the start timers of rooms and quick races) live in the memory of the server that started the race. Running several instances would need the socket.io Redis adapter and one owner per race (see "Scaling notes" in the root README).
- Races are simulated in a worker thread, so the main thread keeps streaming.
- The database is a single Railway Postgres.
