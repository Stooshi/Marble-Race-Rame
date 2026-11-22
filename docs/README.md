# Marble Spins: technical documentation

*One-page status for anyone taking over the code, such as a new CTO. Read this first, then the documents below. Last reviewed 22 Nov 2026, in the Sunday docs review that runs every week. Mirrored in the claude.ai project "Marble Race" under `cto/`.*

## Status, 22 Nov 2026

**What it is:** Marble Spins is a free online marble racing game. Players drop a marble into a live 20-marble race, decided on the server by real physics. Purchases only change how a marble looks (or, with track packs, which tracks a player can race), never how it races. Races are decided once, from a seed, and never change.

**Where it stands:**
- **Website:** live at marblespins.com (Vercel builds every push to `Main`; production is at `50cde6e`, 22 Nov, Ready). Soft start (social media, a daily set of videos, invited test pilots) since the week of 26 Oct. **Official launch 1 Dec 2026**, with the Holiday Season, the season pass and the apps. GA4 on since 31 Oct (after cookie consent); the Meta Pixel off. The new track picker and Marble Bag (v2) are live since 17 Nov.
- **Tracks: 187 live in ten series** (since 17 Nov), 227 in the database. Coasters has 18 of 20 live paid tracks (Santa Monica Pier Run and Amalfi Coast Run kept off as reserves for a later Coasters 2). Cappadocia, Hallstatt, Lake Bled and Santorini (World Tour) stay off until their look fixes are approved. **Eight new Track and Field tracks** (21–22 Nov: Rome Monte Mario Drop, Helsinki Tower Lap, Munich Tent Roof Run, Brussels Night Mile, Doha Desert Sprint, Paris Saint-Denis Relay, Montreal Tower Run, Rio Samba Relay) are on Main, switched off, waiting for the server deploy; with them Track and Field has 16 of 20 paid tracks. **Every new track starts clear** (Moses, 21 Nov). The 31 holiday tracks are switched on but hidden and closed until 1 Dec 00:00 Swedish time (218 live then).
- **Server:** last deployed **17 Nov 2026, morning** (code fingerprint `f3b74623039f`, Main `32a9fb2`). **Waiting for the next server deploy:** 17 data updates (`2027-08-29-ms-1001-test-order`, then `2027-08-30-…` to `2027-09-06-…`, the eight Track and Field tracks) and the server code of 17–21 Nov: the device and browser log (`user_devices`), the confirm-email reminders (then `CONFIRM_REMINDERS=on`), MS-1001 as a test order (`payments.is_test`), Google Play's purchase readiness on `/health`, the CRM's Dashboard, Races & tracks and Tools. After it: add the applied files to `test/appliedDataUpdates.json`.
- **Wildness and track packs:** every live track is Easy / Wild / Extreme (from 1,000 report races), shown as a badge and a picker filter. 11 packs, **$6.99, or 1,990 coins + $4.99** (coins at most 30%), on the website (Stripe live), Google Play (products created for the complete packs) and the App Store (products not yet created). **Free set: 15 tracks.** **Complete packs:** Blocks 2, Grand Prix, Rivers, Canyons, Peaks, Blocks 1; Coasters 18, World Tour 16, Track and Field 8 (16 after the deploy). The track-pack terms of sale are live on /legal (16 Nov). **Locking and selling are off** (`TRACK_PACKS`); the website keeps saying every track is free until `PACKS_LIVE`.
- **Apps:** iPhone and Android (Capacitor), **1.0.0 (8)** (`client/app-version.json`). Builds 6 and 7 played no sound in solo races; build 8 takes the account's sound settings once per sign-in, **confirmed by Moses on 19 Nov**. iPhone minimum iOS 16.4. The store submission (planned 16–20 Nov) isn't recorded on Main yet.
- **Email:** on since 1 Nov (Brevo). Service emails only. **Marketing email is built and its texts are approved (19 Nov), but sending is off** (`MARKETING_SENDING`; soft opt-in only from `MARKETING_SOFT_OPT_IN_FROM`). The confirm-email reminders (day 1, 3, 7) are approved and switched on after the deploy. The pass reminders wait for `PASS_REMINDERS_SENDING`.
- **Payments:** Stripe **live** since 16 Nov 2026. Our own receipts (K-…) and credit notes (KR-…) are issued as pages and A4 PDFs, with VAT lines that are consistent. MS-1001 counts as a test order. Google Play Billing and Apple in-app purchases are built. On sale: coin packs, the Holiday Season pass (pre-sale from 28 Nov) and, once switched on, track packs.
- **Back office:** the CRM (since 16–17 Nov) covers billing, roles and audit, customers, support stages and saved replies, email templates and the email log, marketing (off), the Dashboard, Races & tracks (switching tracks on and off, owner only) and Tools. The classic pages keep working until Moses approves the move.
- **Legal texts:** all four approved and in effect since 1 Nov 2026. Updated since then: the terms of sale's track-pack section (16 Nov); the privacy policy's "How you found us" (13 Nov), "Emails" (19 Nov) and "Device and browser" (20 Nov).
- **Leagues part 1: on for everyone** since 27 Oct (`LEAGUES=on`). **Part 2** (credits, the Pro League) is on branch `leagues-pro`, behind `LEAGUES_PRO`, waiting for a review preview.
- **Built, switched off:** push notifications (first app update, December), gift codes, the pass reminder emails, marketing email, the guest deletion job (dry run), deleting old replays (dry run until `REPLAY_TRIM=on`), the landing page draft v2 (`/preview/landing-v2`).
- **The sameness check over every track** (`test/samenessAllTracks.test.js`) **fails since 21 Nov**: Marble Stadium Sprint and Zurich Golden Lap share their start shots with the new Doha Desert Sprint and Brussels Night Mile (different gates, which passes for the new clear-start tracks but not for the older ones). Needs Moses's choice (see `claude/known-issues.md`). The 3 known failures listed in the test are unchanged: Dubai, Frostmere and Elderglade Marble Grand Prix.
- **This week (16–22 Nov):** Stripe live and 22 tracks switched on (16 Nov), 8 of 10 new Coasters tracks live (17 Nov), the pack price $6.99, the track-pack terms, receipt PDFs, the CRM phases 3–6 and the back office moved in, picker v2 and bag v2, app builds 6–8 and the sound fix, marketing and confirm-reminder texts approved, device and browser logging, eight new Track and Field tracks with the clear start, the crowd cheer. Details: `claude/changelog/2026-W47.md` in the project.

