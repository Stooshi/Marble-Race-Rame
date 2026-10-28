'use strict';

/**
 * The back office's API. Every route here runs requireAdminSession first (an admin
 * account, the 2-step login, a session used in the last 30 minutes): the pages on
 * /admin only show what this API allows.
 *
 * Every support action takes a reason and is written to the audit log in the same
 * transaction as the change itself, with the admin, the player and what changed.
 *
 *   GET  /players?q=               search by name, email, id or a Marble ID
 *   GET  /players/:id              everything support needs about one player
 *   POST /players/:id/coins        { amount, reason }       add or take coins
 *   POST /players/:id/items        { item, action: 'grant'|'remove', reason }
 *   POST /players/:id/suspend      { reason }   /unsuspend { reason }
 *   POST /players/:id/name         { display_name, reason } (e.g. an offensive name)
 *   POST /players/:id/consent      { consent: false, reason } (the player asked to stop emails)
 *   POST /players/:id/delete       { reason } delete (anonymise) the account, as the player can in settings
 *   GET  /payments?q=              coin-pack orders   POST /payments/:id/refund { reason, amount_cents? }
 *   GET  /audit                    the audit log
 *   GET  /economy?days=30          the economy dashboard
 *   GET  /consents?reason=         players who agreed to news by email (CSV with format=csv; the export is audited)
 *   GET  /support?q=&status=&category=   the support inbox (contact-form messages), newest first, with counts by status
 *   GET  /support/:id              one message, its replies and its audit trail   GET /support/:id/screenshot  the image
 *   POST /support/:id/status       { status: 'new'|'open'|'done', reason? }   POST /support/:id/reply { text } (emailed when email is on)
 *   GET  /name-reports             reported names (open, by player; hidden names first, then most reporters) and
 *                                  existing names the filter would block
 *   POST /name-reports/:userId/resolve { action: 'restore'|'dismiss'|'keep-hidden'|'rename', reason }
 *   GET  /gift-codes?q=&tag=       gift codes, newest first, with a summary by tag (creator / campaign)
 *   POST /gift-codes               { kind: 'coins'|'pass', coins?, season_key?, max_uses, expires_at, tag, note?, code?, count?, reason }
 *                                  make one code, or `count` single-use codes → { codes: [...] }
 *   GET  /gift-codes/:id           one code and who redeemed it   POST /gift-codes/:id/disable { reason }
 */
const express = require('express');
const db = require('../db');
const { assertUuid, validate } = require('../utils/validate');
const { badRequest, conflict, notFound } = require('../utils/httpError');
const { requireAdminSession, router: sessionRouter } = require('../admin/session');
const economy = require('../economy');
const collection = require('../marbles/collection');
const { bySlug, normaliseId, byId } = require('../marbles/catalog');
const { IP_DAYS } = require('../security');
const paymentsSvc = require('../payments');
const account = require('../account');
const support = require('../support');
const giftCodes = require('../giftCodes');
const names = require('../names');
const seasons = require('../seasons');

const router = express.Router();
router.use('/session', sessionRouter);
router.use(requireAdminSession);
// (Never cached anywhere on the way.)
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const REASON = { type: 'string', required: true, min: 5, max: 500 };
const PAYMENT_COLUMNS = `p.id, p.order_no, p.provider, p.product_id, p.coins, p.amount_cents, upper(p.currency) AS currency, p.charged_cents,
  p.charged_currency, p.tax_cents, p.status, p.refunded_cents, p.receipt_url, p.payment_intent, p.provider_ref, p.store_consumed_at, p.consent_at, p.created_at, p.paid_at, p.refunded_at`;

const SUPPORT_LIST_COLUMNS = `s.id, s.ref, s.created_at, s.name, s.email, s.category, s.order_no, s.message, s.status, s.status_at,
  s.linked_by, s.user_id AS player_id, u.username AS player, u.is_guest AS player_guest, s.screenshot IS NOT NULL AS has_screenshot,
  (SELECT COUNT(*)::int FROM support_replies r WHERE r.message_id = s.id) AS replies`;

async function audit(client, req, action, targetUserId, reason, details = {}) {
  await client.query(
    'INSERT INTO admin_audit (admin_id, action, target_user_id, reason, details) VALUES ($1, $2, $3, $4, $5)',
    [req.admin.id, action, targetUserId, reason, JSON.stringify(details)],
  );
}

async function lockPlayer(client, id) {
  const { rows } = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [id]);
  if (!rows[0]) throw notFound('No such player');
  return rows[0];
}

/** GET /readiness?days= — which screens weren't ready by GO, and what they missed (src/readiness). */
router.get('/readiness', async (req, res) => {
  const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
  res.json(await require('../readiness').summary(db, { days }));
});

