# 3. Data model

*Last updated 25 Oct 2026.* The database is PostgreSQL. The schema is defined in `docs/database_schema.sql`. The server applies that file at every start; it only adds what is missing and never deletes or changes rows. Changes to existing rows go in `docs/data_updates/` (see the [runbook](05-runbook.md#data-updates)).

**Conventions:**
- Ids are UUIDs (`gen_random_uuid()`), except where noted.
- Times are `timestamptz`.
- `citext` is case-insensitive text (usernames and emails).
- Enumerated types:

| Type | Values |
|---|---|
| `user_role` | `player`, `admin` |
| `race_status` | `lobby`, `countdown`, `running`, `finished`, `cancelled` |
| `marble_rarity` | `common`, `uncommon`, `rare`, `epic`, `legendary` |
| `track_difficulty` | `easy`, `medium`, `hard`, `extreme` |

## Overview

```
users ─┬─< race_entries >── races >── tracks          rooms ──< races (room_id)
       ├─< coin_ledger            └── race_replays (physics races)
       ├─< user_collection >── collection_counters (per item)
       ├── user_shooter, marble_appearances, user_days
       ├─< payments ──< payment_refunds          stripe_events (webhook dedupe)
       ├─< season_passes >── seasons ──< tracks (season_key), payments (season_key)
       ├─< user_badges
       ├─< security_events, email_consents, cookie_consents
       ├─< support_messages ──< support_replies   (user_id may be empty: no account found)
       └── admin_2fa, admin_sessions, admin_audit (target/admin)
race_entries ── race_entry_looks (player's collection marble) / house_looks (CPU showcase look)
marbles ──< user_marbles   (the older plain marbles; looks only)
```

**What is *not* in the database:**
- The marble collection catalogue (designs, shades, prices; the kinds of collection: standard, limited, seasonal with its own prices and dates, a season pass's marble): `client/src/shared/marbles/catalog.json`.
- The economy numbers: `client/src/shared/economy.json`.
- The coin packs: `client/src/shared/payments/packs.json`.
- The contact form's categories and limits: `client/src/shared/support.json`.
- Physics track definitions: `src/tracks/*.js`. The database holds a copy in `tracks.physics`, put there by data updates.

---

## Players

### `users`
| Column | Meaning |
|---|---|
| `id` | Player id |
| `username` | Player name, 3–24 letters, digits or `_`, unique regardless of case. Guests get `guest_<10 hex>` (shown as `guest_<5 digits>` until they choose a name); deleted accounts become `deleted_<12 hex>` |
| `email` | Unique. Guests get a placeholder `guest-<id>@guest.marblespins.invalid`; deleted accounts get `…@deleted.invalid` |
| `password_hash` | bcrypt hash. Deleted accounts get a value no password can match |
| `display_name` | The name the player chose to be shown by (25 Oct 2026; a guest can choose one; it stays when they save the account, cleared if it's the same as their new player name). 3–24 letters, digits, spaces, `_` or `-`, the name filter, never `guest_…`, never another player's player name or chosen name (case ignored; `users_display_name_lower` index). Shown instead of the player name everywhere (`src/names/shown.js`) |
| `name_hidden_at`, `name_hidden_name` | A reported name hidden by itself (25 Oct 2026, `src/names` `hideIfReported`): open reports on the name now shown from 3 different players on 3 different addresses set `name_hidden_at` and keep the name in `name_hidden_name`; `display_name` becomes NULL (a guest: `guest_<number>` shows) or `Player_<number>` (a saved account). The player is told (`GET /auth/me` → `name_hidden`) and chooses a new name, which clears `name_hidden_at` (`name_hidden_name` stays, so the name can't come back). The back office's restore clears both and puts the name back; rename clears both |
| `avatar_url` | Not used by the website today |
| `role` | `player` or `admin` (the back office) |
| `coins` | Current balance, never below 0. **Only changed through `economy.change()`**, which also writes `coin_ledger` |
| `coins_earned` | Running total of coins earned by racing (the scoreboards rank by this). Spending doesn't lower it |
| `coins_bought` | Running total of coins bought (coin packs, and credits converted when coins became the only currency). Refunds lower it |
| `skill` | 1–100, default 50. How fast the player's marbles race (see [Game rules](04-game-rules.md#skill)). For launch every player stays at 50 |
| `skill_refund_coins` | One-time notice: coins refunded when marbles stopped carrying strength (12 Oct 2026). NULL once seen |
| `is_guest` | Playing without an account yet ("Play free"). Saving the account clears it and keeps coins and marbles |
| `marketing_opt_in` | Current answer to news by email. Its history is in `email_consents`. Always false under 13 |
| `age_group` | `under-13`, `13-17`, `18+`, or NULL for older accounts. Worked out at sign-up from the birth year and month (older apps send the group) |
| `birth_month` | The first day of the birth month (year and month asked at sign-up, no day; since 20 Oct 2026). NULL for older accounts and guests |
| `email_verified_at` | When the player opened the link in the "Confirm your email" email (sent once email is set up). Cleared when the email changes |
| `settings` | JSON that follows the player across devices: `{ "sound": { "muted": false, "music": true } }` (mute, and Game music on/off; no volumes since 28 Oct 2026: data update `2027-04-26-sound-settings.sql` dropped the old slider numbers, music on unless it was at 0) |
| `streak_days`, `streak_last_day` | Days in a row the daily goal was met (shown; pays nothing) |
| `last_login_at`, `created_at`, `updated_at` | `updated_at` is set by a trigger |
| `last_seen_at` | The last visit (set when the account is made, then at most once a day by `GET /auth/me`). A guest not seen for 90 days is deleted (`src/account/retention.js`, daily, once `GUEST_RETENTION_MODE=delete`; the last visit counts the latest of this, `created_at`, `last_login_at` and the last race); accounts from before 21 Oct 2026 count from when the column was added |
| `suspended_at` | Set by the back office. A suspended player can't log in or race |
| `deleted_at` | The player deleted the account. The row stays, anonymised (see below) |
| `password_changed_at` | When the password was last reset by email. Logins made before it stop working |
| `apple_account_token` | A random UUID the iPhone app buys with (StoreKit's appAccountToken): ties an App Store purchase to this player without giving Apple anything personal. Made at the first App Store purchase; cleared when the account is deleted |
| `country` | The country the player races for (ISO 3166-1, two letters), chosen by the player; optional, saved accounts only; it needn't be where they live. **Never from the IP address** (that country is for security only). See `src/country` and [Game rules](04-game-rules.md#the-country-you-race-for) |
| `country_chosen_at` | When the player last chose (the first choice or a change): it opens 24 hours of corrections and starts the 90 days to the next change. Removing the country doesn't change it |
| `store_account_id` | Random id (unique, up to 64 characters) the Android app gives Google Play with each purchase (`obfuscatedAccountId`), so the server can check a purchase belongs to this player. Made at the first purchase; never the user id or email. Cleared when the account is deleted |

**Account deletion** (`src/account/index.js`; by the player, the back office, or for a guest 90 days without a visit) doesn't remove the `users` row.
- **It anonymises the account:** name, email, password, shown name, settings, age group, birth month, the country (also on the player's race entries, so they leave the country records), email confirmation and consent are cleared.
- **It deletes:** `email_consents`, `security_events`, `user_country_history`, `support_messages` (with their replies; also messages sent from the account's email without a link), `admin_sessions` and `admin_2fa` rows. It also clears the marble label and closes rooms the player hosts.
- **It keeps:**
  - race results, so other players' places never change;
  - marble IDs, so serial numbers stay unique;
  - the coin ledger;
  - payments, for bookkeeping.

### `password_resets`
One row per emailed reset link (`src/account/passwordReset.js`).

| Column | Meaning |
|---|---|
| `user_id` | The account |
| `token_hash` | SHA-256 of the link's token. The token itself is never stored |
| `created_at`, `expires_at` | A link works for 60 minutes |
| `used_at` | Set when the link is used, or when a newer link replaces it |

At most 3 links are sent per account per hour.

### `user_days`
One row per player per day (UTC): `races` finished that day and `goal_met_at` (when the daily goal was reached). Used for the daily full-pay limit and the daily goal.

### `email_consents`
History of every yes/no to news by email: `consent`, `source` (`signup`, `claim`, `settings`, `support`, `unsubscribe`), `created_at`. Deleted with the account.

### `user_country_history`
Every choice of the country a player races for: `country` (NULL when removed), `kind` (`first`, `correction`, `change`, `removed`), `created_at`. For "which country did the player have at a moment" (`country.countryAt`: national leagues qualify by the country at the start of the month). In Download my data; deleted with the account.

### `security_events`
Sign-up, login and purchase events: `kind`, `ip` (inet), `country` (2 letters, looked up offline), `created_at`. **The full IP is kept for at most 90 days**: a daily job blanks it and keeps only the country (`src/security`). The table is used only for security and fraud checks, such as many accounts from one address.

## Tracks and races

### `tracks`
| Column | Meaning |
|---|---|
| `slug`, `name`, `description` | Identity (the slug is the stable key used in files and data updates) |
| `difficulty`, `length_m`, `lane_count` | Display and the classic engine |
| `waypoints`, `obstacles` | JSON: the classic engine's polyline and obstacles |
| `physics` | JSON settings for the **new physics engine** (channel, sections, features, start, kit looks). NULL means the track uses the classic engine |
| `thumbnail_url`, `created_by`, `created_at`, `updated_at` | |
| `is_active` | Shown and raced. New tracks are added switched off and turned on later, by hand in Railway's query box (`UPDATE tracks SET is_active = true WHERE slug = …`, as the Rivers were on 25 Oct 2026 and the first five Peaks on 27 Oct) or by a data update (the holiday tracks: `2027-03-31-switch-on-holiday-tracks`). So the live count is in the database, not the repository (110 on 27 Oct 2026, after Moses switched on the first five Peaks; the 31 holiday tracks join on 1 Dec) |
| `season_key` | A season's track (e.g. `holiday-2026`): raced only by pass holders while the season is on, by nobody before it, by everyone after (see [Seasons](#seasons-and-the-season-pass)). NULL for every ordinary track |

### `races`
| Column | Meaning |
|---|---|
| `track_id`, `name` | |
| `status` | `lobby` → `countdown` → `running` → `finished` (or `cancelled`) |
| `min_marbles`, `max_marbles` | 10–20. Empty places fill with computer players when `fill_with_bots` is true |
| `entry_fee_coins` | **Always 0.** Coin entry fees were switched off on 14 Oct 2026. The column stays for old races |
| `seed` | The random seed the race was decided from (set at decision) |
| `target_duration_ms` | Race length: classic races are scaled to it; physics races take what they take (20–90 s) |
| `tick_rate_hz`, `countdown_ms` | Streaming rate and countdown length |
| `track_snapshot` | A copy of the track as it was when the race was decided, including the physics settings and engine version. Later track edits never change a past race |
| `created_by`, `scheduled_at` | Who made it; when the server starts it by itself (a friend room's start timer, a quick race's 15 s; 25 Oct 2026). NULL: it waits for a start |
| `decided_at`, `started_at`, `finished_at` | Lifecycle times. `started_at` = decision time + countdown |
| `next_race_id` | The rematch: the follow-up race on the same track |
| `league_night_id`, `league_night_race` | A League Night's race and which of the night's races it is (27 Oct 2026). A room race, never a league race (no try) |
| `league_id` | Set for a league race (27 Oct 2026): a solo race made from a league's page (`POST /api/leagues/:code/race`). Never in the public race list |
| `room_id` | Set for a room's races (friend rooms and quick races). They never appear in the public race list (`GET /api/races`); a public room shows in its own list (`GET /api/rooms/public`) |

**Checks on the table:**
- A race outside the lobby must have a seed, a duration and a snapshot.
- Durations must be 20–90 s.

### `race_entries`
One marble in one race. Computer players have `user_id NULL` and `is_bot = true`.

| Column | Meaning |
|---|---|
| `race_id`, `marble_id`, `user_id`, `is_bot`, `lane` | Who and where. Each marble, lane and finishing place is unique within a race, and a player can have only one entry per race |
| `snap_top_speed`, `snap_acceleration`, `snap_handling`, `snap_luck` | The four engine stats the entry raced with, copied at decision time (today all four equal the player's skill) |
| `finish_position`, `finish_time_ms`, `split_time_ms` | Results (`split_time_ms` is the halfway time). **Written at decision time but hidden by the API until the race is finished** |
| `coins_awarded` | Coins paid for this race (taking part, the finishing bonus, the daily goal) |
| `country` | The player's country when they joined the race (a `BEFORE INSERT` trigger copies `users.country`; NULL for computer players, guests and players without one). The country records read it, so a later change of country never moves a record (`src/country/records.js`) |
| `bonus_coins` | The Track of the Day bonus a pass holder got on this race (0 otherwise). Kept out of `coins_awarded`, which the stats and scoreboards read |
| `joined_at` | |

### `race_replays`
For physics races, the whole race is stored as `data` along with the `engine` version. Classic races aren't stored; they are re-simulated from their seed.
- **Two forms, both read** (`src/game/replayPack.js`): until 27 Oct 2026 gzipped JSON (frames, events, gate; about 160–180 KB a race); since then version 2, starting with the bytes `MSR2`: Brotli over JSON with the frames stored by column as whole numbers and differences (about 50–70 KB a race, lossless: the race plays back exactly as it ran).
- **Kept 30 days** (Moses, 27 Oct 2026; `src/game/replayRetention.js`, daily at 04:30 UTC, deleting only once `REPLAY_TRIM=on`): older replays are deleted, except the latest 200 finished races (the landing page's closest finish), each track's record (by anyone, and by a player), each country's record on each track, and each collection marble's first win. The race and its results (`races`, `race_entries`) are kept for ever; its replay then answers 410 `replay_gone`.

### `race_readiness`
Each screen's report at GO, once per race (28 Oct 2026; `src/readiness`): `race_id`, `user_id` (null for a visitor; set to null when the account is deleted), `platform` (`web`, `ios`, `android`), `kind` (`solo`, `room`: any shared race), `device` (the browser's user agent, cut to 200 characters; no IP address), `ready` (everything in by GO), `missing` (`track`, `marbles`, or a sound file's name such as `tune-3`), `late_ms` (how long after GO this screen caught up; 60000 = still missing after a minute), `details` (the sound's backend `web` or `native`, whether it was started (`started: false` = no tap yet on the website), the connection type and device memory when the browser says). **Kept 30 days**, then deleted by the daily job.

### `race_entry_looks`, `house_looks`
Looks only; the race engine never reads them.
- `race_entry_looks`: which collection marble a player raced in. Used for the certificate's race record.
- `house_looks`: the collection look a computer player wore in a beginner race (showcase).

### `rooms`
Friend rooms, public rooms and quick races (25 Oct 2026).

| Column | Meaning |
|---|---|
| `code` | Short code from the room link, e.g. `/r/K7QF2M` |
| `host_id` | The host (a quick race: the player who opened it, with no host powers) |
| `track_id` | The host's chosen track; NULL: a random track each race (always for a quick race) |
| `current_race_id` | The room's current race |
| `status` | `open` or `closed` |
| `created_at`, `last_active_at` | A room closes after 2 hours without a race; a quick race closes after its race |
| `is_public` | Listed under "Join a race" (`GET /api/rooms/public`); false (the default): only people with the link or code. The host may change it at any time |
| `kind` | `friends` (a room someone made; they are its host) or `quick` (Quick race: always public, no host powers, a random track, starts by itself 15 s after it opens, closes after its race) |
| `removed` | Players the host took out: they can't join that room again |

### `leagues`, `league_members`, `league_runs`, `league_results`
Leagues (Leagues v1 part 1, 27 Oct 2026; behind the `LEAGUES` switch). Rules: [Game rules: leagues](04-game-rules.md#leagues).

| Table | Columns |
|---|---|
| `leagues` | `code` (6 letters, `/l/CODE`), `kind` (`league`; `pro` is part 2), `name`, `created_by`, `track_ids` (uuid[], in the creator's order), `attempt_cap` (NULL unlimited, 3, 5 or 10), `starts_at`, `ends_at`, `status` (`open`, `ended`), `ended_at`, `feeds_major` (part 2; false), `again_of` (the league this one is a Run again of) |
| `league_members` | `league_id`, `user_id`, `joined_at`, `removed_at` (taken out by the creator: they can't come back), `final_place` and `final_total_ms` (frozen when the league ends; NULL for a member who didn't finish every track) |
| `league_runs` | One try: `league_id`, `user_id`, `track_id`, `race_id` (unique), `created_at` (the try is counted from here), `time_ms` and `finished_at` (filled when the race finishes). A cancelled race's row is removed (the try comes back) |
| `league_results` | Part 2 (Pro Leagues feeding the Major League): created, nothing writes it yet |
| `league_nights` | League Night: `league_id`, `starts_at`, `races` (3–5), `status` (`scheduled` → `open` when its room opens 15 minutes before → `done`, or `cancelled`), `room_id`, `opened_at`, `ended_at`. One scheduled or open per league. Its room: `rooms.league_night_id`; its races: `races.league_night_id` and `league_night_race` (1 to `races`) |
| `user_credits` | Credits (Leagues part 2, branch `leagues-pro`, behind `LEAGUES_PRO`): one row per player with credits, `balance` (never below 0). Changed only by `credits.change()` (`src/credits`) |
| `credit_ledger` | Every credits change: `amount`, `balance_after`, `kind` (`credit-pack`, `pack-refund`, `pro-league`, `pro-pass`, `swap`, `admin`), `payment_id`, `league_id`, `note`, `actor_id`. Adds up to the balance. A `swap` line (credits into coins, 1,000 each) has its coin ledger line `credit-swap`; never the other way |
| `payments` (part 2 columns) | `credit_amount` (a credit pack's credits), and after a refund: `credits_swapped_back` (swapped credits whose coins were taken back), `credits_short` (credits already spent on Pro), `swap_coins_short` (swapped coins already spent) |
| `pro_passes` | The 30-day Pro pass: `starts_at`, `ends_at` (bought while one runs, it starts when that ends), `ledger_id` |

## Marbles and the collection

### `user_collection`: one owned copy of a collection marble
| Column | Meaning |
|---|---|
| `user_id`, `item_slug` | Owner and item (`<design>-<shade>`, from `catalog.json`). A player can own **one copy per item** |
| `source` | `purchase`, `grant` (a gift from support, or a season pass's marble) or `legacy-gift` |
| `copy_no` | Which bought copy of this item it is: 1, 2, 3… (a season pass's marble: which pass holder's, in the order passes were granted) |
| `edition_no` | **The First Edition number**: equals `copy_no` for the first 500 copies of an item (the whole run for a limited edition), otherwise NULL. A season pass's marble: its pass edition number ("Holiday 2026 #0001"), every copy, price 0. Its counter (`collection_counters.bought`) only grows, so a number taken back with a refunded pass is never handed out again |
| `gift_no` | Numbering for gifts. Gifts never use a First Edition number |
| `marble_code` | The ID on the certificate, e.g. `SC105-000037` (gifts: `SC105-G00012`). Unique |
| `currency`, `price_paid` | What was paid (`coins`; `credits` only on copies from before coins-only) |
| `first_owner_id` | The first owner. It stays the same if trading arrives later |
| `acquired_at` | |

### `collection_counters`
One row per item: `bought` and `gifted` so far.

**How First Editions are handed out** (`src/marbles/collection.js`):
1. The counter row is locked (`FOR UPDATE`) inside the purchase transaction.
2. The next `copy_no` is `bought + 1`.
3. If that is within the edition size, it also becomes the `edition_no`.

Two players can never get the same number, and unique constraints back this up.

### `user_shooter`
The look the player races in: either a collection item (`item_slug`) or one of the older plain marbles (`marble_id`), never both. With neither set, the player races in one of their own starters (see `marbles`).

### `marbles`, `user_marbles`
The older catalogue of plain marbles ("Originals") and who owns them, and **every player's own 4 starter marbles** (since 20 Oct 2026, `src/marbles/starters.js`). **Looks only:** the stat columns (`top_speed`, `acceleration`, `handling`, `luck`) are a historical record and are no longer read by races. `on_sale` and `price_coins` cover the plain marbles still for sale.
- **A player's starter** is their own `marbles` row: `owner_id` (the player), `starter_no` 1–4, `is_starter`, `marble_code` (its Marble ID, `ST` + the player's 5-character code + 1–4, e.g. `STLVAS82`; unique; its certificate at `/certificate/<ID>`), `pattern` `solid` (one colour) or `half` (two colours, half and half), colours from `client/src/shared/marbles/starters.json`. Made when the account is made, or for older players the first time they need them. Never sold.
- **The catalogue** is the rows with `owner_id` NULL: the shop's plain marbles and the computer players' marbles. The 4 shared starters of before (Ruby, Sapphire, Emerald, Topaz) are still there (`is_starter` with no owner): computer players race in them, nobody owns them since data update `2027-04-01-own-starter-marbles`.
- A race still holds each marble row once (`race_entries_unique_marble`); since each player has their own, any number of new players fit in a race.

### `email_confirmations`
The "Confirm your email" links (`src/account/emailConfirm.js`): the address it was sent to, the token's SHA-256 (never the token), the language, `expires_at` (7 days), `used_at`. At most 3 an hour per player. Deleted with the account.

### `marble_colors`, `marble_surfaces`, `marble_effects`, `marble_appearances`
The first cosmetic system: a curated colour, surface and effect per player. Options are retired with `is_active = false`. The `label` is always NULL; custom text needs a word filter first. Looks only.

### `billboards`
Images on the tracks' billboards.

| Column | Meaning |
|---|---|
| `track_slug` | The track, or NULL for every track |
| `slot` | Slot 1–6, or NULL for every slot |
| `image_url` | The image (https) |
| `kind` | `own` or `partner` |
| `note` | |
| `starts_at`, `ends_at` | When the image is shown |

The most specific row wins, then the newest. A slot with no row shows a built-in promotion.

## Coins and payments

### `coin_ledger`: every change to every player's coins
| Column | Meaning |
|---|---|
| `id` | bigserial (order of events) |
| `user_id` | The player |
| `amount` | Signed, never 0 |
| `kind` | What it was (list below) |
| `race_id`, `item_slug`, `payment_id` | What it relates to |
| `note` | Free text (e.g. the order number, an admin's reason) |
| `actor_id` | The admin, for back-office adjustments and refunds |
| `balance_after` | The player's balance right after this line |
| `created_at` | |

**Kinds** (the `KINDS` list in `src/economy/index.js`):

| Kind | Meaning |
|---|---|
| `start` | Starting coins |
| `opening-balance` | The first line for accounts that had coins before the ledger existed |
| `race` | **Earned:** taking part |
| `finish-bonus` | **Earned:** finishing place bonus |
| `daily-goal` | **Earned:** the daily goal |
| `coin-pack` | **Bought:** a coin pack |
| `credit-conversion` | **Bought:** old credits converted |
| `gift-code` | **Bought:** coins from a gift code (`src/giftCodes`); the note names the code and its tag. Never on the scoreboards |
| `purchase` | Spent on a marble |
| `bag` | Spent on a bag |
| `entry-fee` | Old races only; fees are switched off |
| `entry-refund` | Return of an old entry fee |
| `refund` | Coins given back, e.g. for retired items |
| `skill-refund` | The 12 Oct 2026 refund when marbles stopped carrying strength |
| `admin` | A back-office adjustment, with a reason |
| `pack-refund` | Coins removed because a coin pack was refunded or disputed |
| `featured-bonus` | The Track of the Day bonus for a season pass holder: +50% of the race's coins, on the day's full-pay races only. **Neither earned nor bought**: it never counts on the scoreboards or in `coins_earned` |

**The rules that keep the ledger right:**
- **Every** change to `users.coins` goes through `economy.change(client, …)`. In one statement it moves the balance and adds the earned or bought total. It then writes the ledger line with `balance_after`.
- The one exception is a new account: it is created with its starting coins already in `users.coins`, and `economy.opening()` writes the matching `start` line.
- So the sum of a player's ledger equals their balance.
- A spend that the balance can't cover changes nothing.
- Never update `users.coins` directly in code or in a data update. Write a ledger line through the same logic.
- Scoreboards and `coins_earned` count **earned** kinds only. Bought coins never count towards the scoreboards.

### `payments`: coin-pack and season-pass orders
| Column | Meaning |
|---|---|
| `user_id` | The buyer |
| `provider` | `stripe`, `apple`, `google` or `test` |
| `provider_ref` | The provider's own id (Stripe session; Google Play order id `GPA.…`, or `token-<sha256>` for a test purchase without one). Unique per provider, so a payment is never credited twice |
| `store_token` | Google Play: the purchase token. Unique per provider, the second guard against crediting twice |
| `store_consumed_at` | Google Play: when the server consumed the purchase at Google (so the pack can be bought again). NULL: still to do; the hourly job retries |
| `store_acknowledged_at` | Google Play, season passes only: when the server acknowledged the purchase (a pass is kept, never consumed). NULL: still to do; the hourly job retries |
| `product_id`, `coins` | The pack and the coins it gives. A season pass has 0 coins (allowed only with `season_key`) |
| `season_key` | Set for a season pass (`product_id` is the pass, e.g. `holiday-pass-2026`) |
| `amount_cents`, `currency` | The pack's list price (USD) |
| `status` | `pending` → `paid` (or `failed`); `refunded` when fully refunded |
| `order_no` | Player-facing order number `MS-1001…` (sequence `payment_order_seq`) |
| `consent_at`, `consent_text` | When the player agreed to immediate delivery and the loss of the withdrawal right, and the exact text they saw |
| `stripe_session_id`, `payment_intent` | Stripe references |
| `charged_cents`, `charged_currency`, `tax_cents` | What Stripe actually charged, in the player's currency, VAT included |
| `receipt_url` | Stripe's receipt |
| `refunded_cents`, `refunded_at` | Total refunded so far |
| `created_at`, `paid_at` | |
| `withdrawn_at` | When the player withdrew from the purchase with the online withdrawal function (a season pass in its pre-sale, before it activates; `src/payments/withdrawal.js`). The refund follows; the pass goes when it comes back |
| `confirmation_sent_at`, `withdrawal_ack_sent_at` | When the purchase confirmation and the withdrawal acknowledgement were emailed (`src/payments/emails.js`; once email is on, website purchases only) |

### `payment_refunds`
One row per refund or dispute (`id` = the Stripe refund or dispute id, or `google-void-<order id>` for a Google Play refund or chargeback, so each is handled once).

| Column | Meaning |
|---|---|
| `amount_cents` | Money refunded |
| `coins_removed` | Coins taken back |
| `coins_short` | Coins the player had already spent, which couldn't be taken back |
| `admin_id`, `reason` | Who refunded and why (from the back office) |

The coins taken back are in proportion to the money refunded; the last refund takes exactly what's left.

### `stripe_events`
Every Stripe webhook event already handled (`id`, `type`). The event is recorded in the same transaction as its coin change, so a resent event is ignored.

## Seasons and the season pass

### `seasons`
One row per season, added by a data update (the Holiday Season 2026: `2027-02-16-season-pass`). Everything follows its dates, so nothing is deployed on any day of a season.

| Column | Meaning |
|---|---|
| `key`, `name` | `holiday-2026`, "Holiday Season 2026" |
| `starts_at`, `ends_at`, `free_from` | Before `starts_at` nobody races its tracks; from `free_from` everyone does, free |
| `time_zone` | The season's calendar (Europe/Stockholm): the Track of the Day changes at its midnight |
| `pass_product_id`, `pass_name`, `price_cents`, `currency` | The pass as a store product (`holiday-pass-2026`, $9.99): the same id on Stripe and the App Store; in Google Play `holiday_pass_2026` (no hyphens there) |
| `pass_sale_starts_at`, `pass_sale_ends_at` | When the pass is sold. The server refuses any sale outside this window. A sale start before `starts_at` is a pre-sale: the pass is held from purchase but opens nothing until `starts_at` (Holiday 2026: sale 28 Nov 00:00, season 1 Dec 00:00 Swedish time) |
| `featured` | The Track of the Day: `{ "2026-12-01": "tromso-aurora-grand-prix", … }` |
| `featured_bonus` | The Track of the Day bonus (0.5 = +50% race coins) |
| `badge_top` | How many players get the season's badge (100) |
| `badges_awarded_at` | When the season-end job gave the badges (once; NULL until the season has ended and the job has run) |

### `season_passes`
A player's pass for a season. Granted once when its payment is paid; a full refund or a chargeback sets `revoked_at` and `revoke_reason` (`refunded`, `chargeback`), and the season's tracks lock again for that player. At most one live (not revoked) pass per player and season. A second pass paid for (bought on two platforms at once) is flagged in `admin_audit` (`pass-duplicate`) for the back office to refund.

| Column | Meaning |
|---|---|
| `user_id`, `season_key` | Whose and which |
| `payment_id`, `provider` | The payment that bought it; a pass from a gift code has `provider` `gift-code` and no payment (its `gift_code_redemptions` row points here) |
| `granted_at`, `revoked_at`, `revoke_reason` | |

### `name_reports`
"Report this name" (`src/names`, 22 Oct 2026): `reported_user_id`, `reporter_id` (a player or guest), `place` (scoreboard, results, room), `name_shown`, `created_at`; `resolved_at`, `resolved_by`, `resolution` (`renamed`: the back office gave a neutral name, or kept a hidden name hidden; `dismissed`: the name is fine, restored if hidden). One open report per reporter and player. `reporter_ip_hash` (25 Oct 2026): a keyed hash of the reporter's address (never the address), so several accounts on one connection count once towards hiding a name.

### `push_devices`, `push_preferences`, `push_sends`
Push notifications in the apps (`src/push`, switched off).
- **`push_devices`:** a phone's token for an account (`platform` ios/android, `token` unique: it moves to whoever logged in on that phone last, `app_id`, `app_version`, `created_at`, `last_seen_at`; `disabled_at`/`disabled_why` when Apple or Google says the token is dead). Deleted on log out on that phone and when the account is deleted.
- **`push_preferences`:** the player's switches: `room_invites` (default on), `season_news` (marketing; default off; `season_news_at` when turned on; never used for guests or under-13s), `daily_goal` (default off). No row = the defaults.
- **`push_sends`:** one row per player and message key (`pass-sale:<season>`, `season-start:<season>`, `daily-goal:<day>`, `room-invite:<code>:<host>:<10-minute slot>`), with how many phones and how many got it. The unique key makes each message go once.

### `gift_codes`
Gift codes made in the back office (`src/giftCodes`, 21 Oct 2026) for creators, campaigns and giveaways. **Redeeming is switched off** until `client/src/shared/giftCodes.json` `enabled` is true.

| Column | Meaning |
|---|---|
| `code` | Unique, normalised: upper case, no spaces or dashes (`ABCDEFGH2345`, shown `ABCD-EFGH-2345`; or a custom word like `MARBLEJOE`) |
| `kind`, `coins`, `season_key` | What it gives: `coins` (how many) or `pass` (which season's) |
| `max_uses`, `uses` | 1 = single-use; more = multi-use up to the limit. `uses` counts redemptions |
| `expires_at` | After this it can't be redeemed |
| `tag` | The creator or campaign it was made for (the back office sums by tag) |
| `note`, `batch_id`, `created_by`, `created_at` | Free text; codes made together; who made it and when |
| `disabled_at`, `disabled_by` | Switched off in the back office (no more redemptions; what was redeemed stays) |

### `gift_code_redemptions`
One row per code and account (unique): `code_id`, `user_id`, `coins` (for a coins code), `season_pass_id` (for a pass code), `redeemed_at`. In the player's data download (`giftCodesRedeemed`).

### `pass_reminders`
"Remind me when sales open" on the pass page, asked for before the pass goes on sale (`src/seasons/reminders.js`). Sent by `src/seasons/reminderMail.js`, **off until `BREVO_API_KEY` is set and `PASS_REMINDERS_SENDING=on`**. One live reminder per player or email address and season.

| Column | Meaning |
|---|---|
| `season_key` | Which season's pass |
| `user_id` | A player's reminder (always in the game); NULL for a visitor's |
| `email` | A visitor's address (lower case); NULL for a player (their account's address is used) |
| `email_wanted` | Also by email (a player who ticked it; always true for a visitor) |
| `consent_text` | The exact text they agreed to, with the consent version |
| `token` | The reminder's own link, to confirm (the confirmation email) or cancel it |
| `confirm_sent_at`, `confirmed_at` | Double opt-in: when the confirmation email went out, and when its link was clicked. Only a confirmed address gets the reminder email; a verified account email would count as confirmed (accounts have no email check yet) |
| `created_at`, `sent_at`, `cancelled_at` | `sent_at`: when the reminder email went |
| `lang` | The emails' language, `en` or `sv` (the browser's when it was asked for) |
| `notice_seen_at` | When the player closed the in-game "on sale now" notice |

Unconfirmed 7 days after the confirmation email: a visitor's reminder is deleted, a player's keeps only its in-game reminder. Deleted with the account (also a visitor's reminder at the account's address), by the hourly seasons job once cancelled, and 30 days after the sale opened. In the player's data download (`passReminders`).

### `user_badges`
Badges on a profile and in the Marble Bag (`user_id`, `badge_key`, `rank`, `awarded_at`). A season's badge has the season's key as `badge_key` and the player's final rank: the season-end job gives it to the top `badge_top` players by coins earned in the season (earned kinds only; ties to who reached their total first; deleted and suspended accounts left out), once.

## Support

### `support_messages`
One row per message sent with the Help Centre's contact form (`src/support`).

| Column | Meaning |
|---|---|
| `id` | uuid |
| `ref` | The reference shown to the player: `S-1001`, `S-1002`… (sequence `support_message_seq`) |
| `user_id`, `linked_by` | The account: `login` when they were logged in (guests too), `email` when it was matched on the email they typed (not proof of identity), empty when no account was found. The player's **Messages** tab in the back office also shows unlinked messages sent from the account's email |
| `name`, `email`, `category`, `order_no`, `message` | As typed. `category` is one of `support.json` → `categories`; `email` is lowercased |
| `screenshot`, `screenshot_type` | The optional image (bytes), at most 4 MB; PNG, JPEG, WebP or GIF, checked by its first bytes |
| `device` | The browser's user-agent, for technical questions |
| `status`, `status_at` | `new` → `open` → `done`. Every change is in `admin_audit` (`support-status`); a first reply moves `new` to `open` |
| `notified_at` | When the support address was emailed about it (empty: email off or no `SUPPORT_EMAIL`) |
| `ip`, `country` | For spam checks only. The IP is blanked after 90 days with the security events; the country stays |

Spam checks before a row is written: a hidden field, a signed form token (a message under 3 s after the form opened is dropped silently), a limit of 6 messages an hour per address, and the same message from the same email and account within 10 minutes kept once.

### `support_replies`
Replies written in the back office: `message_id`, `admin_id`, `body`, `emailed_at` (empty when email was off or sending failed), `created_at`. Each is also in `admin_audit` (`support-reply`, with the text).

### `cookie_consents`
The website's cookie choice, kept as a record of consent (GDPR): one row each time a logged-in player decides or changes their mind (`POST /api/users/me/cookie-consent`). `user_id`, `version` (the banner's `CONSENT_VERSION`), `statistics`, `marketing`, `decided_at` (the browser's time when plausible, else the server's), `created_at`. Visitors who aren't logged in have their choice in their browser only. In "Download my data" (`cookieChoices`); deleted with the account.

## Back office

| Table | Holds |
|---|---|
| `admin_2fa` | One per admin: the authenticator secret, encrypted (`secret_enc`), `enabled_at`, and `last_step` (so each code works only once) |
| `admin_sessions` | Back-office sessions: `created_at`, `last_seen_at` (30-minute idle limit), `ended_at` |
| `admin_audit` | Every back-office action: `admin_id`, `action`, `target_user_id`, `reason` (required), `details` (JSON of what changed). Never edited. Also records refunds made in the Stripe dashboard, disputes and account deletions, and support-message status changes (`support-status`, details `message_id`, `from`, `to`) and replies (`support-reply`) |

## Bookkeeping tables and views

| Name | What it is |
|---|---|
| `data_updates` | The one-time SQL files already applied: `id` = file name without `.sql`, `applied_at`, `summary` |
| `user_stats` (view) | Per player: races, wins, podiums, best times, average place, coins won |
| `marble_stats` (view) | Per plain marble: races, wins, average place |
| `default_marble_color()` | A function giving each new player a starting colour, based on their id |
| `set_updated_at()` | The trigger function behind every `updated_at` column |