**How it runs:**

| Part | Where | Deploys |
|---|---|---|
| Website (`client/`, React 19 + Vite + three.js) | Vercel, marblespins.com | Automatically on every push to `Main` |
| Game server (`src/`, Node, Express, socket.io) | Railway, one instance | **By hand by Moses** (ZIP + `railway up`) |
| Database (PostgreSQL) | Railway | The schema (`docs/database_schema.sql`, adds only) and data updates (`docs/data_updates/`) apply themselves when the server starts |
| Apps (`client/ios`, `client/android`) | App Store, Google Play (not yet submitted) | Built on Moses's Mac with the release scripts |

**Rules that never bend** (`CLAUDE.md`):
- Race results never change, and looks never affect results. The race fingerprint tests guard this.
- Coins move only through `economy.change()`, which writes the coin ledger.
- The schema only adds. Row changes go in a new data update, and one that has run is never edited.
- Secrets never appear in code, docs or chat: only their variable names.
- Docs are updated in the same commit as the code.

**Watch out for:**
- **One server instance only:** race timers live in memory.
- **After a Railway variables change,** check `/health` shows the new code fingerprint. On 23 Oct a redeploy served an old build.
- **Rotating `JWT_SECRET` logs everyone out,** and guests lose their accounts.
- **Store submission is no longer blocked by the legal texts:** all four (terms of use, terms of sale, privacy policy, cookie policy) are approved and in effect from 1 Nov 2026, with no DRAFT banner; email is on since 1 Nov. See `claude/open-decisions.md` in the project.

**Where the rest is:**
- **In the project:**
  - `claude/open-decisions.md`: what Moses still has to decide;
  - `claude/known-issues.md`: bugs and rough edges;
  - `claude/changelog/`: one file per week;
  - a PDF of these documents every Sunday, sent to Moses (for `cto/pdf/`: the project can only take it as an upload in claude.ai).
- **Plans and status per feature:** `claude/*`, for example `prelaunch-check`, `store-submission-drafts`, `rivers-status` and `holiday-season-plan`.

## The documents

| # | Document | What it answers |
|---|---|---|
| 1 | [Architecture](01-architecture.md) | The parts (website, server, database, payments, apps), how they talk to each other, environments and variables |
| 2 | [Code map](02-code-map.md) | Where everything is in the repository, and where to look to fix something |
| 3 | [Data model](03-data-model.md) | Every database table and column; how the coin ledger and First Editions work |
| 4 | [Game and economy rules](04-game-rules.md) | How a race is decided, coins, prices, rooms and Quick race, fairness checks, in plain English |
| 5 | [Operations runbook](05-runbook.md) | Deploying, data updates, rollback, backups, secret rotation, the admin 2-step reset, Stripe test/live, the app releases, Google Play and App Store setup, common problems |
| 6 | [Decisions log](06-decisions.md) | Key decisions, with the date and the reason for each |
| 7 | [Known gaps and roadmap](07-gaps-roadmap.md) | What isn't built or isn't finished yet |
| 8 | [Store rules](08-store-rules.md) | The App Store and Google Play rules checked against the app, account deletion, the age rating, App Privacy and Data safety answers |

**Other documentation in the repository:**
- `README.md`: the server's REST and socket API reference.
- `client/README.md`: the client and the apps.
- `client/APP-TESTING.md`: running the apps on your own phone.
- `src/tracks/README.md`: the track kit, for building new tracks.
- `store-assets/README.md`: the App Store and Google Play screenshots and feature graphic.
- `docs/database_schema.sql`: the schema itself, with comments.

**Conventions used in these documents:**
- Paths are relative to the repository root.
- "The server" means the Node app in `src/`. There is no `server/` folder: the server sits at the top level of the repository, next to `client/`.
- Variables are named but their values are never written here. Values live only in Railway, Vercel, Stripe, Google Play Console and App Store Connect. The Android upload key lives only on Moses's computer and its backups.
- **Every Sunday** a docs review checks every document against the code. It fixes what's out of date, writes the week's changelog, updates the open decisions and known issues, reports the sameness check's known failures (`test/samenessAllTracks.test.js`), and makes the PDF.