/** GET /players?q=&limit= */
router.get('/players', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const params = [];
  let where = 'TRUE';
  if (q) {
    // A Marble ID (SC105-000012) finds its owner too.
    const code = q.toUpperCase();
    params.push(`%${q}%`, q, code);
    where = `(u.username ILIKE $1 OR u.email ILIKE $1 OR u.display_name ILIKE $1 OR u.id::text = $2
              OR EXISTS (SELECT 1 FROM user_collection c WHERE c.user_id = u.id AND c.marble_code = $3))`;
  }
  params.push(limit);
  const { rows } = await db.query(
    `SELECT u.id, u.username, u.display_name, u.email, u.is_guest, u.role, u.coins, u.age_group, u.created_at, u.last_login_at, u.suspended_at, u.deleted_at,
            (SELECT COUNT(*)::int FROM race_entries e WHERE e.user_id = u.id) AS races
       FROM users u WHERE ${where}
      ORDER BY u.last_login_at DESC NULLS LAST, u.created_at DESC
      LIMIT $${params.length}`,
    params,
  );
  res.json({ players: rows });
});

/** GET /players/:id */
router.get('/players/:id', async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows: [player] } = await db.query(
    `SELECT id, username, display_name, email, is_guest, role, coins, coins_earned, coins_bought, skill, age_group,
            marketing_opt_in, created_at, last_login_at, suspended_at, deleted_at, streak_days
       FROM users WHERE id = $1`,
    [id],
  );
  if (!player) throw notFound('No such player');
  const [ledger, sums, races, items, originals, events, related, auditRows, consents, payments, races24h, messages] = await Promise.all([
    db.query('SELECT id, amount, kind, note, item_slug, race_id, actor_id, balance_after, created_at FROM coin_ledger WHERE user_id = $1 ORDER BY id DESC LIMIT 200', [id]),
    db.query('SELECT kind, COUNT(*)::int AS lines, SUM(amount)::int AS coins FROM coin_ledger WHERE user_id = $1 GROUP BY kind ORDER BY kind', [id]),
    db.query(
      `SELECT r.id, r.status, r.finished_at, t.name AS track, e.finish_position, e.coins_awarded, r.room_id IS NOT NULL AS room
         FROM race_entries e JOIN races r ON r.id = e.race_id JOIN tracks t ON t.id = r.track_id
        WHERE e.user_id = $1 ORDER BY r.created_at DESC LIMIT 50`,
      [id],
    ),
    db.query('SELECT item_slug, source, marble_code, price_paid, acquired_at FROM user_collection WHERE user_id = $1 ORDER BY acquired_at', [id]),
    db.query(
      `SELECT m.slug, m.name, m.is_starter FROM marbles m
        WHERE m.owner_id = $1 OR EXISTS (SELECT 1 FROM user_marbles um WHERE um.user_id = $1 AND um.marble_id = m.id) ORDER BY m.starter_no NULLS LAST, m.name`,
      [id],
    ),
    db.query('SELECT kind, host(ip) AS ip, country, created_at FROM security_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]),
    // Other accounts seen from the same addresses (coin farming with many accounts).
    db.query(
      `SELECT u.id, u.username, u.is_guest, u.created_at, COUNT(*)::int AS shared
         FROM security_events mine
         JOIN security_events other ON other.ip = mine.ip AND other.user_id <> mine.user_id
         JOIN users u ON u.id = other.user_id
        WHERE mine.user_id = $1 AND mine.ip IS NOT NULL
        GROUP BY u.id ORDER BY shared DESC LIMIT 20`,
      [id],
    ),
    db.query(
      `SELECT a.id, a.action, a.reason, a.details, a.created_at, adm.username AS admin
         FROM admin_audit a LEFT JOIN users adm ON adm.id = a.admin_id
        WHERE a.target_user_id = $1 ORDER BY a.created_at DESC LIMIT 100`,
      [id],
    ),
    db.query('SELECT consent, source, created_at FROM email_consents WHERE user_id = $1 ORDER BY created_at DESC', [id]),
    db.query(`SELECT ${PAYMENT_COLUMNS} FROM payments p WHERE p.user_id = $1 ORDER BY p.created_at DESC LIMIT 50`, [id]),
    db.query(`SELECT COUNT(*)::int AS n FROM race_entries e JOIN races r ON r.id = e.race_id WHERE e.user_id = $1 AND r.finished_at > now() - interval '24 hours'`, [id]),
    // Support messages: linked to the account, or sent from its email without a link.
    db.query(
      `SELECT ${SUPPORT_LIST_COLUMNS} FROM support_messages s LEFT JOIN users u ON u.id = s.user_id
        WHERE s.user_id = $1 OR (s.user_id IS NULL AND lower(s.email) = lower($2))
        ORDER BY s.created_at DESC LIMIT 100`,
      [id, player.email],
    ),
  ]);
  res.json({
    player,
    coins: { ledger: ledger.rows, byKind: sums.rows },
    races: { recent: races.rows, last24h: races24h.rows[0].n },
    marbles: { collection: items.rows, plain: originals.rows },
    security: { events: events.rows, sameAddress: related.rows, ipDays: IP_DAYS },
    consents: consents.rows,
    payments: payments.rows,
    audit: auditRows.rows,
    messages: messages.rows,
  });
});

