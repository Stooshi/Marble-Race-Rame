'use strict';

/**
 * Receipts and credit notes (Moses, 16 Nov 2026, CRM phase 1; the plan: claude/crm-plan.md in the project).
 *
 *   - A receipt (K-2026-00001…) for every paid Stripe purchase, issued in the same transaction that marks it
 *     paid (stripe.js handleEvent). Store purchases (Apple, Google Play) get none: the store sells those and
 *     issues the receipt. Stripe test mode gets none (its events carry livemode: false).
 *   - A credit note (KR-2026-00001…) for every refund or chargeback of a purchase that has a receipt, issued in
 *     the same transaction that records the refund (stripe.js revoke).
 *   - Numbers: one unbroken series per kind and year, taken from billing_counters in the same transaction
 *     (a rolled-back purchase takes its number back with it).
 *   - Each document is frozen when issued: `snapshot` holds everything it shows (./layout.js at that moment).
 */
const layout = require('./layout');

const TZ = 'Europe/Stockholm';
/** The calendar date (YYYY-MM-DD) and year of a moment, in Swedish time. */
function swedishDate(at) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(at));
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** The next number of a series for the year of `at`: K-2026-00001. Locks the counter row until the transaction ends. */
async function nextNumber(client, kind, at) {
  const series = layout.SERIES[kind];
  const year = Number(swedishDate(at).slice(0, 4));
  const { rows: [c] } = await client.query(
    `INSERT INTO billing_counters (series, year, last_no) VALUES ($1, $2, 1)
     ON CONFLICT (series, year) DO UPDATE SET last_no = billing_counters.last_no + 1
     RETURNING last_no`,
    [series, year],
  );
  return `${series}-${year}-${String(c.last_no).padStart(layout.NUMBER_DIGITS, '0')}`;
}

/** What was bought, in words (as in the purchase emails). */
async function itemOf(client, pay) {
  if (pay.pack_key) {
    const { rows: [p] } = await client.query('SELECT name FROM track_packs WHERE key = $1', [pay.pack_key]);
    return `${p?.name ?? 'Track'} track pack${pay.coins_spent > 0 ? ` (with ${Number(pay.coins_spent).toLocaleString('en-US')} coins)` : ''}`;
  }
  if (pay.season_key) {
    const { rows: [s] } = await client.query('SELECT pass_name FROM seasons WHERE key = $1', [pay.season_key]);
    return s?.pass_name ?? 'Season pass';
  }
  return `${Number(pay.coins).toLocaleString('en-US')} coins`;
}

/** The VAT rate (percent, 2 decimals) of a payment: Stripe Tax's own when known, else worked out from the amounts. */
function rateOf(pay) {
  if (pay.vat_rate != null) return Number(pay.vat_rate);
  const gross = pay.charged_cents ?? pay.amount_cents;
  const vat = pay.tax_cents ?? 0;
  if (!vat || gross <= vat) return 0;
  return Math.round((vat / (gross - vat)) * 1000) / 10;
}

function vatNote(country, vat) {
  if (vat) return null;
  if (country && !layout.EU.includes(country)) return layout.VAT_NOTES.outsideEu;
  return layout.VAT_NOTES.zero;
}

function sellerSnapshot() {
  return {
    fields: [...layout.SELLER_FIELDS, ...(layout.F_SKATT.show ? ['fSkatt'] : [])],
    ...layout.SELLER,
    ...(layout.F_SKATT.show && { fSkatt: layout.F_SKATT.text }),
  };
}

async function buyerOf(client, userId) {
  const { rows: [u] } = await client.query('SELECT username, display_name, email FROM users WHERE id = $1', [userId]);
  return { fields: layout.BUYER_FIELDS, name: u?.display_name || u?.username || '', username: u?.username ?? '', email: u?.email ?? '' };
}

const DOC_COLUMNS = `d.id, d.number, d.kind, d.payment_id, d.refund_id, d.user_id, d.issued_at, d.currency, d.gross_cents, d.net_cents,
  d.vat_cents, d.vat_rate, d.vat_country, d.book_currency, d.book_gross_cents, d.book_fee_cents, d.book_filled_at, d.snapshot, d.emailed_at`;

