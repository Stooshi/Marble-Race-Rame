// Receipts and credit notes as issued (Moses, 16 Nov 2026, CRM phase 1): everything from the frozen snapshot, the
// seller's and buyer's fields from its list (so the accountant's answers need no client change), the player's
// receipt page and its links on /purchases, and the CRM's sidebar hiding what a role can't open.
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import BillingDocument from '../src/shared/billing/BillingDocument';

const seller = { fields: ['name', 'orgNo', 'vatNo', 'address', 'email'], name: 'Voltron Robotics AB', orgNo: '559344-3756', vatNo: 'SE559344375601', address: 'Drivhjulsvägen 20, 126 30 Hägersten, Sweden', email: 'support@marblespins.com' };
const receipt = {
  number: 'K-2026-00001', kind: 'receipt', title: 'Receipt', date: '2026-11-16', orderNo: 'MS-1042', currency: 'EUR',
  seller, buyer: { fields: ['name', 'email'], name: 'Ada', email: 'ada@example.com' },
  lines: [{ description: '1,000 coins', qty: 1, grossCents: 1090, netCents: 872, vatCents: 218, vatRate: 25 }],
  totals: { grossCents: 1090, netCents: 872, vatCents: 218 }, vat: { country: 'SE', rate: 25, note: null }, paidWith: 'Card or wallet, through Stripe',
};

describe('a document', () => {
  it('shows the seller, the buyer, the lines and the totals from the snapshot', () => {
    const html = renderToString(<BillingDocument doc={receipt} />).replace(/<!-- -->/g, '');
    for (const s of ['K-2026-00001', 'MS-1042', '16 November 2026', 'Voltron Robotics AB', '559344-3756', 'SE559344375601', 'Hägersten', 'Ada', 'ada@example.com', '1,000 coins', '€10.90', '€8.72', '€2.18', 'Total paid', 'Card or wallet, through Stripe']) expect(html).toContain(s);
  });
  it('a field added later (an F-skatt line) shows without a client change', () => {
    const html = renderToString(<BillingDocument doc={{ ...receipt, seller: { ...seller, fields: [...seller.fields, 'fSkatt'], fSkatt: 'Godkänd för F-skatt' } }} />).replace(/<!-- -->/g, '');
    expect(html).toContain('Godkänd för F-skatt');
  });
  it('a credit note: negative amounts, what it credits, the reason', () => {
    const credit = { ...receipt, number: 'KR-2026-00001', kind: 'credit', title: 'Credit note', credits: { number: 'K-2026-00001', date: '2026-11-16' }, reason: 'Bought by mistake', lines: [{ ...receipt.lines[0], description: '1,000 coins (refund)', grossCents: -1090, netCents: -872, vatCents: -218 }], totals: { grossCents: -1090, netCents: -872, vatCents: -218 } };
    const html = renderToString(<BillingDocument doc={credit} />).replace(/<!-- -->/g, '');
    for (const s of ['Credit note', 'KR-2026-00001', 'K-2026-00001 of 16 November 2026', 'Bought by mistake', 'Refunded', '-€10.90']) expect(html).toContain(s);
  });
});

describe('where documents are reached', () => {
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
  it('the player page /purchases/receipt/:number (the confirmation email links there) and the links on /purchases', () => {
    expect(read('../src/App.jsx')).toMatch(/path="\/purchases\/receipt\/:number"/);
    expect(read('../src/site/pages/PurchasesPage.jsx')).toMatch(/\/purchases\/receipt\/\$\{encodeURIComponent\(d\.number\)\}/);
  });
  it('/purchases (Moses, 16 Nov 2026): an Item column, our receipt first (Stripe\'s a small second link), test orders marked with no receipt, the paid banner links our receipt', () => {
    const page = read('../src/site/pages/PurchasesPage.jsx');
    expect(page).toContain('<th>Item</th>');
    expect(page).not.toContain('<th className="num">Coins</th>');
    expect(page).toMatch(/if \(o\.test\) return 'Test · not charged'/);
    expect(page).toMatch(/\{o\.test \? '—' :/);
    expect(page).toContain("Stripe's payment receipt");
    expect(page).toMatch(/Your receipt: <Link to=\{`\/purchases\/receipt\//);
    expect(page).not.toMatch(/Stripe has emailed/);
    const receipt = read('../src/site/pages/ReceiptPage.jsx');
    expect(receipt).toContain('This receipt belongs to another account');
  });
  it('the CRM: each sidebar item names the permission it needs; the preview address leads to the CRM', () => {
    const crm = read('../src/admin/Crm.jsx');
    const nav = crm.slice(crm.indexOf('const NAV = ['), crm.indexOf('];', crm.indexOf('const NAV = [')));
    expect(nav.match(/\{ to: /g).length).toBe(nav.match(/need: \[?'/g).length); // (one permission, or a list where any one will do)
    expect(crm).toMatch(/NAV\.filter\(\(n\) => can\(n\.need\)\)/);
    expect(read('../src/admin/AdminApp.jsx')).toMatch(/preview-crm.*Navigate/s);
  });
});
