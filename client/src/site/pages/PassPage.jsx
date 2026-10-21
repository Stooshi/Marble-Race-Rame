import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CONSENT from '../../shared/payments/consent.json';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { STORE_NAME, buyPass, restoreStorePurchases, storeProvider, useStorePrices } from '../payments';
import { ITEMS, collectionOf } from '../../shared/marbles';
import MarbleBadge from '../marbles/MarbleBadge';
import { activatesDay, countdownText, useCountdown } from '../payments/preSale';
import PassReminder from '../payments/PassReminder';
import BANNERS from '../../shared/trackBanners.json';

const day = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
const time = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

/**
 * /pass?season=holiday-2026: the season pass. The season's marble and dates up top, what it gives (the
 * season's tracks, the Track of the Day, the season marble, friend rooms), today's Track of the Day, the
 * price and buying it with real money only (Stripe on the web, Google Play or the App Store in the apps;
 * the apps never show or link to the website's price). Opened from the lock on a season track.
 * Before the season starts (its pre-sale, from 28 Nov): "Activates 1 December" and a countdown, the
 * same on the website and in the apps; the pass is bought then, but opens only on that day.
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
  // Before the season starts: the countdown to its first day (when a pass activates).
  const before = season?.state === 'before';
  const left = useCountdown(before ? season.startsAt : null);
  useEffect(() => { if (before && left != null && left <= 0) reload(); }, [before, left != null && left <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!season) return <div className="ms-page ms-page--narrow"><p className="ms-note">{data ? 'There is no season pass right now.' : 'Loading…'}</p></div>;
  const { pass } = season;
  // The season's own marble (catalog.json: the pass collection of this season).
  const marble = ITEMS.find((i) => i.kind === 'pass' && collectionOf(i.design).season === season.key) ?? null;
  const bonus = Math.round((season.featured?.bonus ?? 0.5) * 100);
  const tracks = season.trackCount > 0 ? `All ${season.trackCount} holiday tracks` : 'Every holiday track';
  const price = web ? `$${(pass.priceCents / 100).toFixed(2)}` : storePrices[pass.productId] ?? null;
  const owned = pass.owned || result?.status === 'paid' || result?.status === 'restored';
  const signIn = `/signup?next=${encodeURIComponent(`/pass?season=${season.key}`)}`;
  const activates = activatesDay(pass.activatesAt ?? season.startsAt);
  const preSale = pass.preSale && pass.onSale;
  const countdown = before ? countdownText(left) : null;
  // Changing your mind before the pass activates: a full refund, from whoever took the payment.
  const refundBefore = provider === 'apple' ? 'ask Apple for a full refund at reportaproblem.apple.com'
    : provider === 'google' ? 'ask Google Play for a full refund, or contact us with your order number'
      : 'contact us with your order number for a full refund';

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
    <div className="ms-page ms-page--narrow ms-pass" style={{ display: 'grid', gap: 18 }}>
      <section className="ms-pass-hero" aria-labelledby="pass-h">
        <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
          <span className="ms-pass-eyebrow">{season.name} · {day(season.startsAt)} – {day(season.freeFrom)}</span>
          <h1 id="pass-h" className="ms-h1" style={{ margin: 0 }}>{pass.name}</h1>
          <p className="ms-lede" style={{ margin: 0 }}>
            Christmas and New Year from around the world, on {season.trackCount > 0 ? season.trackCount : 'its own'} holiday tracks, until {day(season.freeFrom)} ({time(season.freeFrom)} Swedish time). After that they're free for everyone.
          </p>
        </div>
        {marble && (
          <div className="ms-pass-hero__marble">
            <MarbleBadge slug={marble.slug} size={150} label={`${marble.design.name}, the season marble`} />
            <span className="ms-note">{marble.design.name} · season marble</span>
          </div>
        )}
      </section>

      {before && (
        <div className="ms-pass-activates" role="status" aria-live="off">
          <strong>Activates {activates}</strong>
          {countdown && <span className="ms-pass-activates__count" style={{ fontVariantNumeric: 'tabular-nums' }}>in {countdown}</span>}
          <span className="ms-note" style={{ flexBasis: '100%' }}>
            {owned
              ? `Your pass is ready: the holiday tracks, the Track of the Day and holiday rooms open on ${activates} at 00:00 Swedish time.`
              : pass.onSale
              ? `Buy it now and it's yours: the holiday tracks, the Track of the Day and holiday rooms open on ${activates} at 00:00 Swedish time, for every pass holder.`
              : `On sale from ${activatesDay(pass.saleStartsAt ?? season.startsAt)}. The holiday tracks, the Track of the Day and holiday rooms open on ${activates} at 00:00 Swedish time.`}
          </span>
        </div>
      )}

      <section className="ms-pass-grid" aria-label="What's in the pass">
        <article className="ms-pass-feature">
          <span className="ms-pass-feature__k">Tracks</span>
          <h2>{tracks}</h2>
          <p>Snowy northern winters, summer Christmas down south, New Year fireworks. Bought later in the season? You still get every one, straight away.</p>
        </article>
        <article className="ms-pass-feature">
          <span className="ms-pass-feature__k">Every day</span>
          <h2>Track of the Day +{bonus}%</h2>
          <p>Each day one holiday track pays you +{bonus}% race coins on your full-pay races. The bonus doesn't count on the scoreboards.</p>
          {season.featured && <Link to={`/tracks/${season.featured.slug}`} className="ms-pass-feature__link">Today: {BANNERS.banners[season.featured.slug]?.name ?? season.featured.slug.replace(/-/g, ' ')}</Link>}
        </article>
        <article className="ms-pass-feature">
          <span className="ms-pass-feature__k">Yours to keep</span>
          <h2>{marble ? marble.design.name : 'The season marble'}</h2>
          <p>{marble ? `${marble.design.inRaces} ` : ''}Only pass holders get it, numbered in the order passes are bought. Looks only: it races like every marble.</p>
        </article>
        <article className="ms-pass-feature">
          <span className="ms-pass-feature__k">Friends</span>
          <h2>Holiday rooms</h2>
          <p>Host a friend room on a holiday track and everyone in it races, pass or not. Watching holiday races and replays is free for all.</p>
        </article>
      </section>
      <p className="ms-note" style={{ margin: 0 }}>One payment, not a subscription. Money only, never coins. <Link to="/legal#season-pass">Terms</Link> · <Link to="/help#season-pass">Help with the pass</Link></p>

      {owned ? (
        before
          ? <div className="ms-msg" role="status"><strong>{pass.name} — activates {activates}.</strong> It's yours; its tracks open then. Changed your mind before {activates}? Just {refundBefore}.</div>
          : <div className="ms-msg" role="status">You have the {pass.name}. <Link to="/play/track">Pick a holiday track</Link></div>
      ) : !pass.onSale && new Date() < new Date(pass.saleStartsAt ?? season.startsAt) ? (
        // Before the sale: the price now, and "Remind me when sales open".
        <section className="ms-card" style={{ display: 'grid', gap: 14 }} aria-label="The pass's price and sale">
          <div className="ms-row" style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
            {price && <span style={{ fontSize: '2rem', fontWeight: 800 }}>{price}</span>}
            <span className="ms-badge-label" style={{ position: 'static' }}>On sale from {activatesDay(pass.saleStartsAt ?? season.startsAt)}</span>
          </div>
          <span className="ms-note">
            {web ? 'One payment, VAT included; shown in your own currency on Stripe\'s payment page.' : `One payment, through ${STORE_NAME[provider]}.`} On sale from {day(pass.saleStartsAt ?? season.startsAt)}{before ? `; activates ${activates}` : ''}.
          </span>
          {/* (Only when the server has reminders: an older server sends no remindersOpen, and then just the price and date show.) */}
          {pass.remindersOpen === true && <PassReminder season={season} user={isAuthenticated ? user : null} onChange={reload} />}
        </section>
      ) : !pass.onSale ? (
        <div className="ms-msg" role="status">The pass is no longer sold: the holiday tracks are free for everyone now.</div>
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
          {preSale && <div className="ms-msg" role="status"><strong>Activates {activates}.</strong> You pay now and the pass is yours; its tracks open on {activates} at 00:00 Swedish time. Changed your mind before then? Just {refundBefore}.</div>}
          {pass.testPurchaseOnly && <div className="ms-msg" role="status">Tester account: a test purchase only (Stripe test mode, Apple sandbox or TestFlight, Google Play licence testing). The pass goes on sale for everyone on {day(pass.saleStartsAt)}.</div>}
          {web && <span className="ms-note">Shown in your own currency, VAT included, on Stripe's payment page.</span>}
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={withdrawal} onChange={(e) => setWithdrawal(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />
            <span>{before ? CONSENT.passPreSaleWithdrawal.replace('{activates}', activates) : CONSENT.passWithdrawal}</span>
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
          {before && <span className="ms-note" style={{ textAlign: 'center' }}>Activates {activates}</span>}
          {provider === 'apple' && <button type="button" className="ms-btn" disabled={busy} onClick={restore}>Restore purchases</button>}
          <span className="ms-note">{web ? 'Payments are handled securely by Stripe. We never see or store your card details.' : `Payments are handled by ${STORE_NAME[provider]}.`} Under 18? Ask a parent or guardian first.</span>
        </section>
      )}
    </div>
  );
}
