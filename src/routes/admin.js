'use strict';

/**
 * The back office's API. Every route here runs requireAdminSession first (an admin
 * account, the 2-step login, a session used in the last 30 minutes): the pages on
 * /admin only show what this API allows.
 *
 * Every support action takes a reason and is written to the audit log in the same
 * transaction as the change itself, with the admin, the player and what changed.
 *
 *   GET  /dashboard?period=        read-only numbers for a period (Swedish time), staff left out
 *   GET  /players?q=               search by name, email, id or a Marble ID
 *   GET  /players/:id              everything support needs about one player (no IP addresses)
 *   GET  /players/:id/security     its security events with IP addresses; each opening audited ('security-view')
 *   POST /players/:id/coins        { amount, reason }       add or take coins
 *   POST /players/:id/items        { item, action: 'grant'|'remove', reason }
 *   POST /players/:id/staff        { staff, reason } staff play normally; the Dashboard leaves them out
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
 *   GET  /today                    the CRM start page's cards: today's sales, new players, sign-ups, open support,
 *                                  and (payments:read) the latest purchases
 *   GET  /tracks                   every track: on or off, pack, free, season, wildness, races in the last 7 days
 *   POST /tracks/:slug/active      { active, reason } switch a track on or off for every player (tracks:switch, audited)
 */
const express = require('express');
const db = require('../db');
const devices = require('../devices');
const { assertUuid, validate } = require('../utils/validate');
const { badRequest, conflict, notFound } = require('../utils/httpError');
const { requireAdminSession, router: sessionRouter } = require('../admin/session');
const { need } = require('../admin/permissions');
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
  p.charged_currency, p.tax_cents, p.status, p.refunded_cents, p.receipt_url, p.payment_intent, p.provider_ref, p.store_consumed_at, p.consent_at, p.created_at, p.paid_at, p.refunded_at,
  (p.is_test OR p.provider = 'test' OR (p.provider = 'stripe' AND p.stripe_session_id LIKE 'cs\\_test\\_%')) AS test`;

const SUPPORT_LIST_COLUMNS = `s.id, s.ref, s.created_at, s.name, s.email, s.category, s.order_no, s.message, s.status, s.status_at,
  s.linked_by, s.user_id AS player_id, u.username AS player, u.is_guest AS player_guest, s.screenshot IS NOT NULL AS has_screenshot,
  (SELECT COUNT(*)::int FROM support_replies r WHERE r.message_id = s.id) AS replies,
  COALESCE(s.stage, CASE s.status WHEN 'done' THEN 'closed' ELSE s.status END) AS stage, COALESCE(s.stage_at, s.status_at) AS stage_at,
  s.assigned_to, (SELECT x.username FROM users x WHERE x.id = s.assigned_to) AS assigned`;

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

/** GET /dashboard?period=6h|24h|7d|30d|mtd|lastmonth — read-only numbers, staff left out (src/admin/dashboard). */
router.get('/dashboard', need('reports:read'), async (req, res) => {
  res.json(await require('../admin/dashboard').summary(db, String(req.query.period ?? '24h')));
});

/**
 * GET /today — the CRM start page (Moses, 17 Nov 2026): today in Swedish time. Sales: purchases paid today (test
 * orders left out) per charged currency, refunds taken off; new players (new guests) and sign-ups (new saved
 * accounts), staff left out as on the Dashboard; open support messages (new or open). The latest purchases (who
 * bought what) only for a role that may see payments.
 */
router.get('/today', need('reports:read'), async (req, res) => {
  const { DAY_START, COUNTED } = require('../admin/dashboard');
  const { can } = require('../admin/permissions');
  const [sales, players, support, latest] = await Promise.all([
    db.query(`SELECT upper(COALESCE(charged_currency, currency)) AS currency, COUNT(*)::int AS purchases,
                     SUM(COALESCE(charged_cents, amount_cents) - COALESCE(refunded_cents, 0))::int AS cents
                FROM payments WHERE status IN ('paid', 'refunded') AND paid_at >= ${DAY_START} AND NOT ${paymentsSvc.TEST_ORDER}
               GROUP BY 1 ORDER BY 3 DESC`),
    db.query(`SELECT
                (SELECT COUNT(DISTINCT e.user_id)::int FROM security_events e JOIN users u ON u.id = e.user_id
                  WHERE e.kind = 'guest' AND e.created_at >= ${DAY_START} AND ${COUNTED}) AS new_players,
                (SELECT COUNT(*)::int FROM (SELECT e.user_id, MIN(e.created_at) AS at FROM security_events e
                  WHERE e.kind IN ('signup', 'claim') GROUP BY e.user_id) s JOIN users u ON u.id = s.user_id
                  WHERE s.at >= ${DAY_START} AND ${COUNTED}) AS sign_ups`),
    db.query(`SELECT COUNT(*)::int AS n FROM support_messages s
               WHERE COALESCE(s.stage, CASE s.status WHEN 'done' THEN 'closed' ELSE s.status END) IN ('new', 'open')`),
    can(req.admin, 'payments:read')
      ? db.query(`SELECT p.id, p.order_no, p.provider, p.product_id, p.status, upper(COALESCE(p.charged_currency, p.currency)) AS currency,
                         COALESCE(p.charged_cents, p.amount_cents) AS cents, p.refunded_cents, p.paid_at, u.id AS player_id, u.username AS player
                    FROM payments p JOIN users u ON u.id = p.user_id
                   WHERE p.status IN ('paid', 'refunded') AND NOT ${paymentsSvc.TEST_ORDER} ORDER BY p.paid_at DESC NULLS LAST LIMIT 8`)
      : null,
  ]);
  res.json({
    sales: sales.rows,
    newPlayers: players.rows[0].new_players,
    signUps: players.rows[0].sign_ups,
    openSupport: support.rows[0].n,
    latest: latest?.rows ?? null,
  });
});

/**
 * GET /tracks — every track for the CRM's Races & tracks (Moses, 17 Nov 2026): on or off, its pack and whether
 * it's free, its season, wildness, and its races in the last 7 days. `built`: the server can run it: an original
 * track (its route in the database, no `physics`), or a built track whose code this server has (only then can it
 * be switched on).
 */
router.get('/tracks', need('reports:read'), async (_req, res) => {
  const { physicsTrack } = require('../game/physicsTracks');
  const { rows } = await db.query(`
    SELECT t.slug, t.name, t.is_active, t.physics IS NOT NULL AS kit, t.is_free, t.pack_key, p.name AS pack, t.season_key, t.wildness, t.wildness_score, t.created_at,
           (SELECT COUNT(*)::int FROM races r WHERE r.track_id = t.id AND r.status = 'finished' AND r.finished_at > now() - interval '7 days') AS races_7d
      FROM tracks t LEFT JOIN track_packs p ON p.key = t.pack_key
     ORDER BY t.is_active DESC, p.name NULLS FIRST, t.name`);
  res.json({ tracks: rows.map(({ kit, ...t }) => ({ ...t, built: !kit || Boolean(physicsTrack(t.slug)) })) });
});

/**
 * POST /tracks/:slug/active { active, reason } — a track on or off for every player (tracks:switch: the owner),
 * written to the audit log with the change. On: only a track the server has the code for. The website's track
 * pages and counts follow with its next build (Vercel), the race picker and packs at once.
 */
router.post('/tracks/:slug/active', need('tracks:switch'), async (req, res) => {
  const slug = String(req.params.slug);
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) throw badRequest('No such track');
  const body = validate(req.body, { active: { type: 'boolean', required: true }, reason: REASON });
  const track = await db.withTransaction(async (client) => {
    const { rows: [t] } = await client.query('SELECT slug, name, is_active, pack_key, season_key, physics IS NOT NULL AS kit FROM tracks WHERE slug = $1 FOR UPDATE', [slug]);
    if (!t) throw notFound('No such track');
    if (body.active && t.kit && !require('../game/physicsTracks').physicsTrack(slug)) throw conflict('This server has no code for that track yet: deploy it first');
    if (t.is_active === body.active) throw conflict(`It's already ${body.active ? 'on' : 'off'}`);
    await client.query('UPDATE tracks SET is_active = $2 WHERE slug = $1', [slug, body.active]);
    await audit(client, req, body.active ? 'track-on' : 'track-off', null, body.reason, { slug, name: t.name, pack: t.pack_key, season: t.season_key });
    const { kit: _kit, ...out } = t;
    return { ...out, is_active: body.active };
  });
  res.json({ track });
});

