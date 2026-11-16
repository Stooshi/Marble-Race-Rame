import './billingDocument.css';
import { vatView } from './vatView';

/**
 * A receipt (K-…) or credit note (KR-…) as it was issued: everything comes from the document's frozen snapshot
 * (src/billing/documents.js on the server), so it shows the same years later. The seller's and buyer's fields
 * are listed in the snapshot (`fields`), so the accountant's answers (D1–D3: an F-skatt line, more buyer
 * details) need no change here: a new field shows with its label below, or its own name.
 * Used on the player's receipt page (/purchases/receipt/:number) and in the back office's Billing.
 */
const LABELS = { orgNo: 'Org. no', vatNo: 'VAT no', address: '', email: '', fSkatt: '', name: '', username: 'Player name' };

export function docMoney(cents, currency) {
  if (cents == null || !currency) return '—';
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: String(currency).toUpperCase() }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${String(currency).toUpperCase()}`;
  }
}
const longDate = (d) => {
  if (!d) return '—';
  const t = new Date(`${d}T12:00:00Z`);
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};

function Party({ who, title }) {
  if (!who) return null;
  const fields = who.fields ?? Object.keys(who).filter((k) => k !== 'fields');
  return (
    <div className="bdoc__party">
      <span className="bdoc__label">{title}</span>
      {fields.filter((f) => who[f]).map((f) => (
        f === 'name'
          ? <b key={f}>{who[f]}</b>
          : <span key={f}>{LABELS[f] ?? f}{(LABELS[f] ?? f) ? ' ' : ''}{who[f]}</span>
      ))}
    </div>
  );
}

export default function BillingDocument({ doc }) {
  if (!doc) return null;
  const credit = doc.kind === 'credit';
  const cur = doc.currency;
  const t = doc.totals ?? {};
  const vat = vatView(doc);
  const money = (c) => docMoney(c, cur);
  return (
    <article className={`bdoc${credit ? ' bdoc--credit' : ''}`} aria-label={`${doc.title ?? (credit ? 'Credit note' : 'Receipt')} ${doc.number}`}>
      <header className="bdoc__head">
        <div>
          <span className="bdoc__kind">{doc.title ?? (credit ? 'Credit note' : 'Receipt')}</span>
          <h2 className="bdoc__no">{doc.number}</h2>
          <dl className="bdoc__meta">
            <div><dt>Date</dt><dd>{longDate(doc.date)}</dd></div>
            {doc.orderNo && <div><dt>Order</dt><dd>{doc.orderNo}</dd></div>}
            {credit && doc.credits && <div><dt>Credits</dt><dd>{doc.credits.number} of {longDate(doc.credits.date)}</dd></div>}
          </dl>
        </div>
        <Party who={doc.seller} title="From" />
      </header>
      <Party who={doc.buyer} title="To" />
      <div className="bdoc__scroll">
        <table className="bdoc__table">
          <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Excl. VAT</th><th className="num">VAT</th><th className="num">Total</th></tr></thead>
          <tbody>
            {(doc.lines ?? []).map((l, k) => (
              <tr key={k}>
                <td>{l.description}</td>
                <td className="num">{l.qty}</td>
                <td className="num">{docMoney(l.netCents, cur)}</td>
                <td className="num">{vat.lineVat(l, money)}</td>
                <td className="num">{docMoney(l.grossCents, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bdoc__totals">
        <span>Excl. VAT <b>{docMoney(t.netCents, cur)}</b></span>
        <span>{vat.totalLabel} <b>{docMoney(t.vatCents ?? 0, cur)}</b></span>
        <span className="bdoc__grand">{credit ? 'Refunded' : 'Total paid'} <b>{docMoney(t.grossCents, cur)}</b></span>
      </div>
      {vat.note && <p className="bdoc__note">{vat.note}</p>}
      {vat.countryLine && <p className="bdoc__note">{vat.countryLine}</p>}
      {credit && doc.reason && <p className="bdoc__note">Reason: {doc.reason}</p>}
      {doc.paidWith && <p className="bdoc__note">{credit ? 'Refunded to' : 'Paid with'}: {doc.paidWith.replace(/^Card or wallet, through Stripe$/, credit ? 'the card or wallet it was paid with, through Stripe' : doc.paidWith)}</p>}
    </article>
  );
}
