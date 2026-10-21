'use strict';

/**
 * Purchase emails (Moses, 21 Oct 2026), sent by Brevo once email is on (BREVO_API_KEY):
 *   - the purchase confirmation for each website purchase (coin pack or season pass), with the order,
 *     the price and the exact words the player agreed to at checkout (payments.consent_text: immediate
 *     delivery and the end of the right of withdrawal; for a pass in its pre-sale, how to withdraw);
 *   - the acknowledgement of a withdrawal (./withdrawal.js).
 * In-app (Apple, Google Play) purchases get the store's own receipt; the stores sell those.
 *
 * Checked every few minutes: each email goes once (claimed in payments before sending, released if
 * Brevo refuses it). Only recent ones: switching email on later doesn't send old confirmations.
 */
const email = require('../email');
const templates = require('../email/templates');
const seasons = require('../seasons');
const config = require('../config');

const TZ = 'Europe/Stockholm';
const when = (t) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(t)).replace(/, /, ' at ') + ' (Swedish time)';
const money = (cents, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency: String(currency || 'USD').toUpperCase() }).format(cents / 100);
const site = () => (config.stripe.siteUrl || 'https://marblespins.com').replace(/\/$/, '');

/** The sentences the player agreed to, from the stored consent text ("[version] a / b"). */
function agreedOf(consentText) {
  return String(consentText || '').replace(/^\[[^\]]*\]\s*/, '').split(' / ').map((s) => s.trim()).filter(Boolean);
}

async function itemOf(db, pay) {
  if (!pay.season_key) return { item: `${Number(pay.coins).toLocaleString('en-US')} coins`, season: null };
  const season = await seasons.byKey(db, pay.season_key);
  return { item: season?.pass_name ?? 'Season pass', season };
}

/** The confirmation email's content for one paid payment row (with username). */
async function confirmationFor(db, pay) {
  const { item, season } = await itemOf(db, pay);
  const preSale = season && new Date(pay.paid_at) < new Date(season.starts_at);
  return templates.purchaseConfirmation({
    username: pay.username,
    orderNo: pay.order_no,
    item,
    price: `${money(pay.charged_cents ?? pay.amount_cents, pay.charged_currency ?? pay.currency)} incl. VAT`,
    paidAt: when(pay.paid_at),
    kind: !season ? 'coins' : preSale ? 'pre-sale-pass' : 'pass',
    activates: season ? when(season.starts_at) : null,
    agreed: agreedOf(pay.consent_text),
    purchasesUrl: `${site()}/purchases`,
    termsUrl: `${site()}/legal#sale`,
  });
}

async function withdrawalFor(db, pay) {
  const { item } = await itemOf(db, pay);
  return templates.withdrawalReceived({
    username: pay.username,
    orderNo: pay.order_no,
    item,
    price: money(pay.charged_cents ?? pay.amount_cents, pay.charged_currency ?? pay.currency),
    receivedAt: when(pay.withdrawn_at),
  });
}

/** Sends one kind: `column` claims the row, `where` picks them, `build` makes the email. → how many sent. */
async function sendKind(db, { column, where, build, tag }) {
  const { rows } = await db.query(
    `UPDATE payments p SET ${column} = now()
       FROM users u
      WHERE u.id = p.user_id AND NOT u.is_guest AND u.deleted_at IS NULL AND p.${column} IS NULL AND ${where}
      RETURNING p.*, u.username, u.email`,
  );
  let sent = 0;
  for (const pay of rows) {
    try {
      const { subject, html } = await build(db, pay);
      await email.send({ to: pay.email, toName: pay.username, subject, html, tags: [tag] });
      sent += 1;
    } catch (err) {
      await db.query(`UPDATE payments SET ${column} = NULL WHERE id = $1`, [pay.id]);
      console.error(`[payments] ${tag} email for ${pay.order_no} failed: ${err.message}`);
    }
  }
  return sent;
}

/** Sends what is due. → { confirmations, withdrawals } (nothing while email is off). */
async function sendDue(db) {
  if (!email.enabled()) return { confirmations: 0, withdrawals: 0 };
  const confirmations = await sendKind(db, {
    column: 'confirmation_sent_at',
    where: `p.status = 'paid' AND p.provider IN ('stripe', 'test') AND p.order_no IS NOT NULL AND p.paid_at > now() - interval '2 days'`,
    build: confirmationFor,
    tag: 'purchase-confirmation',
  });
  const withdrawals = await sendKind(db, {
    column: 'withdrawal_ack_sent_at',
    where: `p.withdrawn_at IS NOT NULL AND p.withdrawn_at > now() - interval '7 days'`,
    build: withdrawalFor,
    tag: 'withdrawal-received',
  });
  return { confirmations, withdrawals };
}

/** Every 2 minutes. */
function startJobs(db) {
  const run = () => sendDue(db).catch((err) => console.error('[payments] purchase emails failed', err.message));
  const timer = setInterval(run, 120_000);
  timer.unref?.();
  return timer;
}

module.exports = { agreedOf, confirmationFor, withdrawalFor, sendDue, startJobs };
