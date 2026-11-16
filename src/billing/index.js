'use strict';

/**
 * Billing (Moses, 16 Nov 2026, CRM phase 1): receipts and credit notes for Stripe purchases (./documents.js),
 * their bookkeeping amounts in SEK from Stripe (./book.js), the monthly export (./exporting.js), and what they
 * show (./layout.js, changed there when the accountant answers D1–D3).
 *
 * Jobs (startJobs): at start-up, issue what is missing (live purchases from before billing); every 5 minutes,
 * the book amounts, and the credit notes' emails.
 */
const email = require('../email');
const templates = require('../email/templates');
const library = require('../email/library');
const config = require('../config');
const documents = require('./documents');
const book = require('./book');
const exporting = require('./exporting');
const layout = require('./layout');

const site = () => (config.stripe.siteUrl || 'https://marblespins.com').replace(/\/$/, '');
const money = (cents, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency: String(currency || 'USD').toUpperCase() }).format(cents / 100);

/** The receipt of a payment (for the purchase confirmation email): { number, url } or null. */
async function receiptLink(db, paymentId) {
  const { rows: [d] } = await db.query(`SELECT number FROM billing_documents WHERE payment_id = $1 AND kind = 'receipt'`, [paymentId]);
  return d ? { number: d.number, url: `${site()}${layout.PLAYER_PATH(d.number)}` } : null;
}

/** Emails the credit notes not yet sent (issued in the last 2 days). → how many sent. */
async function sendCreditNotes(db) {
  if (!email.enabled()) return 0;
  const { rows } = await db.query(
    `UPDATE billing_documents d SET emailed_at = now()
       FROM users u
      WHERE d.kind = 'credit' AND d.emailed_at IS NULL AND d.created_at > now() - interval '2 days'
        AND u.id = d.user_id AND NOT u.is_guest AND u.deleted_at IS NULL AND u.email IS NOT NULL
      RETURNING d.id, d.number, d.snapshot, d.gross_cents, d.currency, d.user_id, u.username, u.email`,
  );
  let sent = 0;
  for (const d of rows) {
    try {
      const s = d.snapshot;
      const o = {
        username: d.username, number: d.number, orderNo: s.orderNo, item: s.lines[0]?.description ?? '',
        amount: money(-d.gross_cents, d.currency), receiptNumber: s.credits?.number ?? '', url: `${site()}${s.playerPath}`, chargeback: s.what === 'chargeback',
      };
      const msg = await library.compose(db, 'credit-note', {
        values: { name: d.username, number: d.number, order_no: s.orderNo }, core: templates.cores.creditCore(o), fallback: () => templates.creditNote(o),
      });
      await email.send({ to: d.email, toName: d.username, subject: msg.subject, html: msg.html, tags: ['credit-note'], userId: d.user_id, templateVersion: msg.templateVersion });
      sent += 1;
    } catch (err) {
      await db.query('UPDATE billing_documents SET emailed_at = NULL WHERE id = $1', [d.id]);
      console.error(`[billing] credit note ${d.number} email failed: ${err.message}`);
    }
  }
  return sent;
}

function startJobs(db) {
  documents.issueMissing(db)
    .then((n) => { if (n.receipts || n.credits) console.log(`[billing] issued ${n.receipts} missing receipt(s) and ${n.credits} credit note(s)`); })
    .catch((err) => console.error('[billing] issuing missing documents failed', err.message));
  const run = async () => {
    try { await book.fillBook(db); } catch (err) { console.error('[billing] book amounts failed', err.message); }
    try { await sendCreditNotes(db); } catch (err) { console.error('[billing] credit note emails failed', err.message); }
  };
  setTimeout(run, 30_000).unref?.();
  const timer = setInterval(run, 5 * 60_000);
  timer.unref?.();
  return timer;
}

module.exports = { ...documents, ...exporting, fillBook: book.fillBook, receiptLink, sendCreditNotes, startJobs, layout };
