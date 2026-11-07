# Marble Spins: technical documentation

*One-page status for anyone taking over the code, such as a new CTO. Read this first, then the documents below. Last reviewed 1 Nov 2026, in the Sunday docs review that runs every week. Mirrored in the claude.ai project "Marble Race" under `cto/`.*

## Status, 1 Nov 2026

**What it is:** Marble Spins is a free online marble racing game. Players drop a marble into a live 20-marble race, decided on the server by real physics. Purchases only change how a marble looks, never how it races. Races are decided once, from a seed, and never change.

**Where it stands:**
- **Website:** live at marblespins.com (Vercel builds every push to `Main`; redeployed by Moses on 1 Nov after the Blocks Series 2 switch-on). Soft start (social media, 10–20 invited test pilots) since the week of 26 Oct. **Official launch 1 Dec 2026**, with the Holiday Season, the season pass and the apps. Google Analytics 4 is on since 31 Oct (after cookie consent); the Meta Pixel is off.
- **Tracks:** **143 live in ten series**: World Tour, Grand Prix, Coasters, Canyons, Blocks, Track and Field, Rivers (16), Peaks (15), Pinball and Arcade. The 31 holiday tracks are switched on but hidden and closed until 1 Dec 00:00 Swedish time (174 then). **Blocks Series 2: all 20 live** (two big features each): the test five since 31 Oct; the other fifteen (four cities, three rivers, four mountains, four winter tracks) switched on by Moses on 1 Nov after the server deploy. **Saint-Tropez** (World Tour) and **Pudong Marble Grand Prix** (Grand Prix), the first two tracks with the kit's loop, switched on by Moses on 4 Nov 2026 by hand in Railway's query box, after the server deploy; the website redeployed the same morning.
- **Server:** deployed by Moses on 6 Nov 2026 from Main (code fingerprint `533b9d0d08de`, `645de71`; 487 columns): the records reset on a new layout (`tracks.records_since`) and Stockholm Marble Grand Prix's own layout (data update `2027-06-01-stockholm-marble-grand-prix-new-layout.sql`; its records started again). Before that, 4 Nov (`d7928db64307`, `ae7dc20`; 177 tracks in the database): Pudong Marble Grand Prix (data update `2027-05-31-add-pudong-marble-grand-prix.sql`). Before that, 3 Nov (`a096af4ab19a`, 176 tracks): the loop engine (physics for the track kit's `loop` piece) and Saint-Tropez (`2027-05-30-add-saint-tropez.sql`). Before that, 2 Nov (`fb4654c0885e`, last server change `6e23a24`; 486 columns): the back office Dashboard, staff accounts (`users.is_staff`), the first-visit steps (`first_steps`), guests made with what they tapped, the hourly IP clean-up, the Security tab loaded on its own and audited (`security-view`), and the first country in the Players list. **Waiting for the next server deploy:** the new layouts of Lagos, Istanbul and Sydney Marble Grand Prix (data updates `2027-06-02-lagos-…`, `2027-06-03-istanbul-…` and `2027-06-04-sydney-…-new-layout.sql`, which reset their records). Take a backup first.
- **Apps:** iPhone and Android (Capacitor) are built; the Android app is tested on Moses's phone. They need a rebuild for the keep-awake fix and the new sounds. Store submission is planned for 16–20 Nov.
- **Email: on since 1 Nov 2026** (Brevo; `BREVO_API_KEY` and `EMAIL_FROM` on Railway, a password-reset email arrived in Moses's inbox; sender no-reply@marblespins.com since 4 Nov 2026, marblespins.com re-authenticated in Brevo that day, support replies with support@ as reply-to): password resets, "Confirm your email" for new sign-ups, support replies and contact-form notifications. The pass reminders are not sent yet.
- **Payments:**
  - Stripe on the website, in **test mode** until Moses says otherwise.
  - Google Play Billing and Apple in-app purchases are built.
  - Coin packs and the Holiday Season pass, pre-sale from 28 Nov.
- **Leagues part 1: on for everyone** since 27 Oct 2026 (`LEAGUES=on`): the free League (**3 tracks from 31 Oct**, the taster league; leagues made before keep 5) and the slim League Night. **Part 2** (credits, the Pro League, the league marble) may start from 1 Nov, behind `LEAGUES_PRO`, on branch `leagues-pro`.
- **Built, switched off:**
  - push notifications (first app update, December);
  - gift codes;
  - the pass reminder emails (built; `PASS_REMINDERS_SENDING` stays off until Moses says go);
  - the guest deletion job (dry run);
  - deleting replays over 30 days old (dry run until `REPLAY_TRIM=on`; new replays are already a third of the size).
- **Newest (2–4 Nov):** the speed pad sound (the old whoosh, the own marble only), a new bump sound (just under the collision click) found on this screen on every obstacle hit, and a new sound balance in two rounds (tunes 8 dB down in all, hits about 19 dB up with a peak limiter, the start sound 6 dB up, whoosh 4 dB down), 4 Nov; the loop in the track kit; Saint-Tropez and Pudong Marble Grand Prix live, 4 Nov (143 live tracks); a check that no land stands inside the channel, on every kit track (3 Nov, after Saint-Tropez's land inside the loop's run-out, fixed in the website's scenery the same day).
- **Newest the week before (26 Oct – 1 Nov):**
  - Peaks (15) and the Chobe live; Blocks Series 2: all twenty live (141 live tracks);
  - Leagues and League Night live; the free League down to 3 tracks;
  - a backward-facing TV camera on every track, the TV camera drama and the racing look (kerbs, chevrons, chequered lines);
  - the start show for solo races, rooms and Quick race;
  - new sounds (start, hit, bump on obstacles; 12 race tunes);
  - the solo starting line: Change marble, Change track, "Other players liked"; "your marble" instead of "Shooter";
  - smaller replays, `.railwayignore`, and server variables changed only from the command line.

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