/**
 * The receipt for a paid Stripe payment, issued now if it has none (inside the caller's transaction). Its date is
 * when it was paid. → the document row, or null for a payment that gets none (not Stripe, not paid).
 */
async function issueReceipt(client, paymentId) {
  const { rows: [pay] } = await client.query('SELECT * FROM payments WHERE id = $1 FOR UPDATE', [paymentId]);
  if (!pay || pay.provider !== 'stripe' || !['paid', 'refunded'].includes(pay.status) || !pay.paid_at) return null;
  const { rows: [had] } = await client.query(`SELECT ${DOC_COLUMNS} FROM billing_documents d WHERE d.payment_id = $1 AND d.kind = 'receipt'`, [pay.id]);
  if (had) return had;
  const number = await nextNumber(client, 'receipt', pay.paid_at);
  const currency = String(pay.charged_currency ?? pay.currency).toUpperCase();
  const gross = pay.charged_cents ?? pay.amount_cents;
  const vat = pay.tax_cents ?? 0;
  const rate = rateOf(pay);
  const description = await itemOf(client, pay);
  const snapshot = {
    version: 1,
    kind: 'receipt',
    title: layout.TITLES.receipt,
    number,
    date: swedishDate(pay.paid_at),
    orderNo: pay.order_no,
    seller: sellerSnapshot(),
    buyer: await buyerOf(client, pay.user_id),
    lines: [{ description, qty: 1, grossCents: gross, netCents: gross - vat, vatCents: vat, vatRate: rate }],
    currency,
    totals: { grossCents: gross, netCents: gross - vat, vatCents: vat },
    vat: { country: pay.vat_country ?? null, rate, note: vatNote(pay.vat_country, vat) },
    paidWith: layout.PAID_WITH,
    playerPath: layout.PLAYER_PATH(number),
  };
  const { rows: [doc] } = await client.query(
    `INSERT INTO billing_documents (number, kind, payment_id, user_id, issued_at, currency, gross_cents, net_cents, vat_cents, vat_rate, vat_country, snapshot)
     VALUES ($1, 'receipt', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, number, kind, payment_id, refund_id, user_id, issued_at, currency, gross_cents, net_cents, vat_cents, vat_rate, vat_country,
               book_currency, book_gross_cents, book_fee_cents, book_filled_at, snapshot, emailed_at`,
    [number, pay.id, pay.user_id, pay.paid_at, currency, gross, gross - vat, vat, rate, pay.vat_country ?? null, JSON.stringify(snapshot)],
  );
  return doc;
}

/**
 * The credit note for one refund or chargeback (a payment_refunds row), issued now if it has none and its payment
 * has a receipt (inside the caller's transaction). The VAT is credited in proportion. → the document, or null.
 */
async function issueCreditNote(client, refundId) {
  const { rows: [r] } = await client.query('SELECT * FROM payment_refunds WHERE id = $1', [refundId]);
  if (!r) return null;
  const { rows: [had] } = await client.query(`SELECT ${DOC_COLUMNS} FROM billing_documents d WHERE d.refund_id = $1 AND d.kind = 'credit'`, [refundId]);
  if (had) return had;
  const { rows: [receipt] } = await client.query(`SELECT ${DOC_COLUMNS} FROM billing_documents d WHERE d.payment_id = $1 AND d.kind = 'receipt'`, [r.payment_id]);
  if (!receipt) return null; // (no receipt: a store or test-mode purchase)
  const { rows: [pay] } = await client.query('SELECT * FROM payments WHERE id = $1', [r.payment_id]);
  const number = await nextNumber(client, 'credit', r.created_at);
  const amount = Math.min(r.amount_cents, receipt.gross_cents);
  const vat = receipt.gross_cents ? Math.round((receipt.vat_cents * amount) / receipt.gross_cents) : 0;
  const what = /^du_/.test(r.id) ? 'chargeback' : pay.withdrawn_at ? 'withdrawal' : amount >= receipt.gross_cents ? 'refund' : 'part refund';
  const item = receipt.snapshot.lines[0]?.description ?? (await itemOf(client, pay));
  const rate = receipt.vat_rate == null ? 0 : Number(receipt.vat_rate);
  const snapshot = {
    version: 1,
    kind: 'credit',
    title: layout.TITLES.credit,
    number,
    date: swedishDate(r.created_at),
    orderNo: pay.order_no,
    credits: { number: receipt.number, date: receipt.snapshot.date },
    reason: r.reason ?? null,
    what,
    seller: sellerSnapshot(),
    buyer: await buyerOf(client, pay.user_id),
    lines: [{ description: `${item} (${what})`, qty: 1, grossCents: -amount, netCents: -(amount - vat), vatCents: -vat, vatRate: rate }],
    currency: receipt.currency,
    totals: { grossCents: -amount, netCents: -(amount - vat), vatCents: -vat },
    vat: { country: receipt.vat_country ?? null, rate, note: vatNote(receipt.vat_country, vat) },
    paidWith: layout.PAID_WITH,
    playerPath: layout.PLAYER_PATH(number),
  };
  const { rows: [doc] } = await client.query(
    `INSERT INTO billing_documents (number, kind, payment_id, refund_id, credits_document_id, user_id, issued_at, currency, gross_cents, net_cents, vat_cents, vat_rate, vat_country, snapshot)
     VALUES ($1, 'credit', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id, number, kind, payment_id, refund_id, user_id, issued_at, currency, gross_cents, net_cents, vat_cents, vat_rate, vat_country,
               book_currency, book_gross_cents, book_fee_cents, book_filled_at, snapshot, emailed_at`,
    [number, pay.id, r.id, receipt.id, pay.user_id, r.created_at, receipt.currency, -amount, -(amount - vat), -vat, rate, receipt.vat_country, JSON.stringify(snapshot)],
  );
  return doc;
}

