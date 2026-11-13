# Marble Spins: technical documentation

*One-page status for anyone taking over the code, such as a new CTO. Read this first, then the documents below. Last reviewed 8 Nov 2026, in the Sunday docs review that runs every week. Mirrored in the claude.ai project "Marble Race" under `cto/`.*

## Status, 8 Nov 2026

**What it is:** Marble Spins is a free online marble racing game. Players drop a marble into a live 20-marble race, decided on the server by real physics. Purchases only change how a marble looks, never how it races. Races are decided once, from a seed, and never change.

**Where it stands:**
- **Website:** live at marblespins.com (Vercel builds every push to `Main`). Soft start (social media, a daily set of videos, 10–20 invited test pilots) since the week of 26 Oct. **Official launch 1 Dec 2026**, with the Holiday Season, the season pass and the apps. Google Analytics 4 on since 31 Oct (after cookie consent); the Meta Pixel off.
- **Tracks: 143 live in ten series** (World Tour, Grand Prix, Coasters, Canyons, Blocks, Track and Field, Rivers, Peaks, Pinball, Arcade); 177 in the database. The 31 holiday tracks are switched on but hidden and closed until 1 Dec 00:00 Swedish time (174 live then). Newest: Saint-Tropez and Pudong Marble Grand Prix, the first with the kit's loop (live 4 Nov).
- **Grand Prix re-layouts (6–8 Nov):** 11 of the 15 Grand Prix tracks turned out to share one design. Eight now have their own layouts, all deployed and raced by Moses: Stockholm (6 Nov), Lagos, Istanbul, Sydney (7 Nov), Nairobi, Delhi Red Fort, Sahara, Wyrmwood Hollow (8 Nov). Their records started again (`tracks.records_since`). The sameness check over every track (`test/samenessAllTracks.test.js`) passes with **16 known failures** left (Dubai, Frostmere, Elderglade; ten World Tour tracks; the three hand-built tracks).
- **Server:** deployed 8 Nov 2026 just after midnight from Main (code fingerprint `456cd315c575`, `0a158a5`; 487 columns, 52 tables): the four latest Grand Prix layouts (data updates `2027-06-06-…` to `2027-06-09-…`), Lagos's second TV camera out, and the race readiness report's app fields. Earlier this week: 7 Nov (`22aa52923453`), 6 Nov (`533b9d0d08de`: the records reset, Stockholm), 4 Nov (`d7928db64307`: Pudong), 3 Nov (`a096af4ab19a`: the loop engine, Saint-Tropez), 2 Nov (`fb4654c0885e`: the back office Dashboard, staff accounts, the first-visit steps). **Waiting for the next server deploy:** logging back in and where new guests stop (9 Nov 2026): the `email_taken` code, `login-failed`, the kind of browser at the tap, `first_step_events` and the log line (the schema adds a column and a table; no data update).
- **Apps:** iPhone and Android (Capacitor) built; Android build 1.0.0 (2) tested on Moses's phone on 7 Nov (late beeps, no hit sounds: fixed, `c3c3782`); 1.0.0 (3) tested on a Galaxy A12 on 11 Nov (slow-phone fixes, `2b94312`). **Android 1.0.0 (4) in Play internal testing since 12 Nov** (`client/app-version.json` and the iPhone project at 1.0.0 (4) on Main; the next build is 5: `npm run app:version -- build`), then Moses's test. Store submission planned for 16–20 Nov.
- **Email: on since 1 Nov** (Brevo; `BREVO_API_KEY`, `EMAIL_FROM` = no-reply@marblespins.com since 4 Nov): password resets, "Confirm your email", support replies, contact-form notifications. The pass reminders are built but not sent (`PASS_REMINDERS_SENDING` off until Moses says go).
- **Payments:** Stripe on the website in **test mode** until Moses says otherwise; Google Play Billing and Apple in-app purchases built; coin packs and the Holiday Season pass (pre-sale from 28 Nov).
- **Legal texts:** all four approved and in effect since 1 Nov 2026, no DRAFT banner.
- **Leagues part 1: on for everyone** since 27 Oct (`LEAGUES=on`): the free League (3 tracks since 31 Oct) and League Night. **Part 2** (credits, the Pro League, the league marble) is on branch `leagues-pro`, behind `LEAGUES_PRO`, waiting for a review preview.
- **Wildness and track packs (live since the 12 Nov deploy, `b5cc113debdb`):** every live track scored Easy / Wild / Extreme from 1,000 report races (64 / 57 / 22), the badge and the picker filter replacing difficulty; 11 packs (one per series, Pinball and Arcade separate, Blocks 1 and 2). **Free set: 30** (3 per series, 2 Extreme; data update `2027-06-11-free-set-of-30` waiting for the next deploy; the World Tour pack goes on sale last). **Voxel Peaks moves to Blocks 2** (`2027-06-13-voxel-peaks-to-blocks-2`, next deploy): Blocks 2 has 20 in its pack, the first complete pack; Blocks 1 has 12. **Motorsport Grand Prix tracks** (12 Nov 2026, overnight, one commit each, switched off, in the Grand Prix pack): Heartland Oval Speedway (Easy, 26), Lapland Ice Race (Easy, 29), Lombardy Parkland Circuit (Easy, 29), Mexico City Stadium Section (Easy, 32), Finland Forest Rally (Wild, 41), Tokyo Night Street Race (Wild, 34), São Paulo Rain Circuit (Wild, 35); the rest as each passes its full report. **Pack sales built 12 Nov** ($7.99, or 1,990 coins + $5.99; Stripe test mode, Google Play, App Store), waiting for a server deploy and the store products; sold only while `TRACK_PACKS` is on for the player. **Locking is behind `TRACK_PACKS`, off**: nothing locked. When on, only complete packs lock (today Blocks 2), and the picker shows My tracks / Locked.
- **Built, switched off:** push notifications (first app update, December), gift codes, the pass reminder emails, the guest deletion job (dry run), deleting replays over 30 days old (dry run until `REPLAY_TRIM=on`).
- **This week (2–8 Nov):** the back office Dashboard and staff accounts; the finish apron on kit tracks; the loop and its first two tracks; the speed pad and bump sounds and a new sound balance (hits about 19 dB up behind a limiter, tunes 8 dB down); the app's countdown and hit-sound fix; the sameness check over every track and records reset on a new layout; eight Grand Prix tracks re-laid; the daily video order (17:00 and 23:00, Sundays also 09:00) with fresh on-screen text per video. Details: `claude/changelog/2026-W45.md` in the project.

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
