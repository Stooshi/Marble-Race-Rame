# 3. Data model

*Last updated 18 Oct 2026.* The database is PostgreSQL. The schema is defined in `docs/database_schema.sql`. The server applies that file at every start; it only adds what is missing and never deletes or changes rows. Changes to existing rows go in `docs/data_updates/` (see the [runbook](05-runbook.md#data-updates)).

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
| `username` | Player name, 3–24 letters, digits or `_`, unique regardless of case. Deleted accounts become `deleted_<12 hex>` |
| `email` | Unique. Guests get a placeholder `guest-<id>@guest.marblespins.invalid`; deleted accounts get `…@deleted.invalid` |
| `password_hash` | bcrypt hash. Deleted accounts get a value no password can match |
| `display_name` | Optional shown name (40 characters) |
| `avatar_url` | Not used by the website today |
| `role` | `player` or `admin` (the back office) |
| `coins` | Current balance, never below 0. **Only changed through `economy.change()`**, which also writes `coin_ledger` |
| `coins_earned` | Running total of coins earned by racing (the scoreboards rank by this). Spending doesn't lower it |
| `coins_bought` | Running total of coins bought (coin packs, and credits converted when coins became the only currency). Refunds lower it |
| `skill` | 1–100, default 50. How fast the player's marbles race (see [Game rules](04-game-rules.md#skill)). For launch every player stays at 50 |
| `skill_refund_coins` | One-time notice: coins refunded when marbles stopped carrying strength (12 Oct 2026). NULL once seen |
| `is_guest` | Playing without an account yet ("Play free"). Saving the account clears it and keeps coins and marbles |
| `marketing_opt_in` | Current answer to news by email. Its history is in `email_consents`. Always false under 13 |
| `age_group` | `under-13`, `13-17`, `18+`, or NULL for older accounts. Asked at sign-up |
| `settings` | JSON that follows the player across devices, e.g. `{ "sound": { "music": 0.6, "effects": 0.8, "muted": false } }` |
| `streak_days`, `streak_last_day` | Days in a row the daily goal was met (shown; pays nothing) |
| `last_login_at`, `created_at`, `updated_at` | `updated_at` is set by a trigger |
| `suspended_at` | Set by the back office. A suspended player can't log in or race |
| `deleted_at` | The player deleted the account. The row stays, anonymised (see below) |
| `password_changed_at` | When the password was last reset by email. Logins made before it stop working |
| `apple_account_token` | A random UUID the iPhone app buys with (StoreKit's appAccountToken): ties an App Store purchase to this player without giving Apple anything personal. Made at the first App Store purchase; cleared when the account is deleted |
| `store_account_id` | Random id (unique, up to 64 characters) the Android app gives Google Play with each purchase (`obfuscatedAccountId`), so the server can check a purchase belongs to this player. Made at the first purchase; never the user id or email. Cleared when the account is deleted |

**Account deletion** (`src/account/index.js`) doesn't remove the `users` row.
- **It anonymises the account:** name, email, password, shown name, settings, age group and consent are cleared.
- **It deletes:** `email_consents`, `security_events`, `support_messages` (with their replies; also messages sent from the account's email without a link), `admin_sessions` and `admin_2fa` rows. It also clears the marble label and closes rooms the player hosts.
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
| `is_active` | Shown and raced. New tracks are added switched off and turned on later by a data update |
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
| `created_by`, `scheduled_at` | Who made it; when the scheduler should start it |
| `decided_at`, `started_at`, `finished_at` | Lifecycle times. `started_at` = decision time + countdown |
| `next_race_id` | The rematch: the follow-up race on the same track |
| `room_id` | Set for friend-room races, which never appear in public lists |

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
| `bonus_coins` | The Track of the Day bonus a pass holder got on this race (0 otherwise). Kept out of `coins_awarded`, which the stats and scoreboards read |
| `joined_at` | |

### `race_replays`
For physics races, the whole race is stored as `data` (gzipped JSON: frames, events, gate) along with the `engine` version. Classic races aren't stored; they are re-simulated from their seed.

### `race_entry_looks`, `house_looks`
Looks only; the race engine never reads them.
- `race_entry_looks`: which collection marble a player raced in. Used for the certificate's race record.
- `house_looks`: the collection look a computer player wore in a beginner race (showcase).

### `rooms`
Friend rooms.

| Column | Meaning |
|---|---|
| `code` | Short code from the room link, e.g. `/r/K7QF2M` |
| `host_id` | The host |
| `track_id` | The host's chosen track |
| `current_race_id` | The room's current race |
| `status` | `open` or `closed` |
| `created_at`, `last_active_at` | A room closes after 2 hours without a race |

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
The look the player races in: either a collection item (`item_slug`) or one of the older plain marbles (`marble_id`), never both. With neither set, the player races in a plain starter.

### `marbles`, `user_marbles`
The older catalogue of plain marbles (free starters and "Originals") and who owns them. **Looks only:** the stat columns (`top_speed`, `acceleration`, `handling`, `luck`) are a historical record and are no longer read by races. `on_sale` and `price_coins` cover the plain marbles still for sale.

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
| `pass_product_id`, `pass_name`, `price_cents`, `currency` | The pass as a store product (`holiday-pass-2026`, $9.99): the same id on Stripe, Google Play and the App Store |
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
| `payment_id`, `provider` | The payment that bought it |
| `granted_at`, `revoked_at`, `revoke_reason` | |

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