/** POST /players/:id/coins { amount, reason } */
router.post('/players/:id/coins', async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { amount: { type: 'int', required: true, min: -1_000_000, max: 1_000_000 }, reason: REASON });
  if (body.amount === 0) throw badRequest('amount must not be 0');
  const out = await db.withTransaction(async (client) => {
    const p = await lockPlayer(client, id);
    const done = await economy.change(client, { userId: id, amount: body.amount, kind: 'admin', note: body.reason, actorId: req.admin.id });
    if (!done) throw conflict(`That would take the balance below 0 (it is ${p.coins})`);
    await audit(client, req, 'coins', id, body.reason, { amount: body.amount, before: p.coins, after: done.balance });
    return done;
  });
  res.json(out);
});

/** POST /players/:id/items { item, action, reason } — item: a slug or a Marble ID */
router.post('/players/:id/items', async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { item: { type: 'string', required: true, max: 64 }, action: { type: 'enum', values: ['grant', 'remove'], required: true }, reason: REASON });
  const slug = bySlug.has(body.item) ? body.item : byId.get(normaliseId(body.item))?.slug;
  if (!slug) throw badRequest('No marble with that name or ID');
  const out = await db.withTransaction(async (client) => {
    await lockPlayer(client, id);
    if (body.action === 'grant') {
      const copy = await collection.grantCopy(client, id, slug);
      await audit(client, req, 'item-grant', id, body.reason, { item: slug, marbleCode: copy.marble_code });
      return { copy };
    }
    const { rows } = await client.query('DELETE FROM user_collection WHERE user_id = $1 AND item_slug = $2 RETURNING marble_code, source, price_paid', [id, slug]);
    if (!rows[0]) throw notFound('The player does not own that marble');
    await client.query('DELETE FROM user_shooter WHERE user_id = $1 AND item_slug = $2', [id, slug]);
    await audit(client, req, 'item-remove', id, body.reason, { item: slug, ...rows[0] });
    return { removed: rows[0] };
  });
  res.json(out);
});

async function setSuspended(req, res, on) {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { reason: REASON });
  if (id === req.admin.id) throw badRequest('You cannot suspend yourself');
  await db.withTransaction(async (client) => {
    const p = await lockPlayer(client, id);
    if (Boolean(p.suspended_at) === on) throw conflict(on ? 'Already suspended' : 'Not suspended');
    await client.query(`UPDATE users SET suspended_at = ${on ? 'now()' : 'NULL'} WHERE id = $1`, [id]);
    await audit(client, req, on ? 'suspend' : 'unsuspend', id, body.reason);
  });
  res.json({ ok: true });
}
router.post('/players/:id/suspend', (req, res) => setSuspended(req, res, true));
router.post('/players/:id/unsuspend', (req, res) => setSuspended(req, res, false));

/** POST /players/:id/name { display_name, reason } */
router.post('/players/:id/name', async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { display_name: { type: 'string', max: 40, nullable: true }, reason: REASON });
  await db.withTransaction(async (client) => {
    const p = await lockPlayer(client, id);
    await client.query('UPDATE users SET display_name = $2 WHERE id = $1', [id, body.display_name || null]);
    await audit(client, req, 'name', id, body.reason, { before: p.display_name, after: body.display_name || null });
  });
  res.json({ ok: true });
});

/** POST /players/:id/consent { consent: false, reason } */
router.post('/players/:id/consent', async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { consent: { type: 'boolean', required: true }, reason: REASON });
  if (body.consent) throw badRequest('Only the player can say yes to emails (in their account); support can only turn them off');
  await db.withTransaction(async (client) => {
    await lockPlayer(client, id);
    await client.query('UPDATE users SET marketing_opt_in = false WHERE id = $1', [id]);
    await client.query(`INSERT INTO email_consents (user_id, consent, source) VALUES ($1, false, 'support')`, [id]);
    await audit(client, req, 'consent-off', id, body.reason);
  });
  res.json({ ok: true });
});

/** POST /players/:id/delete { reason } — delete (anonymise) an account the player asked support to delete. */
router.post('/players/:id/delete', async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { reason: REASON });
  if (id === req.admin.id) throw badRequest("You can't delete your own admin account here");
  const done = await db.withTransaction((client) => account.deleteAccount(client, id, { by: req.admin.id, reason: body.reason }));
  if (!done) throw notFound('No such player (or already deleted)');
  res.json(done);
});