/** GET /devices?days= — the Dashboard's "Devices & browsers": players seen in the last 30 days by their latest device (src/devices). */
router.get('/devices', need('reports:read'), async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  res.json(await devices.breakdown(db, { days }));
});

/** GET /readiness?days= — which screens weren't ready by GO, and what they missed (src/readiness). */
router.get('/readiness', need('reports:read'), async (req, res) => {
  const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
  res.json(await require('../readiness').summary(db, { days }));
});

/**
 * The country of the player's first recorded security event (their first visit or sign-up), from
 * the country already stored with it: never the IP address, and nothing new stored (Moses, 1 Nov 2026).
 * Kept after the address itself is blanked (90 days).
 */
const FIRST_COUNTRY = (userId) => `(SELECT s.country FROM security_events s WHERE s.user_id = ${userId} AND s.country IS NOT NULL ORDER BY s.created_at, s.id LIMIT 1)`;

/** GET /players?q=&limit=&device=&client=&os=&browser= (each player's latest device: src/devices) */
router.get('/players', need('customers:read'), async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const params = [];
  let where = 'TRUE';
  if (q) {
    // A Marble ID (SC105-000012) finds its owner too.
    const code = q.toUpperCase();
    params.push(`%${q}%`, q, code);
    // …and an order number (MS-1042), a receipt or credit note (K-2026-00001, KR-…) or a support reference (S-1043).
    where = `(u.username ILIKE $1 OR u.email ILIKE $1 OR u.display_name ILIKE $1 OR u.id::text = $2
              OR EXISTS (SELECT 1 FROM user_collection c WHERE c.user_id = u.id AND c.marble_code = $3)
              OR EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.order_no = $3)
              OR EXISTS (SELECT 1 FROM billing_documents d WHERE d.user_id = u.id AND d.number = $3)
              OR EXISTS (SELECT 1 FROM support_messages s WHERE s.user_id = u.id AND s.ref = $3))`;
  }
  // (The device filter, 20 Nov 2026: the player's latest device; ?device=phone|tablet|computer, ?client=web|android-app|ios-app, ?os=Android, ?browser=Chrome.)
  const [deviceWhere, deviceParams] = devices.filterSql(req.query, params.length + 1);
  params.push(...deviceParams);
  if (deviceWhere) where = `(${where}) AND ${deviceWhere}`;
  params.push(limit);
  const { rows } = await db.query(
    `SELECT u.id, u.username, u.display_name, u.email, u.is_guest, u.role, u.is_staff OR u.role = 'admin' AS is_staff, u.coins, u.age_group, u.created_at, u.last_login_at, u.suspended_at, u.deleted_at,
            (SELECT COUNT(*)::int FROM race_entries e WHERE e.user_id = u.id) AS races,
            ${FIRST_COUNTRY('u.id')} AS first_country,
            dev.device_type, dev.os_name, dev.os_version, dev.browser_name, dev.browser_version, dev.client, dev.first_seen_at, dev.last_seen_at
       FROM users u ${devices.LATEST} WHERE ${where}
      ORDER BY u.last_login_at DESC NULLS LAST, u.created_at DESC
      LIMIT $${params.length}`,
    params,
  );
  for (const r of rows) {
    r.device = r.device_type ? devices.shown(r) : null;
    for (const k of ['device_type', 'os_name', 'os_version', 'browser_name', 'browser_version', 'client', 'first_seen_at', 'last_seen_at']) delete r[k];
  }
  // (An order, receipt, credit note, support reference, Marble ID or account id that finds one player: the CRM opens it.)
  const exact = rows.length === 1 && /^(MS-\d+|KR?-\d{4}-\d+|S-\d+|[A-Z]{1,3}\d+-\d+|[0-9a-f]{8}-[0-9a-f-]{27})$/i.test(q);
  res.json({ players: rows, exact });
});

/**
 * GET /players/:id/security — the player's security events with their IP addresses (at most 90
 * days old) and the other accounts seen from the same addresses, for fraud checks. Admins only,
 * like everything here; every opening is written to the audit log ('security-view', Moses, 1 Nov 2026).
 */
async function securityOf(id) {
  const [events, related] = await Promise.all([
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
  ]);
  return { events: events.rows, sameAddress: related.rows, ipDays: IP_DAYS };
}

router.get('/players/:id/security', need('customers:security'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows: [p] } = await db.query('SELECT id FROM users WHERE id = $1', [id]);
  if (!p) throw notFound('No such player');
  const security = await securityOf(id);
  await audit(db, req, 'security-view', id, 'Opened the Security tab (IP addresses)', {
    events: security.events.length, withIp: security.events.filter((e) => e.ip).length,
  });
  res.json(security);
});

/**
 * A document's SEK amount against its own amount: the exchange rate it implies (SEK per unit). Outside SEK_RATE it is
 * flagged in the Overview (Moses, 17 Nov 2026: MS-1002, a $5.00 purchase, showed as 4.54 SEK; a 10× slip in a book
 * amount would show here). Stripe's own rates for USD and EUR sit near 9–12 SEK; SEK itself is 1.
 */
const SEK_RATE = { USD: [6, 16], EUR: [7, 17], GBP: [8, 20], SEK: [0.97, 1.03] };
function rateCheck(d) {
  if (d.book_gross_cents == null || !d.gross_cents) return null;
  const rate = Math.abs(d.book_gross_cents) / Math.abs(d.gross_cents);
  const band = SEK_RATE[String(d.currency).toUpperCase()];
  return { rate: Math.round(rate * 1000) / 1000, odd: band ? rate < band[0] || rate > band[1] : false };
}

