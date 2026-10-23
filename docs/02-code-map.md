# 2. Code map

*Last updated 21 Oct 2026.* Where everything is, and where to look to fix something. Paths are relative to the repository root.

## Find it fast

| I want to… | Look in |
|---|---|
| Change how much a race pays, the daily goal, starting coins or bag discounts | `client/src/shared/economy.json` (read by server and website) |
| Start a scoreboard season | A row in the `seasons` table (a data update: name, `starts_at`, `ends_at`, `badge_top`); the board, its end and the badges follow its dates. Only when the table has no season on or ended: `client/src/shared/economy.json` → `season` (`number`, `startsAt`, `endsAt`, `badgeTop`) |
| Change the starter marbles' colours | `client/src/shared/marbles/starters.json` (palette, two-colour minimum difference), `src/marbles/starters.js` (making them, the race line-up), `badge.js` `plainLookOf` (pattern `half`) |
| Change the save pop-up or quick sign-up texts (EN/SV) | `client/src/site/account/saveTexts.js`; the pop-up's rule in `SavePrompt.jsx` |
| Switch Swedish texts back on (save pop-up, quick sign-up, confirm-email and pass-reminder emails) | `client/src/shared/language.json` → `ENGLISH_ONLY: false` (English only since 21 Oct) |
| Change what a guest sees on "Log out" | `client/src/site/account/LogoutButton.jsx` (header, Settings, the old nav bar) |
| Change how a player's name shows to others ("@name", a guest as "Guest 0DA1") | `client/src/shared/playerName.js` (`handle()`, `plainName()`); friend rooms: `src/routes/rooms.js` `nameOf` |
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
| Fix an App Store (iPhone) payment | `src/payments/apple.js` (Apple's signature checked on the server), `client/src/site/payments/index.js` (StoreKit through `@capgo/native-purchases`), `src/routes/payments.js` (`/apple/*`) |
| Fix the season's scoreboard, its end or its badges | `src/seasons/index.js` (`scoreboardSeason`, `standings`, `awardBadges`, `badgesOf`, `startJobs`), `src/routes/scoreboard.js` (`currentSeason`) |
| Fix a Google Play (Android) payment | `src/payments/google.js` (server checks with Google), `client/src/site/payments/index.js` (the app's purchase sheet), `src/routes/payments.js` |
| Build the Android release | `client/scripts/android-upload-key.mjs`, `client/scripts/android-release.mjs`, `client/app-version.json`, `client/android/app/build.gradle` (signing) |
| Fix a back-office page | `client/src/admin/AdminApp.jsx` (pages), `src/routes/admin.js` (data and actions), `src/admin/session.js` (login) |
| Fix friend rooms | `src/routes/rooms.js`, `client/src/site/pages/RoomPage.jsx` |
| Change a season's dates, its pass price or the Track of the Day | A new data update on the `seasons` row (`featured`: date → track slug). Rules in `src/seasons/index.js` |
| Fix the season pass, locked season tracks or the Track of the Day bonus | `src/seasons/index.js` (`trackAccess`, `pickOpenTrack`, `pickSeasonTrack`, `bonusLine`, `grantForPayment`, `revokeForPayment`), `src/payments/index.js` (`passCheckout`, `passProduct`, `grant`), `src/routes/seasons.js`, `client/src/site/pages/PassPage.jsx` |
| Fix how a track looks | `client/src/three/` (see the 3D section below). Drawing only, never the race |
| Add a new track | `src/tracks/README.md` (the kit guide), then `scripts/physics-track-sql.js` and a data update |
| Fix sound or music | `client/src/sound/engine.js` (the race's sound: countdown beeps, one race track, the ceremony song), `client/src/sound/settings.js`, files in `client/public/audio/`; the race page calls `raceCountdown`/`raceGo`/`raceCeremony`/`raceEnd` (`pages/Race.jsx`, `components/LiveRaceViewer3D.jsx`, `components/RaceViewer.jsx`) |
| Change legal text | `client/src/site/pages/LegalPage.jsx`; the company's name, org.nr, VAT no., address, support and privacy email in `client/src/shared/company.json` (used by the legal pages, cookie page, footer, Help Centre, emails and Stripe's checkout) |
| Write, review or publish a marbles hub article | Drafts for review: `content/marbles-drafts/<slug>.md` (never built into the site). To publish: set `status: published` and move the file to `client/src/hub/articles/`; the hub must be on (`client/src/shared/marblesHub.json`). Preview locally with `VITE_MARBLES_HUB=drafts npm run dev`, then `/marbles` |
| Change a page's title, description or share picture, or what search engines index | `client/src/site/pageMeta.js` (used by the site and the pre-rendering), `client/public/robots.txt`; pages in the sitemap: `client/scripts/prerender.mjs` |
| Change the cookie banner, the cookie list, or what Analytics / the Pixel receive | `client/src/site/consent/` (`consent.js`: categories, `STORAGE_LIST` shown on `/cookies`; `tracking.js`: loading and events; `ConsentManager.jsx`: banner and settings). A new browser storage key must be added to `STORAGE_LIST` (a test checks) |
| Redo a track's picture in the track picker | `node scripts/track-banners.js <slug>` (a moment and side in `scripts/track-banners.json` if the automatic one isn't good); review at `/preview/banners`; switch the pictures on with `enabled` in `client/src/shared/trackBanners.json` |
| Change a Help Centre answer, or the search's synonyms | `client/src/site/help/faq.js` (texts from the project doc `claude/help-faq-draft.md`; numbers come from the settings files), `client/src/site/help/search.js` (`SYNONYMS`) |
| Change an email's text | `src/email/templates.js` |
| Fix the contact form or the support inbox | `client/src/site/help/ContactForm.jsx`, `src/routes/support.js`, `src/support/index.js`, `src/routes/admin.js` (`/support…`); categories and limits in `client/src/shared/support.json` |
| Change the app icon or splash | `client/assets/*.png`, then `npx capacitor-assets generate --ios --android`. The website's icons follow it: redo `public/apple-touch-icon.png`, `icon-192.png` and `icon-512.png` from `assets/icon-only.png`, `favicon-48x48.png` and `favicon-96x96.png` from `icon-512.png`, and the small `favicon.svg` / `favicon.ico` by hand (check them at 16 px on light and dark tabs). `src/site/seo.test.js` checks the sizes, the links and robots.txt |
| Change the database | Add columns or tables to `docs/database_schema.sql` (additions only). To change existing rows, add a new file in `docs/data_updates/` |

---

## Repository root

| Path | What it is |
|---|---|
| `package.json` | The server's dependencies and scripts: `npm start`, `npm run dev`, `npm run db:migrate`, `npm run report -- <slug>`, `npm test` |
| `README.md` | Server REST and socket API reference, quick start, scaling notes |
| `src/` | **The game server** (see below) |
| `client/` | **The website and the apps** (see below) |
| `content/marbles-drafts/` | Marbles hub articles waiting for Moses's review (markdown, `status: draft`). Not part of any build; `client/src/hub/hub.test.jsx` checks they stay valid |
| `docs/` | This documentation, `database_schema.sql` (the schema) and `data_updates/` (one-time SQL changes) |
| `scripts/` | Command-line tools: track reports, fingerprints, track SQL, audio conversion, the clear-track check |
| `test/` | Server tests (`node --test`) |
| `reports/` | Committed output of the track reports (one folder per track: `index.html`, JSON, screenshots) |
| `music-inbox/` | Moses's original audio files. `scripts/convert-audio.sh` turns them into `client/public/audio/` |
| `vercel.json` | (root) Vercel settings for the website project |
| `.github/workflows/season-start-rebuild.yml` | "Season start: rebuild the website": at 1 Dec 2026 00:05 Swedish time (and from its "Run workflow" button) it POSTs the Vercel Deploy Hook kept in the Actions secret `VERCEL_DEPLOY_HOOK_SEASON`, then checks the sitemap has a holiday track (runbook, "The season-start website rebuild") |


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
- `physicsSimulator.js`: the **new physics** engine (`PHYSICS_VERSION`), used by every track with `tracks.physics`. Half-pipes (`channel.wides`: the channel widening into a U, `wideAt`), jib parts (features `box`: raised flat tops marbles ride over or are pushed round, `boxLift`) and boost-pad jumps (features `jump`: kicker, gap, landing deck and the hidden catch channel, `advanceJump`, `jumpLift`; a launch pad is a `boost` with a `min` speed; `stats.jumpFlights` for the report) race only on tracks that have them. Its races are stored as replays (`race_replays`), so tuning it never changes a past race. The comments at the top of this file and `routes/physics.js` still say real races use the classic engine; that is no longer true.
- `runSimulation.js`: picks the engine; `packReplay` gzips a physics race.
- `simulationPool.js` + `simulationWorker.js`: run simulations in a worker thread, falling back to the main thread.
- `raceService.js`: the database side of a race:
  - `decide()` fills computer players, sets lanes and skills, dresses showcase looks, picks lighting, simulates, writes results, and sets `countdown`;
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
  - `parts.js`: shapes, obstacles and features, with proven numbers (also `boostJump`: the launch pad, kicker, gap and landing deck, proven on the jump run, L73; the recipe allows one a track, on a straight, every marble clearing it at the pad's minimum speed);
  - `openings.js`, `layouts.js`: proven starts and section orders (L30–L39 and L50–L54 were made for the Canyon Series, L40–L49 and L55–L59 for the Block Series, L60–L69 for Track and Field, L70–L73 the skatepark parts' proving layouts, L74–L88 for the Rivers);
  - `recipe.js`: the rules. Families: `world-tour`, `grand-prix`, `coaster`, `pinball`, `arcade`, `canyon`, `block`, `athletics`, `winter-wonders`, `river`, `test` (**Winter Wonders**, `family: 'winter-wonders'`, is a World Tour track on the ground whose kit carries `winterWonders: true`, listed as its own series by `GET /api/tracks` and `scripts/track-banners.js`). A **Track and Field** track (`family: 'athletics'`, `athletics: { stadium, lanes }`, sections' `stadium: true`, surface `tartan` or `tartan-blue`) is built the same way, on the ground, with concrete columns (`coaster.style: 'concrete'`) under any ramp; A **Block Series** track (`family: 'block'`, `block: { world }`) is built the same way, on voxel land, with block-pillar supports (`coaster.style: 'blocks'`); A **Rivers** track (`family: 'river'`, `river: { palette, side, width, banks }`, sections' `river`: `left`, `right`, `under` (flying at least 6 m over the water) or `none`) is built the same way, on its banks, flying out over the water where a section gives a `height`; its starts `pier`, `river-boat` (which may take the boost-launch opening) and `lock-gate` are for Rivers tracks only; A **canyon** (`family: 'canyon'`, `canyon: { palette, depth, river, narrow }`, sections' `walls`) is built as a coaster whose sections run on the canyon floor unless they give a `height`;
  - `mirror.js`;
  - `lighting.js`: lighting chosen per race from its seed; looks only.

**`report/`: the track reports** (see [Game rules: fairness](04-game-rules.md#fairness-checks)).
- `analyze.js`: measures one race.
- `batch.js`: runs batches of races on worker threads.
- `summarize.js`: pass/fail lines; `TARGETS` holds every threshold.
- `overtakes.js`, `variety.js` (sameness check), `startLook.js` + `startLooks.json` (first-3-seconds check), `firstSeconds.js` + `startSequences.json` (first-20-seconds check: what the field races through after the gate against every other track's start; `scripts/start-sequences.js` records every track).
- `html.js`: writes the report page.

**`marbles/`: the collection.**
- `catalog.js`: reads `catalog.json`. Builds items (design × shade), IDs like `SC105` and certificate codes like `SC105-000037` (gifts: `SC105-G00012`). Each item has its collection's `kind` (`collectionOf`: catalog.json → `collections` by its code; `standard`, `limited`, `seasonal`, `pass`), its price (a seasonal collection's own per rarity) and its window. `saleState()`: `coming` before its window (a limited edition's `limited.saleStartsAt`, a seasonal collection's `releaseAt`), `on-sale` in it, `sold-out` after a limited edition's window or once every numbered copy is sold, `retired` after a seasonal collection's `retireAt`, `pass-only` for a season pass's marble; `onSale()` is true only when on sale. `isStandard()` (bags and the showcase use only these), `passMarbleOf(seasonKey)`.
- `collection.js`:
  - buying (`buy`, which hands out First Edition numbers and refuses a limited edition or a seasonal marble outside its window: 409 before, 410 after, whatever the screen shows, and a pass marble always), gifts (`grantCopy`) and bags (the standard collection only);
  - the season pass's marble: `grantSeasonMarble` (numbered in order: `copy_no` = `edition_no`, price 0, source `grant`), `takeBackSeasonMarble` (a refunded pass), `passNumber` ("Holiday 2026 #0001"); `certificate()` also says a pass marble's `edition` and `number`, and a retired seasonal marble's `retiredAt`;
  - the Marble Bag, the Shooter, certificates, find by ID;
  - `pickRacingMarble`.
- `starters.js`: every player's own 4 starter marbles (20 Oct 2026): the 76 looks from 12 colours, `create()`/`ensure()` (their `marbles` rows, Marble IDs `ST…`), `lineUp()` (the starter a joining player races with so no two show the same look: their next one first; only if all 4 are shown, an earlier player moves). Used by `collection.js` `pickRacingMarble`.
- `showcase.js`: dresses computer players in collection looks in beginner races. It uses its own randomness, never the race seed.
- `computerPlayers.js`: how computer players show (`NAMES`, `computerPlayers(raceId, entries)`, `dressRows`): a friendly name each and a plain starter-style look no one else in the race shows (showcase marbles kept), worked out from the race id each time it is shown (two seeded streams, so a name never depends on the looks). Applied to the race stream (`describeForClients`), the results (`getResults`), `GET /api/races/:id` entries and a computer player's track record; never to the engine's rows. The client marks them with a robot icon (`components/CpuTag.jsx`, "Computer player").

**`economy/index.js`: coins.**
- `change()` is the **only** way coins move: it updates the balance and writes a `coin_ledger` line.
- `payRace` also pays a pass holder's Track of the Day bonus (`featured-bonus`, from `seasons.bonusLine`; kept in `race_entries.bonus_coins`, never earned coins).
- Also: `spend`, `opening`, `placeCoins`, `raceLines`, `streakAfter`, `bagPrice`, and `refundEntryFee` (for fees paid before entry fees were switched off).

**`names/index.js`:** player names (22 Oct 2026): `check`/`assertAllowed` (the shared filter `client/src/shared/nameFilter.js`, loaded as an ES module; 400 `name_not_allowed`), used by `routes/auth.js` (register, claim) and `routes/users.js` (PATCH /me); `report()` ("Report this name"); `neutralName()` (PlayerNNNN, for the back office's rename). Tests: `test/names.test.js`.

**`push/`:** push notifications in the apps (21 Oct 2026; switched off: `client/src/shared/push.json` for the apps, `PUSH_SENDING=on` plus keys for the server).
- `index.js`: the four messages (`MESSAGES`: `pass-sale`, `season-start` (season news: marketing), `room-invite`, `daily-goal`), the player's switches (`preferencesOf`, `setPreferences`: season news off until turned on, never for guests or under-13s), phones (`registerDevice`, `forgetDevice`), `sendTo()` (one message to a player's phones, once per key, claimed in `push_sends`; a dry run while sending is off; dead tokens switched off), room invites (`invitable`: who raced in a friend room with the host in the last 30 days; `inviteToRoom`: at most one per friend and room every 10 minutes), the jobs (`seasonNews`: within 6 hours after a pass sale opens or a season starts; `dailyGoal`: at 17:00 UTC to opted-in players who raced in the last week and haven't met today's goal), `startJobs` (every 10 minutes).
- `transports.js`: sending without SDKs: Firebase Cloud Messaging HTTP v1 (service-account JWT, like `payments/google.js`) and APNs over HTTP/2 (ES256 token; `.dev` app id → sandbox). Tests: `test/push.test.js`.

**`country/index.js`, `country/records.js`:** the country a player races for (22 Oct 2026): `status`, `choose` (the change rule: the first choice free, corrections for 24 hours, then one change every 90 days; removing any time without restarting the clock; every choice in `user_country_history`), `countryAt` (the country at a moment, for national leagues), `isCountry`/`nameOf` (the list `client/src/shared/countries.json`, ISO 3166-1 with CLDR English names). `records.js`: `byTrack`, `byCountry` (the country records, from `race_entries.country`, cached for a minute). Used by `routes/auth.js` (register and claim take an optional `country`), `routes/users.js` and `routes/scoreboard.js` (`GET /countries?track=`, `GET /countries/:code`). Client: `site/country/` (the list, `CountryPicker`), the picker in `site/account/QuickSignup.jsx` and Settings (`YourCountry`), `site/pages/CountryRecords.jsx` (the scoreboards' Countries tab; `TrackCountryRecords` on each track's page). Tests: `test/country.test.js`, `client/test/country.test.jsx`.

**`giftCodes/index.js`:** gift codes (21 Oct 2026). `create()` (one code, a custom code, or a batch of single-use codes; generated codes are 12 letters and digits without 0/O/1/I/L), `redeem()` (saved accounts only; the code row is locked; coins through `economy.change()` as kind `gift-code`, a bought kind; a pass into `season_passes` with provider `gift-code` and the season marble), `mine()`, `stateOf()` (active, expired, used-up, disabled), `normalise()`/`display()`. On/off: `client/src/shared/giftCodes.json` (`enabled`, `maxCoins`, `maxUses`, `maxBatch`). Tests: `test/giftCodes.test.js`.

**`payments/`:**
- `index.js`: providers (stripe, apple, google, test). `grant()` adds a pack's coins once, or gives a season pass once (a payment with `season_key` and 0 coins). Also `checkout()` (with consent and order number), `passCheckout()` (the season pass on the website: refused outside its sale window or when already held), `passProduct()`, `stripeEvent()`, `refund()`, `ordersOf`/`orderOf`, and for Google Play `googleAccountId`, `googlePurchase`, `googleSync`, `startGoogleJobs` (hourly: consume leftovers; every 6 hours: voided purchases), and for the App Store `appleAccountToken`, `applePurchase`, `appleNotification`.
- `stripe.js`: Checkout sessions (coin packs and the season pass), webhook verification, `handleEvent()` (paid, expired, refund, dispute), `revoke()` (takes coins back in proportion; a full refund or a dispute of a pass revokes the pass), `requestRefund()`. Live keys are refused unless `STRIPE_ALLOW_LIVE`.
- `withdrawal.js`: the online withdrawal function (EU rules, 21 Oct 2026): `withdrawalOf()` (a season pass bought in its pre-sale, until it activates; never coin packs), `annotate()` (each order's `withdraw` on the Purchases page), `withdraw()` (records `withdrawn_at`, then a full refund through `index.js` `refund()`; Apple's are for Apple). Coin packs and the pass are for saved accounts only (`index.js` `savedAccount()`: 401 `save_first` for a guest's checkout and store account ids).
- `emails.js`: the purchase confirmation (website purchases: the order, the price and the exact words agreed to at checkout) and the withdrawal acknowledgement, every 2 minutes once email is on, each once (claimed in `payments`); templates in `email/templates.js`.
- `google.js`: Google Play Billing on the server. Signs in to the Android Publisher API as the service account (`GOOGLE_PLAY_SERVICE_ACCOUNT`, RS256 JWT with node's crypto, no Google library). `redeem()` checks a purchase with Google (paid, the right product, the player's `store_account_id`), records it once (`provider_ref` = order id, `store_token`), grants the coins, then consumes it (a season pass: granted only if bought inside its sale window and not already held, then **acknowledged**, never consumed; `acknowledgeLeftovers()` retries hourly); `syncVoided()` takes back refunded and charged-back purchases through `stripe.revoke()` (same ledger lines and `payment_refunds`); `refundOrder()` asks Google to refund and revoke; `decodeRtdn()`/`rtdnTokenOk()` read Google's Pub/Sub notifications. Tests: `test/googlePlay.test.js` (a fake Google that checks the signed token).

- `apple.js`: App Store purchases (StoreKit 2) on the server, with no Apple library: `verifySigned()` checks a JWS from the App Store (its x5c chain to the pinned Apple Root CA - G3 fingerprint, the leaf's and intermediate's Apple marker extensions, dates, the ES256 signature); `redeem()` checks the bundle id, the product, the player's `apple_account_token` (StoreKit's appAccountToken), not revoked, not family shared, then grants once (`provider_ref` = Apple's transactionId; a pass also by its originalTransactionId, so Restore Purchases never gives a second); a pass bought outside its window or a second one is not granted and is flagged in the audit log (`apple-pass-refused`) for the player to ask Apple; `notification()` handles Server Notifications v2 (REFUND, REVOKE) through `stripe.revoke()`. Tests: `test/applePurchases.test.js` with a test-only chain in `test/fixtures/apple`.

**`seasons/index.js`: seasons and the season pass** (the `seasons`, `season_passes` tables, `tracks.season_key`):
- `stateOf` ('before', 'on', 'free' by the season's dates), `dayOf` (the season's calendar day), `featuredSlug` (the Track of the Day), `passOnSale`, `saleDaysLeft` (the countdown), `view` (what `/api/seasons` shows).
- `trackAccess` / `assertTrackAccess`: may this player race this track (a pass, or a friend room whose host has one); every route that puts a marble on a track calls it (`routes/races.js` `joinRace`, create, rematch; `routes/rooms.js` `pickTrack`).
- `pickOpenTrack` (the public random pick: never a locked season track), `pickSeasonTrack` (Holiday races: the Track of the Day one race in three).
- `bonusLine` (the Track of the Day bonus), `grantForPayment` (also gives the season marble), `revokeForPayment` (also takes it back), `grantMissingMarbles` (the hourly job: pass holders still without the season marble get it).
- `scoreboardSeason` (the season that is on, or the one that ended last: its final standings), `standings` (coins earned in the season, ties to who got there first), `awardBadges` (the season-end job: the top `badge_top` get `user_badges`, once), `badgesOf`, `startJobs` (hourly, from `server.js`: missing season marbles, then season-end badges).
- `seasons/reminders.js`: "Remind me when sales open" (`pass_reminders`): `open` (before the sale only), `remind` (a player: in the game, by email if ticked; a visitor or guest: an email address and consent; one per player or address; the exact consent text stored), `confirm` (double opt-in: the confirmation email's link), `cancelForPlayer`, `cancelByToken`, `purge` (the hourly job: cancelled ones, all 30 days after the sale opened, and unconfirmed ones 7 days after their confirmation email), `counts`, `accountEmailVerified` (false until accounts have an email check).
- `seasons/reminderMail.js`: sending them, **off until `BREVO_API_KEY` is set and `PASS_REMINDERS_SENDING=on`**: every 5 minutes the confirmation emails (before the sale) and the one reminder email to confirmed addresses (once the sale opens), each row claimed before it's sent and released if Brevo refuses it, 50 a run; `noticeFor`/`noticeSeen` (the in-game "on sale now" notice). `seasons/reminderEmails.js`: the two emails in English and Swedish, with a cancel link and List-Unsubscribe headers. Client: `site/pages/PassReminderLink.jsx` (`/pass/reminder?confirm=` / `?cancel=`), `site/payments/PassOnSaleNotice.jsx` (the notice above every page).
- Tests: `test/seasonPass.test.js` (the dates always; with a database: Stripe test mode, Google Play, locks, rooms, the bonus, refunds, the pre-sale, reminders).

**Back office and accounts:**
- `admin/session.js`: the back-office login (separate admin token, TOTP 2-step code, 30-minute idle timeout, 5 wrong codes give a 15-minute pause kept in memory).
- `admin/totp.js`: RFC 6238 codes and the encrypted secret.
- `security/index.js`: `record()` stores IP and country for sign-up, login and purchase. `trimIps()` blanks IPs older than 90 days (security events and support messages) and runs daily. Countries are looked up offline (geoip-country).
- `account/index.js`: `exportData()` ("Download my data", support messages and replies included) and `deleteAccount()` (anonymises, deletes support messages, keeps payments and race results).
- `account/retention.js`: guests not seen for 90 days are deleted (anonymised like a deleted account), daily; a dry run that only logs the count unless `GUEST_RETENTION_MODE=delete`; a guest's last visit is the latest of `last_seen_at`, created, last login and last race; `seen()` records a visit (`users.last_seen_at`, at most once a day, from `GET /auth/me`).
- `support/index.js`: support messages. The form token (`formToken`, `checkFormToken`: under 3 s is a bot, over 12 h asks for a fresh form), `readScreenshot` (PNG, JPEG, WebP or GIF by their first bytes, at most 4 MB), `create` (links the account, keeps a repeat within 10 minutes once, emails `SUPPORT_EMAIL`), `reply` (saves and emails a back-office reply).
- `email/index.js`: sends email through Brevo when `BREVO_API_KEY` is set (`enabled()`, `send()`). Tests swap the transport.
- `email/templates.js`: the emails' HTML (password reset, support notification, support reply).
- `email/unsubscribe.js`: signed unsubscribe links and RFC 8058 one-click headers.
- `account/emailConfirm.js`: "Confirm your email" after sign-up (double opt-in, sent once email is set up): EN/SV email, `send()` (3 an hour), `confirm()` → `users.email_verified_at`.
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
| `auth.js` | Rate limits per address, each its own (21 Oct 2026): log in, password reset and email confirmation 20 per 15 min; sign-up and saving a guest 60 per 15 min; starting as a guest 300 per hour; name suggestions 300 per 15 min. Sign-up (birth year and month → age group; refuses under-13s, code `under_13`), guest, claim (guest → account), login, me (a guest's `racesFinished` for the save pop-up; renews the login), `GET /suggest-name`, `POST /confirm-email` and `/confirm-email/resend`; password reset (`GET /password-reset`, `POST /forgot`, `POST /reset`). New accounts get their 4 starters (`marbles/starters.js`) |
| `users.js` | Profile, settings, the country the player races for (`GET`/`PUT /me/country`, `GET /country-suggestion`), news-by-email, unsubscribe, cookie consent record (`POST /me/cookie-consent`), data export, delete account, appearance, the old marble bag, leaderboard, public profiles |
| `races.js` | Lobby list, create (a track, random, or `season`: Holiday races), join and leave (free; season tracks checked), next race, start, cancel, results, replay, showcase race |
| `rooms.js` | Friend rooms (create, join, leave, track, remove, start, close; `GET /:code/invitable` and `POST /:code/invite { user_id }`: the host invites a room friend with a push, once push is on) and `afterRace`; a season track only if the host may race it (`hostedSeason` in the room view) |
| `seasons.js` | `GET /` and `GET /:key`: a season's dates, state, today's Track of the Day, the pass (price, on sale, countdown, owned, `remindersOpen`, the player's `reminder`); `POST /:key/remind` and `DELETE /:key/remind` ("Remind me when sales open"; visitors limited to 20 an hour per address, with a hidden bot field), `POST /reminders/confirm { token }` (double opt-in), `POST /reminders/cancel { token }`, `POST /reminders/unsubscribe?t=` (mail apps' one-click), `POST /:key/remind/seen` (close the in-game notice); the season view's `pass.onSaleNotice` |
| `collection.js` | Collection, Marble Bag, Shooter, bags, buy, find by ID, certificates |
| `payments.js` | Packs, checkout, `POST /pass/checkout` (the season pass), my orders (`GET /mine`, each with `withdraw`), `POST /orders/:orderNo/withdraw { confirm: true }` (the online withdrawal function), the Stripe webhook; Google Play: `GET /google/account` (the player's Play account id, and whether purchases are on), `POST /google/verify` (a purchase token from the app), `POST /google/rtdn?token=` (Google's notifications); the App Store: `GET /apple/account` (the player's account token), `POST /apple/verify` (a signed transaction from the app), `POST /apple/notifications` (Apple's Server Notifications v2) |
| `admin.js` | The back office: players (with their support messages), coins, items, suspend, rename, delete, consent, payments and refunds, audit, economy (with coins from gift codes), email list, the support inbox (list, message, screenshot, status, reply), name reports (`GET /name-reports`: open reports by player, the last 30 days' resolved, and names the filter would block; `POST /name-reports/:userId/resolve { action: 'rename'|'dismiss', reason }`), gift codes (`GET /gift-codes?q=&tag=` with a summary by tag, `POST /gift-codes` one code or a batch, `GET /gift-codes/:id` with its redemptions, `POST /gift-codes/:id/disable`) |
| `users.js` (also) | `POST /:id/report-name { where, name? }`: "Report this name" (logged-in players and guests; 30 an hour) |
| `push.js` | `GET`/`PUT /settings` (the player's three switches), `POST /devices` (this phone's token: `{ token, platform, appId, appVersion }`), `POST /devices/forget` (logging out on a phone) |
| `giftCodes.js` | `POST /redeem { code }` (a saved account; 10 tries per 15 min per account, 30 per address), `GET /mine`; both 404 while gift codes are off |
| `support.js` | The Help Centre's contact form: `GET /form` (a form token), `POST /` (a message; rate-limited to 6 an hour per address) |
| `economy.js` | Economy numbers, my day, race payouts, my ledger |
| `scoreboard.js` | Season, all-time and friends boards (earned coins only), and the country records (`/countries`); the season is a season in the `seasons` table that is on or ended last (`currentSeason`, counted from its start to its end), else the numbered one in `economy.json` → `season` (`seasonFrom`), else `null`, and the season board then counts all time |
| `tracks.js`, `marbles.js` | Public lists (a track's `season` and `locked` for the player asking); admin edits |
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
| `node scripts/clear-check.js [slug…] [--all] [--clear-only] [--out file.json]` | Scenery-inside-the-track and camera check only (`--clear-only` skips the races; the finish straight, the line, the catch area after it and the finish shot are covered too) |
| `node scripts/check-api-address.js [https://api.marblespins.com] [--against <address in use>]` | Checks a server address before switching to it (reads only): name, certificate, `/health` and the same server code, the track list, CORS for the website and the apps, socket.io, and the Stripe, Google Play and App Store notification addresses. The addresses come from `client/app-api.json` (`api`: what the apps are built against; `planned`; `fallback`: Railway) |
| `node scripts/finish-frame-check.js [slug…] [--all] [--races n] [--out file.json]` | The finish camera's picture on a 390×844 and a 430×932 phone and a 1280×720 computer, through the end of real races (following the arrivals, and the winner): fails a track where anything hanging over the run-in or the catch area covers more than 10% of the picture (after the win, and in the last 5 s before it), a finished marble is not clearly in the picture (under the results, under the banner, outside it or behind something), or one is drawn right in front of the lens. About 1 min a track; `--all` ≈ 2 h. Also part of the full track report |
| `node scripts/variety-table.js [--matrix]` | How alike the tracks are |
| `node scripts/start-looks.js` | Records how each start looks (first 3 seconds) |
| `node scripts/dump-kit-track.js <slug>` | Writes a track for the development kit view (`client/dev/kit-view.html`; `&race=<name>` plays a race, `&show=1` adds the winner's moment as in the game: the spotlight and the push-in) |
| `node client/report/clip.mjs <plan.json>` (run in `client`) | A short MP4 of a race in the kit view (headless browser, `kitView.raceShot` / `raceLook` / `spot` in `client/dev/kitView.js`): follow-camera and fixed-camera segments, for showing a new kit part before it goes on a real track. The track and race JSON go in `client/dev/.tracks/` first (as the track report writes them). `kit-view.html?…&mine=<entry>` makes that marble the viewer's (its pointer) with the corner view following it |
| `node scripts/track-banners.js <slug…> \| --all \| --missing` | The track picker's pictures: each track drawn from its own scene in a headless browser (`client/report/banners.mjs`, `kitView.banner` in `client/dev/kitView.js`), saved as WebP in `client/public/tracks/`, listed in `client/src/shared/trackBanners.json`. Looks only: one race is simulated to put marbles on the track; nothing is stored. The track report runs it for its track |
| `bash scripts/convert-audio.sh` | Converts `music-inbox/` into small Opus and AAC files in `client/public/audio/` (`race-1`…`race-8`, `ceremony`, `start-beeps`, and the three race sounds; `SKIP_EFFECTS=1` leaves the race sounds alone), levelled with one steady gain per file so loops match |
| `npm run db:migrate` | Runs the same schema and data-update step as server start |

## Server tests: `test/`

- **Running them:** `npm test`, about 5 minutes. Set `ROOMS_TEST_DATABASE_URL=postgres://…` to also run the tests that need a database (rooms, admin, Stripe, Google Play, the App Store, seasons, account, support, entry fees). `npm test` first brings that database up to date on its own (`test/helpers/migrateTestDb.js`, the `pretest` step), so no test file runs the schema while the others run against it.
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
| `package.json` | `npm run dev`, `npm run build` (`vite build`, then `scripts/prerender.mjs`; output `dist/`, which Vercel serves), `npm test` (vitest, about 8 minutes), `npm run app:sync`; app releases: `npm run app:version`, `npm run app:notes`, `npm run android:key`, `npm run android:release`, `npm run ios:release` (runbook, "App versions and release notes") |
| `vite.config.js`, `vercel.json` | Build settings. `vercel.json`: `cleanUrls` (so `/help` serves the pre-rendered `help.html`), the site's own routes (the first part of every path in `App.jsx`: `/play/…`, `/race/…`, `/admin/…`, …) are rewritten to `/app-shell` (keep the list in step when a route with a new first part is added, or it answers 404) and any other address gets `404.html` with HTTP 404 (written without `.html`: with clean URLs that file is served at `/app-shell`, and a rewrite to `/app-shell.html` finds nothing, which made every in-game address answer 404 on 16 Oct 2026; a test checks), `noindex` headers on `/admin` |
| `.vercelignore` | Keeps the app projects out of Vercel uploads |
| `index.html` | The single page: meta, canonical, Open Graph and share-picture tags |
| `scripts/serve-vercel-output.mjs` | Serves a local `npx vercel build` output with Vercel's own routing (`.vercel/output/config.json`), to check routes before pushing (see the runbook) |
| `scripts/prerender.mjs` | Build step 2: renders the public pages to HTML (through `src/prerender/entry.jsx`, the real app with `StaticRouter`), writes `dist/<path>.html`, `dist/app-shell.html`, `dist/404.html` (the app with a noindex head, served by Vercel with HTTP 404 for unknown addresses; it draws "Lost the marble") and `dist/sitemap.xml`. The page's copy is wrapped in `<div data-ms-prerender>`; a small script in each page hides only that copy at once when it isn't the page asked for, when logged in, or in the apps, and `src/main.jsx` removes any copy left once the app has drawn (never hide the app itself: `#root > *` did, and logged-in players got a blank page, 16 Oct 2026) |
| `public/` | The tab and home-screen icons (linked from `index.html`, so on every page, pre-rendered or not, and `/admin`): `favicon.svg` and `favicon.ico` (16, 32 px: the app icon's marble alone on its navy tile, simplified to read at tab size; 48 px with the orbit arcs), `favicon-48x48.png` and `favicon-96x96.png` (the app icon scaled; with `icon-192.png` the square icons in multiples of 48 px that Google's search results want, each linked with its size), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png` (the app icon itself, `client/assets/icon-only.png`), `site.webmanifest` (name, icons, theme colour `#0E1320`); `robots.txt` (blocks `/admin`, `/preview`, checkout and account pages), `audio/`, `tracks/` (the track pictures, `<slug>.webp` and `<slug>@2x.webp`), `share/` (link-preview pictures, 1200 × 630: `marble-spins-1200x630.png` and `tracks/<slug>.jpg`; a track without one uses its `@2x.webp`). `sitemap.xml` is generated by the build |
| `capacitor.config.json` | App id, name, splash and status-bar settings |
| `ios/`, `android/` | The native app projects (see "Apps" below) |
| `assets/` | Source images for the app icons and splash screens |
| `scripts/app-sync.mjs` | Builds the site against the live server and copies it into both apps (`node scripts/app-sync.mjs ios` or `android`: one app) |
| `scripts/android-upload-key.mjs` | `npm run android:key`: makes the Google Play upload key once, in `MarbleSpins-keys` in your home folder (outside the project), and `android/keystore.properties` (gitignored, no password) |
| `scripts/android-release.mjs` | `npm run android:release`: the signed `.aab` for Google Play, copied to `MarbleSpins-releases` in your home folder as `marblespins-<versionName>-<versionCode>.aab`. Never raises the version; refuses a `versionCode` that already has a bundle there (`-- --again` overrides); prints the `git tag app-v…` command |
| `scripts/ios-release.mjs` | `npm run ios:release` (Mac with Xcode): builds the site into the iPhone app (`app-sync.mjs ios`), sets the iPhone project's version from `app-version.json`, `xcodebuild archive` of `ios/App/App.xcodeproj` (Swift Package Manager, no CocoaPods workspace), scheme App, Release, to `MarbleSpins-releases/MarbleSpins-<versionName>-<versionCode>.xcarchive`, then `-exportArchive` with a generated `ExportOptions.plist` (app-store-connect, automatic signing) to an `.ipa`; `-- --upload` uploads to App Store Connect instead; `-- --again` rebuilds the same build. Team ID from `MS_APPLE_TEAM_ID` or `ios/apple-team-id.txt` (gitignored) |
| `scripts/app-version.mjs` | `npm run app:version -- [patch\|minor\|major\|build\|x.y.z]`: raises `versionCode` by 1 and `versionName` (default patch) in `app-version.json` and `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in both build configurations of the iPhone App target (`project.pbxproj`), then writes the notes draft |
| `scripts/app-notes.mjs` | `npm run app:notes`: first run writes `release-notes/<versionName>.md` (a player text to edit, and commit subjects since the previous `app-v*` tag, or the last 30, grouped by what they touched); later runs write `<versionName>.play.txt` (`<en-US>` block, ≤ 500 characters) and `<versionName>.appstore.txt` (≤ 4000) |
| `scripts/app-release-lib.mjs` | The release scripts' pure logic (version raising, pbxproj edit, notes grouping, store-text limits, release-folder check), tested by `test/appRelease.test.js` |
| `release-notes/` | One draft per app version and its store texts (made by `npm run app:notes`, edited by hand, committed) |
| `app-version.json` | The apps' `versionCode` (Android's versionCode and the iPhone build number; +1 for every upload) and `versionName` (what players see). Changed by `npm run app:version` |
| `APP-TESTING.md` | Beginner guide: Mac and Windows setup, running the apps on your own phone, raising the version, release notes, uploading to Play Console and TestFlight, common errors |
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
  - `useRaceStream.js`: live frames, buffered 400 ms behind and interpolated, so motion is smooth; `holdBack(ms, startsAt)` / `lagNow()`: a view that got ready late plays that far behind the live race (at most 12 s), showing the countdown and the start, then catches up at 1.35× from 1.5 s after the GO as shown (`CATCH_UP`, `holdLag`); until the hold is decided it keeps every frame since the start;
  - `useReplay.js`: playback of a finished race;
  - `useTrackScene.js`: loads the 3D scene and reports failures;
  - `useAsync.js`, `useLobby.js`.
- `components/`: the race viewers and shared UI:
  - `LiveRaceViewer3D.jsx`: live 3D race; FPS button, corner view, finish show, skip. **Getting ready (22 Oct 2026):** it builds the track from the `track` prop as soon as the 3D view exists (before the countdown when the page knows it), waits for `TrackScene.whenReady()` (the scenery built, every material compiled), calls `onPrepared()` (the solo race page then starts the race), and once the race's marbles are in and drawn decides the hold (`holdFor`: ready more than 250 ms after the countdown began and less than 8 s past GO), times the beeps to the countdown as shown and draws the countdown (numbers, or the start lights on a Grand Prix) over the view; "Getting the track ready…" until then; the clock and the order show the race as shown while held back. On phones (CSS in `styles.css`, "The race on phones"): the camera buttons share the row with short labels (Leader, My marble), the clock hides once the winner is across so it can't sit under the medals or the winner banner, and the "home" list sits bottom right, clear of the corner view;
  - `RaceReplayViewer.jsx`: 3D replay;
  - `RaceViewer.jsx`: the 2D viewer;
  - `FinishShow.jsx`, `Confetti.jsx`, `StartLights.jsx`, `CornerView.jsx`, `FrameMeter.jsx`, `SceneFailure.jsx`;
  - marble and track pickers, `NextRace.jsx` (rematch and room), `ErrorBoundary.jsx`, and others.
- `pages/`: the original game pages:
  - `Home` (lobby), `Race` (lobby, countdown, live), `Results`, `Dashboard`;
  - the previews `TrackPreview3D`, `Replay3D`, `PhysicsPreview`.
- `site/`: the Marble Spins website:
  - `SiteHeader.jsx` (the website's header; inside the apps it renders `AppHeader.jsx` instead: one compact bar with a small logo, the coins, sound and a menu button whose pages open in a bottom sheet, and in a 3D race two floating buttons, back and menu, over the full-screen race; 22 Oct 2026), `SiteFooter.jsx`, `Logo.jsx`, `SoundControl.jsx`, `canonical.js`, `TrackBanner.jsx` (a track's picture on its picker card: lazy-loaded, over the series gradient, which stays when a picture is missing or still loading; `SERIES_PIC`);
  - `company.js` (the company details formatted, `CONTACT_PATH` = `/help#contact`: where every "Contact us" link goes) and `ProtectedEmail.jsx` (an email address shown as "support (at) marblespins.com" in the page HTML, so the pre-rendered pages hold no address for spam bots, and as a normal mailto link once the page runs);
  - `pageMeta.js`: every page's title, description, canonical address, share picture and indexing (`metaFor`, `applyMeta`), set on every page change and used by the pre-rendering;
  - `trackCount.js`: the track count the texts give, the live count at build time rounded down to ten ("90+ tracks"; `roundedTracks`, `tracksPhrase`; `BUILD_TRACK_SERIES`: the live series, for the Help Centre), so no description, share preview, Help answer or landing line goes stale; without a count, "dozens of tracks";
  - `consent/`: the cookie banner and the trackers (website only, never in the apps): `consent.js` (the choice in local storage `marble-consent`, version `CONSENT_VERSION`; `STORAGE_LIST`), `ConsentManager.jsx` (banner with REJECT ALL and ACCEPT ALL side by side, Settings per category with nothing ticked, reopened by "Cookie settings" in the footer and on `/cookies`; logs the choice to the account when logged in), `tracking.js` (Google Analytics 4 with Consent Mode v2 after statistics consent, the Meta Pixel after marketing consent and never under 13; `track()` events: `sign_up`, `first_race`, `race_finished`, `shop_view`, `checkout_started`, `purchase`);
  - `landing/` (landing page, 3D hero replay; `SERIES`: the series cards, each with one of its tracks' pictures; the tracks-and-series heading is counted from the live track list);
  - the season's wording: `../shared/holidayWording.js` ("Free to play — holiday tracks need the Holiday Pass" from 1 Dec to 7 Jan, on the landing page, the track pages and Help). **Get coins** (`site/payments/GetCoins.jsx`, 22 Oct 2026): wherever a marble or a bag costs more coins than the player has (the shop's big view and bags, the race page's marble picker), a GET COINS button with the coins still needed instead of "Not enough coins"; it opens the checkout on the smallest pack that covers them (`?pack=…&back=<the marble's page>`; Stripe on the website, the app's own store in the apps), and once paid the player is back at that marble with "● N coins added" (straight from the checkout for the app stores; after Stripe's page from `/purchases`, which reads this tab's memory of it, `ms:wanted` in session storage, kept an hour; only paths on this site). The Purchases page's **Right of withdrawal** section (`pages/PurchasesPage.jsx` `Withdrawals`); the checkout's "Save your marble to buy" for guests (`pages/CheckoutPage.jsx`).
  - `account/`: the save pop-up for guests (`SavePrompt.jsx`: after every 3rd finished race, before the next race; `SavePromptProvider` in `App.jsx`, `useSavePrompt().beforeNextRace()` before "Race again"), the quick sign-up form (`QuickSignup.jsx`, also the sign-up page's form: suggested name, birth year and month, under-13 message, confirm step), its EN/SV texts (`saveTexts.js`), `/confirm-email` (`ConfirmEmailPage.jsx`);
  - `marbles/` (badge, 3D turntable, certificate, `StarterCertificate.jsx` for a starter's Marble ID, `useCollection`, with `limitedSale`/`limitedLine`: the limited edition's "Coming 1 December — limited to 500", how many are left, "Sold out"; `seasonalSale`/`seasonalLine`/`retiredLine`: a seasonal marble's "Coming 1 December · on sale until 7 January", "Leaving in N days", "Retired 7 Jan 2027"); the shop's **Seasonal** shelf (`ShopPage.jsx` `SeasonalShelf`: a seasonal collection until it retires, a season pass's marble while the pass is sold);
  - `pages/PassPage.jsx` (`/pass?season=`): the season pass: a header with the season's marble and dates, four cards (the season's tracks with their count, the Track of the Day with today's track, the season marble, friend rooms), the price (the store's own in the apps), the countdown, buying it with the pass's own consent (`consent.json` `passWithdrawal`; Stripe's button `passStripeSubmit`); the track picker, track pages and room picker show season tracks locked with "Get the pass", and holders get "Holiday races";
  - `payments/index.js`: `buyPass()` (the season pass: Stripe on the web, Google Play or the App Store in the apps, kept not consumed); `buyCoins()` for every screen: Stripe on the website; Google Play Billing in the Android app (`@capgo/native-purchases`: purchase with the player's Play account id, then `api.googleVerify`); the App Store in the iPhone app (the same plugin's StoreKit 2: purchase with the player's account token, `api.appleVerify` with the signed transaction, then `finishTransaction`); `resumeStorePurchases()` (unconfirmed purchases resent at login, from `App.jsx`; on iPhone the unfinished transactions); `restoreStorePurchases()` (iPhone "Restore purchases", on the pass page); `useStorePrices()` (the store's prices in the player's currency, on the shop and checkout); `shownPrice()` (the price a screen shows: in the apps only the store's, never the website's; `docs/08-store-rules.md`);
  - `pages/` (every website page; see the routes below);
  - `help/` (the Help Centre at `/help`): `ContactForm.jsx` ("Still need help?": name, email, topic, order number, message, screenshot scaled down before sending, a hidden spam field), `faq.js` (the 12 categories of questions and answers, numbers read from `economy.json`, `packs.json` and `catalog.json`, `[bracket]` placeholders kept; the FAQPage structured data; `buildFaq({ platform })`: in the apps (`'ios'`, `'android'`, from `HelpPage.jsx`) the buying answers name only that app's store, see `docs/08-store-rules.md`), `search.js` (type-ahead search: any word order, typos, synonyms, highlighting), `HelpPage.jsx`.
- `hub/`: the marbles knowledge hub at `/marbles` (plan: project doc `claude/marbles-hub-plan.md`), **off** until `../shared/marblesHub.json` `enabled` is true:
  - `route.jsx`: the `/marbles/*` route (the 404 page while off), `preloadHub` (main.jsx loads the hub's chunk before the first draw on a hub address), `VITE_MARBLES_HUB` preview modes (`preview`, `drafts`);
  - `HubPages.jsx` (+ `hub.css`): the hub home, section pages and article pages (breadcrumbs, contents, sources list, shop card, "Read next", a "Play free" card), its own code chunk;
  - `content.js`: the articles from `articles/*.md` (front matter: title, description, section, slug, type, status, published, updated, shop, sources), only `status: published` shown; `hubRoutes` (for the pre-rendering and sitemap); `frontMatter.js` parses the front matter;
  - `Markdown.jsx`: draws an article's markdown as React (headings with anchors, lists, quotes, links, citations `[1]` to the sources list, `[REVIEW: …]` as a highlighted mark; never raw HTML);
  - `sections.js` (games, history, making, types, racing), `seo.js` (titles, descriptions, Article, CollectionPage and BreadcrumbList data);
  - `hub.test.jsx`: off in the repository and linked from nowhere, articles, markdown, pages and structured data, and the review drafts are valid.
- `admin/`: the back office (`AdminApp.jsx`, `adminApi.js`, `admin.css`). The support inbox (`SupportInbox`, `SupportMessage`, `SupportTable`) lives in `AdminApp.jsx` too.
- `components/ReportName.jsx`: "Report this name" (⚑, then Report/Cancel): on the scoreboards (`site/pages/ScoresPage.jsx`), the race results (`pages/Results.jsx`) and the tapped-marble card (`components/MarbleInfo.jsx`, from the live finish board and the results).
- `app/push.js`: push notifications in the apps (off until `shared/push.json`): `pushOn`, `raceFinished`/`shouldAsk`/`markAsked` (ask after the first finished race, once; local storage `marble-push`), `enablePush` (the phone's dialog, then register), `startPush` (re-register at start, from `App.jsx`), `forgetPush` (on log out, from `AuthContext`), Android channels (`friends`, `news`, `reminders`), a tapped notification opens its page. On screen: `site/account/PushSettings.jsx` (`PushAsk` under every race result in `components/NextRace.jsx`; `PushSettings`, Settings → Notifications); room invites in `site/pages/RoomPage.jsx` (`PushInvites`).
- `app/`: the native app shell:
  - `native.js`: `isNativeApp()` (also picks the apps' header and the full-screen race: `pages/Race.jsx` `RaceFullScreen` sets `html.is-race-full` while the 3D view shows; the rules are in `site/site.css`, "Inside the apps", all under `.is-app`), splash, status bar, Android back button, sound in the background, network watch, and on iPhone an "ambient" audio session (`preferAmbientAudio`: the silent switch mutes the game, the player's own music keeps playing);
  - `OfflineScreen.jsx` (links to the Help Centre; on `/help` itself it shrinks to a bar so the answers stay readable offline).
- `shared/`: data and code **shared with the server**:
  - `economy.json` (also the scoreboard `season`);
  - `storeLinks.json` (the website footer's App Store and Google Play links; empty = hidden);
  - `socialLinks.json` (YouTube, Instagram, TikTok profile links: the footer's icon links via `site/SocialLinks.jsx`, the Help Centre's "Follow Marble Spins", and `sameAs` in the landing page's Organization data; website only, an empty link hides its icon);
  - `company.json` (who runs Marble Spins: Voltron Robotics AB, org.nr, VAT no., address, support and privacy email, the legal texts' date; `client/src/site/company.js` formats it);
  - `nameFilter.js` (the offensive-name filter and its word list, by language; used by the forms and the server; how to add words is at its top);
  - `push.json` (push notifications on or off in the apps, how many races before asking, the daily reminder's hour);
  - `giftCodes.json` (gift codes on or off for players, and their limits; read by the server too);
  - `trackBanners.json` (the track pictures: `enabled` in the picker, and per track its version, sizes, name and series);
  - `support.json` (contact-form categories and limits, checked by the server too; "Privacy and your data" is the topic for data requests);
  - `payments/packs.json`, `payments/consent.json` (what a buyer agrees to: coin packs, and the season pass's own wording; stored with each payment);
  - `marbles/catalog.json` (also `collections`: the limited, seasonal and pass collections, by the code in their Marble IDs);
  - `marbles/badge.js`: the master look of each design (`HOLIDAY_LOOKS`: Winter 2026 and Winter Solstice, as approved on `/preview/marbles/holiday`);
  - `marbles/paint.js`: draws the badge as CSS for the shop and as textures for 3D;
  - `marbles/materials.js`: the 3D marble material;
  - `marbles/index.js` (`collectionOf`, `isStandard`, `windowOf`: where an item stands by its dates, `passNumber`).
- `sound/`:
  - `engine.js` (Web Audio): nothing before the first tap; no music outside races. A race: the start beeps over the 3-2-1 (the last beep on GO; **only on a running sound clock**, scheduled when it wakes during the countdown, and stopped by the wall clock once their GO beep is over, so a paused clock (Android before a tap) never plays them mid-race; the race sounds are skipped on a paused clock too), one of 8 race tracks from GO (shuffled rounds, never the previous race's), looping, mixed under the effects; at the finish ceremony the ceremony song instead, looping, fading out after 45 s; silence when the player leaves. The three race sounds as before; pauses in the background.
  - `settings.js`: volumes and mute, saved on the device and in the account.
- `three/`: the 3D renderer (next section).
- `utils/`: formatting, splits, the 2D track geometry, finish-show timing, confetti, `staleCode.js` (reload after deploy).

### Routes (`client/src/App.jsx`)

| Path | Page |
|---|---|
| `/` | Landing page (visitors) or `HomeHub` (signed in) |
| `/home` | Home hub (signed in; a visitor goes to `/`). `/lobby` goes to `/home` (the first version's lobby is retired) |
| `/play/friends`, `/play/track`, `/play/shooter`, `/play/start` | The race flow (`site/pages/RaceFlow.jsx`) |
| `/r/:code` | Friend room |
| `/shop`, `/collection`, `/collection/:design` | Shop |
| `/bag` | Marble Bag |
| `/certificate/:code` | Marble certificate |
| `/checkout?pack=` | Coin-pack checkout |
| `/purchases?paid=` | Orders and receipts |
| `/settings` | News by email, purchases, download my data, delete my account; "Redeem a code" once gift codes are on (website only) |
| `/redeem` | **Redeem a code** (`site/pages/RedeemPage.jsx`): a gift code for coins or a season pass; saved accounts only; a 404 while gift codes are off, and always in the apps |
| `/unsubscribe?u=&t=` | Unsubscribe link from emails (no login) |
| `/forgot-password`, `/reset-password?token=` | Password reset (`site/pages/PasswordPages.jsx`) |
| `/scores` | Scoreboards |
| `/signup` (`?mode=login`) | Sign up / log in |
| `/legal` | Terms, terms of sale, privacy, contact |
| `/cookies` | Cookie policy: everything the site stores, by category, and the visitor's choice (`site/pages/CookiesPage.jsx`) |
| `/tracks`, `/tracks/:slug` | Public track pages: every live track by series; one track's name, series, picture, description and "Race it" (`site/pages/TrackPages.jsx`) |
| `/help`, `/help/<question-slug>`, `/help#<question-slug>` | Help Centre: every question has its own link (the slug is the question in lowercase with dashes, e.g. `/help#i-forgot-my-password`); `#contact` is the contact form. Linked from the header, footer, Settings, shop, checkout, Purchases, the offline screen, the error box and the 404 page |
| `/marbles`, `/marbles/<section>`, `/marbles/<section>/<article>` | The marbles knowledge hub (`hub/`). **Off** (`shared/marblesHub.json`): a 404 until switched on |
| `/dashboard`, `/profile/:userId` | Retired (21 Oct 2026): go to `/home` and `/scores` |
| `/race/:raceId`, `/results/:raceId` | Live race and results |
| `/preview/3d`, `/preview/3d/race/:raceId`, `/preview/marbles`, `/preview/marbles/compare`, `/preview/marbles/roll`, `/preview/marbles/northern-lights` (the Northern Lights launch edition's design review: the original `aurora-glass` next to its upgrade `aurora-glow`, now the catalogue's (badge.js `GLOW_STRENGTH` and `SHIMMER`, materials.js's shimmer), drawn with `materials.js` `createCustomLook`), `/preview/marbles/holiday` (the Holiday Season's design review: the season marble's three options and the Winter collection's five designs, `site/marbles/holidayDesigns.js`, with the Snowball before and after on snow; the chosen ones are now in the catalogue (Winter 2026, Winter Solstice). Designs under review race in the dev kit view with `&designs=<key>,<key>`: `three/marbles.js` draws a marble's `customLook`), `/preview/physics`, `/preview/banners` | Preview and check pages (not linked); `/preview/banners`: every track picture as a picker card, for review |
| `/admin/*` | Back office: Players, Player detail (tabs: Coins, Races, Marbles, Payments, Messages, Security, Emails, Audit), Payments, Support messages (`/admin/support`, `/admin/support/:id`), Name reports (`/admin/name-reports`), Gift codes (`/admin/gift-codes`: make codes, totals by creator or campaign, every code; `/admin/gift-codes/:id`: who redeemed it, switch off), Economy, Email list, Audit log |

### 3D: `client/src/three/`

**Drawing never affects a race.** The server decides everything; the client only places marbles where the frames say.

**`TrackScene.js` is the core of the 3D view:**
- It builds the track, the scenery, structures (tunnels, bridges), billboards, lighting, the start gate and the finish.
- It places marbles from each frame and runs the cameras: follow, countdown, and the corner view. The corner view draws no pointer over the marble it follows (that close, the pointer would hide it).
- **The finish shot** (where the big view settles once anyone is home): `finishShotPose` frames it for the screen (`FINISH_SHOT`): the finishers, gathered against the catch area's end cushion, sit 45% of the way down the picture, clear of the results over the bottom and the winner's banner over the top; 40 m from them on a wide screen, 30 m on a tall phone (closer still is never needed: the catch area's width fits). `finishPush` is the push-in on the winner there: across the ground at the camera's own height, never nearer than 32 m (a tall phone's shot stays put). `finishCutaway` cuts a coaster station's canopy (and the boards on it) from the big view while it is on the finish shot, by five clipping planes on the materials reaching into it (`prepareFinishCut`; the renderer's `localClippingEnabled`). **No station roof** (`roofless()`, Moses's option A, 22 Oct 2026): on phones and tall screens, and on computers while `ROOF_ON_COMPUTERS` is off, the canopy is cut away for the whole race (big view and corner view), so it never pops out of the picture when the finish shot begins and the camera no longer stays under it. On the finish shot the follow camera's road and stretch clamps no longer apply (they belong to the marble still coming home). Moses, 22 Oct 2026.
- **Phone mode ("lite")** turns on for touch screens up to 900 px wide, or with `?lite=1`. It lowers the detail and switches off antialiasing.
- **Frame rate:** phones draw at most 60 frames a second. `keepPace()` lowers the resolution step by step on a phone that can't keep up (down to 0.75). `frameStats()` feeds the FPS counter.

**Other files:**
- `trackModel.js`: pure geometry, matching the server's.
- `tvMoments.js` (TV moments: a track's trackside cameras, `tvCameras`, and the cut by where the followed marble is, `tvMoment`; `TrackScene.applyTvMoment` draws it; `components/tvMomentsSetting.js` keeps the viewer's TV on/off, `marble-tv-moments`).
- `iceChannel.js` (also the half-pipe's widening, `channelRadiusAt` / `channelLipAt`), `marbles.js`, `startGate.js`, `startCamera.js` (the countdown shots; on narrow screens the chase shot stands up to 1.5× further back and 1.4× higher, so a phone sees the row, not the starting blocks; wide screens unchanged), `trackFeatures.js` (also the jib parts: box, rail, table top; and the boost-pad jump: kicker, gap with its catch-channel grate or river, landing deck, exit grate), `structures.js`, `billboards.js`, `lighting.js`, `themes.js`, `winnerGlow.js`, `movers.js`, `diagnostics.js`.
- `scenery/`: the worlds:
  - kit scenery: `kit.js`, `kitGround.js`, `kitProps.js`, `kitPlaces.js`, `kitLandmarks*.js`;
  - series looks: `coaster.js` (steel A-frames, or timber trestle bents with `coaster.style: 'timber'`; the rails along the rims from `coasterRails`, long straight pieces on the straights and shorter ones on the bends, so none cuts a bend over the floor), `arcade.js`, `pinball.js`, `grandPrix.js`;
  - canyons: `canyon.js` (the canyon shaped into the land around the track: floor, stepped walls in the palette's bands, plateau, river ribbon; the palettes; what grows there), `canyonSpans.js` (prayer flags, arch bridge, railway trestle and footbridge from rim to rim), `kitLandmarksCanyon.js` (the series' landmarks and the condor). A slot canyon (`narrow: true`) stands its walls about 15 m from the track instead of 20. Any landmark may have see-through parts (`haze`: shafts of light, a rainbow, an island's waterfall), drawn in one faint mesh in `kit.js`. `terrain.js` draws the walls finer (`detail`, at `detailFine`) and in their colours (`colorAt`);
  - the Block Series: `blocks.js` (the twelve worlds: voxel land stepped in terraces away from the track, only ever lowering it; tiles and terrace tones through `colorAt`; cube dressing), `kitLandmarksBlock.js` (the series' landmarks, their unlit `glow` parts, and `buildBlockEffects`: rows clearing, lamp rows lighting, blocks settling on the stack, the split board, the gate's blocks dropping, the drawbridge, the portal's glow, the GG, the chain walls clearing one after another, the score wall filling, the checkpoint arches flashing, the final stage lighting; all on the race clock and the leader's progress, undone when a replay rewinds). Block-pillar supports are `coaster.style: 'blocks'` in `coaster.js`; the lighting presets `dawn`, `cave` and `magma` (with drifting embers, computers only) are in `lighting.js`; a Block Series world's lit parts are one draw call, and its still scenery is merged in bigger squares on phones;
  - Track and Field: `athletics.js` (the stadiums' generic architecture in `STADIUMS`: the ten Track and Field stadiums and Accra's for the Holiday Season; `fitStadium`, an athletics-track outline fitted round the sections marked `stadium`; the stands in chunks, rows rising with the crowd coloured into them, open where the track runs out through them, stepped down under a ramp over them, short pieces left between two stretches dropped; roofs, floodlight masts, the stadium's own touch; the starter's stand and his gun's flash and smoke at GO; the scoreboard, its canvas clock running with the race and stopping at the winner's time; the photo-finish post and its flash; a golden finish at `letzigrund`; `buildLaneMarkings`, the lane lines, start and finish lines and lane numbers, drawn with the track in `TrackScene.js`), `kitLandmarksAthletics.js` (the series' landmarks). The tartan colours are `TARTAN_COLORS` in `iceChannel.js`; the exchange-zone paint and the tartan's rubber braking strips are in `trackFeatures.js`; the hurdle, steeplechase barrier and hurdle cart in `costumes/kit.js`; the starting blocks at the gate in `startGate.js`; the park land (grassed embankments) in `kitGround.js`; an athletics finish has no coaster station (`coaster.js`).
  - the Holiday Season's layer: `../holidayLayer.js` (looks only): warm string lights twinkling on a garland over the start line and on the finish arch's beam and posts, the place's weather round the camera (snow, confetti or warm sparkles; none where the track's own sky already snows) and three bursts of fireworks over the finish as the winner crosses (race time); the lights, the weather and the fireworks are one Points object with its own small shader (per-point size and colour, additive), so the layer costs one draw call. On a phone the season's tracks (`kit.season`) are drawn a little lighter to keep room for it (at most 32 draw calls, Moses 21 Oct): still scenery merged in bigger squares and fewer dressing items (`kit.js`), costumes merged over bigger areas (`trackFeatures.js`, `season`), house windows in the houses' own mesh at night (`kitPlaces.js`), the coaster's supports and station one mesh (`coaster.js`). Which tracks and which weather: `client/src/shared/holidayLayer.json` (`on`: the tracks it is switched on for); fewer points on phones (`lite`). Built in `TrackScene` with the finish arch; ticked in the draw loop and in `dev/kitView.js` shots.
  - the Rivers: `river.js` (`makeRiver`: the river as a ribbon of water beside the track, swinging to the side each section names, under a flying section or away from it, eased over 45 m; the water keeps 15 m from a stretch on the ground and never lowers the land within 11 m of one; its level only falls along the track; banks (quay, sand, reeds, bayou, rock, grass), the palettes of the fifteen rivers and their trees (a palette's `seam`: two waters side by side, Amazon; `glint`: wavelets and a ripple line along each shore, so dark or brown water reads as water; `rapids`: how steeply it must fall before it foams; the track's `river.calm`: a slow lowland river with hardly any white water, Murray, Irrawaddy and Thames; and, from the portrait review of 22 Oct 2026, the track's `river.slope` (0.5–1.4: how steeply land may rise beside another stretch, the cut walls where a track folds back past itself; `kitGround.js` uses it in place of MOUNTAIN_CAP), `river.gap` (10–15 m: the water nearer a ground stretch, with a lower shore) and `river.hillside` (green land in patches away from the water, instead of bare bed), used by Congo, Rhine and Ganges and, from 23 Oct, the first five (Danube, Mekong, Mississippi, Zambezi, Yangtze); on palettes with `glint` each facet of water a little lighter or darker and white water broken up; Mekong's palette re-coloured so it reads as water); `dressable` keeps trees and houses out of the water), `water.js` (a Rivers track's river is its own mesh with the water material, 23 Oct 2026: the palette's colour, the sky mirrored towards the horizon, sun glitter on ripples drifting downstream, moving even while the camera stands still; one extra draw call on a phone; `river.js` `riverTriangles({ shaded })` lets the water run on down over land that falls below it instead of leaving a dry bed, never within 22 m of a stretch nor 75 m of the line; phones draw it every 10 m and the river banks' detail at 7 m to stay in the 60k budget), `riverSpans.js` (the bridges over a section, at least 18 m over the rim: a chain bridge along it, its piers in the river and beside the track, never in it; across it a steel arch, a cable-stayed bridge, a raised bascule bridge (its towers either side of the track), a suspension bridge, a port's loading gantry and a railway truss bridge with a train; five stone arch bridges one after another; a long many-span bridge beside a section; drifting hot-air balloons, low and ahead of the section so they show in a tall frame), `kitLandmarksRiver.js` (the series' landmarks: boats float on the river (`river: true` on a section's landmark), quay lamps glow; the other ten's: lily pads, floating houses, feluccas, granite islands, a palm grove, fishing tripods, dugout canoes, an island castle (also in a spiral's middle), a hilltop castle, vineyard terraces, ghat steps (no shrines), floating lamps, rowing boats in mist, a river clipper, glass towers, a weeping willow, quay cranes, red gums, pelicans, a lock weir, limestone cliffs, brick temples far off). Rivers start looks (`start.look`, `START_LOOKS` in `recipe.js`, built in `coaster.js`): the lift inside a bridge tower or up a port crane, a mansard rooftop. The starts `pier`, `river-boat` and `lock-gate` are in `coaster.js`; the `steamer` tunnel in `structures.js`; the houses `balcony-houses` and `city-quay` in `kitPlaces.js`; `cypress` and `reeds` in the dressing (`kit.js`).
  - the Holiday Season: `kitLandmarksHoliday.js` (the season's landmarks: generic architecture and traditions, lights and fires glowing unlit); the `fireworks-night` sky's fireworks are in `lighting.js` (on the race clock); the start types `lighthouse`, `ski-jump` and `castle-tower` in `coaster.js`; Accra's stadium in `athletics.js`; the season's costumes (steel pans, maracas, firework rockets, gumdrops, candy canes) in `costumes/kit.js`; the pinball art `parang` and `beach-fireworks` in `pinball.js` and the arcade art `star-lanterns` and `light-stream` in `arcade.js`.
  - hand-built worlds: `sanFrancisco.js`, `alpine.js`, `capeTown.js`;
  - checks: `clearCheck.js` (nothing inside the track, sampled four times finer over the last 60 m and every metre through the catch area after the line; nothing within 0.5 m of the camera; `finishShotView`: nothing between the finish shot's camera, `finishShotPose` in `TrackScene.js`, and the finish straight or catch area; `finishFrame`: the finish camera's picture, its limits in `FRAME`, driven through whole races by `client/report/finishFrame.report.js` and tested in `client/test/finishFrame.test.js`) and `groundCheck.js`; `../edgeCheck.js` (`rimCrossings`: the channel's rim never folds back over the floor; `railCrossings`: no rail piece along the rims hangs over the floor; run on every track by `client/test/edgeCheck.test.js`, phone and computer). The land is kept under the catch area by `kitGround.js` (`icePoints` adds the pen: under its floor between the walls, under the walls' tops beside them; on phones 10 cm deeper under the ice, for their coarser grid). Under a coaster station the finish shot cuts the canopy away (`finishCutaway` in `TrackScene.js`; until 22 Oct it held the camera under the canopy, which filled half a phone's picture), and no coaster leg stands in the catch area (`coaster.js`).
- `textCheck.js`: no painted text is mirrored. Meshes carrying text are tagged `userData.text` (`{ floor: true }` for the lane numbers; `{ faces: 'front' }` for two-sided pictures on a body's outer face); `mirroredText` works out the side each triangle reads from. Tested in `client/test/trackText.test.js` (lane numbers on the ten Track and Field tracks, lane 1 on the inside; scoreboards, timing boards, backglasses, cabinet art, billboards).
- `costumes/`: what obstacles look like, sized to their real footprint so marbles hit what you see.

### Apps: `client/ios`, `client/android`

- Capacitor 8, app id `com.marblespins.app`. iPhone test builds use `com.marblespins.app.dev`.
- **Never edit these** (written by `npx cap sync`, and gitignored): `ios/App/App/public` and `android/app/src/main/assets/public`.
- **Generated from `client/assets/`:** the icons and splash screens.
- **Edited by hand:**
  - iPhone: `Info.plist` (version and build number come from `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`), `AppDelegate.swift` (sets the `.ambient` audio category at launch, for the silent switch), `project.pbxproj` (its two version lines are set by `npm run app:version`; it uses Swift Package Manager, `CapApp-SPM`, so there is no CocoaPods workspace);
  - Android: `AndroidManifest.xml` (removes the advertising-ID permission: no ads or tracking), `res/values/*.xml`, the Gradle files (`app/build.gradle`: version from `client/app-version.json`, release signing from `android/keystore.properties` or `MS_UPLOAD_*` variables).
- **Push notifications** (switched off; `src/app/push.js`): `@capacitor/push-notifications`. iPhone: `App/App.entitlements` (`aps-environment`, linked as `CODE_SIGN_ENTITLEMENTS`), `AppDelegate.swift` hands the APNs token to Capacitor. Android: `AndroidManifest.xml` sets the small icon (`res/drawable/ic_stat_marble.xml`), its colour and the default channel (`friends`); Firebase needs `android/app/google-services.json` from the Firebase console (not in the repository yet: `app/build.gradle` applies the Google services plugin only when the file is there). `capacitor.config.json` → `PushNotifications.presentationOptions`.
- **After adding a plugin, run `npx cap sync`** (or `npm run app:sync`): it writes the plugin lists, `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle` and the iPhone's `ios/App/CapApp-SPM/Package.swift`. (Until 21 Oct 2026 the iPhone's list lacked `@capgo/native-purchases`, so iPhone purchases would have failed; fixed by the sync.)
- Plugins: `@capacitor/app`, `network`, `push-notifications`, `splash-screen`, `status-bar`, and `@capgo/native-purchases` (Google Play Billing 9 on Android; StoreKit 2 on iPhone, with `autoFinishTransactions: false` so a transaction is finished only once the server has it). `npx cap sync` lists them in `android/capacitor.settings.gradle`.
- In-app purchases: Google Play in the Android app and the App Store in the iPhone app (`client/src/site/payments/index.js`).

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
- **Other:** `finishShow`, `confetti`, `utils`, `sound`, `appShell`, `appRelease` (app version, iPhone project version lines on the real `project.pbxproj`, release notes, store-text limits), `staleCode`, `canonical`, `trackBanners` (every track has a picture, both sizes, under 40 kB), `help` (the Help Centre's texts, numbers from the settings files, placeholders kept, the search).

## Known stale comments

- `src/game/physicsSimulator.js` and `src/routes/physics.js` describe the physics engine as preview-only. It runs real races now.
- The `user_collection` comment in `docs/database_schema.sql` shows an old Marble ID format (`MS-SUN-SOL-000037`). Today's format is `SC105-000037`.
- The root `README.md` "Database" table describes the first version of the database. [Data model](03-data-model.md) is the current one.