/** GET /payments?q= — coin-pack orders, newest first; q: an order number, a player's name or e-mail. */
router.get('/payments', async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 100);
  const { rows } = await db.query(
    `SELECT ${PAYMENT_COLUMNS}, u.id AS player_id, u.username AS player,
            (SELECT COALESCE(sum(r.coins_short), 0)::int FROM payment_refunds r WHERE r.payment_id = p.id) AS coins_short
       FROM payments p JOIN users u ON u.id = p.user_id
      WHERE p.order_no IS NOT NULL AND ($1 = '' OR p.order_no ILIKE $1 OR u.username ILIKE $2 OR u.email ILIKE $2)
      ORDER BY p.created_at DESC LIMIT 200`,
    [q, q ? `%${q}%` : ''],
  );
  res.json({ payments: rows });
});

/**
 * POST /payments/:id/refund { reason, amount_cents? } — refund a coin pack (all, or part, in the
 * currency it was charged in). Stripe refunds the money; its refund event then takes the coins
 * back (ledger + audit). Test payments are refunded at once.
 */
router.post('/payments/:id/refund', async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { reason: REASON, amount_cents: { type: 'int', min: 1, max: 10_000_000 } });
  res.json(await paymentsSvc.refund(db, id, { amountCents: body.amount_cents ?? null, adminId: req.admin.id, reason: body.reason }));
});

/**
 * GET /support?q=&status=&category=&limit= — the support inbox, newest first. q: a name, email,
 * player name, order number, reference (S-1001) or words from the message.
 */
router.get('/support', async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 200);
  const status = support.STATUSES.includes(req.query.status) ? req.query.status : null;
  const category = support.settings.categories.includes(req.query.category) ? req.query.category : null;
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
  const params = [];
  const where = [];
  if (status) { params.push(status); where.push(`s.status = $${params.length}`); }
  if (category) { params.push(category); where.push(`s.category = $${params.length}`); }
  if (/^S-\d+$/i.test(q)) {
    // A message's reference (S-1001): that message only, never others that merely contain the text
    // (an order number MS-1001 holds "S-1001" too).
    params.push(q.toUpperCase());
    where.push(`s.ref = $${params.length}`);
  } else if (q) {
    params.push(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    const p = `$${params.length}`;
    where.push(`(s.name ILIKE ${p} OR s.email ILIKE ${p} OR s.message ILIKE ${p} OR s.order_no ILIKE ${p} OR s.ref ILIKE ${p} OR u.username ILIKE ${p})`);
  }
  params.push(limit);
  const [list, counts] = await Promise.all([
    db.query(
      `SELECT ${SUPPORT_LIST_COLUMNS} FROM support_messages s LEFT JOIN users u ON u.id = s.user_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY s.created_at DESC LIMIT $${params.length}`,
      params,
    ),
    db.query('SELECT status, COUNT(*)::int AS n FROM support_messages GROUP BY status'),
  ]);
  res.json({
    messages: list.rows,
    counts: Object.fromEntries(support.STATUSES.map((st) => [st, counts.rows.find((r) => r.status === st)?.n ?? 0])),
    categories: support.settings.categories,
  });
});

async function supportMessage(client, id) {
  const { rows: [m] } = await client.query(
    `SELECT ${SUPPORT_LIST_COLUMNS}, s.device, host(s.ip) AS ip, s.country, s.notified_at, s.screenshot_type
       FROM support_messages s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = $1`,
    [id],
  );
  if (!m) throw notFound('No such message');
  return m;
}

/** GET /support/:id — one message, its replies and every status change and reply in the audit log. */
router.get('/support/:id', async (req, res) => {
  const id = assertUuid(req.params.id);
  const message = await supportMessage(db, id);
  const [replies, trail] = await Promise.all([
    db.query(
      `SELECT r.id, r.body, r.created_at, r.emailed_at, a.username AS admin FROM support_replies r LEFT JOIN users a ON a.id = r.admin_id
        WHERE r.message_id = $1 ORDER BY r.created_at, r.id`,
      [id],
    ),
    db.query(
      `SELECT a.id, a.action, a.reason, a.details, a.created_at, adm.username AS admin
         FROM admin_audit a LEFT JOIN users adm ON adm.id = a.admin_id
        WHERE a.action LIKE 'support-%' AND a.details->>'message_id' = $1 ORDER BY a.created_at DESC, a.id DESC`,
      [id],
    ),
  ]);
  res.json({ message, replies: replies.rows, audit: trail.rows, emailOn: require('../email').enabled() });
});

/** GET /support/:id/screenshot — the image sent with the message. */
router.get('/support/:id/screenshot', async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows: [m] } = await db.query('SELECT screenshot, screenshot_type FROM support_messages WHERE id = $1', [id]);
  if (!m?.screenshot) throw notFound('No screenshot');
  res.set('Content-Type', m.screenshot_type).set('Content-Disposition', 'inline').set('Content-Security-Policy', "default-src 'none'");
  res.send(m.screenshot);
});