/**
 * GET /players/:id: the Overview's money (Moses, 17 Nov 2026: net spend after refunds, shown plainly).
 *   spend    every purchase (website and apps) by charged currency: purchases, paid, refunded, net (test orders left out)
 *   website  website (Stripe) purchases only, the same by currency: the headline "Spent on the website"
 *   sek      the SEK amounts Stripe booked for the website's receipts and credit notes (its rate on each day):
 *            paid, refunded (positive), net, Stripe's fees, documents still waiting, and each document with the
 *            rate its SEK amount implies (`odd`: outside SEK_RATE)
 */
async function overviewOf(id) {
  const money = (where) => db.query(
    `SELECT upper(COALESCE(charged_currency, currency)) AS currency, COUNT(*)::int AS purchases,
            SUM(COALESCE(charged_cents, amount_cents))::int AS paid_cents, SUM(COALESCE(refunded_cents, 0))::int AS refunded_cents,
            SUM(COALESCE(charged_cents, amount_cents) - COALESCE(refunded_cents, 0))::int AS cents, max(paid_at) AS last_paid_at
       FROM payments WHERE user_id = $1 AND status IN ('paid', 'refunded') AND NOT ${paymentsSvc.TEST_ORDER} ${where} GROUP BY 1 ORDER BY 3 DESC`,
    [id],
  );
  const [spend, website, docs, packsHeld, passes] = await Promise.all([
    money(''),
    money(`AND provider = 'stripe'`),
    db.query(
      `SELECT d.number, d.kind, d.currency, d.gross_cents, d.book_currency, d.book_gross_cents, d.book_fee_cents, d.book_filled_at, p.order_no
         FROM billing_documents d JOIN payments p ON p.id = d.payment_id WHERE d.user_id = $1 AND NOT p.is_test ORDER BY d.issued_at, d.number`,
      [id],
    ),
    db.query(`SELECT o.pack_key, p.name, o.provider, o.granted_at FROM pack_owners o JOIN track_packs p ON p.key = o.pack_key WHERE o.user_id = $1 AND o.revoked_at IS NULL ORDER BY o.granted_at`, [id]),
    db.query(`SELECT season_key, provider, granted_at FROM season_passes WHERE user_id = $1 AND revoked_at IS NULL ORDER BY granted_at`, [id]),
  ]);
  const filled = docs.rows.filter((d) => d.book_filled_at);
  const sum = (rows, f) => rows.reduce((n, d) => n + f(d), 0);
  const sek = {
    paid: sum(filled.filter((d) => d.kind === 'receipt'), (d) => d.book_gross_cents),
    refunded: -sum(filled.filter((d) => d.kind !== 'receipt'), (d) => d.book_gross_cents),
    fees: sum(filled, (d) => d.book_fee_cents ?? 0),
    missing: docs.rows.length - filled.length,
    documents: docs.rows.map((d) => ({ number: d.number, kind: d.kind, orderNo: d.order_no, currency: d.currency, cents: d.gross_cents, sekCents: d.book_filled_at ? d.book_gross_cents : null, ...rateCheck(d) })),
  };
  sek.cents = sek.paid - sek.refunded;
  return { spend: spend.rows, website: website.rows, sek, packs: packsHeld.rows, passes: passes.rows };
}

router.get('/players/:id', need('customers:read'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows: [player] } = await db.query(
    `SELECT id, username, display_name, email, is_guest, role, coins, coins_earned, coins_bought, skill, age_group,
            marketing_opt_in, created_at, last_login_at, suspended_at, deleted_at, streak_days, is_staff OR role = 'admin' AS is_staff,
            ${FIRST_COUNTRY('users.id')} AS first_country
       FROM users WHERE id = $1`,
    [id],
  );
  if (!player) throw notFound('No such player');
  const [ledger, sums, races, items, originals, events, auditRows, consents, payments, races24h, documents, messages] = await Promise.all([
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
    // Without the addresses: those only on the Security tab (GET /players/:id/security, audited).
    db.query('SELECT kind, country, created_at FROM security_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [id]),
    db.query(
      `SELECT a.id, a.action, a.reason, a.details, a.created_at, adm.username AS admin
         FROM admin_audit a LEFT JOIN users adm ON adm.id = a.admin_id
        WHERE a.target_user_id = $1 ORDER BY a.created_at DESC LIMIT 100`,
      [id],
    ),
    db.query('SELECT consent, source, created_at FROM email_consents WHERE user_id = $1 ORDER BY created_at DESC', [id]),
    db.query(`SELECT ${PAYMENT_COLUMNS} FROM payments p WHERE p.user_id = $1 ORDER BY p.created_at DESC LIMIT 50`, [id]),
    db.query(`SELECT COUNT(*)::int AS n FROM race_entries e JOIN races r ON r.id = e.race_id WHERE e.user_id = $1 AND r.finished_at > now() - interval '24 hours'`, [id]),
    // Receipts and credit notes (src/billing).
    db.query(`SELECT d.number, d.kind, d.issued_at, d.gross_cents, d.vat_cents, d.currency, d.payment_id, d.emailed_at, d.snapshot->>'reason' AS reason
                FROM billing_documents d WHERE d.user_id = $1 ORDER BY d.issued_at DESC, d.number DESC LIMIT 200`, [id]),
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
    security: { events: events.rows, ipDays: IP_DAYS },
    consents: consents.rows,
    payments: payments.rows,
    documents: documents.rows,
    emails: await require('../email/log').ofPlayer(db, id),
    // The Overview (CRM phase 3): what they have paid (each currency, net of refunds), in SEK where our receipts have it,
    // and the packs and passes they hold now.
    overview: await overviewOf(id),
    audit: auditRows.rows,
    messages: messages.rows,
    // (Devices and browsers, latest first: at most 5, coarse fields only; src/devices, 20 Nov 2026.)
    devices: await devices.ofPlayer(db, id),
  });
});

