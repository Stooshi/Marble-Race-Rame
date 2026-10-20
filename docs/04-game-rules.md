# 4. Game and economy rules (plain English)

*Last updated 20 Oct 2026.* The numbers live in `client/src/shared/economy.json` and `client/src/shared/marbles/catalog.json`. If this page and those files ever disagree, the files are right; then update this page.

## The golden rules

1. **Race results never change.** Once a race is decided, its result, and the replay of how it ran, stay the same forever. No code change, track edit or physics tuning may alter a past race. Tests (race fingerprints) guard this.
2. **Looks never change speed.** Marbles, shades, collection items, showcase looks, billboards, scenery, lighting, sound and the 3D drawing are all cosmetic. The race engine never receives them.
3. **Money never buys speed.** Coins and coin packs only buy looks. A season pass buys access to tracks and a coin bonus that never counts on a scoreboard, never speed.
4. **Every coin is accounted for.** Every coin movement is a line in the coin ledger, and the ledger always adds up to the balance.

## How a race is decided

1. **The lobby.** A race is created with up to 20 places. Players join with their Shooter (the look they race in). Joining is free: coin entry fees were switched off on 14 Oct 2026.
2. **The decision**, made once, on the server, when the race leaves the lobby:
   - A random **seed** is drawn.
   - Empty places are filled with **computer players**, up to the race size. They are always marked as computer players (a small robot icon, "Computer player"), have a fun made-up name from a fixed list (no real people or brands) and, unless they wear a showcase marble, a plain starter-style look (one colour or two half and half) that no one else in the race shows. Names and looks are worked out from the race when it is shown, never stored, and never given to the race engine.
   - The seed alone decides the computer players' skills, the lanes and the timing of moving obstacles.
   - The whole race is then simulated, start to finish.
   - The finishing order, times and halfway splits are written to the database straight away. The API keeps them hidden until the race has finished.
3. **The countdown** (5 s), then the race is **streamed** to everyone watching at 10–20 frames a second. Viewers only see positions; their device can't affect anything.
4. **The finish.**
   - The race is marked finished and coins are paid in the same transaction.
   - Solo players may race again straight away. A group moves on to a rematch on the same track (about 40 s later).
   - In a friend room, the next race is set up automatically for everyone in the room.

**Two engines:**
- **New physics** (`tracks.physics` set; every current and new track). A real 3D physics simulation of marbles in a channel with obstacles, boosts, splitters and gates. The complete race is saved, so the engine can be tuned later without changing old races.
- **Classic** (older tracks with no physics settings). A simpler engine whose races are re-created from the seed, which is why that engine must never change.

**A race is between 20 and 90 seconds.** New tracks are designed so the winner finishes in about 48–55 s and the last marble in at most 85 s.

## Skill

- **Every player races at the same level (the rule for launch, decided 14 Oct 2026).** Every player's marble races at skill 50, whatever it looks like and however long they've played. The race itself decides who wins: the track, the start, the bumps and the bounces.
- **Computer players** are spread a little around the players (skill 45–55), so the field isn't identical and the races stay close.
- **How skill works in the engine:** skill is a number from 1 to 100 stored per player (`users.skill`). It sets all four marble stats (top speed, acceleration, handling, luck) to the same value. A higher skill would mean a slightly faster marble with fewer losses on walls and knocks.
- **Skill belongs to the player, not the marble** (12 Oct 2026). Every marble in a bag races the same; coins were refunded for marbles bought for their strength.
- **After launch:** a growth rule (skill rising with races played, on a curve that flattens, with matched fields) will be considered again using real data. Until then nothing changes a player's skill. Every text says "every player races at the same level"; don't promise growth anywhere.
- A race keeps each entry's stats as they were (`race_entries.snap_*`), so a future change to skills never changes a past race.

## Coins

There is one currency: **coins**. They can be earned by racing or bought in coin packs. They are spent only in the shop and can never be cashed out, exchanged or transferred.

**Earning:**

| What | Coins |
|---|---|
| Starting coins (new account, guests too) | 650 |
| Taking part in a race | 15 |
| Finishing bonus | 1st 50 · 2nd 30 · 3rd 20 · 4th–10th 5 each · 11th–20th 0 |
| Daily goal: 5 races in a day (once a day) | 35 |
| **Daily limit:** after the first 10 races of the day | each race pays 5 in total (no taking-part or finishing pay) |
| Streak (days in a row with the daily goal) | shown only (in the header, `▲ 3`, once there is one; on the home screen); pays nothing |