/** POST /support/:id/status { status, reason? } — New, Open or Done; written to the audit log. */
router.post('/support/:id/status', async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { status: { type: 'enum', required: true, values: support.STATUSES }, reason: { type: 'string', max: 500 } });
  const message = await db.withTransaction(async (client) => {
    const { rows: [m] } = await client.query('SELECT id, ref, user_id, status FROM support_messages WHERE id = $1 FOR UPDATE', [id]);
    if (!m) throw notFound('No such message');
    if (m.status !== body.status) {
      await client.query('UPDATE support_messages SET status = $2, status_at = now() WHERE id = $1', [id, body.status]);
      await audit(client, req, 'support-status', m.user_id, body.reason || `${m.ref}: ${m.status} → ${body.status}`,
        { message_id: id, ref: m.ref, from: m.status, to: body.status });
    }
    return supportMessage(client, id);
  });
  res.json({ message });
});

/** POST /support/:id/reply { text } — saved, emailed to the player when email is on, written to the audit log. */
router.post('/support/:id/reply', async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { text: { type: 'string', required: true, min: 2, max: 5000 } });
  const out = await db.withTransaction(async (client) => {
    const { rows: [before] } = await client.query('SELECT status FROM support_messages WHERE id = $1', [id]);
    const done = await support.reply(client, { messageId: id, adminId: req.admin.id, body: body.text });
    if (!done) throw notFound('No such message');
    const { rows: [m] } = await client.query('SELECT user_id FROM support_messages WHERE id = $1', [id]);
    if (before.status === 'new') {
      await audit(client, req, 'support-status', m.user_id, `${done.message.ref}: new → open (replied)`, { message_id: id, ref: done.message.ref, from: 'new', to: 'open' });
    }
    await audit(client, req, 'support-reply', m.user_id, `Reply to ${done.message.ref}${done.emailed ? ' (emailed)' : ' (not emailed: email is off)'}`,
      { message_id: id, ref: done.message.ref, reply_id: done.reply.id, emailed: done.emailed, ...(done.emailError && { email_error: done.emailError }), text: body.text });
    return { reply: done.reply, emailed: done.emailed, emailError: done.emailError, message: await supportMessage(client, id) };
  });
  res.json(out);
});

/** GET /audit?limit=&action= */
router.get('/audit', async (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const { rows } = await db.query(
    `SELECT a.id, a.action, a.reason, a.details, a.created_at, adm.username AS admin, u.id AS player_id, u.username AS player
       FROM admin_audit a LEFT JOIN users adm ON adm.id = a.admin_id LEFT JOIN users u ON u.id = a.target_user_id
      ORDER BY a.created_at DESC LIMIT $1`,
    [limit],
  );
  res.json({ entries: rows });
});

