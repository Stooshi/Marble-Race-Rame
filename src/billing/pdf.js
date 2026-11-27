'use strict';

/**
 * A receipt (K-…) or credit note (KR-…) as an A4 PDF (Moses, 16 Nov 2026): the same content and order as the page
 * (client/src/shared/billing/BillingDocument.jsx), from the document's frozen snapshot: the title and number, date,
 * order (and what a credit note credits), the seller (Voltron Robotics AB: org.nr, VAT no, address, email) and the
 * buyer, the lines, the totals, the VAT lines (./vatView.js, the page's rules), how it was paid. Downloaded from the
 * receipt page (GET /api/payments/documents/:number/pdf) and attached to the purchase and credit-note emails.
 *
 *   await pdfOf(doc) → Buffer          (doc: publicDocument(row), as the page gets it)
 *   fileName(doc) → 'Marble-Spins-K-2026-00001.pdf'
 */
const PDFDocument = require('pdfkit');
const { vatView } = require('./vatView');

const LABELS = { orgNo: 'Org. no', vatNo: 'VAT no', address: '', email: '', fSkatt: '', name: '', username: 'Player name' };
const INK = '#1b1f2a';
const SOFT = '#6b7280';
const LINE = '#d9dde5';
const ACCENT = '#0e1320';

