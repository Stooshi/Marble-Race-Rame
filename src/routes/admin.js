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

const router = express.Router();
router.use('/session', sessionRouter);
router.use(requireAdminSession);
// (Never cached anywhere on the way.)
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const REASON = { type: 'string', required: true, min: 5, max: 500 };
const PAYMENT_COLUMNS = `p.id, p.order_no, p.provider, p.product_id, p.coins, p.amount_cents, upper(p.currency) AS currency, p.charged_cents,
  p.charged_currency, p.tax_cents, p.status, p.refunded_cents, p.receipt_url, p.payment_intent, p.consent_at, p.created_at, p.paid_at, p.refunded_at`;

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
  const [ledger, sums, races, items, originals, events, related, auditRows, consents, payments, races24h] = await Promise.all([
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
        WHERE m.is_starter OR EXISTS (SELECT 1 FROM user_marbles um WHERE um.user_id = $1 AND um.marble_id = m.id) ORDER BY m.name`,
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