/** GET /economy?days=30 */
router.get('/economy', async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  const [daily, totals, players, sales, packs, farming, earners] = await Promise.all([
    db.query(
      `SELECT to_char(d, 'YYYY-MM-DD') AS day,
              COALESCE(SUM(l.amount) FILTER (WHERE l.kind IN ('race', 'finish-bonus', 'daily-goal')), 0)::int AS earned,
              COALESCE(SUM(l.amount) FILTER (WHERE l.kind = 'coin-pack'), 0)::int AS bought,
              COALESCE(SUM(l.amount) FILTER (WHERE l.kind = 'gift-code'), 0)::int AS gifted,
              COALESCE(-SUM(l.amount) FILTER (WHERE l.kind IN ('purchase', 'bag', 'entry-fee') AND l.amount < 0), 0)::int AS spent,
              COALESCE(-SUM(l.amount) FILTER (WHERE l.kind = 'pack-refund'), 0)::int AS refunded,
              COALESCE(SUM(l.amount) FILTER (WHERE l.kind = 'admin'), 0)::int AS support,
              (SELECT COUNT(*)::int FROM races r WHERE r.status = 'finished' AND r.finished_at::date = d::date) AS races,
              (SELECT COUNT(DISTINCT e.user_id)::int FROM race_entries e JOIN races r ON r.id = e.race_id
                WHERE e.user_id IS NOT NULL AND r.finished_at::date = d::date) AS players,
              (SELECT COUNT(*)::int FROM users u WHERE u.created_at::date = d::date) AS new_accounts
         FROM generate_series(current_date - ($1::int - 1), current_date, interval '1 day') d
         LEFT JOIN coin_ledger l ON l.created_at::date = d::date
        GROUP BY d ORDER BY d`,
      [days],
    ),
    db.query(`SELECT SUM(coins)::bigint AS in_circulation, SUM(coins_earned)::bigint AS earned_ever, SUM(coins_bought)::bigint AS bought_ever FROM users`),
    db.query(
      `SELECT COUNT(*)::int AS accounts, COUNT(*) FILTER (WHERE NOT is_guest)::int AS saved, COUNT(*) FILTER (WHERE is_guest)::int AS guests,
              COUNT(*) FILTER (WHERE marketing_opt_in)::int AS email_ok, COUNT(*) FILTER (WHERE suspended_at IS NOT NULL)::int AS suspended,
              COUNT(*) FILTER (WHERE age_group = 'under-13')::int AS under_13, COUNT(*) FILTER (WHERE age_group = '13-17')::int AS age_13_17,
              COUNT(*) FILTER (WHERE age_group = '18+')::int AS adults
         FROM users`,
    ),
    db.query(
      `SELECT item_slug, COUNT(*)::int AS copies, SUM(price_paid)::int AS coins
         FROM user_collection WHERE source = 'purchase' AND acquired_at > now() - make_interval(days => $1)
        GROUP BY item_slug ORDER BY copies DESC`,
      [days],
    ),
    db.query(
      `SELECT product_id, provider, COUNT(*)::int AS paid, SUM(amount_cents)::int AS cents, currency
         FROM payments WHERE status = 'paid' AND paid_at > now() - make_interval(days => $1)
        GROUP BY product_id, provider, currency ORDER BY cents DESC`,
      [days],
    ),
    // Possible coin farming: one address making or using many accounts in the last week.
    db.query(
      `SELECT host(ip) AS ip, MAX(country) AS country, COUNT(DISTINCT user_id)::int AS accounts, MAX(created_at) AS last_seen
         FROM security_events WHERE ip IS NOT NULL AND created_at > now() - interval '7 days'
        GROUP BY ip HAVING COUNT(DISTINCT user_id) >= 3 ORDER BY accounts DESC LIMIT 20`,
    ),
    db.query(
      `SELECT u.id, u.username, u.is_guest, SUM(l.amount)::int AS earned
         FROM coin_ledger l JOIN users u ON u.id = l.user_id
        WHERE l.kind IN ('race', 'finish-bonus', 'daily-goal') AND l.created_at > now() - interval '7 days'
        GROUP BY u.id ORDER BY earned DESC LIMIT 10`,
    ),
  ]);
  const item = (slug) => bySlug.get(slug);
  res.json({
    days,
    daily: daily.rows,
    totals: totals.rows[0],
    players: players.rows[0],
    sales: sales.rows.map((r) => ({ ...r, name: item(r.item_slug) ? `${item(r.item_slug).design.name} · ${item(r.item_slug).shade.name}` : r.item_slug, rarity: item(r.item_slug)?.design.rarity ?? null })),
    coinPacks: packs.rows,
    possibleFarming: farming.rows,
    topEarners7d: earners.rows,
  });
});

// ── Name reports (src/names) ──────────────────────────────────────────────

/**
 * GET /name-reports — open reports grouped by player, hidden names first (auto-hidden after reports,
 * src/names: `hidden`, `hidden_name`, `hidden_at`, and `changed` once the player chose a new one), and
 * names already taken that the filter blocks.
 */
router.get('/name-reports', async (req, res) => {
  const { rows: open } = await db.query(
    `SELECT u.id AS player_id, u.username, u.display_name, u.is_guest, u.suspended_at,
            u.name_hidden_at IS NOT NULL AS hidden, u.name_hidden_name AS hidden_name, u.name_hidden_at AS hidden_at,
            (u.name_hidden_name IS NOT NULL AND u.name_hidden_at IS NULL) AS changed,
            COUNT(*)::int AS reports, COUNT(DISTINCT r.reporter_id)::int AS reporters,
            COUNT(DISTINCT COALESCE(r.reporter_ip_hash, r.reporter_id::text))::int AS addresses,
            MIN(r.created_at) AS first_at, MAX(r.created_at) AS last_at,
            array_agg(DISTINCT r.place) AS places, array_agg(DISTINCT r.name_shown) AS names_shown
       FROM name_reports r JOIN users u ON u.id = r.reported_user_id
      WHERE r.resolved_at IS NULL AND u.deleted_at IS NULL
      GROUP BY u.id
      ORDER BY (u.name_hidden_at IS NOT NULL) DESC, (u.name_hidden_name IS NOT NULL) DESC, reporters DESC, last_at DESC LIMIT 300`,
  );
  const { rows: done } = await db.query(
    `SELECT r.reported_user_id AS player_id, u.username, r.resolution, MAX(r.resolved_at) AS resolved_at, COUNT(*)::int AS reports
       FROM name_reports r JOIN users u ON u.id = r.reported_user_id
      WHERE r.resolved_at > now() - interval '30 days'
      GROUP BY r.reported_user_id, u.username, r.resolution ORDER BY resolved_at DESC LIMIT 100`,
  );
  // Names taken before the filter existed (or by an admin): checked here, newest accounts first.
  const { rows: all } = await db.query(
    `SELECT id, username, display_name, is_guest, created_at FROM users
      WHERE deleted_at IS NULL AND (NOT is_guest OR display_name IS NOT NULL) ORDER BY created_at DESC LIMIT 20000`,
  );
  const flagged = [];
  for (const u of all) {
    const hit = (u.is_guest ? null : await names.check(u.username)) || (u.display_name ? await names.check(u.display_name) : null);
    if (hit) flagged.push({ player_id: u.id, username: u.username, display_name: u.display_name, is_guest: u.is_guest, word: hit.word, lang: hit.lang });
    if (flagged.length >= 200) break;
  }
  res.json({ open, resolved: done, flagged });
});