function docMoney(cents, currency) {
  if (cents == null || !currency) return '—';
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: String(currency).toUpperCase() }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${String(currency).toUpperCase()}`;
  }
}
function longDate(d) {
  if (!d) return '—';
  const t = new Date(`${d}T12:00:00Z`);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
/** The built-in PDF font covers Western European letters (å, ä, ö, é, €); anything else becomes its nearest. */
const pdfText = (s) => String(s ?? '')
  .replace(/[−‒–]/g, '-').replace(/ | /g, ' ')
  .normalize('NFKC').replace(/[^\u0000-ÿ€•·—–‘’“”…]/g, '?');

const partyLines = (who) => {
  if (!who) return [];
  const fields = who.fields ?? Object.keys(who).filter((k) => k !== 'fields');
  return fields.filter((f) => who[f]).map((f) => ({ bold: f === 'name', text: f === 'name' ? who[f] : `${LABELS[f] ?? f}${(LABELS[f] ?? f) ? ' ' : ''}${who[f]}` }));
};

function pdfOf(doc) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 }, info: { Title: `${doc.title ?? 'Receipt'} ${doc.number}`, Author: doc.seller?.name ?? 'Marble Spins' } });
    const chunks = [];
    pdf.on('data', (c) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    try {
      draw(pdf, doc);
      pdf.end();
    } catch (err) {
      reject(err);
    }
  });
}

function draw(pdf, doc) {
  const credit = doc.kind === 'credit';
  const cur = doc.currency;
  const money = (c) => docMoney(c, cur);
  const t = doc.totals ?? {};
  const vat = vatView(doc);
  const left = pdf.page.margins.left;
  const width = pdf.page.width - left - pdf.page.margins.right;
  const T = (s) => pdfText(s);

  // The head: the kind and number, date and order, on the left; the seller on the right.
  const top = pdf.y;
  pdf.font('Helvetica-Bold').fontSize(10).fillColor(SOFT).text(T((doc.title ?? (credit ? 'Credit note' : 'Receipt')).toUpperCase()), left, top, { characterSpacing: 1 });
  pdf.font('Helvetica-Bold').fontSize(22).fillColor(ACCENT).text(T(doc.number), left, pdf.y + 2);
  pdf.moveDown(0.6);
  const meta = [['Date', longDate(doc.date)], ...(doc.orderNo ? [['Order', doc.orderNo]] : []), ...(credit && doc.credits ? [['Credits', `${doc.credits.number} of ${longDate(doc.credits.date)}`]] : [])];
  for (const [k, v] of meta) {
    const y = pdf.y;
    pdf.font('Helvetica').fontSize(10).fillColor(SOFT).text(T(k), left, y, { width: 60 });
    pdf.font('Helvetica').fontSize(10).fillColor(INK).text(T(v), left + 62, y, { width: 200 });
  }
  const leftBottom = pdf.y;
  const sx = left + width * 0.55;
  const sw = width * 0.45;
  pdf.font('Helvetica-Bold').fontSize(9).fillColor(SOFT).text('FROM', sx, top, { width: sw, characterSpacing: 1 });
  for (const l of partyLines(doc.seller)) pdf.font(l.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(INK).text(T(l.text), sx, pdf.y + 1, { width: sw });
  pdf.y = Math.max(leftBottom, pdf.y) + 22;

  // The buyer.
  pdf.font('Helvetica-Bold').fontSize(9).fillColor(SOFT).text('TO', left, pdf.y, { characterSpacing: 1 });
  for (const l of partyLines(doc.buyer)) pdf.font(l.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(INK).text(T(l.text), left, pdf.y + 1, { width: width * 0.6 });
  pdf.moveDown(1.4);

  // The lines.
  const cols = [
    { h: 'Item', w: 0.40, align: 'left' }, { h: 'Qty', w: 0.08, align: 'right' }, { h: 'Excl. VAT', w: 0.17, align: 'right' },
    { h: 'VAT', w: 0.18, align: 'right' }, { h: 'Total', w: 0.17, align: 'right' },
  ];
  const row = (cells, { bold = false, color = INK, size = 10 } = {}) => {
    const y = pdf.y;
    let x = left;
    let h = 0;
    cells.forEach((c, i) => {
      const w = cols[i].w * width;
      pdf.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color);
      h = Math.max(h, pdf.heightOfString(T(c), { width: w - 8 }));
      pdf.text(T(c), x + (i ? 4 : 0), y, { width: w - 8, align: cols[i].align });
      x += w;
    });
    pdf.y = y + h + 6;
  };
  row(cols.map((c) => c.h), { bold: true, color: SOFT, size: 9 });
  pdf.moveTo(left, pdf.y - 2).lineTo(left + width, pdf.y - 2).lineWidth(0.8).strokeColor(LINE).stroke();
  pdf.y += 4;
  for (const l of doc.lines ?? []) row([l.description, String(l.qty), money(l.netCents), vat.lineVat(l, money), money(l.grossCents)]);
  pdf.moveTo(left, pdf.y).lineTo(left + width, pdf.y).lineWidth(0.8).strokeColor(LINE).stroke();
  pdf.moveDown(0.8);

  // The totals, on the right.
  const tx = left + width * 0.5;
  const tw = width * 0.5;
  const total = (k, v, bold = false, size = 10) => {
    const y = pdf.y;
    pdf.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(bold ? INK : SOFT).text(T(k), tx, y, { width: tw * 0.6 });
    pdf.font('Helvetica-Bold').fontSize(size).fillColor(INK).text(T(v), tx + tw * 0.6, y, { width: tw * 0.4, align: 'right' });
    pdf.y = y + size + 7;
  };
  total('Excl. VAT', money(t.netCents));
  total(vat.totalLabel, money(t.vatCents ?? 0));
  pdf.moveTo(tx, pdf.y).lineTo(left + width, pdf.y).lineWidth(0.8).strokeColor(LINE).stroke();
  pdf.y += 5;
  total(credit ? 'Refunded' : 'Total paid', money(t.grossCents), true, 12);
  pdf.moveDown(1);

  // The notes: VAT, the reason (credit notes), how it was paid.
  const note = (s) => pdf.font('Helvetica').fontSize(9.5).fillColor(SOFT).text(T(s), left, pdf.y, { width });
  if (vat.note) note(vat.note);
  if (vat.countryLine) note(vat.countryLine);
  if (credit && doc.reason) note(`Reason: ${doc.reason}`);
  if (doc.paidWith) note(`${credit ? 'Refunded to' : 'Paid with'}: ${credit && doc.paidWith === 'Card or wallet, through Stripe' ? 'the card or wallet it was paid with, through Stripe' : doc.paidWith}`);

  // The foot: where the document lives.
  const foot = pdf.page.height - pdf.page.margins.bottom - 14;
  pdf.font('Helvetica').fontSize(8.5).fillColor(SOFT).text(T(`${doc.seller?.name ?? 'Marble Spins'} · Marble Spins · marblespins.com${doc.playerPath ? ` · marblespins.com${doc.playerPath}` : ''}`), left, foot, { width, align: 'center', lineBreak: false });
}

const fileName = (doc) => `Marble-Spins-${String(doc.number).replace(/[^A-Z0-9-]/gi, '')}.pdf`;

module.exports = { pdfOf, fileName, pdfText };
