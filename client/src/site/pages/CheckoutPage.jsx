import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ITEM, priceLabel } from '../../shared/marbles';
import { CREDIT_PACKS, PACK } from '../../shared/payments/packs';
import MarbleBadge from '../marbles/MarbleBadge';
import { useCollection } from '../marbles/useCollection';
import { STORE_NAME, buyCredits, storeProvider } from '../payments';

/**
 * Checkout. ?pack=credits-10 buys credits (Stripe on the web, the App Store or
 * Google Play in the apps); ?item=<limited marble> spends credits on it.
 */
export default function CheckoutPage() {
  const [search] = useSearchParams();
  const { isAuthenticated, user, refreshUser } = useAuth();
  const item = ITEM[search.get('item')];
  const pack = PACK[search.get('pack')] ?? (item ? null : PACK['credits-10']);
  const { buy } = useCollection();
  const [withdrawal, setWithdrawal] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const provider = storeProvider();
  const web = provider === 'stripe' || provider === 'test';

  if (!isAuthenticated) {
    return (
      <div className="ms-page ms-page--narrow">
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <h1 className="ms-h2">Checkout</h1>
          <p className="ms-lede" style={{ margin: 0 }}>Log in or make a free account first, so your credits and marbles are saved to you.</p>
          <div className="ms-row"><Link to={`/signup?next=${encodeURIComponent(`/checkout?${search}`)}`} className="ms-btn ms-btn--primary">SIGN UP</Link><Link to={`/signup?mode=login&next=${encodeURIComponent(`/checkout?${search}`)}`} className="ms-btn">Log in</Link></div>
        </div>
      </div>
    );
  }

  // Spending credits on a limited marble.
  if (item) {
    const cost = item.price.credits;
    const enough = cost != null && (user?.credits ?? 0) >= cost;
    const spend = async () => {
      setBusy(true);
      try {
        const { copy } = await buy(item.slug);
        setResult({ ok: true, copy });
      } catch (err) {
        setResult({ ok: false, message: err.message });
      } finally {
        setBusy(false);
      }
    };
    return (
      <div className="ms-page ms-page--narrow">
        <div className="ms-two">
          <section className="ms-card" style={{ display: 'grid', gap: 14 }} aria-labelledby="pay-h">
            <h1 id="pay-h" className="ms-h2" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>Checkout</h1>
            <p style={{ margin: 0, color: 'var(--ms-soft)' }}>
              You have <b>◆ {user?.credits ?? 0} credits</b>. {cost == null ? 'This marble has no price yet: it goes on sale once its price is set.' : enough ? 'Spending them adds the marble to your Marble Bag at once.' : 'Top up with a credit pack first.'}
            </p>
            {result?.ok && <div className="ms-msg" role="status">It's yours{result.copy.editionNo ? <>: <b>#{String(result.copy.editionNo).padStart(3, '0')}</b></> : ''}. <Link to={`/certificate/${result.copy.marbleCode}`}>See its certificate</Link></div>}
            {result && !result.ok && <div className="ms-msg ms-msg--bad" role="alert">{result.message}</div>}
            {!result?.ok && (enough
              ? <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" disabled={busy} onClick={spend}>{busy ? 'BUYING…' : `SPEND ◆ ${cost} CREDITS`}</button>
              : <div className="ms-row">{CREDIT_PACKS.map((p) => <Link key={p.id} to={`/checkout?pack=${p.id}`} className="ms-btn ms-btn--sm">◆ {p.credits} · {p.priceLabel}</Link>)}</div>)}
          </section>
          <aside className="ms-card" aria-label="Order summary" style={{ display: 'grid', gap: 12, justifyItems: 'center', textAlign: 'center' }}>
            <span className="ms-eyebrow">Your order</span>
            <MarbleBadge slug={item.slug} size={120} label={item.design.name} />
            <b style={{ fontSize: '1.2rem' }}>{item.design.name}</b>
            <span className="ms-coins" style={{ color: '#3DB5FF', fontSize: '1.3rem' }}>{priceLabel(item.price)}</span>
            <span className="ms-note">Numbered limited edition. Never sold again once the month is over.</span>
          </aside>
        </div>
      </div>
    );
  }

  const pay = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await buyCredits(pack);
      if (r.status === 'paid') await refreshUser();
      setResult(r);
    } catch (err) {
      setResult({ status: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };
  const ready = withdrawal && terms && !busy;

  return (
    <div className="ms-page ms-page--narrow">
      <div className="ms-two">
        <section className="ms-card" style={{ display: 'grid', gap: 16, flexBasis: 420 }} aria-labelledby="pay-h">
          <h1 id="pay-h" className="ms-h2" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>Checkout</h1>
          <div style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontWeight: 700 }}>Payment</span>
            <div style={{ border: '1px dashed var(--ms-border)', borderRadius: 14, padding: 18, color: 'var(--ms-muted)', minHeight: 120, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
              {web ? '[Stripe secure payment form: card, Apple Pay, Google Pay]' : `[${STORE_NAME[provider]} purchase sheet]`}
            </div>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={withdrawal} onChange={(e) => setWithdrawal(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />
            <span>I want my credits delivered right away. I understand that I lose my 14-day right of withdrawal once they're delivered.</span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />
            <span>I'm 18 or older, or a parent or guardian has agreed to this purchase. I accept the <Link to="/legal#sale">terms of sale</Link>.</span>
          </label>
          {result?.status === 'paid' && <div className="ms-msg" role="status">Paid: ◆ {pack.credits} credits added. You now have ◆ {result.credits}. <Link to="/shop">Back to the shop</Link></div>}
          {(result?.status === 'unavailable' || result?.status === 'error') && <div className="ms-msg ms-msg--bad" role="alert">{result.message}</div>}
          <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" disabled={!ready} onClick={pay}>{busy ? 'ONE MOMENT…' : `PAY ${pack.priceLabel}`}</button>
          <span className="ms-note">
            {web ? 'Payments are handled securely by Stripe. We never see or store your card details.' : `Payments are handled by ${STORE_NAME[provider]}.`}
          </span>
        </section>
        <aside className="ms-card" aria-label="Order summary" style={{ display: 'grid', gap: 10, alignContent: 'start', flexBasis: 280 }}>
          <span className="ms-eyebrow">Your order</span>
          <div className="ms-row" style={{ alignItems: 'baseline' }}><span className="ms-coins" style={{ fontSize: '2.4rem', color: '#3DB5FF' }}>◆ {pack.credits}</span><span style={{ color: 'var(--ms-soft)' }}>credits</span></div>
          <div className="ms-kv" style={{ gridTemplateColumns: '1fr auto' }}>
            <span>Price incl. VAT</span><span>{pack.priceLabel}.00</span>
            <span>of which VAT</span><span>[local rate]</span>
            <span>Total</span><span>{pack.priceLabel}.00</span>
          </div>
          <div className="ms-row">{CREDIT_PACKS.filter((p) => p.id !== pack.id).map((p) => <Link key={p.id} to={`/checkout?pack=${p.id}`} className="ms-chip">◆ {p.credits}</Link>)}</div>
          <ul style={{ margin: 0, paddingLeft: '1.2em', color: 'var(--ms-muted)', display: 'grid', gap: 4 }}>
            <li>Credits work only in the Marble Spins shop.</li>
            <li>Credits can't be exchanged for money.</li>
            <li>Receipt sent to your email.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