/**
 * POST /name-reports/:userId/resolve { action, reason } — the open reports are closed, in the audit log:
 *   'restore' (or 'dismiss'): the name is fine. A hidden name comes back (unless the player has chosen
 *     a new one since); the reports are dismissed, so it takes 3 new reports to hide it again.
 *   'keep-hidden': the name stays hidden (the player still chooses a new one); closed as renamed.
 *   'rename': the account gets a neutral player name (PlayerNNNN; a guest keeps guest_<number>), the
 *     shown name cleared; closed as renamed.
 */
router.post('/name-reports/:userId/resolve', async (req, res) => {
  const id = assertUuid(req.params.userId);
  const body = validate(req.body, { action: { type: 'enum', values: ['restore', 'dismiss', 'keep-hidden', 'rename'], required: true }, reason: REASON });
  const action = body.action === 'dismiss' ? 'restore' : body.action;
  const out = await db.withTransaction(async (client) => {
    const p = await lockPlayer(client, id);
    let after = null;
    if (action === 'rename') {
      after = { username: p.is_guest ? p.username : await names.neutralName(client), display_name: null };
      await client.query('UPDATE users SET username = $2, display_name = NULL, name_hidden_at = NULL, name_hidden_name = NULL, updated_at = now() WHERE id = $1', [id, after.username]);
    } else if (action === 'restore' && p.name_hidden_name) {
      // (The hidden name back: as the shown name, or none if it was the player name itself.)
      const back = p.name_hidden_at ? (p.name_hidden_name.toLowerCase() === String(p.username).toLowerCase() ? null : p.name_hidden_name) : p.display_name;
      after = { username: p.username, display_name: back };
      await client.query('UPDATE users SET display_name = $2, name_hidden_at = NULL, name_hidden_name = NULL, updated_at = now() WHERE id = $1', [id, back]);
    }
    const { rowCount } = await client.query(
      `UPDATE name_reports SET resolved_at = now(), resolved_by = $2, resolution = $3 WHERE reported_user_id = $1 AND resolved_at IS NULL`,
      [id, req.admin.id, action === 'restore' ? 'dismissed' : 'renamed'],
    );
    const auditAction = { rename: 'name-reset', restore: 'name-reports-dismissed', 'keep-hidden': 'name-kept-hidden' }[action];
    await audit(client, req, auditAction, id, body.reason, { before: { username: p.username, display_name: p.display_name, hidden_name: p.name_hidden_name, hidden: Boolean(p.name_hidden_at) }, after: after ?? undefined, reports: rowCount });
    return { player_id: id, username: after?.username ?? p.username, display_name: after ? after.display_name : p.display_name, hidden: action === 'keep-hidden' ? Boolean(p.name_hidden_at) : false, closed: rowCount };
  });
  res.json(out);
});

// ── Gift codes (src/giftCodes) ────────────────────────────────────────────

const codeRow = (c) => ({ ...c, code: giftCodes.display(c.code), state: giftCodes.stateOf(c) });

/** GET /gift-codes?q=&tag= — q: a code or words from its tag or note. */
router.get('/gift-codes', async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 64);
  const tag = String(req.query.tag ?? '').trim().slice(0, 64);
  const [codes, tags] = await Promise.all([
    db.query(
      `SELECT g.*, s.name AS season_name, a.username AS created_by_name
         FROM gift_codes g LEFT JOIN seasons s ON s.key = g.season_key LEFT JOIN users a ON a.id = g.created_by
        WHERE ($1 = '' OR g.code = $2 OR g.tag ILIKE $3 OR g.note ILIKE $3) AND ($4 = '' OR g.tag = $4)
        ORDER BY g.created_at DESC, g.code LIMIT 500`,
      [q, giftCodes.normalise(q), `%${q}%`, tag],
    ),
    db.query(
      `SELECT g.tag, COUNT(*)::int AS codes, COALESCE(SUM(g.uses), 0)::int AS redemptions,
              COALESCE(SUM(g.uses * g.coins) FILTER (WHERE g.kind = 'coins'), 0)::int AS coins_given,
              COALESCE(SUM(g.uses) FILTER (WHERE g.kind = 'pass'), 0)::int AS passes_given, MAX(g.created_at) AS last_made
         FROM gift_codes g GROUP BY g.tag ORDER BY last_made DESC LIMIT 200`,
    ),
  ]);
  // (The seasons a pass code can be made for: with a pass, not yet ended.)
  const seasonList = (await seasons.all(db)).filter((x) => x.pass_product_id && seasons.stateOf(x) !== 'free').map((x) => ({ key: x.key, name: x.name, startsAt: x.starts_at, freeFrom: x.free_from }));
  res.json({ enabled: giftCodes.enabled(), codes: codes.rows.map(codeRow), tags: tags.rows, seasons: seasonList });
});

