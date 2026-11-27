'use strict';

// Receipts and credit notes as A4 PDFs, and their VAT lines (Moses, 16 Nov 2026): a rate only with VAT charged;
// no VAT → only 0% or "not applicable" with the country; the page and the PDF follow the same rules.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { vatView } = require('../src/billing/vatView');
const { pdfOf, fileName, pdfText } = require('../src/billing/pdf');
const layout = require('../src/billing/layout');

const money = (c) => `€${(c / 100).toFixed(2)}`;
const seller = { fields: layout.SELLER_FIELDS, ...layout.SELLER };
const doc = (over) => ({
  number: 'K-2026-00001', kind: 'receipt', title: 'Receipt', date: '2026-11-16', orderNo: 'MS-1002', seller,
  buyer: { fields: ['name', 'email'], name: 'Ada', email: 'ada@example.com' }, currency: 'EUR', paidWith: 'Card or wallet, through Stripe',
  lines: [{ description: '5,000 coins', qty: 1, grossCents: 999, netCents: 999, vatCents: 0, vatRate: 0 }],
  totals: { grossCents: 999, netCents: 999, vatCents: 0 }, vat: { country: null, rate: 0, note: null }, ...over,
});
const CASES = {
  // K-2026-00001 as issued: Stripe named a US rate it didn't collect.
  usUncollected: doc({ currency: 'USD', lines: [{ description: '5,000 coins', qty: 1, grossCents: 999, netCents: 999, vatCents: 0, vatRate: 6.63 }], vat: { country: 'US', rate: 6.63, note: 'VAT: not applicable (sale outside the EU).' } }),
  swedish: doc({ currency: 'SEK', lines: [{ description: '5,000 coins', qty: 1, grossCents: 10900, netCents: 8720, vatCents: 2180, vatRate: 25 }], totals: { grossCents: 10900, netCents: 8720, vatCents: 2180 }, vat: { country: 'SE', rate: 25, note: null } }),
  euZero: doc({ vat: { country: 'DE', rate: 19, note: null } }),
  unknown: doc({}),
  credit: doc({ kind: 'credit', title: 'Credit note', number: 'KR-2026-00001', credits: { number: 'K-2026-00001', date: '2026-11-16' }, reason: 'Bought by mistake', lines: [{ description: '5,000 coins (refund)', qty: 1, grossCents: -10900, netCents: -8720, vatCents: -2180, vatRate: 25 }], totals: { grossCents: -10900, netCents: -8720, vatCents: -2180 }, vat: { country: 'SE', rate: 25, note: null } }),
};

test('VAT lines: a rate only with an amount; no VAT is 0% or not applicable, never "6.63% · $0.00"', () => {
  const us = vatView(CASES.usUncollected);
  assert.equal(us.lineVat(CASES.usUncollected.lines[0], money), 'Not applicable');
  assert.equal(us.totalLabel, 'VAT (not applicable)');
  assert.equal(us.note, 'VAT: not applicable (sale outside the EU, customer country US).');
  assert.equal(us.countryLine, null);
  const se = vatView(CASES.swedish);
  assert.equal(se.lineVat(CASES.swedish.lines[0], money), '25% · €21.80');
  assert.equal(se.totalLabel, 'VAT 25%');
  assert.equal(se.note, null);
  assert.equal(se.countryLine, 'VAT country: SE');
  const de = vatView(CASES.euZero);
  assert.deepEqual([de.lineVat(CASES.euZero.lines[0], money), de.totalLabel, de.note, de.countryLine], ['0%', 'VAT 0%', 'VAT: 0%.', null]);
  for (const d of Object.values(CASES)) {
    const v = vatView(d);
    for (const l of d.lines) assert.doesNotMatch(v.lineVat(l, money), /\d%.*0\.00/, 'a rate with a zero amount');
    if (!v.charged) assert.doesNotMatch(v.totalLabel, /[1-9]\d*(\.\d+)?%/);
  }
});

test('the page and the PDF use the same VAT rules (client/src/shared/billing/vatView.js)', async () => {
  const client = await import(pathToFileURL(path.join(__dirname, '../client/src/shared/billing/vatView.js')).href);
  for (const [name, d] of Object.entries(CASES)) {
    const a = vatView(d);
    const b = client.vatView(d);
    assert.deepEqual({ ...a, lineVat: d.lines.map((l) => a.lineVat(l, money)) }, { ...b, lineVat: d.lines.map((l) => b.lineVat(l, money)) }, name);
  }
});

test('an A4 PDF of each, named by its number', async () => {
  for (const d of Object.values(CASES)) {
    const pdf = await pdfOf(d);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.match(pdf.toString('latin1'), /\/MediaBox \[0 0 595\.28 841\.89\]/); // (A4)
    assert.ok(pdf.length > 1500);
  }
  assert.equal(fileName(CASES.credit), 'Marble-Spins-KR-2026-00001.pdf');
  assert.equal(pdfText('Hägersten − 5 000 kr'), 'Hägersten - 5 000 kr');
});
