# Marble Spins: technical documentation

*One-page status for anyone taking over the code, such as a new CTO. Read this first, then the documents below. Last reviewed 15 Nov 2026, in the Sunday docs review that runs every week. Mirrored in the claude.ai project "Marble Race" under `cto/`.*

## Status, 16 Nov 2026

**What it is:** Marble Spins is a free online marble racing game. Players drop a marble into a live 20-marble race, decided on the server by real physics. Purchases only change how a marble looks (or, with track packs, which tracks a player can race), never how it races. Races are decided once, from a seed, and never change.

**Where it stands:**
- **Website:** live at marblespins.com (Vercel builds every push to `Main`; production is at `548aeb8`, 15 Nov). Soft start (social media, a daily set of videos, 10–20 invited test pilots) since the week of 26 Oct. **Official launch 1 Dec 2026**, with the Holiday Season, the season pass and the apps. GA4 on since 31 Oct (after cookie consent); the Meta Pixel off.
- **Tracks: 187 live in ten series** (since 17 Nov 2026: after the server deploy of 17 Nov Moses switched on 8 of the 10 new Coasters tracks. Coasters is **not complete yet: 18 of 20** live paid tracks (its 2 free tracks don't count; the 2 reserves, switched off, would complete it; corrected 17 Nov, 22:40). Before that, since 16 Nov 2026: after the server deploy of 16 Nov Moses switched on 22 tracks: the six Canyons, six Peaks, seven Blocks 1 and three new World Tour tracks, Mont-Saint-Michel Tide Run, Angkor Temple Run and Giant's Causeway Run; the five Rivers tracks of 13 Nov are on too); 227 in the database. The ten World Tour re-layouts are live, their records started again. **Switched off until their look fixes:** Cappadocia Balloon Run, Hallstatt Salt Mine Run, Lake Bled Island Run, Santorini Caldera Run. **The ten new Coasters tracks** (deployed 17 Nov): live since 17 Nov: Lake Como Villa Run, Quebec Château Run, Gold Coast Surf Run, Seoul Namsan Run, Pingxi Lantern Run, Atlas Kasbah Run, Bavarian Castle Run, Jodhpur Blue City Run; **kept switched off as reserves for a later Coasters 2** (Moses, 17 Nov): Santa Monica Pier Run and Amalfi Coast Run. The 31 holiday tracks are switched on but hidden and closed until 1 Dec 00:00 Swedish time (210 live then).
- **Server:** last deployed **17 Nov 2026, morning** (code fingerprint `f3b74623039f`, Main `32a9fb2`): the new layouts and look fixes (`2027-08-04-…` to `2027-08-15-…`), the CRM's billing and roles and phases 3–6 (`2027-08-16-…`, `2027-08-18-…`), the costume fixes (`2027-08-17-…`), the ten more Coasters tracks (`2027-08-19-…` to `2027-08-28-…`), the track-pack price ($6.99 / 1,990 coins + $4.99), receipt PDFs and VAT lines; all on `test/appliedDataUpdates.json`. Before it: 16 Nov ~08:00 (`13cbd532658a`, Main `f782fc9`), 13 Nov ~23:00 (`7abad7e4c43d`). **Waiting for the next server deploy:** nothing.
- **Wildness and track packs:** every live track is Easy / Wild / Extreme (from 1,000 report races; 68 / 61 / 23 of the 152), shown as a badge and a picker filter. 11 packs (one per series; Pinball and Arcade separate; Blocks 1 and 2), **$6.99, or 1,990 coins + $4.99**, on the website (Stripe, **live** since 16 Nov), Google Play and the App Store. **Free set: 15 tracks**, one or two per series. **Complete packs** (20 live besides the free ones), since 16 Nov: **Blocks 2, Grand Prix, Rivers, Canyons, Peaks and Blocks 1**; the World Tour has 16 of 20. Only complete packs show in the shop (16 Nov). **Locking and selling are off** (`TRACK_PACKS`); only complete packs lock when it is on. The website keeps saying every track is free until `PACKS_LIVE` (`client/src/shared/packWording.js`). First end-to-end test purchase (Grand Prix pack, Stripe test mode) worked on 13 Nov. Still to do: the store products, the pack terms of sale (draft at `/preview/legal-packs`), Moses's go.
- **Apps:** iPhone and Android (Capacitor). **Android 1.0.0 (5) in Play internal testing, tested by Moses on 13 Nov:** hit and bump sounds work, the ceremony song stops. **Next: 1.0.0 (6)** (17 Nov; `client/app-version.json` and the iPhone project, release notes `client/release-notes/1.0.0.*`): the new track picker and Marble Bag (picker v2 and bag v2, live on the website the same day), track packs through Google Play Billing (the 7 complete packs; Coasters once it has 20 paid tracks live), the shuffled race music, and no website prices in the app's terms. Moses builds it on his PC. **Store submission planned for 16–20 Nov.**
- **Email: on since 1 Nov** (Brevo; `BREVO_API_KEY`, `EMAIL_FROM`). The pass reminders are built but not sent (`PASS_REMINDERS_SENDING` off until Moses says go; planned 20 Nov).
- **Payments:** Stripe **live** since 16 Nov 2026 (`/health`: mode live, webhook ready); the shop shows only complete track packs and has no test purchase (16 Nov); Google Play Billing and Apple in-app purchases built, store products not yet created; coin packs, the Holiday Season pass (pre-sale from 28 Nov) and track packs.
- **Legal texts:** all four approved and in effect since 1 Nov 2026; the privacy policy's "How you found us" added 13 Nov (approved by Moses).
- **Where players come from (since 13 Nov):** the first-touch UTM tags or referring domain, kept in the page's memory (no cookie) and stored once per account (`player_origins`); the back office Dashboard's "Where players come from".
- **Leagues part 1: on for everyone** since 27 Oct (`LEAGUES=on`). **Part 2** (credits, the Pro League) is on branch `leagues-pro`, behind `LEAGUES_PRO`, waiting for a review preview.
- **Built, switched off:** push notifications (first app update, December), gift codes, the pass reminder emails, the guest deletion job (dry run), deleting old replays (dry run until `REPLAY_TRIM=on`), the landing page draft v2 (`/preview/landing-v2`, for Moses).
- **The sameness check over every track** (`test/samenessAllTracks.test.js`) passes with **3 known failures** (Dubai, Frostmere and Elderglade Marble Grand Prix): every World Tour track has its own layout and opening since 16 Nov (the ten re-layouts deployed that morning; Bobsleigh Run and Table Mountain Run on Main, their old tracks frozen for the engine's tests in `src/game/referenceTracks.js`), and San Francisco passes.
- **This week (9–15 Nov):** wildness and track packs, pack sales and the first test purchase; 9 motorsport Grand Prix tracks (live), 5 Rivers, 6 Canyons and 6 Peaks tracks (switched off); the free set of 15; where players come from; Log in for guests and where new guests stop; slow-phone and app sound fixes (builds 4 and 5). Details: `claude/changelog/2026-W46.md` in the project.

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