/** POST /gift-codes — make a code, or a batch of single-use codes. */
router.post('/gift-codes', async (req, res) => {
  const body = validate(req.body, {
    kind: { type: 'enum', values: ['coins', 'pass'], required: true },
    coins: { type: 'int', min: 1, max: 1_000_000 },
    season_key: { type: 'string', max: 32 },
    max_uses: { type: 'int', required: true, min: 1, max: 1_000_000 },
    expires_at: { type: 'string', required: true, max: 40 },
    tag: { type: 'string', required: true, min: 2, max: 64 },
    note: { type: 'string', max: 500 },
    code: { type: 'string', max: 40 },
    count: { type: 'int', min: 1, max: 10_000 },
    reason: REASON,
  });
  const made = await db.withTransaction(async (client) => {
    const rows = await giftCodes.create(client, {
      kind: body.kind, coins: body.coins ?? null, seasonKey: body.season_key ?? null, maxUses: body.max_uses, expiresAt: body.expires_at,
      tag: body.tag, note: body.note ?? null, code: body.code ?? null, count: body.count ?? 1, adminId: req.admin.id,
    });
    await audit(client, req, 'gift-codes-create', null, body.reason, {
      count: rows.length, kind: body.kind, coins: body.coins ?? null, season: body.season_key ?? null, max_uses: body.max_uses,
      expires_at: rows[0].expires_at, tag: body.tag, batch_id: rows[0].batch_id, codes: rows.length <= 20 ? rows.map((r) => giftCodes.display(r.code)) : undefined,
    });
    return rows;
  });
  res.status(201).json({ codes: made.map(codeRow) });
});

/** GET /gift-codes/:id — a code and its redemptions. */
router.get('/gift-codes/:id', async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows: [c] } = await db.query(
    `SELECT g.*, s.name AS season_name, a.username AS created_by_name FROM gift_codes g
       LEFT JOIN seasons s ON s.key = g.season_key LEFT JOIN users a ON a.id = g.created_by WHERE g.id = $1`,
    [id],
  );
  if (!c) throw notFound('No such code');
  const { rows: redemptions } = await db.query(
    `SELECT r.redeemed_at, r.coins, r.season_pass_id, p.revoked_at AS pass_revoked_at, u.id AS player_id, u.username AS player
       FROM gift_code_redemptions r JOIN users u ON u.id = r.user_id LEFT JOIN season_passes p ON p.id = r.season_pass_id
      WHERE r.code_id = $1 ORDER BY r.redeemed_at DESC LIMIT 1000`,
    [id],
  );
  res.json({ code: codeRow(c), redemptions });
});

/** POST /gift-codes/:id/disable { reason } — no more redemptions (what was redeemed stays). */
router.post('/gift-codes/:id/disable', async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { reason: REASON });
  const out = await db.withTransaction(async (client) => {
    const { rows: [c] } = await client.query(
      'UPDATE gift_codes SET disabled_at = now(), disabled_by = $2 WHERE id = $1 AND disabled_at IS NULL RETURNING *',
      [id, req.admin.id],
    );
    if (!c) throw conflict('No such code, or already switched off');
    await audit(client, req, 'gift-code-disable', null, body.reason, { code: giftCodes.display(c.code), tag: c.tag, uses: c.uses });
    return c;
  });
  res.json({ code: codeRow(out) });
});

/** GET /consents?reason=&format=csv — the email list (who agreed, when); the export itself is audited. */
router.get('/consents', async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.email, u.username, u.display_name, u.age_group,
            (SELECT MAX(c.created_at) FROM email_consents c WHERE c.user_id = u.id AND c.consent) AS since
       FROM users u
      -- (Under 13: no email consent of their own; the parent rule is still a placeholder.)
      WHERE u.marketing_opt_in AND NOT u.is_guest AND u.suspended_at IS NULL AND u.age_group IS DISTINCT FROM 'under-13'
      ORDER BY since DESC NULLS LAST`,
  );
  if (req.query.format !== 'csv') return res.json({ count: rows.length, players: rows.slice(0, 200) });
  const reason = String(req.query.reason ?? '').trim();
  if (reason.length < 5) throw badRequest('Give a reason for the export (at least 5 characters)');
  await audit(db, req, 'consent-export', null, reason, { count: rows.length });
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="email-consents-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(['email,username,name,age_group,consent_since', ...rows.map((r) => [r.email, r.username, r.display_name, r.age_group, r.since?.toISOString?.() ?? r.since].map(cell).join(','))].join('\n'));
});

module.exports = router;
