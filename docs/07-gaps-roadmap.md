# 7. Known gaps and roadmap

*Last updated 16 Oct 2026.* What isn't built, isn't finished, or is a known weakness. The launch target is **1 December 2026** (web, iPhone and Android). When something here is fixed, remove it and note the change in the [decisions log](06-decisions.md) if it was a decision.

## Must fix before launch

| Gap | Detail | Where |
|---|---|---|
| **Turn on email** | The password reset is built but off until `BREVO_API_KEY` (and a verified `EMAIL_FROM` sender) are set on Railway. See the [runbook](05-runbook.md#email-brevo) | Railway variables, Brevo |
| **In-app purchases in the apps** | Apple and Google purchases are placeholders. They need the store accounts, products named after `packs.json` ids, and server receipt checks (`redeemReceipt`) | `src/payments/index.js`, `client/src/site/payments/index.js` |
| **Legal text placeholders** | Company name, organisation number, address, support and privacy email, email provider, retention after account deletion, and whether coins expire | `client/src/site/pages/LegalPage.jsx` |
| **Under-13 parental approval** | Placeholder. Until it exists, under-13s can't make an account: both the sign-up page and the server refuse (they can still play as guests). The process for a parent to approve is still to be designed | `src/routes/auth.js`, `client/src/site/pages/SignupPage.jsx` |
| **Stripe live** | Test mode now. Before going live: the company's Stripe account, the accountant's confirmation of tax code and VAT (OSS), live webhook. See the [runbook](05-runbook.md#switching-to-live-only-when-moses-says-so) | Railway variables |
| **Store accounts and listings** | D-U-N-S number, Apple Developer and Google Play accounts; the Google 14-day closed test with 12 testers (start by mid-November); screenshots. Drafts are in the project doc `claude/store-submission-drafts.md` | — |
| **Support email** | Set `SUPPORT_EMAIL` on Railway (and Brevo) so contact-form messages are emailed, and fill `[support email]` in the Help Centre and legal text. Until then, messages are only in the back office | Railway variables |
| **Help Centre placeholders** | Answers still holding `[brackets]` (support and privacy email, reply time, company details, coins expiry, Swedish time, what happens when someone leaves a room, changing a name, Google/Apple sign-in, app launch, quality setting, parent approval, email switched on). Fill them in the project doc and in `faq.js` together | `client/src/site/help/faq.js` |
| **Limited edition price** | "Northern Lights" coin price is still `[X]` | `client/src/shared/marbles/catalog.json` |
| **Season** | Not set: no season is shown until `number`, `startsAt` and `endsAt` are set. The season badge for the top players isn't built yet | `client/src/shared/economy.json` → `season` |
| **App store links** | The website footer shows the App Store / Google Play buttons once their links are in `storeLinks.json` | `client/src/shared/storeLinks.json` |
| **50 launch tracks** | The 10 Canyon Series tracks were switched on on 15 Oct 2026 (Moses: 60 tracks live). Check that every series the landing page shows has live tracks | `docs/data_updates`, `tracks.is_active` |
| **Backups** | Not confirmed that Railway backs up the database on the current plan. Until then, take manual `pg_dump` backups | [Runbook](05-runbook.md#backups) |

## Missing features (planned)

- **News emails.** Brevo is the chosen provider and the sending code is in place (`src/email`). Consent and unsubscribe links are ready; still to build: the news email itself, its sending, and the list from the back office.
- **Sign in with Google and Apple.** Not built; the buttons are hidden on the sign-up page. Mentioned in the privacy policy. If Google sign-in is added, Apple requires Sign in with Apple too.
- **Push notifications** (app plan step 5).
- **Marble trading** between players. `user_collection.first_owner_id` is ready for it.
- **Custom marble labels.** The column exists, but a word filter is needed first.
- **Subscriptions and season pass** (later).
- **Automated social posting** of race clips, approved by Moses.
- **Block Series: waiting for Moses's review.** All 10 tracks are built and pass their full reports, added **switched off** (`docs/data_updates/2027-01-16-…` to `2027-01-25-…`). To switch them on: review the preview links and the track pictures (`/preview/banners`), then a data update setting `is_active` for the ten slugs. The landing page's Blocks card appears by itself once they are live. The Canyon Series (10 tracks) is live. The landing page and the Help Centre count tracks and series from the live track list; a new series needs its card in `SERIES` in `client/src/site/landing/LandingPage.jsx` (marked `true` to stay hidden until it has live tracks).
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
   - trading;
   - season pass.