Days run midnight to midnight **UTC**. Friend-room races pay like any race and count towards the same daily limit, so rooms can't be used to farm coins. Computer players are never paid.

**Buying (coin packs):**

| Pack | Price | Coins |
|---|---|---|
| `coins-5000` | $5 | 5,000 |
| `coins-10500` (marked popular) | $10 | 10,500 |
| `coins-27500` | $25 | 27,500 |
| `coins-57500` | $50 | 57,500 |

- **On the web:** Stripe Checkout shows the price in the player's own currency, with VAT included.
- **Coins arrive only** when Stripe confirms the payment.
- **Before paying,** the player must agree to immediate delivery and the loss of the 14-day withdrawal right; the exact text is stored with the order.
- **Refunds and chargebacks** take back the matching share of the coins, or whatever is left if some were spent.
- **In the apps,** purchases go through the stores: Google Play on Android, the App Store on iPhone. The server checks each purchase (with Google; with Apple's signature) before adding coins, once. Inside the apps, coins are never sold any other way, and the apps never show or link to the website's prices.
- **App Store refunds** are Apple's: the player asks Apple (we can't refund an App Store purchase). Apple's signed notification then takes the coins back, like any refund.

**Scoreboards** rank players by coins **earned** racing. Bought coins never count. The boards are season, all-time, and friends. **The season board** follows the season in the `seasons` table that is on (the Holiday Season 2026: 1 Dec 2026 to 7 Jan 2027, 23:59 Swedish time), counting coins earned between its start and its end; once it has ended it shows the final standings until the next season starts. Before the first season (and when no season is on or has ended) there is no season board or season label, and the scoreboards open on all-time. (A numbered season in `economy.json` → `season` is used only when the table has none.)

**Season badges.** When a season ends, the top 100 by coins earned in it get its badge ("Holiday Season 2026", with their final rank) on their profile and in their Marble Bag. Ties go to the player who reached the total first. Only earned coins count: never bought coins or the Track of the Day bonus. The server gives the badges by itself within an hour of the end; nothing is deployed on the night.

## The shop and the collection

**Collection 1, Schoolyard Classics (code SC):** 10 designs in 5 shades (Classic, Ocean, Forest, Berry, Sunset), so 50 marbles. More collections are announced as "coming soon": Handmade Heritage (HH), Moonies & Glow (MG), Art Glass (AG). Limited editions use the code LE.

**Marble IDs:** two letters for the collection, then the design number (01–10), then the shade number (1–5). For example, SC105 is design 10 in shade 5 (Sunset). The shop finds a marble by its ID however it's typed.

**Prices by rarity (coins):**

| Rarity | Price |
|---|---|
| Common | 1,000 |
| Uncommon | 2,500 |
| Rare | 6,000 |
| Epic | 12,000 |
| Legendary | 25,000 |
| Limited (Northern Lights, the launch edition) | 25,000 |

A seasonal collection has its own prices per rarity (below). A season pass's marble is never sold.

