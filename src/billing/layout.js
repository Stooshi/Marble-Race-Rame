'use strict';

/**
 * What a receipt or credit note shows, and what the monthly export holds (Moses, 16 Nov 2026: decisions D1–D3
 * are with the accountant, so these are settings, changed here without touching the rest of billing).
 *
 * A document is frozen when it is issued (billing_documents.snapshot), including which of these fields it
 * shows: a change here applies to documents issued after it, never to old ones.
 */
const company = require('../../client/src/shared/company.json');

/** The number series (D5, Moses: separate series): K-2026-00001 receipts, KR-2026-00001 credit notes, per year. */
const SERIES = { receipt: 'K', credit: 'KR' };
const NUMBER_DIGITS = 5;

const TITLES = { receipt: 'Receipt', credit: 'Credit note' };

/**
 * The seller's lines on every document, in order (mervärdesskattelagen 17 kap.: name, address, VAT number;
 * Bokföringslagen: the organisation number). `fSkatt` waits for D2 (is Voltron Robotics AB approved for
 * F-skatt?): switch `show` on once the accountant confirms.
 */
const SELLER = {
  name: company.name,
  orgNo: company.orgNo,
  vatNo: company.vatNo,
  address: `${company.street}, ${company.postcode} ${company.city}, ${company.country}`,
  email: company.supportEmail,
};
const F_SKATT = { show: false, text: 'Godkänd för F-skatt' };
const SELLER_FIELDS = ['name', 'orgNo', 'vatNo', 'address', 'email'];

/** What a document says about the buyer (consumers: no address is needed). */
const BUYER_FIELDS = ['name', 'email'];

/** How it was paid, as the document says it. */
const PAID_WITH = 'Card or wallet, through Stripe';

/** The EU's member states: a sale to them carries VAT (OSS); outside, none is charged. */
const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
const VAT_NOTES = {
  outsideEu: 'VAT: not applicable (sale outside the EU).',
  zero: 'VAT: 0%.',
};

/** Where the player reads their documents (the website's Purchases page). */
const PLAYER_PATH = (number) => `/purchases/receipt/${encodeURIComponent(number)}`;

/**
 * The monthly export's columns (D1: the accountant may want others or another order; SIE 4 is D7).
 * `doc` is a billing_documents row joined with its payment's order number; amounts in cents become
 * decimals with a full stop.
 */
const cents = (v) => (v == null ? '' : (Number(v) / 100).toFixed(2));
const EXPORT_COLUMNS = [
  ['Number', (d) => d.number],
  ['Kind', (d) => (d.kind === 'receipt' ? 'Receipt' : 'Credit note')],
  ['Date', (d) => d.date],
  ['Order', (d) => d.order_no],
  ['Credits', (d) => d.credits_number ?? ''],
  ['Currency', (d) => d.currency],
  ['Gross', (d) => cents(d.gross_cents)],
  ['Net', (d) => cents(d.net_cents)],
  ['VAT', (d) => cents(d.vat_cents)],
  ['VAT rate %', (d) => (d.vat_rate == null ? '' : Number(d.vat_rate).toFixed(2))],
  ['VAT country', (d) => d.vat_country ?? ''],
  ['Book currency', (d) => d.book_currency ?? ''],
  ['Book gross', (d) => cents(d.book_gross_cents)],
  ['Stripe fee', (d) => cents(d.book_fee_cents)],
  ['Payment intent', (d) => d.payment_intent ?? ''],
];
/** The VAT summary's columns: one row per VAT country, rate and currency (for the VAT and OSS returns). */
const VAT_COLUMNS = [
  ['VAT country', (r) => r.vat_country ?? ''],
  ['VAT rate %', (r) => (r.vat_rate == null ? '' : Number(r.vat_rate).toFixed(2))],
  ['Currency', (r) => r.currency],
  ['Documents', (r) => r.documents],
  ['Gross', (r) => cents(r.gross_cents)],
  ['Net', (r) => cents(r.net_cents)],
  ['VAT', (r) => cents(r.vat_cents)],
  ['Book currency', (r) => r.book_currency ?? ''],
  ['Book gross', (r) => cents(r.book_gross_cents)],
];

module.exports = {
  SERIES, NUMBER_DIGITS, TITLES, SELLER, F_SKATT, SELLER_FIELDS, BUYER_FIELDS, PAID_WITH, EU, VAT_NOTES, PLAYER_PATH,
  EXPORT_COLUMNS, VAT_COLUMNS,
};
