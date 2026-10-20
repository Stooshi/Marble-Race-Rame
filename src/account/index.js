'use strict';

/**
 * The player's own data rights (GDPR; Apple and Google require in-app deletion too).
 *
 *   exportData(userId)        everything stored about the player, as one JSON document
 *   deleteAccount(client, …)  deletes the account by anonymising it:
 *     - the person is removed: name, email, password, shown name, picture, settings, age group,
 *       email answers, IP addresses (security log), support messages (with their replies) and admin
 *       logins are wiped or deleted; the
 *       marble's own label is cleared; rooms they host are closed; every login stops at once;
 *     - what isn't about the person stays, under a name like deleted_3f2a91c07b4e: race results
 *       (other players' places must never change), marble IDs and certificates (serial numbers
 *       stay unique), the coin ledger and payment records (kept for bookkeeping, as the law requires);
 *     - the back office's audit log records that it happened (no reason text from the player).
 */
const crypto = require('crypto');

const ANON_PREFIX = 'deleted_';

const anonName = (userId) => `${ANON_PREFIX}${userId.replace(/-/g, '').slice(0, 12)}`;

/** Everything stored about a player (passwords and secrets excepted), for "Download my data". */
async function exportData(db, userId) {
  const one = async (sql) => (await db.query(sql, [userId])).rows[0] ?? null;
  const all = async (sql) => (await db.query(sql, [userId])).rows;
  const account = await one(
    `SELECT id, username, email, display_name, avatar_url, role, is_guest, age_group, to_char(birth_month, 'YYYY-MM') AS birth_year_month, email_verified_at, marketing_opt_in, coins, coins_earned,
            coins_bought, skill, streak_days, streak_last_day, settings, created_at, updated_at, last_login_at, suspended_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
  );
  if (!account) return null;
  const [stats, emailAnswers, cookieAnswers, ledger, collection, shooter, look, startingMarbles, races, days, payments, rooms, security, support, supportReplies, passes, badges, passReminders] = await Promise.all([
    one('SELECT * FROM user_stats WHERE user_id = $1'),
    all('SELECT consent, source, created_at FROM email_consents WHERE user_id = $1 ORDER BY created_at'),
    all('SELECT version, statistics, marketing, decided_at FROM cookie_consents WHERE user_id = $1 ORDER BY created_at'),
    all('SELECT created_at, amount, kind, balance_after, item_slug, race_id, note FROM coin_ledger WHERE user_id = $1 ORDER BY id'),
    all('SELECT item_slug, marble_code, source, copy_no, gift_no, edition_no, price_paid, currency, acquired_at FROM user_collection WHERE user_id = $1 ORDER BY acquired_at'),
    one('SELECT item_slug, marble_id, updated_at FROM user_shooter WHERE user_id = $1'),
    one('SELECT color_key, surface_key, effect_key, label, updated_at FROM marble_appearances WHERE user_id = $1'),
    all(`SELECT m.name, m.marble_code, m.starter_no, um.is_favorite, coalesce(um.acquired_at, m.created_at) AS acquired_at
           FROM marbles m LEFT JOIN user_marbles um ON um.marble_id = m.id AND um.user_id = $1
          WHERE m.owner_id = $1 OR um.user_id IS NOT NULL ORDER BY m.starter_no NULLS LAST, m.name`),
    all(`SELECT r.id AS race_id, t.name AS track, r.finished_at, e.finish_position, e.finish_time_ms, e.coins_awarded, r.room_id IS NOT NULL AS friend_room
           FROM race_entries e JOIN races r ON r.id = e.race_id LEFT JOIN tracks t ON t.id = r.track_id
          WHERE e.user_id = $1 ORDER BY r.created_at`),
    all('SELECT day, races, goal_met_at FROM user_days WHERE user_id = $1 ORDER BY day'),
    all(`SELECT order_no, provider, product_id, season_key, coins, amount_cents, currency, charged_cents, charged_currency, tax_cents, status,
                refunded_cents, consent_at, consent_text, receipt_url, created_at, paid_at, refunded_at
           FROM payments WHERE user_id = $1 ORDER BY created_at`),
    all('SELECT code, status, created_at, last_active_at FROM rooms WHERE host_id = $1 ORDER BY created_at'),
    all('SELECT kind, host(ip) AS ip, country, created_at FROM security_events WHERE user_id = $1 ORDER BY created_at'),
    all(`SELECT ref, created_at, name, email, category, order_no, message, screenshot IS NOT NULL AS screenshot_attached, device, status,
                host(ip) AS ip, country
           FROM support_messages WHERE user_id = $1 ORDER BY created_at`),
    all(`SELECT m.ref, r.body, r.created_at, r.emailed_at FROM support_replies r JOIN support_messages m ON m.id = r.message_id
          WHERE m.user_id = $1 ORDER BY r.created_at`),
    all('SELECT season_key, provider, granted_at, revoked_at, revoke_reason FROM season_passes WHERE user_id = $1 ORDER BY granted_at'),
    all('SELECT badge_key, rank, awarded_at FROM user_badges WHERE user_id = $1 ORDER BY awarded_at'),
    all(`SELECT season_key, email_wanted, consent_text, created_at, sent_at, cancelled_at FROM pass_reminders WHERE user_id = $1
          UNION ALL
         SELECT r.season_key, r.email_wanted, r.consent_text, r.created_at, r.sent_at, r.cancelled_at FROM pass_reminders r
          WHERE r.user_id IS NULL AND lower(r.email) = (SELECT lower(email) FROM users WHERE id = $1 AND NOT is_guest)
          ORDER BY created_at`),
  ]);
  return {
    about: 'Everything Marble Spins stores about your account. Passwords are stored only as a one-way hash and are not included. IP addresses are kept for security and fraud checks for at most 90 days, then only the country.',
    exportedAt: new Date().toISOString(),
    account,
    stats,
    newsByEmail: emailAnswers,
    cookieChoices: cookieAnswers,
    coinLedger: ledger,
    marbles: { collection, shooter, look, startingMarbles },
    races,
    dailyRaces: days,
    payments,
    seasonPasses: passes,
    passReminders,
    badges,
    friendRoomsHosted: rooms,
    securityLog: security,
    supportMessages: support.map((m) => ({ ...m, replies: supportReplies.filter((r) => r.ref === m.ref).map(({ ref: _r, ...r }) => r) })),
  };
}

/**
 * Deletes (anonymises) an account, inside the caller's transaction. `by`: 'player' or an admin's id.
 * → { username } the anonymous name, or null if there was no such (live) account.
 */
async function deleteAccount(client, userId, { by = 'player', reason = null } = {}) {
  const { rows: [user] } = await client.query('SELECT id, role FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE', [userId]);
  if (!user) return null;
  const name = anonName(userId);
  // Support messages: the player's own, and any sent from their email without an account link.
  await client.query(
    `DELETE FROM support_messages WHERE user_id = $1
        OR (user_id IS NULL AND lower(email) = (SELECT lower(email) FROM users WHERE id = $1 AND NOT is_guest))`,
    [userId],
  );
  // Pass reminders: the player's own, and any a visitor asked for at the account's email (before the email is wiped below).
  await client.query(
    `DELETE FROM pass_reminders WHERE user_id = $1
        OR (user_id IS NULL AND lower(email) = (SELECT lower(email) FROM users WHERE id = $1 AND NOT is_guest))`,
    [userId],
  );
  const unusable = `!deleted:${crypto.randomBytes(16).toString('hex')}`; // (no password can ever match)
  await client.query(
    `UPDATE users SET username = $2, email = $3, password_hash = $4, display_name = NULL, avatar_url = NULL,
            settings = '{}'::jsonb, age_group = NULL, birth_month = NULL, email_verified_at = NULL, marketing_opt_in = false, last_login_at = NULL,
            role = 'player', store_account_id = NULL, apple_account_token = NULL, deleted_at = now(), updated_at = now()
      WHERE id = $1`,
    [userId, name, `${name}@deleted.invalid`, unusable],
  );
  await client.query('DELETE FROM email_consents WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM cookie_consents WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM security_events WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM admin_sessions WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM admin_2fa WHERE user_id = $1', [userId]);
  await client.query('UPDATE marble_appearances SET label = NULL WHERE user_id = $1', [userId]);
  await client.query(`UPDATE rooms SET status = 'closed' WHERE host_id = $1 AND status = 'open'`, [userId]);
  await client.query(
    'INSERT INTO admin_audit (admin_id, action, target_user_id, reason, details) VALUES ($1, $2, $3, $4, $5)',
    [by === 'player' ? null : by, 'account-deleted', userId, by === 'player' ? 'Deleted by the player in settings' : reason || 'Deleted in the back office', JSON.stringify({ anonymised_as: name })],
  );
  return { username: name };
}

module.exports = { exportData, deleteAccount, anonName };