/** POST /players/:id/coins { amount, reason } */
router.post('/players/:id/coins', need('coins:adjust'), async (req, res) => {
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
router.post('/players/:id/items', need('coins:adjust'), async (req, res) => {
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
/** POST /players/:id/staff { staff: true|false, reason } — staff play normally but the Dashboard leaves them out. */
router.post('/players/:id/staff', need('staff:set'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { staff: { type: 'boolean', required: true }, reason: REASON });
  await db.withTransaction(async (client) => {
    const p = await lockPlayer(client, id);
    if (p.role === 'admin') throw conflict('Admins are always staff');
    if (p.is_staff === body.staff) throw conflict(body.staff ? 'Already staff' : 'Not staff');
    await client.query('UPDATE users SET is_staff = $2 WHERE id = $1', [id, body.staff]);
    await audit(client, req, body.staff ? 'staff-on' : 'staff-off', id, body.reason);
  });
  res.json({ ok: true });
});

router.post('/players/:id/suspend', need('customers:edit'), (req, res) => setSuspended(req, res, true));
router.post('/players/:id/unsuspend', need('customers:edit'), (req, res) => setSuspended(req, res, false));

/** POST /players/:id/name { display_name, reason } */
router.post('/players/:id/name', need('customers:edit'), async (req, res) => {
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
router.post('/players/:id/consent', need('customers:edit'), async (req, res) => {
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
router.post('/players/:id/delete', need('customers:delete'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { reason: REASON });
  if (id === req.admin.id) throw badRequest("You can't delete your own admin account here");
  const done = await db.withTransaction((client) => account.deleteAccount(client, id, { by: req.admin.id, reason: body.reason }));
  if (!done) throw notFound('No such player (or already deleted)');
  res.json(done);
});

/** GET /payments?q= — coin-pack orders, newest first; q: an order number, a player's name or e-mail. */
router.get('/payments', need('payments:read'), async (req, res) => {
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
router.post('/payments/:id/refund', need('payments:refund'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { reason: REASON, amount_cents: { type: 'int', min: 1, max: 10_000_000 } });
  res.json(await paymentsSvc.refund(db, id, { amountCents: body.amount_cents ?? null, adminId: req.admin.id, reason: body.reason }));
});

/**
 * GET /support?q=&status=&category=&limit= — the support inbox, newest first. q: a name, email,
 * player name, order number, reference (S-1001) or words from the message.
 */
router.get('/support', need('support:read'), async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 200);
  const status = support.STATUSES.includes(req.query.status) ? req.query.status : null;
  // (CRM phase 4) The views: mine (assigned to me, not closed), waiting-us (New and Open), waiting-player (Answered), closed.
  const stage = support.STAGES.includes(req.query.stage) ? req.query.stage : null;
  const view = ['mine', 'waiting-us', 'waiting-player', 'closed'].includes(req.query.view) ? req.query.view : null;
  const category = support.settings.categories.includes(req.query.category) ? req.query.category : null;
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
  const params = [];
  const where = [];
  if (status) { params.push(status); where.push(`s.status = $${params.length}`); }
  const STAGE = "COALESCE(s.stage, CASE s.status WHEN 'done' THEN 'closed' ELSE s.status END)";
  if (stage) { params.push(stage); where.push(`${STAGE} = $${params.length}`); }
  if (view === 'mine') { params.push(req.admin.id); where.push(`s.assigned_to = $${params.length} AND ${STAGE} <> 'closed'`); }
  if (view === 'waiting-us') where.push(`${STAGE} IN ('new', 'open')`);
  if (view === 'waiting-player') where.push(`${STAGE} = 'answered'`);
  if (view === 'closed') where.push(`${STAGE} = 'closed'`);
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
  const [list, counts, stages] = await Promise.all([
    db.query(
      `SELECT ${SUPPORT_LIST_COLUMNS} FROM support_messages s LEFT JOIN users u ON u.id = s.user_id
        ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY s.created_at DESC LIMIT $${params.length}`,
      params,
    ),
    db.query('SELECT status, COUNT(*)::int AS n FROM support_messages GROUP BY status'),
    db.query(
      `SELECT COALESCE(stage, CASE status WHEN 'done' THEN 'closed' ELSE status END) AS stage, COUNT(*)::int AS n,
              COUNT(*) FILTER (WHERE assigned_to = $1)::int AS mine
         FROM support_messages GROUP BY 1`,
      [req.admin.id],
    ),
  ]);
  const st = (k) => stages.rows.find((r) => r.stage === k)?.n ?? 0;
  res.json({
    messages: list.rows,
    counts: Object.fromEntries(support.STATUSES.map((st) => [st, counts.rows.find((r) => r.status === st)?.n ?? 0])),
    categories: support.settings.categories,
    stages: Object.fromEntries(support.STAGES.map((k) => [k, st(k)])),
    views: {
      mine: stages.rows.filter((r) => r.stage !== 'closed').reduce((n, r) => n + r.mine, 0),
      'waiting-us': st('new') + st('open'), 'waiting-player': st('answered'), closed: st('closed'),
    },
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
router.get('/support/:id', need('support:read'), async (req, res) => {
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
  // (CRM phase 4) The customer beside the message: what they have spent, their packs and pass, their last purchase.
  const customer = message.player_id ? await overviewOf(message.player_id) : null;
  res.json({ message, replies: replies.rows, audit: trail.rows, emailOn: require('../email').enabled(), customer });
});

/** GET /support/:id/screenshot — the image sent with the message. */
router.get('/support/:id/screenshot', need('support:read'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows: [m] } = await db.query('SELECT screenshot, screenshot_type FROM support_messages WHERE id = $1', [id]);
  if (!m?.screenshot) throw notFound('No screenshot');
  res.set('Content-Type', m.screenshot_type).set('Content-Disposition', 'inline').set('Content-Security-Policy', "default-src 'none'");
  res.send(m.screenshot);
});

/** POST /support/:id/status { status, reason? } — New, Open or Done; written to the audit log. */
router.post('/support/:id/status', need('support:answer'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { status: { type: 'enum', required: true, values: support.STATUSES }, reason: { type: 'string', max: 500 } });
  res.json({ message: await changeStage(req, id, body.status === 'done' ? 'closed' : body.status, body.reason) });
});

/** A message's stage changed (audited 'support-status', as before). */
function changeStage(req, id, stage, reason) {
  return db.withTransaction(async (client) => {
    const { rows: [m] } = await client.query(
      `SELECT id, ref, user_id, COALESCE(stage, CASE status WHEN 'done' THEN 'closed' ELSE status END) AS stage FROM support_messages WHERE id = $1 FOR UPDATE`, [id],
    );
    if (!m) throw notFound('No such message');
    if (m.stage !== stage) {
      await support.setStage(client, id, stage);
      await audit(client, req, 'support-status', m.user_id, reason || `${m.ref}: ${m.stage} → ${stage}`, { message_id: id, ref: m.ref, from: m.stage, to: stage });
    }
    return supportMessage(client, id);
  });
}

/** POST /support/:id/stage { stage: 'new'|'open'|'answered'|'closed', reason? } (CRM phase 4; audited). */
router.post('/support/:id/stage', need('support:answer'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { stage: { type: 'enum', required: true, values: support.STAGES }, reason: { type: 'string', max: 500 } });
  res.json({ message: await changeStage(req, id, body.stage, body.reason) });
});

/** GET /support-assignees — admins a message can be assigned to (owners and support). */
router.get('/support-assignees', need('support:read'), async (_req, res) => {
  const { rows } = await db.query(`SELECT id, username FROM users WHERE role = 'admin' AND admin_role IN ('owner', 'support') AND suspended_at IS NULL AND deleted_at IS NULL ORDER BY username`);
  res.json({ admins: rows });
});

/** POST /support/:id/assign { adminId | null } — who is on it (audited 'support-assign'). */
router.post('/support/:id/assign', need('support:answer'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const to = req.body?.adminId ? assertUuid(req.body.adminId) : null;
  const message = await db.withTransaction(async (client) => {
    const { rows: [m] } = await client.query('SELECT id, ref, user_id, assigned_to FROM support_messages WHERE id = $1 FOR UPDATE', [id]);
    if (!m) throw notFound('No such message');
    if (to) {
      const { rows: [a] } = await client.query(`SELECT id, username FROM users WHERE id = $1 AND role = 'admin' AND admin_role IN ('owner', 'support')`, [to]);
      if (!a) throw badRequest('Only an owner or a support admin can take a message');
    }
    if ((m.assigned_to ?? null) !== to) {
      await client.query('UPDATE support_messages SET assigned_to = $2 WHERE id = $1', [id, to]);
      await audit(client, req, 'support-assign', m.user_id, `${m.ref}: ${to ? 'assigned' : 'unassigned'}`, { message_id: id, ref: m.ref, from: m.assigned_to, to });
    }
    return supportMessage(client, id);
  });
  res.json({ message });
});

// ── Saved replies (CRM phase 4) ───────────────────────────────────────────────────────────────────────────

const SAVED = { title: { type: 'string', required: true, min: 2, max: 80 }, body: { type: 'string', required: true, min: 2, max: 5000 } };

/** GET /support-replies — the saved replies (not archived). */
router.get('/support-replies', need('support:read'), async (_req, res) => {
  const { rows } = await db.query(
    `SELECT r.id, r.title, r.body, r.updated_at, u.username AS created_by FROM support_saved_replies r LEFT JOIN users u ON u.id = r.created_by
      WHERE r.archived_at IS NULL ORDER BY r.title`,
  );
  res.json({ replies: rows, placeholders: ['name', 'ref', 'order_no'] });
});

/** POST /support-replies { title, body } — a new saved reply. */
router.post('/support-replies', need('support:answer'), async (req, res) => {
  const body = validate(req.body, SAVED);
  const { rows: [r] } = await db.query('INSERT INTO support_saved_replies (title, body, created_by) VALUES ($1, $2, $3) RETURNING id', [body.title.trim(), body.body, req.admin.id]);
  await audit(db, req, 'saved-reply-add', null, body.title.trim(), { id: r.id });
  res.json({ id: r.id });
});

/** POST /support-replies/:id { title, body } — edited. */
router.post('/support-replies/:id', need('support:answer'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, SAVED);
  const { rowCount } = await db.query('UPDATE support_saved_replies SET title = $2, body = $3, updated_at = now() WHERE id = $1 AND archived_at IS NULL', [id, body.title.trim(), body.body]);
  if (!rowCount) throw notFound('No such saved reply');
  await audit(db, req, 'saved-reply-edit', null, body.title.trim(), { id });
  res.json({ ok: true });
});

/** POST /support-replies/:id/archive — removed from the list (kept, for the history). */
router.post('/support-replies/:id/archive', need('support:answer'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const { rows: [r] } = await db.query('UPDATE support_saved_replies SET archived_at = now() WHERE id = $1 AND archived_at IS NULL RETURNING title', [id]);
  if (!r) throw notFound('No such saved reply');
  await audit(db, req, 'saved-reply-archive', null, r.title, { id });
  res.json({ ok: true });
});

/** POST /support/:id/reply { text } — saved, emailed to the player when email is on, written to the audit log. */
router.post('/support/:id/reply', need('support:answer'), async (req, res) => {
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
router.get('/audit', need('audit:read'), async (req, res) => {
  // Filters (16 Nov 2026): by admin (username), action, player (username or id), and from / to dates (Swedish time).
  const csv = req.query.format === 'csv';
  const limit = csv ? 10_000 : Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const params = [];
  const where = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('$?', `$${params.length}`)); };
  const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) ? String(v) : null);
  if (req.query.admin) add('adm.username ILIKE $?', String(req.query.admin).slice(0, 40));
  if (req.query.action) add('a.action = $?', String(req.query.action).slice(0, 40));
  if (req.query.player) add('(u.username ILIKE $? OR u.id::text = lower($?))'.replace(/\$\?/g, `$${params.length + 1}`), String(req.query.player).slice(0, 60));
  if (date(req.query.from)) add(`(a.created_at AT TIME ZONE 'Europe/Stockholm') >= $?::date`, date(req.query.from));
  if (date(req.query.to)) add(`(a.created_at AT TIME ZONE 'Europe/Stockholm') < $?::date + 1`, date(req.query.to));
  params.push(limit);
  const { rows } = await db.query(
    `SELECT a.id, a.action, a.reason, a.details, a.created_at, adm.username AS admin, u.id AS player_id, u.username AS player
       FROM admin_audit a LEFT JOIN users adm ON adm.id = a.admin_id LEFT JOIN users u ON u.id = a.target_user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY a.created_at DESC LIMIT $${params.length}`,
    params,
  );
  if (!csv) return res.json({ entries: rows });
  const reason = String(req.query.reason ?? '').trim();
  if (reason.length < 5) throw badRequest('Give a reason for the export (at least 5 characters)');
  await audit(db, req, 'audit-export', null, reason, { count: rows.length, filters: { admin: req.query.admin, action: req.query.action, player: req.query.player, from: req.query.from, to: req.query.to } });
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(require('../billing').csv([
    ['When', (r) => r.created_at?.toISOString?.() ?? r.created_at], ['Admin', (r) => r.admin ?? ''], ['Action', (r) => r.action],
    ['Player', (r) => r.player ?? ''], ['Reason', (r) => r.reason], ['Details', (r) => JSON.stringify(r.details ?? {})],
  ], rows));
});

/** GET /economy?days=30 */
router.get('/economy', need('reports:read'), async (req, res) => {
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
         FROM payments WHERE status = 'paid' AND paid_at > now() - make_interval(days => $1) AND NOT ${paymentsSvc.TEST_ORDER}
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
router.get('/name-reports', need('names:moderate'), async (req, res) => {
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
router.post('/name-reports/:userId/resolve', need('names:moderate'), async (req, res) => {
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
router.get('/gift-codes', need('gift-codes:read'), async (req, res) => {
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
router.post('/gift-codes', need('gift-codes:make'), async (req, res) => {
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
router.get('/gift-codes/:id', need('gift-codes:read'), async (req, res) => {
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
router.post('/gift-codes/:id/disable', need('gift-codes:make'), async (req, res) => {
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
router.get('/consents', need('emails:read'), async (req, res) => {
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

// ── Admins and roles (16 Nov 2026, CRM phase 2; src/admin/permissions.js) ─────────────────────────────

const { ROLES } = require('../admin/permissions');
const ROLE = { type: 'enum', required: true, values: ROLES };

/** GET /admins — every admin, their role, 2-step login and last use of the back office. */
router.get('/admins', need('admins:manage'), async (_req, res) => {
  const { rows } = await db.query(
    `SELECT u.id, u.username, u.display_name, u.email, COALESCE(u.admin_role, 'read-only') AS role, u.suspended_at,
            (SELECT f.enabled_at FROM admin_2fa f WHERE f.user_id = u.id) AS two_step_since,
            (SELECT MAX(s.last_seen_at) FROM admin_sessions s WHERE s.user_id = u.id) AS last_seen_at
       FROM users u WHERE u.role = 'admin' AND u.deleted_at IS NULL ORDER BY u.username`,
  );
  res.json({ admins: rows, roles: ROLES });
});

/** No change may leave the back office without an owner. */
async function assertAnotherOwner(client, exceptId) {
  const { rows: [o] } = await client.query(
    `SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND admin_role = 'owner' AND id <> $1 AND suspended_at IS NULL AND deleted_at IS NULL`,
    [exceptId],
  );
  if (!o.n) throw conflict('The back office needs at least one owner');
}

/** POST /admins { login, role, reason } — an existing saved account (username or email) becomes an admin with a role. */
router.post('/admins', need('admins:manage'), async (req, res) => {
  const body = validate(req.body, { login: { type: 'string', required: true, min: 2, max: 254 }, role: ROLE, reason: REASON });
  const out = await db.withTransaction(async (client) => {
    const { rows: [u] } = await client.query(
      `SELECT id, username, role, is_guest, suspended_at, deleted_at FROM users WHERE lower(username) = lower($1) OR lower(email) = lower($1) FOR UPDATE`,
      [body.login.trim()],
    );
    if (!u || u.deleted_at) throw notFound('No such account');
    if (u.is_guest) throw badRequest('A guest account can\'t be an admin: it must be saved first');
    if (u.suspended_at) throw badRequest('This account is suspended');
    if (u.role === 'admin') throw conflict('Already an admin: change their role instead');
    await client.query(`UPDATE users SET role = 'admin', admin_role = $2 WHERE id = $1`, [u.id, body.role]);
    await audit(client, req, 'admin-add', u.id, body.reason, { role: body.role });
    return { id: u.id, username: u.username, role: body.role };
  });
  res.json({ admin: out });
});

/** POST /admins/:id/role { role, reason } */
router.post('/admins/:id/role', need('admins:manage'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { role: ROLE, reason: REASON });
  await db.withTransaction(async (client) => {
    const { rows: [u] } = await client.query(`SELECT id, role, admin_role FROM users WHERE id = $1 FOR UPDATE`, [id]);
    if (!u || u.role !== 'admin') throw notFound('No such admin');
    const from = u.admin_role ?? 'read-only';
    if (id === req.admin.id) throw conflict('You can\'t change your own role: another owner can');
    if (from === body.role) throw conflict(`Already ${body.role}`);
    if (from === 'owner') await assertAnotherOwner(client, id);
    await client.query('UPDATE users SET admin_role = $2 WHERE id = $1', [id, body.role]);
    await audit(client, req, 'admin-role', id, body.reason, { from, to: body.role });
  });
  res.json({ ok: true });
});

/** POST /admins/:id/remove { reason } — back to a player; their back-office sessions end at once. */
router.post('/admins/:id/remove', need('admins:manage'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { reason: REASON });
  await db.withTransaction(async (client) => {
    const { rows: [u] } = await client.query(`SELECT id, role, admin_role FROM users WHERE id = $1 FOR UPDATE`, [id]);
    if (!u || u.role !== 'admin') throw notFound('No such admin');
    if (id === req.admin.id) throw conflict('You can\'t remove yourself: another owner can');
    if (u.admin_role === 'owner') await assertAnotherOwner(client, id);
    await client.query(`UPDATE users SET role = 'player', admin_role = NULL WHERE id = $1`, [id]);
    await client.query('UPDATE admin_sessions SET ended_at = now() WHERE user_id = $1 AND ended_at IS NULL', [id]);
    await audit(client, req, 'admin-remove', id, body.reason, { role: u.admin_role ?? 'read-only' });
  });
  res.json({ ok: true });
});

// ── Billing (16 Nov 2026, CRM phase 1; src/billing) ──────────────────────────────────────────────────────

const billing = require('../billing');
const thisMonth = () => billing.swedishDate(new Date()).slice(0, 7);
const monthOf = (v) => (billing.MONTH.test(String(v ?? '')) ? String(v) : thisMonth());

/** GET /billing/documents?q=&kind=receipt|credit&month=YYYY-MM — receipts and credit notes, newest first. */
router.get('/billing/documents', need('billing:read'), async (req, res) => {
  const q = String(req.query.q ?? '').trim().slice(0, 100);
  const kind = ['receipt', 'credit'].includes(req.query.kind) ? req.query.kind : null;
  const month = req.query.month ? monthOf(req.query.month) : null;
  const params = [];
  const where = [];
  if (kind) { params.push(kind); where.push(`d.kind = $${params.length}`); }
  if (month) {
    const r = billing.monthRange(month);
    params.push(r.from, r.to);
    where.push(`(d.issued_at AT TIME ZONE 'Europe/Stockholm') >= $${params.length - 1}::date AND (d.issued_at AT TIME ZONE 'Europe/Stockholm') < $${params.length}::date`);
  }
  if (q) {
    params.push(q.toUpperCase(), `%${q}%`);
    where.push(`(d.number = $${params.length - 1} OR p.order_no = $${params.length - 1} OR u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  const { rows } = await db.query(
    `SELECT d.number, d.kind, d.issued_at, d.currency, d.gross_cents, d.vat_cents, d.vat_rate, d.vat_country, d.book_currency, d.book_gross_cents,
            d.book_fee_cents, d.emailed_at, p.order_no, p.provider, p.is_test AS test, u.id AS player_id, u.username AS player
       FROM billing_documents d JOIN payments p ON p.id = d.payment_id LEFT JOIN users u ON u.id = d.user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY d.issued_at DESC, d.number DESC LIMIT 500`,
    params,
  );
  res.json({ documents: rows });
});

/** GET /billing/documents/:number — one document as issued, its purchase and its customer. */
router.get('/billing/documents/:number', need('billing:read'), async (req, res) => {
  const number = String(req.params.number).toUpperCase().slice(0, 20);
  const { rows: [d] } = await db.query(
    `SELECT ${billing.DOC_COLUMNS}, p.order_no, p.is_test AS test, p.status AS payment_status, p.refunded_cents, p.charged_cents, p.payment_intent, p.withdrawn_at,
            u.username AS player, c.number AS credits_number,
            (SELECT COALESCE(json_agg(x.number ORDER BY x.number), '[]'::json) FROM billing_documents x WHERE x.credits_document_id = d.id) AS credited_by
       FROM billing_documents d JOIN payments p ON p.id = d.payment_id LEFT JOIN users u ON u.id = d.user_id
       LEFT JOIN billing_documents c ON c.id = d.credits_document_id
      WHERE d.number = $1`,
    [number],
  );
  if (!d) throw notFound('No such document');
  res.json({ document: d });
});

/** GET /billing/documents/:number/pdf — the document as the customer gets it, as an A4 PDF (src/billing/pdf.js). */
router.get('/billing/documents/:number/pdf', need('billing:read'), async (req, res) => {
  const number = String(req.params.number).toUpperCase().slice(0, 20);
  const { rows: [d] } = await db.query(`SELECT ${billing.DOC_COLUMNS} FROM billing_documents d WHERE d.number = $1`, [number]);
  if (!d) throw notFound('No such document');
  const { pdfOf, fileName } = require('../billing/pdf');
  const doc = billing.publicDocument(d);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fileName(doc)}"`, 'Cache-Control': 'private, no-store' });
  res.send(await pdfOf(doc));
});

/** GET /billing/summary?month=YYYY-MM — the month's totals and its VAT per country and rate. */
router.get('/billing/summary', need('billing:read'), async (req, res) => {
  const month = monthOf(req.query.month);
  const [totals, vat] = await Promise.all([billing.monthTotals(db, month), billing.vatSummary(db, month)]);
  res.json({ month, totals, vat });
});

/** GET /billing/export?month=YYYY-MM&file=documents|vat&reason= — the month for the accountant, as CSV (audited). */
router.get('/billing/export', need('billing:export'), async (req, res) => {
  const month = monthOf(req.query.month);
  const file = req.query.file === 'vat' ? 'vat' : 'documents';
  const reason = String(req.query.reason ?? '').trim();
  if (reason.length < 5) throw badRequest('Give a reason for the export (at least 5 characters)');
  const body = file === 'vat' ? await billing.exportVat(db, month) : await billing.exportDocuments(db, month);
  await audit(db, req, 'billing-export', null, reason, { month, file });
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="marble-spins-${file === 'vat' ? 'vat-summary' : 'receipts-and-credit-notes'}-${month}.csv"`);
  res.send(body);
});

// ── Email templates (16 Nov 2026, CRM phase 5; src/email/library.js) ─────────────────────────────────────

const library = require('../email/library');
const emailSvc = require('../email');

/** GET /emails/templates — every kind: its group, words, placeholders, the published version and the newest saved one. */
router.get('/emails/templates', need('emails:templates'), async (_req, res) => {
  const { rows } = await db.query(
    `SELECT kind, max(version)::int AS latest, max(version) FILTER (WHERE published_at IS NOT NULL)::int AS published_version, max(published_at) AS published_at
       FROM email_templates GROUP BY kind`,
  );
  const by = new Map(rows.map((r) => [r.kind, r]));
  res.json({
    kinds: Object.entries(library.KINDS).filter(([, k]) => k.listed !== false).map(([kind, k]) => ({
      kind, name: k.name, group: k.group, about: k.about,
      latest: by.get(kind)?.latest ?? null, published: by.get(kind)?.published_version ?? null, publishedAt: by.get(kind)?.published_at ?? null,
    })),
    sending: emailSvc.enabled(),
  });
});

const kindOf = (req) => {
  const kind = String(req.params.kind);
  if (!library.KINDS[kind]) throw notFound('No such email');
  return kind;
};

/** GET /emails/templates/:kind — the kind, its placeholders, its versions, and the one to edit (the newest, else the default). */
router.get('/emails/templates/:kind', need('emails:templates'), async (req, res) => {
  const kind = kindOf(req);
  const { rows: versions } = await db.query(
    `SELECT t.version, t.subject, t.preheader, t.title, t.blocks, t.note, t.created_at, t.published_at, c.username AS created_by, p.username AS published_by
       FROM email_templates t LEFT JOIN users c ON c.id = t.created_by LEFT JOIN users p ON p.id = t.published_by
      WHERE t.kind = $1 ORDER BY t.version DESC`,
    [kind],
  );
  const live = versions.filter((v) => v.published_at).sort((a, b) => new Date(b.published_at) - new Date(a.published_at))[0] ?? null;
  const k = library.KINDS[kind];
  res.json({
    kind, name: k.name, group: k.group, about: k.about,
    placeholders: Object.entries(library.placeholdersOf(kind)).map(([key, p]) => ({ key, about: p.about, sample: p.sample })),
    versions, liveVersion: live?.version ?? null,
    editing: versions[0] ?? { version: null, ...k.defaults, preheader: null, note: null },
    defaults: k.defaults,
  });
});

/** POST /emails/templates/:kind/preview { subject, preheader, title, blocks } — the email with sample values. */
router.post('/emails/templates/:kind/preview', need('emails:templates'), async (req, res) => {
  const kind = kindOf(req);
  const t = library.validate(kind, req.body ?? {});
  res.json(library.render(kind, t, { values: library.samples(kind), core: library.sampleCore(kind) }));
});

/** POST /emails/templates/:kind { subject, preheader, title, blocks, note } — saves a new version (not published). */
router.post('/emails/templates/:kind', need('emails:templates'), async (req, res) => {
  const kind = kindOf(req);
  const t = library.validate(kind, req.body ?? {});
  const note = req.body?.note ? String(req.body.note).trim().slice(0, 300) : null;
  const { rows: [v] } = await db.query(
    `INSERT INTO email_templates (kind, version, subject, preheader, title, blocks, note, created_by)
     VALUES ($1, COALESCE((SELECT max(version) FROM email_templates WHERE kind = $1), 0) + 1, $2, $3, $4, $5, $6, $7) RETURNING version, created_at`,
    [kind, t.subject, t.preheader, t.title, JSON.stringify(t.blocks), note, req.admin.id],
  );
  res.json({ version: v.version, created_at: v.created_at });
});

/** POST /emails/templates/:kind/:version/publish { reason } — this version is sent from now on (audited). */
router.post('/emails/templates/:kind/:version/publish', need('emails:templates'), async (req, res) => {
  const kind = kindOf(req);
  const version = Number(req.params.version);
  const body = validate(req.body, { reason: REASON });
  await db.withTransaction(async (client) => {
    const { rows: [t] } = await client.query('SELECT id, published_at FROM email_templates WHERE kind = $1 AND version = $2 FOR UPDATE', [kind, version]);
    if (!t) throw notFound('No such version');
    await client.query('UPDATE email_templates SET published_at = now(), published_by = $2 WHERE id = $1', [t.id, req.admin.id]);
    await audit(client, req, 'email-template-publish', null, body.reason, { kind, version });
  });
  res.json({ ok: true });
});

/** POST /emails/templates/:kind/unpublish { reason } — back to the email in code (audited). */
router.post('/emails/templates/:kind/unpublish', need('emails:templates'), async (req, res) => {
  const kind = kindOf(req);
  const body = validate(req.body, { reason: REASON });
  await db.withTransaction(async (client) => {
    await client.query('UPDATE email_templates SET published_at = NULL, published_by = NULL WHERE kind = $1 AND published_at IS NOT NULL', [kind]);
    await audit(client, req, 'email-template-unpublish', null, body.reason, { kind });
  });
  res.json({ ok: true });
});

/** POST /emails/templates/:kind/test { subject, preheader, title, blocks } — sends it, with sample values, to the admin's own address only. */
router.post('/emails/templates/:kind/test', need('emails:templates'), async (req, res) => {
  const kind = kindOf(req);
  const t = library.validate(kind, req.body ?? {});
  const { rows: [me] } = await db.query('SELECT email, username FROM users WHERE id = $1', [req.admin.id]);
  if (!me?.email) throw badRequest('Your account has no email address to send the test to');
  if (!emailSvc.enabled()) throw conflict('Email is not set up on this server (BREVO_API_KEY)');
  const m = library.render(kind, t, { values: library.samples(kind), core: library.sampleCore(kind) });
  await emailSvc.send({ to: me.email, toName: me.username, subject: `[Test] ${m.subject}`, html: m.html, kind, userId: req.admin.id, test: true, tags: ['template-test'] });
  res.json({ sentTo: me.email });
});

// ── Marketing (16 Nov 2026, CRM phase 6; src/marketing): sending is OFF unless MARKETING_SENDING=on ──────────

const marketing = require('../marketing');

/** GET /marketing/status — the switch, the rules, how many players they allow now, and who onboarding would reach today. */
router.get('/marketing/status', need('marketing:read'), async (_req, res) => {
  const steps = [];
  for (const step of marketing.STEPS) steps.push({ ...step, due: (await marketing.due(db, step)).length });
  res.json({
    sendingOn: marketing.audience.sendingOn(),
    softOptInFrom: marketing.audience.softOptInFrom(),
    allowed: await marketing.audience.count(db, {}),
    onboarding: steps,
  });
});

const NEWSLETTER = { name: { type: 'string', required: true, min: 2, max: 80 } };
const segmentOf = (seg = {}) => ({
  ...(marketing.audience.BUYERS[seg.buyers] && { buyers: seg.buyers }),
  ...([30, 60, 90].includes(Number(seg.lapsedDays)) && { lapsedDays: Number(seg.lapsedDays) }),
  ...(Number(seg.newDays) === 30 && { newDays: 30 }),
  ...(/^[A-Z]{2}$/.test(seg.country ?? '') && { country: seg.country }),
});

/** GET /marketing/newsletters */
router.get('/marketing/newsletters', need('marketing:read'), async (_req, res) => {
  const { rows } = await db.query(
    `SELECT n.id, n.name, n.subject, n.status, n.segment, n.updated_at, n.sent_at, n.sent_count, u.username AS created_by
       FROM newsletters n LEFT JOIN users u ON u.id = n.created_by ORDER BY n.updated_at DESC LIMIT 200`,
  );
  res.json({ newsletters: rows, sendingOn: marketing.audience.sendingOn() });
});

/** GET /marketing/newsletters/:id */
router.get('/marketing/newsletters/:id', need('marketing:read'), async (req, res) => {
  const { rows: [n] } = await db.query('SELECT * FROM newsletters WHERE id = $1', [assertUuid(req.params.id)]);
  if (!n) throw notFound('No such newsletter');
  res.json({ newsletter: n, reach: await marketing.audience.count(db, n.segment), sendingOn: marketing.audience.sendingOn() });
});

/** POST /marketing/newsletters { id?, name, subject, preheader, title, blocks, segment } — a draft saved (new or changed). */
router.post('/marketing/newsletters', need('marketing:read'), async (req, res) => {
  const { name } = validate(req.body, NEWSLETTER);
  const t = library.validate('newsletter', req.body ?? {});
  const seg = segmentOf(req.body?.segment);
  if (req.body?.id) {
    const { rows: [n] } = await db.query(
      `UPDATE newsletters SET name = $2, subject = $3, preheader = $4, title = $5, blocks = $6, segment = $7, updated_at = now()
        WHERE id = $1 AND status = 'draft' RETURNING id`,
      [assertUuid(req.body.id), name.trim(), t.subject, t.preheader, t.title, JSON.stringify(t.blocks), JSON.stringify(seg)],
    );
    if (!n) throw conflict('Only a draft can be changed');
    return res.json({ id: n.id });
  }
  const { rows: [n] } = await db.query(
    `INSERT INTO newsletters (name, subject, preheader, title, blocks, segment, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [name.trim(), t.subject, t.preheader, t.title, JSON.stringify(t.blocks), JSON.stringify(seg), req.admin.id],
  );
  res.json({ id: n.id });
});

/** POST /marketing/preview { subject, preheader, title, blocks } — a newsletter with sample values. */
router.post('/marketing/preview', need('marketing:read'), async (req, res) => {
  const t = library.validate('newsletter', req.body ?? {});
  res.json(library.render('newsletter', t, { values: { name: 'Ada' }, unsubscribeUrl: 'https://marblespins.com/unsubscribe?u=sample' }));
});

/** POST /marketing/reach { segment } — how many players a segment reaches now, under the rules. */
router.post('/marketing/reach', need('marketing:read'), async (req, res) => {
  res.json({ reach: await marketing.audience.count(db, segmentOf(req.body?.segment)) });
});

/** POST /marketing/test { subject, preheader, title, blocks } — to the admin's own address only. */
router.post('/marketing/test', need('marketing:read'), async (req, res) => {
  const t = library.validate('newsletter', req.body ?? {});
  const { rows: [me] } = await db.query('SELECT email, username FROM users WHERE id = $1', [req.admin.id]);
  if (!me?.email) throw badRequest('Your account has no email address to send the test to');
  if (!emailSvc.enabled()) throw conflict('Email is not set up on this server (BREVO_API_KEY)');
  const m = library.render('newsletter', t, { values: { name: me.username }, unsubscribeUrl: 'https://marblespins.com/unsubscribe?u=test' });
  await emailSvc.send({ to: me.email, toName: me.username, subject: `[Test] ${m.subject}`, html: m.html, kind: 'newsletter', userId: req.admin.id, test: true, tags: ['newsletter-test'] });
  res.json({ sentTo: me.email });
});

/** POST /marketing/newsletters/:id/send { reason } — starts sending a draft (owners; refused while sending is off). */
router.post('/marketing/newsletters/:id/send', need('marketing:send'), async (req, res) => {
  const id = assertUuid(req.params.id);
  const body = validate(req.body, { reason: REASON });
  if (!marketing.audience.sendingOn()) throw conflict('Marketing email is switched off (MARKETING_SENDING). Nothing was sent.');
  await db.withTransaction(async (client) => {
    const { rows: [n] } = await client.query(`UPDATE newsletters SET status = 'sending', send_started_at = now() WHERE id = $1 AND status = 'draft' RETURNING name, segment`, [id]);
    if (!n) throw conflict('Only a draft can be sent');
    await audit(client, req, 'newsletter-send', null, body.reason, { id, name: n.name, segment: n.segment, reach: await marketing.audience.count(client, n.segment) });
  });
  res.json({ ok: true });
});

module.exports = router;
