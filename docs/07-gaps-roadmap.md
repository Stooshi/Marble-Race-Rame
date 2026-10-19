# 7. Known gaps and roadmap

*Last updated 18 Oct 2026.* What isn't built, isn't finished, or is a known weakness. The launch target is **1 December 2026** (web, iPhone and Android). When something here is fixed, remove it and note the change in the [decisions log](06-decisions.md) if it was a decision.

## Must fix before launch

| Gap | Detail | Where |
|---|---|---|
| **Turn on email** | The password reset is built but off until `BREVO_API_KEY` (and a verified `EMAIL_FROM` sender) are set on Railway. See the [runbook](05-runbook.md#email-brevo) | Railway variables, Brevo |
| **Google Play setup** | Built (Google Play Billing, server checks, refunds). Still to do in Play Console and Google Cloud, by Moses: payments profile, the four products, the service account (`GOOGLE_PLAY_SERVICE_ACCOUNT`), notifications (`GOOGLE_PLAY_RTDN_TOKEN`), license testers, the first internal test. Step by step in the [runbook](05-runbook.md#google-play-billing-coins-in-the-android-app). Not yet tested against Google's real servers | Play Console, Railway variables |
| **iPhone in-app purchases: Apple setup** | Built (StoreKit 2 in the app, Apple's signature checked on the server, refunds from Apple's notifications, Restore purchases). Still to do by Moses: the Apple Developer account, the Paid Apps agreement, the five products, the notification URL, `APPLE_IAP_ENABLED=true`, a TestFlight test. Step by step in the [runbook](05-runbook.md#app-store-purchases-the-iphone-app). Not yet tested against Apple's real servers (the tests use a test-only certificate chain) | App Store Connect, Railway variables |
| **Legal text placeholders** | Company details are filled (Voltron Robotics AB, `client/src/shared/company.json`). Still open: the age in "Players under [13]…", trading rules, whether coins expire, retention after an account is closed (`[X months]`). The DRAFT banner stays until Moses has reviewed the texts | `client/src/site/pages/LegalPage.jsx` |
| **Under-13 parental approval** | Placeholder. Until it exists, under-13s can't make an account: both the sign-up page and the server refuse (they can still play as guests). The process for a parent to approve is still to be designed | `src/routes/auth.js`, `client/src/site/pages/SignupPage.jsx` |
| **Stripe live** | Test mode now. Before going live: the company's Stripe account, the accountant's confirmation of tax code and VAT (OSS), live webhook. See the [runbook](05-runbook.md#switching-to-live-only-when-moses-says-so) | Railway variables |
| **Store accounts and listings** | Google Play account done (Voltron Robotics AB, an organisation account, so the 14-day closed test with 12 testers doesn't apply). Still: Apple Developer account; the Play listing, data safety, content rating and target audience (answers drafted; target audience 13+ recommended, Moses to decide). Drafts are in the project doc `claude/store-submission-drafts.md` | — |
| **Support email** | support@marblespins.com and privacy@marblespins.com are in the texts. The mailboxes must exist and receive mail, and Brevo must be on (`BREVO_API_KEY`) for contact-form notifications to be emailed (they go to support@marblespins.com unless `SUPPORT_EMAIL` says otherwise) | Railway variables, the mail host |
| **Help Centre placeholders** | Answers still holding `[brackets]` (reply time, coins expiry, Swedish time, what happens when someone leaves a room, changing a name, Google/Apple sign-in, app launch, quality setting, parent approval, email switched on). Fill them in the project doc and in `faq.js` together | `client/src/site/help/faq.js` |
| **Holiday Season pass: the rest** | Built (steps 1, 3 and 5 of the plan): the `seasons` row, the scoreboard season and its end, the top-100 badge (profile and Marble Bag), the pass on Stripe (test mode), Google Play and the App Store, locked season tracks checked by the server, friend rooms, Holiday races and the Track of the Day bonus. The seasonal collections (Winter 2026, on sale 1 Dec–7 Jan, then retired) and the season marble (Winter Solstice, given with the pass, numbered) are built too, and the boost-pad jump for a few holiday tracks (proven on its test track; Moses sees its clip before it goes on a real track). Still to do: the `holiday-pass-2026` product in Play Console ([runbook](05-runbook.md#the-season-pass-holiday-season-2026)); the App Store setup ([runbook](05-runbook.md#app-store-purchases-the-iphone-app)); the pass page's final design, store texts, terms and Help answers (step 6); the 31 holiday tracks (step 4) | `src/seasons`, project doc `claude/holiday-season-plan.md` |
| **App store links** | The website footer shows the App Store / Google Play buttons once their links are in `storeLinks.json` | `client/src/shared/storeLinks.json` |
| **50 launch tracks** | The 10 Canyon Series tracks were switched on on 15 Oct 2026 (Moses: 60 tracks live). Check that every series the landing page shows has live tracks | `docs/data_updates`, `tracks.is_active` |
| **Backups** | Not confirmed that Railway backs up the database on the current plan. Until then, take manual `pg_dump` backups | [Runbook](05-runbook.md#backups) |

## Missing features (planned)

- **News emails.** Brevo is the chosen provider and the sending code is in place (`src/email`). Consent and unsubscribe links are ready; still to build: the news email itself, its sending, and the list from the back office.
- **Sign in with Google and Apple.** Not built; the buttons are hidden on the sign-up page. Mentioned in the privacy policy. If Google sign-in is added, Apple requires Sign in with Apple too.
- **Push notifications** (app plan step 5).
- **Marble trading** between players. `user_collection.first_owner_id` is ready for it.
- **Custom marble labels.** The column exists, but a word filter is needed first.
- **Subscriptions** (later). The season pass is being built (see "Holiday Season pass" above).
- **Automated social posting** of race clips, approved by Moses.
- **Holiday Season tracks (31 planned): being built.** Each passes its full report and is added **switched off** and in the Holiday Season pass (`season_key` `holiday-2026`), from `docs/data_updates/2027-02-17-…`; they are switched on before 1 Dec. Added so far: Tromsø Aurora Grand Prix, Zermatt Marble Grand Prix, Gamla Stan Christmas Run, Outback Christmas Burst, Cape Town Summer Christmas, Québec Old Town Spins, Medellín Lights, Oaxaca Posadas Run, Nuremberg Christmas Market Run, Belgrade Badnjak Run, Coptic Cairo Lights, Veliky Ustyug Frost Run, New York Winter Run, Accra December Beats, Harbin Ice City, Sapporo Snow Sculptures, Queenstown Pōhutukawa Run, Buenos Aires Summer Christmas, Edinburgh Hogmanay Grand Prix, Reykjavik Yule Lights, Lalibela Genna Spins, San Fernando Lantern Spins, Trinidad Parang Run, Goa Star Lanterns, Seoul Winter Lights, Gingerbread Village, Sydney Harbour New Year, Rio New Year Burst, Ice Palace, Night Train North. All 31 are drafted; the rest wait for their full reports (about 18 minutes each).
- **Track and Field (10 tracks): waiting for Moses's review.** All built and passing their full reports, added **switched off** (`docs/data_updates/2027-02-05-…` to `2027-02-15-…`): Marble Stadium Sprint, Berlin Blue Lanes, Bislett Mile, Eugene Hurdles, Beijing Nest 200, Tokyo Photo Finish, Stockholm 1912 Relay, London Steeplechase, Coliseum Anchor Leg, Zurich Golden Lap. Results and preview links: the project doc `claude/track-and-field-plan.md`. To switch them on: a data update setting `is_active` for the ten slugs; the landing page's Track and Field card then appears by itself.
- **Block Series: waiting for Moses's review.** All 10 tracks are built and pass their full reports, added **switched off** (`docs/data_updates/2027-01-16-…` to `2027-01-25-…`).
- **Canyon and Block tracks 11–15 (ten tracks): waiting for Moses's review.** Built 16–17 Oct 2026, each passing its full report, added **switched off**: Antelope Slot Spins, Verdon Burst, Tiger Leaping Spins, Wadi Mujib Burst, Waimea Free Fall (`2027-01-26-…` to `2027-01-30-…`) and Sky Islands, Voxel Harbor, Sunstone Temple, Chain Reaction, Bonus Round (`2027-01-31-…` to `2027-02-04-…`). Switching on: a data update setting `is_active` for the slugs. Details and preview links: the project docs `claude/canyon-series-plan.md` and `claude/block-series-plan.md`. To switch them on: review the preview links and the track pictures (`/preview/banners`), then a data update setting `is_active` for the ten slugs. The landing page's Blocks card appears by itself once they are live. The Canyon Series (10 tracks) is live. The landing page and the Help Centre count tracks and series from the live track list; a new series needs its card in `SERIES` in `client/src/site/landing/LandingPage.jsx` (marked `true` to stay hidden until it has live tracks).
- **Race sound effects** (rolling, clacks), on hold.
- **Support: a confirmation email to the player** ("we got your message, reference S-…") and canned replies. The form shows the reference on screen today.
- **Analytics in the apps.** None. The website has Google Analytics 4 and the Meta Pixel, only with consent and only once `VITE_GA4_ID` / `VITE_META_PIXEL_ID` are set in Vercel. Adding anything to the apps needs the store privacy forms updated first.
- **Website pre-rendering is per build.** A track switched on gets its `/tracks/<slug>` page and sitemap entry at the next website build (a redeploy in Vercel, or any push). Unknown addresses still answer 200 with the app (a "soft 404" to Google; the page says "noindex").

## Technical weaknesses

- **Single server instance.** Race timers live in memory. Scaling out needs the socket.io Redis adapter and one owner per race (see "Scaling notes" in the root README). The long-term ambition is very large scale (hundreds of thousands of races), which will need a redesign of race hosting.
- **No monitoring or alerts.** There are no uptime checks, error tracking or paging. Suggested: an uptime monitor on `/health`, and log alerts for `FAILED, rolled back` and `[stripe]` errors.
- **The admin lockout counter is in memory** (5 wrong codes give a 15-minute pause). A restart clears it, and it isn't shared if there is ever more than one instance.
- **No staging environment.** Vercel previews talk to the production server.
- **Rate limiting** only on the login and sign-up routes.
- **The server reads files from `client/`** (economy, catalogue, packs, consent). Deploys must include the whole repository.
- **Two race engines.** The classic engine must stay frozen for old races. Moving every remaining classic track to physics would allow it to be retired from new races, but never deleted (old replays need it).
- **Slow test suites:** server about 5 minutes, client about 8 minutes.
- **Stale comments and docs:** `physicsSimulator.js` and `routes/physics.js` still describe physics as preview-only; the schema comment on `user_collection` shows an old Marble ID format; the "Database" table in the root `README.md` is from the first version.
- **Legacy tables:** `marbles` / `user_marbles` (plain marbles) and `marble_colors` / `marble_surfaces` / `marble_effects` / `marble_appearances` (the first look system) coexist with the collection. They are kept because old races and players reference them.

## Roadmap (as known on 14 Oct 2026)

1. **Now to mid-November:**
   - store accounts;
   - legal details;
   - in-app purchases;
   - the 50 tracks;
   - phone testing with the apps;
   - start the Google closed test.
2. **Second half of November:**
   - store listings and screenshots;
   - Stripe live;
   - final fairness and phone checks;
   - submission.
3. **1 December 2026:** launch on the web, iPhone and Android.
4. **After launch:**
   - news emails;
   - a skill growth rule, looked at again with real data;
   - push notifications;
   - new collections (Handmade Heritage 8 Dec, Moonies & Glow 15 Dec, Art Glass 22 Dec);
   - track series;
   - trading.