/**
 * Issues what is missing (at start-up, and after Stripe's events as a safety net): receipts for live Stripe
 * purchases paid before billing existed (their checkout session is a live one, cs_live_…), oldest first, then
 * credit notes for their refunds. One server at a time (an advisory lock). → { receipts, credits }.
 */
async function issueMissing(db) {
  return db.withTransaction(async (client) => {
    const { rows: [lock] } = await client.query("SELECT pg_try_advisory_xact_lock(hashtext('billing-issue-missing')) AS ok");
    if (!lock.ok) return { receipts: 0, credits: 0 };
    const { rows: pays } = await client.query(
      `SELECT p.id FROM payments p
        WHERE p.provider = 'stripe' AND p.status IN ('paid', 'refunded') AND p.paid_at IS NOT NULL AND p.stripe_session_id LIKE 'cs_live_%'
          AND NOT EXISTS (SELECT 1 FROM billing_documents d WHERE d.payment_id = p.id AND d.kind = 'receipt')
        ORDER BY p.paid_at, p.id`,
    );
    let receipts = 0;
    for (const p of pays) if (await issueReceipt(client, p.id)) receipts += 1;
    const { rows: refunds } = await client.query(
      `SELECT r.id FROM payment_refunds r
        WHERE EXISTS (SELECT 1 FROM billing_documents d WHERE d.payment_id = r.payment_id AND d.kind = 'receipt')
          AND NOT EXISTS (SELECT 1 FROM billing_documents d WHERE d.refund_id = r.id)
        ORDER BY r.created_at, r.id`,
    );
    let credits = 0;
    for (const r of refunds) if (await issueCreditNote(client, r.id)) credits += 1;
    return { receipts, credits };
  });
}

/** A player's own document by its number (their Purchases page), or null. */
async function ofPlayer(db, userId, number) {
  const { rows: [doc] } = await db.query(`SELECT ${DOC_COLUMNS} FROM billing_documents d WHERE d.number = $1 AND d.user_id = $2`, [number, userId]);
  return doc ? publicDocument(doc) : null;
}

/** Whether a document with this number exists at all (on any account): a receipt on another account says so. */
async function exists(db, number) {
  const { rows } = await db.query('SELECT 1 FROM billing_documents WHERE number = $1', [number]);
  return rows.length > 0;
}

/** What the player (and the back office's "as the customer sees it") is shown: the frozen document. */
function publicDocument(doc) {
  return { number: doc.number, kind: doc.kind, issuedAt: doc.issued_at, ...doc.snapshot };
}

module.exports = { DOC_COLUMNS, swedishDate, nextNumber, issueReceipt, issueCreditNote, issueMissing, ofPlayer, exists, publicDocument, rateOf };