**Limited editions:** sold only in their sale window or until their numbered copies are sold, then never again; every copy numbered, with a First Edition certificate. Bags never contain them.
- **Northern Lights** (LE011), the launch edition: 500 copies (#001–#500) at 25,000 coins, on sale from 1 Dec 2026 00:00 to 31 Dec 2026 23:59 Swedish time (`limited.saleStartsAt` / `saleEndsAt` in the catalogue).
- Before its window the shop shows it as "Coming 1 December — limited to 500" without a buy button; after the window or once sold out, "Sold out". The server refuses any purchase outside the window, whatever the screen shows.
- Gifts from support (back office) are not sales: they get a gift number, never one of the 500.

**Kinds of collection** (catalog.json → `collections`, by the two letters of the Marble IDs): the live **standard** collection (Schoolyard Classics, SC), **limited** editions (LE), **seasonal** collections and a **season pass's marble**. Only the standard collection is in bags and on the computer players in beginner races.

**Seasonal collections:** on sale from their release to their retirement at their own prices per rarity, then **retired**: never sold again; owners keep theirs, and they race normally. The shop shows them on the **Seasonal** shelf ("Coming 1 December · on sale until 7 January", then "Leaving in N days"); after retirement they leave the shop, and the Marble Bag and the certificate show "Retired 7 Jan 2027". The server refuses a sale outside the window, whatever the screen shows (409 before, 410 after). The first 500 of each are a numbered First Edition, as for every marble.
- **Winter 2026** (WI011–WI051), for the Holiday Season: Snowball (Common, 800 coins), Frost Clearie (Common, 800), Candy Cane (Uncommon, 2,000), Evergreen (Rare, 4,500), Midwinter Star (Epic, 9,000), one shade each. On sale 1 Dec 2026 00:00 to 7 Jan 2027 23:59 Swedish time.

**A season pass's marble:** never sold; only the season's pass holders get it, the moment the pass is granted, numbered in the order the passes were granted ("Holiday 2026 #0001", certificate "Holiday Season 2026 pass edition"). An open edition: no fixed size, it closes when the pass stops being sold. A pass refunded in full or charged back takes the marble back (its number is never handed out again); a player who still holds the pass another way keeps it. An hourly job gives it to any pass holder still without it.
- **Winter Solstice** (HS011), the Holiday Season 2026 pass marble: deep blue glass, a frosted star burst at its heart, snowflakes drifting through it.

**Bags:** the buyer chooses the shade.
- **Starter Bag:** the 3 Commons at 15% off.
- **Full Collection Bag:** all 10 designs at 30% off.
- Prices round to the nearest 100. If the player already owns some marbles in a bag, the discount applies to the ones still missing.

**No loot boxes.** Every purchase is a chosen item; nothing is random.

**First Editions:**
- The first **500** copies bought of every marble are numbered #001–#500. A limited edition is numbered through its whole run.
- Each numbered copy gets a **First Edition certificate** showing the serial number, first owner, date and the copy's race record.
- After 500, the marble stays on sale **unnumbered**, with a Marble ID card instead.
- Gifts from support have their own numbering and never use up a First Edition number.

**One copy each:** a player can own one copy of each marble.

**The Shooter** is the marble a player races in.

**Starter marbles** (since 20 Oct 2026; replaced the 4 shared ones): every player, guest or saved, gets **4 starter marbles of their own** when the account is made (older players the first time they need them). Plain glass from 12 clearly different colours (`client/src/shared/marbles/starters.json`): one in one colour and three in two colours, half and half, all different; two colours of one marble always clearly differ. Each has its own Marble ID (`ST` + 5 characters + 1–4) and certificate. Never sold. Looks only: they never change a race.
- **In a race no two players show the same starter look.** A player without a collection Shooter races their Shooter starter (or their first); if someone in the race already shows that look, they get their own next starter. Only when all 4 are shown already does an earlier player waiting in the race move to another of theirs. (In 20,000 simulated races of 20 new players, everyone always got one of their own, all different.)
- So any number of new players fit in one race or friend room (before: 4).

**Showcase marbles:**
- In beginner races, the computer players wear collection marbles, so new players see what exists.
- A beginner race is one where every player has finished fewer than 20 races.
- The mix per race: about 6 Common or Uncommon, 3 Rare or Epic and 1 Legendary.
- The looks are chosen separately from the race and never affect it. The fairness report checks that every rarity wins its fair share.

## Fairness checks

Every track must pass a **full report** (`npm run report -- <slug>`) before it is switched on. The report runs 3 batches of 1,000 races and checks:

| Check | Target |
|---|---|
| Wins per group of 4 starting places | 17–23% each (no lane advantage) |
| Average finishing place per group | 10.2–10.8 |
| Strongest five marbles' share of wins | 35–50%; the weakest five win at least 8%, and the strongest win at least twice as often |
| Median winner's time | 48–55 s (new designs) |
| Slowest marble home | at most 85 s, never over 90 s |
| Median gap from winner to last | at most 18 s |
| Overtakes per race (median) | at least 60 |
| Splitters | each channel's share of wins within 5 points of its share of marbles, and at most half a place gained or lost |
| Obstacles | each group's share of hits within 5 points of fair; no hop over 1.2 m |
| Showcase looks | each rarity wins its share (chi-square test, p above 0.001) |
| Sameness | layout not too close to another track (fails at 0.80 similarity, 0.70 when key sections match); start looks different; the first 20 seconds (what the field races through after the gate) not too close to another track's (fails at 0.80; held for every track from Bislett Mile on), and no start part straight after the gate on two tracks in a row |
| Safety | the same seed gives the same race; the database matches the track file; the race fingerprints are unchanged |
| Drawing | no scenery inside the track (up to 2.5 m above the rim); nothing within 0.5 m of the follow camera; ground and phone drawing load within budget |

Reports are saved in `reports/<slug>/`. Track design rules:
- bends long and flowing, with at most one sharp bend per track;
- a race needs its luck: the openings without the pile-up and slalom (clean drop, peg drop, pipe drop) let the field go in **waves** (five waves of four starting places, 0.3 s apart, in a new order every race); a track that opens without the pile-up and slalom and without the waves has a pile-up or a hard slalom (5+ gates, loss 0.3) in its first half;
- TV moments (looks only): up to two trackside cameras a track cuts to as the followed marble passes, about 3–5 s each, never in the first 8 s or the last 150 m; viewers can switch them off (the TV button);
- tracks sit in the ground like a trench, raised only where they drop away or cross;
- at least 35 of the 50 launch tracks must be truly unique (mirrors count towards the 50).

## Friend rooms

- The host creates a room and shares its link (`/r/CODE`). Friends join, as guests if they need to.
- The host picks the track and starts each race. Empty places fill with computer players, up to 20.
- After a race, the next one is set up with everyone still in the room. There is no chat.
- A room closes after 2 hours without a race.
- **Season tracks in rooms:** a host with the season pass can pick a season track, and everyone in the room races it, pass or not ("hosted by a pass holder"). A host without the pass sees season tracks locked. If the host's pass is refunded, the room's next race goes back to a random free track.

## Seasons and the season pass

A season (the first: **Holiday Season 2026**, `holiday-2026`, 1 Dec 2026 00:00 to 7 Jan 2027 23:59 Swedish time) has its own tracks and a pass. Everything follows the season's dates in the `seasons` table, so nothing is deployed on any day of the season (`src/seasons`).

**Who races a season's tracks** (`tracks.season_key`), checked by the server on every request that puts a marble on a track (creating or joining a race, a rematch, a room's track), not only in the pickers:
- **Before the season starts:** nobody (the tracks may already be switched on).
- **During the season:** pass holders, and everyone in a friend room whose host has the pass. Anyone else gets "This track is in the Holiday Season pass".
- **After it ends:** everyone, free. They join the random pick like any track.
- **Watching** races and replays on season tracks is open to everyone.
- **The public random pick** never picks a locked season track. Pass holders get **Holiday races** (`POST /api/races { season }`): a random season track each race, the Track of the Day one race in three.

