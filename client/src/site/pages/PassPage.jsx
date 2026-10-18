import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CONSENT from '../../shared/payments/consent.json';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { STORE_NAME, buyPass, restoreStorePurchases, storeProvider, useStorePrices } from '../payments';

const day = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
const time = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

/**
 * /pass?season=holiday-2026: the season pass. What it gives, the price, the end date and today's Track
 * of the Day; buying it with real money only (Stripe on the web, Google Play in the Android app; the
 * apps never show or link to the website's price). Opened from the lock on a season track.
 */
export default function PassPage() {
  const [search] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const { data, reload } = useAsync(() => api.seasons(), [user?.id]);
  const season = useMemo(() => {
    const all = (data?.seasons ?? []).filter((s) => s.pass);
    return all.find((s) => s.key === search.get('season')) ?? all.find((s) => s.state !== 'free') ?? null;
  }, [data, search]);
  const provider = storeProvider();
  const web = provider === 'stripe' || provider === 'test';
  const storePrices = useStorePrices(season?.pass ? [{ id: season.pass.productId }] : []);
  const [withdrawal, setWithdrawal] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const cancelled = search.get('cancelled') === '1';

  if (!season) return <div className="ms-page ms-page--narrow"><p className="ms-note">{data ? 'There is no season pass right now.' : 'Loading…'}</p></div>;
  const { pass } = season;
  const price = web ? `$${(pass.priceCents / 100).toFixed(2)}` : storePrices[pass.productId] ?? null;
  const owned = pass.owned || result?.status === 'paid' || result?.status === 'restored';
  const signIn = `/signup?next=${encodeURIComponent(`/pass?season=${season.key}`)}`;

  // iPhone: "Restore Purchases" (Apple requires it for the pass, a non-consumable).
  const restore = async () => {
    setBusy(true);
    setResult(null);
    try {
      const n = await restoreStorePurchases();
      if (n) reload();
      setResult(n ? { status: 'restored' } : { status: 'unavailable', message: 'No pass to restore on this Apple ID.' });
    } catch (err) {
      setResult({ status: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const buy = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await buyPass(season, { consent: withdrawal && terms });
      setResult(r);
      if (r.status === 'paid') reload();
      if (r.status !== 'redirecting') setBusy(false);
    } catch (err) {
      setResult({ status: 'error', message: err.message });
      setBusy(false);
    }
  };

  return (
    <div className="ms-page ms-page--narrow" style={{ display: 'grid', gap: 18 }}>
      <h1 className="ms-h1" style={{ margin: 0 }}>{pass.name}</h1>
      <p className="ms-lede" style={{ margin: 0 }}>
        Every holiday track from around the world, from {day(season.startsAt)} to {day(season.freeFrom)} ({time(season.freeFrom)} Swedish time).
        After that they're free for everyone.
      </p>
      <section className="ms-card" style={{ display: 'grid', gap: 10 }} aria-label="What's in the pass">
        <span className="ms-eyebrow">What you get</span>
        <ul style={{ margin: 0, paddingLeft: '1.2em', display: 'grid', gap: 6 }}>
          <li>All the holiday tracks, from the day the season starts. Bought later? You still get every one, straight away.</li>
          <li>The Track of the Day: each day one holiday track pays you +{Math.round((season.featured?.bonus ?? 0.5) * 100)}% race coins on your full-pay races. The bonus doesn't count on the scoreboards.</li>
          <li>The season marble, yours to keep. Looks only: it races like every marble.</li>
          <li>Friends race the holiday tracks with you in your rooms, with or without a pass.</li>
        </ul>
        {season.featured && <span className="ms-note">Today's Track of the Day: <Link to={`/tracks/${season.featured.slug}`}>{season.featured.slug.replace(/-/g, ' ')}</Link></span>}
        <span className="ms-note">One payment, not a subscription. Watching holiday races and replays is free for everyone.</span>
      </section>

      {owned ? (
        <div className="ms-msg" role="status">You have the {pass.name}. <Link to="/play/track">Pick a holiday track</Link></div>
      ) : !pass.onSale ? (
        <div className="ms-msg" role="status">
          {new Date() < new Date(pass.saleStartsAt ?? season.startsAt) ? `On sale from ${day(pass.saleStartsAt ?? season.startsAt)}.` : 'The pass is no longer sold: the holiday tracks are free for everyone now.'}
        </div>
      ) : !isAuthenticated || user?.is_guest ? (
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0 }}>Make a free account first, so your pass is yours on every device.</p>
          <div className="ms-row"><Link to={signIn} className="ms-btn ms-btn--primary">SIGN UP</Link><Link to={`${signIn}&mode=login`} className="ms-btn">Log in</Link></div>
        </div>
      ) : (
        <section className="ms-card" style={{ display: 'grid', gap: 14 }} aria-label="Buy the pass">
          <div className="ms-row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
            {price && <span style={{ fontSize: '2rem', fontWeight: 800 }}>{price}</span>}
            {pass.endsInDays != null && <span className="ms-badge-label" style={{ position: 'static' }}>Ends in {pass.endsInDays} {pass.endsInDays === 1 ? 'day' : 'days'}</span>}
          </div>
          {web && <span className="ms-note">Shown in your own currency, VAT included, on Stripe's payment page.</span>}
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={withdrawal} onChange={(e) => setWithdrawal(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />
            <span>{CONSENT.withdrawal}</span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />
            <span>{CONSENT.terms.replace(/the terms of sale\.$/, '')}<Link to="/legal#sale">the terms of sale</Link>.</span>
          </label>
          {cancelled && !result && <div className="ms-msg" role="status">Payment cancelled: nothing was charged.</div>}
          {result?.status === 'redirecting' && <div className="ms-msg" role="status">Taking you to Stripe's secure payment page…</div>}
          {result?.status === 'pending' && <div className="ms-msg" role="status">{result.message}</div>}
          {result?.status === 'cancelled' && <div className="ms-msg" role="status">Payment cancelled: nothing was charged.</div>}
          {(result?.status === 'unavailable' || result?.status === 'error') && <div className="ms-msg ms-msg--bad" role="alert">{result.message}</div>}
          <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" disabled={!withdrawal || !terms || busy} onClick={buy}>
            {busy ? 'ONE MOMENT…' : provider === 'stripe' ? 'CONTINUE TO PAYMENT' : price ? `GET THE PASS · ${price}` : 'GET THE PASS'}
          </button>
          {provider === 'apple' && <button type="button" className="ms-btn" disabled={busy} onClick={restore}>Restore purchases</button>}
          <span className="ms-note">{web ? 'Payments are handled securely by Stripe. We never see or store your card details.' : `Payments are handled by ${STORE_NAME[provider]}.`} Under 18? Ask a parent or guardian first.</span>
        </section>
      )}
    </div>
  );
}
