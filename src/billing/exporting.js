'use strict';

/**
 * The monthly export for the accountant (Moses, 16 Nov 2026; D1: the format may change, so the columns are in
 * ./layout.js): every receipt and credit note of a month (Swedish time) as CSV, and a VAT summary per country,
 * rate and currency. Credit notes are negative, so the sums are net of refunds.
 */
const layout = require('./layout');

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

function monthRange(month) {
  const m = MONTH.exec(String(month ?? ''));
  if (!m) return null;
  const next = Number(m[2]) === 12 ? `${Number(m[1]) + 1}-01` : `${m[1]}-${String(Number(m[2]) + 1).padStart(2, '0')}`;
  return { from: `${month}-01`, to: `${next}-01` };
}

// (Never a test order's document: Moses, 18 Nov 2026, MS-1001. A test order gets none from then on; this keeps one
// issued before out of the exports, the VAT summary and the totals.)
const IN_MONTH = `(d.issued_at AT TIME ZONE 'Europe/Stockholm') >= $1::date AND (d.issued_at AT TIME ZONE 'Europe/Stockholm') < $2::date
  AND NOT EXISTS (SELECT 1 FROM payments tp WHERE tp.id = d.payment_id AND tp.is_test)`;

async function documentsOf(db, month) {
  const r = monthRange(month);
  const { rows } = await db.query(
    `SELECT d.*, to_char(d.issued_at AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD') AS date, p.order_no, p.payment_intent, c.number AS credits_number
       FROM billing_documents d JOIN payments p ON p.id = d.payment_id LEFT JOIN billing_documents c ON c.id = d.credits_document_id
      WHERE ${IN_MONTH} ORDER BY d.kind DESC, d.number`,
    [r.from, r.to],
  );
  return rows;
}

async function vatSummary(db, month) {
  const r = monthRange(month);
  const { rows } = await db.query(
    `SELECT d.vat_country, d.vat_rate, d.currency, COUNT(*)::int AS documents, SUM(d.gross_cents)::int AS gross_cents,
            SUM(d.net_cents)::int AS net_cents, SUM(d.vat_cents)::int AS vat_cents,
            MAX(d.book_currency) AS book_currency, SUM(d.book_gross_cents)::int AS book_gross_cents
       FROM billing_documents d WHERE ${IN_MONTH}
      GROUP BY d.vat_country, d.vat_rate, d.currency ORDER BY d.vat_country NULLS LAST, d.vat_rate, d.currency`,
    [r.from, r.to],
  );
  return rows;
}

/** The month's totals for the Billing page: per currency, and in the book currency (SEK) with Stripe's fees. */
async function monthTotals(db, month) {
  const r = monthRange(month);
  const { rows: [t] } = await db.query(
    `SELECT COUNT(*)::int AS documents, COUNT(*) FILTER (WHERE kind = 'receipt')::int AS receipts, COUNT(*) FILTER (WHERE kind = 'credit')::int AS credits,
            COALESCE(SUM(book_gross_cents), 0)::int AS book_gross_cents, COALESCE(SUM(book_fee_cents), 0)::int AS book_fee_cents,
            COUNT(*) FILTER (WHERE book_filled_at IS NULL)::int AS book_missing, MAX(book_currency) AS book_currency
       FROM billing_documents d WHERE ${IN_MONTH}`,
    [r.from, r.to],
  );
  return t;
}

function csv(columns, rows) {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return `${[columns.map(([h]) => cell(h)).join(','), ...rows.map((row) => columns.map(([, f]) => cell(f(row))).join(','))].join('\n')}\n`;
}

const exportDocuments = async (db, month) => csv(layout.EXPORT_COLUMNS, await documentsOf(db, month));
const exportVat = async (db, month) => csv(layout.VAT_COLUMNS, await vatSummary(db, month));

module.exports = { MONTH, monthRange, documentsOf, vatSummary, monthTotals, csv, exportDocuments, exportVat };
