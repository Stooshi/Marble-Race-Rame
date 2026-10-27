# Marble Spins: technical documentation

*One-page status for anyone taking over the code, such as a new CTO. Read this first, then the documents below. Last reviewed 25 Oct 2026, in the Sunday docs review that runs every week. Mirrored in the claude.ai project "Marble Race" under `cto/`.*

## Status, 27 Oct 2026

**What it is:** Marble Spins is a free online marble racing game. Players drop a marble into a live 20-marble race, decided on the server by real physics. Purchases only change how a marble looks, never how it races. Races are decided once, from a seed, and never change.

**Where it stands:**
- **Website:** live at marblespins.com. Soft start (social media, 10–20 invited test pilots) in the week of 26 Oct. **Official launch 1 Dec 2026**, with the Holiday Season, the season pass and the apps.
- **Tracks:** **110 live in ten series**: World Tour, Grand Prix, Coasters, Canyons, Blocks, Track and Field, Rivers, Peaks, Pinball and Arcade. The 31 holiday tracks are switched on but hidden and closed until 1 Dec 00:00 Swedish time (141 then). **Peaks:** the first five (Everest, Mont Blanc, Vinson, Kilimanjaro, Vatnajökull) switched on by Moses on 27 Oct 2026 (after the server deploy that added them); the other ten after Leagues part 1, each with its big feature listed for Moses's approval first.
- **Apps:** iPhone and Android (Capacitor) are built; the Android app is tested on Moses's phone. Store submission is planned for 16–20 Nov.
- **Payments:**
  - Stripe on the website, in **test mode** until Moses says otherwise.
  - Google Play Billing and Apple in-app purchases are built.
  - Coin packs and the Holiday Season pass, pre-sale from 28 Nov.
- **Built, switched off:**
  - push notifications (first app update, December);
  - gift codes;
  - email: pass reminders and confirmations, waiting for Brevo and its key;
  - the guest deletion job (dry run).
- **Newest this week:**
  - player names everywhere;
  - public rooms and a one-tap Quick race;
  - the friend-room start timer;
  - the phone website with a full-screen race;
  - Rivers live;
  - the marbles hub at /marbles, five articles (26 Oct).

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
- **Store submission is blocked** by the legal DRAFT banner and email (Brevo). See `claude/open-decisions.md` in the project.

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
- **Every Sunday** a docs review checks every document against the code. It fixes what's out of date, writes the week's changelog, updates the open decisions and known issues, and makes the PDF.