**The Track of the Day:** each day of the season (Swedish calendar day) one season track is featured (`seasons.featured`). On it, a pass holder's **full-pay races** (the first 10 of the day) pay **+50% of the race's coins** (taking part and the finishing bonus) as a separate ledger line, `featured-bonus`. After the day's full races there is no bonus. The bonus is **neither earned nor bought**: it never counts on the scoreboards or in a player's earned coins (decided 17 Oct 2026: it comes with a paid pass, and money never buys a place on a scoreboard). Free players see the Track of the Day locked with "Get the pass".

**The pass** (`holiday-pass-2026`, $9.99): real money only, never coins. Its terms are section 2 of the terms of sale (`/legal#season-pass`); the Help Centre's "Season pass" category answers the common questions (its dates and price are written there, kept in step with the season's row).
- **On the web:** Stripe Checkout (test mode until Moses says otherwise), with an immediate-delivery consent of its own ("I want my pass delivered right away…"; in the pre-sale "I want my pass to activate on 1 December. Until then I can cancel it for a full refund…"), stored with the payment like a coin pack's. The pass arrives only when Stripe's signed webhook confirms the payment, once.
- **On Android:** Google Play; the server checks the purchase with Google and **acknowledges** it (a pass is kept, never consumed). A purchase made outside the sale window, or a second pass while holding one, is not taken and left unacknowledged, so Google refunds it by itself within 3 days.
- **On iPhone:** the App Store, a non-consumable in-app purchase. The server checks Apple's signature, this player and the sale window; a pass bought outside the window, or a second one, is not given (Apple can't be asked by us to refund: the player asks Apple, and the back office sees it flagged). "Restore purchases" on the pass page gives back a pass the player already has, never a second.
- **Sold** from `pass_sale_starts_at` (**28 Nov 2026 00:00 Swedish time**, 72 hours before the season: the pre-sale, decided 19 Oct, replacing "no pre-sale") to the season's end, with an "ends in N days" countdown from 1 Jan. The server refuses a sale outside the window, or a second pass. The sale start is a date, the same on the website, the App Store and Google Play (each store purchase is checked by its own purchase time).
- **A season's tracks before the season:** switched on ahead of time, they are still closed to everyone (pass holders too) and left out of the track list (the picker, the website's track pages and track count) until the season's start; they appear and open by themselves then, with nothing deployed. Only the pass page counts them before ("All 31 holiday tracks").
- **The pre-sale (28 Nov to 1 Dec):** a pass bought then is the player's at once (and its season marble, numbered in order), but it **activates on 1 Dec 00:00**: the holiday tracks, the Track of the Day bonus and holiday rooms follow the season's `starts_at`, for every holder at once, never the purchase. The pass page, Stripe's checkout and the app's purchase screen say "Activates 1 December" with a countdown; the account (Settings, Purchases) says "Holiday Season Pass 2026 — activates 1 December". A buyer who asks for a refund before 1 Dec gets it in full (back office for Stripe and Google Play; Apple refunds its own), and the refund revokes the pass as any full refund does.
- **Test purchases before the sale starts** (for App Review and our testers, decided 18 Oct): an Apple sandbox or TestFlight purchase, a Google Play licence tester's test purchase (`purchaseType` 0), or a Stripe purchase in test mode by a tester account (`PASS_TESTERS`, emails) is accepted before the sale starts, never after it ends. Tester accounts see the pass on sale early, marked as a test purchase. Real (production) purchases stay refused until the sale starts, 28 Nov 2026 00:00 Swedish time.
- **Before the sale opens** the pass page shows the price ($9.99 on the website; the store's own price in the apps) and **"Remind me when sales open"**: a player gets a reminder in the game, and by email to their account's address only if they tick it; a visitor (or a guest) gives an email address and ticks a consent box (unticked by default: one email, no newsletter, cancel any time). The exact consent text is stored. **Double opt-in** (decided 19 Oct): an email reminder goes only to an address confirmed from a confirmation email; a player's verified account email would count as confirmed, but accounts have no email check yet, so players confirm too. Unconfirmed 7 days after the confirmation email: a visitor's reminder is deleted, a player's keeps only the in-game one. **Sending is built but off** until `BREVO_API_KEY` and `PASS_REMINDERS_SENDING=on` are set on Railway (Moses says go): then the confirmation emails go out before the sale (every 5 minutes), one reminder email to each confirmed address once the sale opens (28 Nov 00:00), and players who asked see an "on sale now" notice above the page until they close it. Emails are in Swedish for a Swedish browser, otherwise English; every one has a cancel link and works with mail apps' unsubscribe button. The reminders are deleted 30 days after the sale opens, when cancelled, or with the account. The page shows the reminder form only when the server supports it (otherwise just the price and date).
- **One pass works everywhere:** bought on one platform, owned on all.
- **No coins move:** a pass payment is a row in `payments` with 0 coins and its `season_key`.
- **A full refund or a chargeback** revokes the pass: the season's tracks lock again for that player until the season ends, and the season marble (Winter Solstice) is taken back. Partial refunds leave the pass.
- **The season marble** comes with the pass ("Kinds of collection" above).

## Age and accounts

- **Birth year and month at sign-up** (no day; since 20 Oct 2026): the age group (under 13, 13–17, 18+) is worked out from them, counting the birth month as not yet reached.
- **Under 13:** no account until parental approval is built (the sign-up form says so kindly and the player keeps racing as a guest; the server refuses too and stores nothing), and never news emails. Guests can play without giving an age.
- **Save your marble pop-up** (guests only): after every 3rd finished race (3, 6, 9 …, counted by the server across visits), before the next race starts. Headline "Save your marble — it's free", six reasons, a big "Sign up now" and a plain "Later". **"Later" always works and racing is never blocked** (App Store rules). Never shown to saved players (the app review accounts are saved accounts). English or Swedish by the browser's or phone's language.
- **Quick sign-up** (the pop-up and the sign-up page alike): player name (a suggested free name the player can change), email, password, birth year and month, the terms (required), news by email (optional, unticked). Everything the guest won stays: it is the same account.
- **Confirm your email** (double opt-in): once email is set up (`BREVO_API_KEY`), a link to confirm the address, valid 7 days; Settings sends a new one. Until then accounts are saved without it.
- **Accounts:** players can download their data and delete their account in Settings. Deletion anonymises the account and keeps race results and payment records.
