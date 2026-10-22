import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { COIN_PACKS, PACK } from '../../shared/payments/packs';
import CONSENT from '../../shared/payments/consent.json';
import { api } from '../../api/client';
import { formatNumber } from '../../utils/format';
import { STORE_NAME, buyCoins, shownPrice, storeProvider, useStorePrices } from '../payments';
import { track } from '../consent/tracking';
import QuickSignup from '../account/QuickSignup';
import { rememberWanted, safeBack, wanted } from '../payments/GetCoins';

/**
 * Checkout for a coin pack bought with real money: ?pack=coins-10500 (Stripe
 * on the web, the App Store or Google Play in the apps). Marbles themselves
 * are bought with coins right in the shop.
 */
export default function CheckoutPage() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, refreshUser } = useAuth();
  // Came from Get coins: the marble wanted, to go back to once paid (?back=, or this tab's memory after Stripe's page).
  const remembered = wanted();
  const back = safeBack(search.get('back')) ?? remembered?.back ?? null;
  const backLabel = remembered?.back === back ? remembered.label : null;
  const pack = PACK[search.get('pack')] ?? COIN_PACKS.find((p) => p.popular) ?? COIN_PACKS[0];
  const [withdrawal, setWithdrawal] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const provider = storeProvider();
  const web = provider === 'stripe' || provider === 'test';
  const cancelled = search.get('cancelled') === '1';
  const [stripeMode, setStripeMode] = useState(null);
  const storePrices = useStorePrices(COIN_PACKS); // (Android: Google Play's price in the player's currency)
  // (In the apps only the store's price, once it has answered; never the website's.)
  const priceOf = (p) => shownPrice(p.id, p.priceLabel, storePrices, provider);
  useEffect(() => {
    if (provider !== 'stripe') return undefined;
    let live = true;
    api.paymentOptions().then((o) => { if (live) setStripeMode(o.stripeMode ?? 'off'); }).catch(() => {});
    return () => { live = false; };
  }, [provider]);

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

  // Coin packs are for saved accounts (Moses, 21 Oct 2026): a guest saves their marble first, right here.
  if (user?.is_guest) {
    return (
      <div className="ms-page ms-page--narrow">
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <QuickSignup
            heading="h1"
            title="Save your marble to buy"
            sub="Coin packs are for saved accounts, so what you buy stays yours on every device. Everything you've won as a guest comes with you."
            onSaved={() => track('sign_up')}
            onDone={() => refreshUser()}
          />
          <Link to="/shop#coins" style={{ textAlign: 'center', color: 'var(--ms-soft)' }}>Back to the shop</Link>
        </div>
      </div>
    );
  }

  const pay = async () => {
    setBusy(true);
    setResult(null);
    track('checkout_started', { productId: pack.id, value: pack.amountCents / 100, currency: pack.currency });
    try {
      if (back) rememberWanted(back, backLabel); // (for the way back from Stripe's payment page)
      const r = await buyCoins(pack, { consent: withdrawal && terms });
      if (r.status === 'paid') await refreshUser();
      if (r.status === 'paid' && back) { // (the app stores and test payments: straight back to the marble)
        wanted({ clear: true });
        navigate(back, { replace: true, state: { coinsAdded: pack.coins } });
        return;
      }
      setResult(r);
      if (r.status !== 'redirecting') setBusy(false); // (on the way to Stripe's page: stay busy)
    } catch (err) {
      setResult({ status: 'error', message: err.message });
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
            <div style={{ border: '1px solid var(--ms-border)', borderRadius: 14, padding: 18, color: 'var(--ms-muted)', display: 'grid', gap: 6 }}>
              {provider === 'stripe' && <>
                <span>You'll pay on Stripe's secure payment page: card, Apple Pay or Google Pay (where your device has them).</span>
                <span>The price is shown in your own currency there, VAT included.</span>
              </>}
              {provider === 'test' && <span>Development: a test payment that completes at once.</span>}
              {!web && <>
                <span>You'll pay with {STORE_NAME[provider]}, using the payment method saved in your {provider === 'google' ? 'Google' : 'Apple'} account.</span>
                <span>The price is in your own currency, VAT included.</span>
              </>}
            </div>
            {stripeMode === 'test' && <span className="ms-note" role="note">TEST MODE: no real money is taken. Use Stripe's test card 4242 4242 4242 4242, any future date, any CVC.</span>}
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={withdrawal} onChange={(e) => setWithdrawal(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />
            <span>{CONSENT.withdrawal}</span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />
            <span>{CONSENT.terms.replace(/the terms of sale\.$/, '')}<Link to="/legal#sale">the terms of sale</Link>.</span>
          </label>
          {cancelled && !result && <div className="ms-msg" role="status">Payment cancelled: nothing was charged. You can try again whenever you like.</div>}
          {back && !result && <div className="ms-msg" role="status">Once paid, you go straight back to {backLabel ?? 'the marble you wanted'}. <Link to={back}>Back without buying</Link></div>}
          {result?.status === 'paid' && <div className="ms-msg" role="status">Paid: ● {formatNumber(pack.coins)} coins added. You now have ● {formatNumber(result.coins ?? 0)}. <Link to="/purchases">Your purchases</Link> · <Link to="/shop">Back to the shop</Link></div>}
          {result?.status === 'redirecting' && <div className="ms-msg" role="status">Taking you to Stripe's secure payment page…</div>}
          {result?.status === 'pending' && <div className="ms-msg" role="status">{result.message}</div>}
          {result?.status === 'cancelled' && <div className="ms-msg" role="status">Payment cancelled: nothing was charged. You can try again whenever you like.</div>}
          {(result?.status === 'unavailable' || result?.status === 'error') && <div className="ms-msg ms-msg--bad" role="alert">{result.message}</div>}
          <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" disabled={!ready} onClick={pay}>{busy ? 'ONE MOMENT…' : provider === 'stripe' ? 'CONTINUE TO PAYMENT' : (priceOf(pack) ? `PAY ${priceOf(pack)}` : 'PAY')}</button>
          <span className="ms-note">
            {web ? 'Payments are handled securely by Stripe. We never see or store your card details.' : `Payments are handled by ${STORE_NAME[provider]}.`}
          </span>
        </section>
        <aside className="ms-card" aria-label="Order summary" style={{ display: 'grid', gap: 10, alignContent: 'start', flexBasis: 280 }}>
          <span className="ms-eyebrow">Your order</span>
          <div className="ms-row" style={{ alignItems: 'baseline' }}><span className="ms-coins" style={{ fontSize: '2.4rem' }}>● {formatNumber(pack.coins)}</span><span style={{ color: 'var(--ms-soft)' }}>coins</span></div>
          <div className="ms-kv" style={{ gridTemplateColumns: '1fr auto' }}>
            <span>Price incl. VAT</span><span>{web ? `${pack.priceLabel}.00` : priceOf(pack) ?? '…'}</span>
            <span>VAT</span><span>included</span>
            <span>Total</span><span>{web ? `${pack.priceLabel}.00` : priceOf(pack) ?? '…'}</span>
          </div>
          <div className="ms-row">{COIN_PACKS.filter((p) => p.id !== pack.id).map((p) => <Link key={p.id} to={`/checkout?pack=${p.id}${back ? `&back=${encodeURIComponent(back)}` : ''}`} className="ms-chip">● {formatNumber(p.coins)}{priceOf(p) ? ` · ${priceOf(p)}` : ''}</Link>)}</div>
          <ul style={{ margin: 0, paddingLeft: '1.2em', color: 'var(--ms-muted)', display: 'grid', gap: 4 }}>
            <li>Coins work only in the Marble Spins shop: for looks, never speed.</li>
            <li>Coins can't be cashed out or exchanged for money.</li>
            <li>{web ? 'Shown in your currency, with your country\'s VAT, on the payment page.' : 'Shown in your currency by the store.'}</li>
            <li>Receipt sent to your email; your orders are on your <Link to="/purchases">Purchases</Link> page.</li>
            <li>Questions? <Link to="/help#buying-coins">Help with buying coins</Link> · <Link to="/help#contact">Contact us</Link></li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
