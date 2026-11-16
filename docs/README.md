# Marble Spins: technical documentation

*One-page status for anyone taking over the code, such as a new CTO. Read this first, then the documents below. Last reviewed 15 Nov 2026, in the Sunday docs review that runs every week. Mirrored in the claude.ai project "Marble Race" under `cto/`.*

## Status, 15 Nov 2026

**What it is:** Marble Spins is a free online marble racing game. Players drop a marble into a live 20-marble race, decided on the server by real physics. Purchases only change how a marble looks (or, with track packs, which tracks a player can race), never how it races. Races are decided once, from a seed, and never change.

**Where it stands:**
- **Website:** live at marblespins.com (Vercel builds every push to `Main`; production is at `548aeb8`, 15 Nov). Soft start (social media, a daily set of videos, 10–20 invited test pilots) since the week of 26 Oct. **Official launch 1 Dec 2026**, with the Holiday Season, the season pass and the apps. GA4 on since 31 Oct (after cookie consent); the Meta Pixel off.
- **Tracks: 152 live in ten series** (World Tour, Grand Prix, Coasters, Canyons, Blocks, Track and Field, Rivers, Peaks, Pinball, Arcade), since the 9 motorsport Grand Prix tracks were switched on on 13 Nov; 191 in the database. **Switched off, waiting for Moses:** five more Rivers tracks (on the server since 13 Nov: Yukon Five Finger Run, Arno Old Bridge Run, Chao Phraya Dawn Spiral, Hudson Highlands Run, Iguazú Devil's Throat) and six more Canyons tracks (on Main, **waiting for the server deploy**: Bryce Hoodoo Run, Blyde Potholes Spiral, Taroko Marble Gorge, Samaria Iron Gates, Kings Canyon Lost City, the first coaster track with a loop, and Sumidero Christmas Falls; data updates `2027-06-29-…` to `2027-07-04-…`) and six more Peaks tracks (on Main, **waiting for the same deploy**: Half Dome Granite Slabs, Huayna Picchu Terraces, Huashan Plank Walk, Eiger North Face, Etna Valle del Bove, Tianmen Heaven's Gate; data updates `2027-07-05-…` to `2027-07-10-…`) and seven more Blocks 1 tracks (on Main, **waiting for the same deploy**: Mushroom Grove, Sunken Ruins, Clockwork Works, Crystal Grotto, Jungle Ruins, Moon Base, Neon Grid; data updates `2027-07-11-…` to `2027-07-17-…`); World Tour re-layouts (on Main, **waiting for the same deploy**; their records start again): Åre Run, Greenland Expedition, Park City Run, Dubai Twister, Rio Jungle Rumble, China Wall Twister, Baqueira-Beret Run, Paris Eiffel Tower Run, Portes du Soleil Run, Amazon Water Run (`2027-07-18-…` to `2027-07-27-…`), and new World Tour tracks, switched off: Santorini Caldera Run, Hallstatt Salt Mine Run, Lake Bled Island Run, Mont-Saint-Michel Tide Run, Angkor Temple Run (`2027-07-28-…` to `2027-08-01-…`). Moses deploys Canyons, Peaks, Blocks 1 and the World Tour work together. The 31 holiday tracks are switched on but hidden and closed until 1 Dec 00:00 Swedish time (183 live then).
- **Server:** last deployed **13 Nov 2026, ~23:00** (code fingerprint `7abad7e4c43d`, Main `7a3342d`; 57 tables, 527 columns): the Stripe webhook's refusals logged and its readiness on `/health`. The week's other deploys (12 Nov `b5cc113debdb` and `bc1bd7ff096f`; 13 Nov ~14:20 `8d7a15a7631e`, ~18:30 `6be622039502`, ~21:45 `c25a2aa05c5b`) brought wildness and track packs, pack sales, the free set of 15, the motorsport Grand Prix tracks, where players come from and the five Rivers. Main is at fingerprint `5636207a9263`: the next deploy brings only the six Canyons tracks.
- **Wildness and track packs:** every live track is Easy / Wild / Extreme (from 1,000 report races; 68 / 61 / 23 of the 152), shown as a badge and a picker filter. 11 packs (one per series; Pinball and Arcade separate; Blocks 1 and 2), **$7.99, or 1,990 coins + $5.99**, on the website (Stripe, test mode), Google Play and the App Store. **Free set: 15 tracks**, one or two per series. **Complete packs** (20 live besides the free ones): Blocks 2 and Grand Prix; Rivers and Canyons have 20 once their new tracks are on. **Locking and selling are off** (`TRACK_PACKS`); only complete packs lock when it is on. The website keeps saying every track is free until `PACKS_LIVE` (`client/src/shared/packWording.js`). First end-to-end test purchase (Grand Prix pack, Stripe test mode) worked on 13 Nov. Still to do: the store products, the pack terms of sale (draft at `/preview/legal-packs`), Moses's go.
- **Apps:** iPhone and Android (Capacitor). **Android 1.0.0 (5) in Play internal testing, tested by Moses on 13 Nov:** hit and bump sounds work, the ceremony song stops (the slow-phone and sound fixes of 11–12 Nov confirmed). `client/app-version.json` and the iPhone project at 1.0.0 (5); the next build is 6 (`npm run app:version -- build`). **Store submission planned for 16–20 Nov.**
- **Email: on since 1 Nov** (Brevo; `BREVO_API_KEY`, `EMAIL_FROM`). The pass reminders are built but not sent (`PASS_REMINDERS_SENDING` off until Moses says go; planned 20 Nov).
- **Payments:** Stripe in **test mode** until Moses says otherwise (live keys planned 27 Nov); Google Play Billing and Apple in-app purchases built, store products not yet created; coin packs, the Holiday Season pass (pre-sale from 28 Nov) and track packs.
- **Legal texts:** all four approved and in effect since 1 Nov 2026; the privacy policy's "How you found us" added 13 Nov (approved by Moses).
- **Where players come from (since 13 Nov):** the first-touch UTM tags or referring domain, kept in the page's memory (no cookie) and stored once per account (`player_origins`); the back office Dashboard's "Where players come from".
- **Leagues part 1: on for everyone** since 27 Oct (`LEAGUES=on`). **Part 2** (credits, the Pro League) is on branch `leagues-pro`, behind `LEAGUES_PRO`, waiting for a review preview.
- **Built, switched off:** push notifications (first app update, December), gift codes, the pass reminder emails, the guest deletion job (dry run), deleting old replays (dry run until `REPLAY_TRIM=on`), the landing page draft v2 (`/preview/landing-v2`, for Moses).
- **The sameness check over every track** (`test/samenessAllTracks.test.js`) passes with **16 known failures**, unchanged this week (Dubai, Frostmere, Elderglade; ten World Tour tracks; the three hand-built tracks). The World Tour pack goes on sale last, after its re-layouts.
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
