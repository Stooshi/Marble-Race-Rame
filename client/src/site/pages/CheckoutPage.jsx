import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { COIN_PACKS, PACK } from '../../shared/payments/packs';
import { formatNumber } from '../../utils/format';
import { STORE_NAME, buyCoins, storeProvider } from '../payments';

/**
 * Checkout for a coin pack bought with real money: ?pack=coins-10500 (Stripe
 * on the web, the App Store or Google Play in the apps). Marbles themselves
 * are bought with coins right in the shop.
 */
export default function CheckoutPage() {
  const [search] = useSearchParams();
  const { isAuthenticated, refreshUser } = useAuth();
  const pack = PACK[search.get('pack')] ?? COIN_PACKS.find((p) => p.popular) ?? COIN_PACKS[0];
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
          <p className="ms-lede" style={{ margin: 0 }}>Log in or make a free account first, so your coins and marbles are saved to you.</p>
          <div className="ms-row"><Link to={`/signup?next=${encodeURIComponent(`/checkout?${search}`)}`} className="ms-btn ms-btn--primary">SIGN UP</Link><Link to={`/signup?mode=login&next=${encodeURIComponent(`/checkout?${search}`)}`} className="ms-btn">Log in</Link></div>
        </div>
      </div>
    );
  }

  const pay = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await buyCoins(pack);
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
            <span>I want my coins delivered right away. I understand that I lose my 14-day right of withdrawal once they're delivered.</span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />
            <span>I'm 18 or older, or a parent or guardian has agreed to this purchase. I accept the <Link to="/legal#sale">terms of sale</Link>.</span>
          </label>
          {result?.status === 'paid' && <div className="ms-msg" role="status">Paid: ● {formatNumber(pack.coins)} coins added. You now have ● {formatNumber(result.coins ?? 0)}. <Link to="/shop">Back to the shop</Link></div>}
          {(result?.status === 'unavailable' || result?.status === 'error') && <div className="ms-msg ms-msg--bad" role="alert">{result.message}</div>}
          <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" disabled={!ready} onClick={pay}>{busy ? 'ONE MOMENT…' : `PAY ${pack.priceLabel}`}</button>
          <span className="ms-note">
            {web ? 'Payments are handled securely by Stripe. We never see or store your card details.' : `Payments are handled by ${STORE_NAME[provider]}.`}
          </span>
        </section>
        <aside className="ms-card" aria-label="Order summary" style={{ display: 'grid', gap: 10, alignContent: 'start', flexBasis: 280 }}>
          <span className="ms-eyebrow">Your order</span>
          <div className="ms-row" style={{ alignItems: 'baseline' }}><span className="ms-coins" style={{ fontSize: '2.4rem' }}>● {formatNumber(pack.coins)}</span><span style={{ color: 'var(--ms-soft)' }}>coins</span></div>
          <div className="ms-kv" style={{ gridTemplateColumns: '1fr auto' }}>
            <span>Price incl. VAT</span><span>{pack.priceLabel}.00</span>
            <span>of which VAT</span><span>[local rate]</span>
            <span>Total</span><span>{pack.priceLabel}.00</span>
          </div>
          <div className="ms-row">{COIN_PACKS.filter((p) => p.id !== pack.id).map((p) => <Link key={p.id} to={`/checkout?pack=${p.id}`} className="ms-chip">● {formatNumber(p.coins)} · {p.priceLabel}</Link>)}</div>
          <ul style={{ margin: 0, paddingLeft: '1.2em', color: 'var(--ms-muted)', display: 'grid', gap: 4 }}>
            <li>Coins work only in the Marble Spins shop: for looks, never speed.</li>
            <li>Coins can't be cashed out or exchanged for money.</li>
            <li>Receipt sent to your email.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
