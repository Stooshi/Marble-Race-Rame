import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import CONSENT from '../../shared/payments/consent.json';
import { TRACK_PACK_PRICE, packProductId } from '../../shared/payments/trackPacks';
import { WILDNESS, WILDNESS_LEVELS, WILDNESS_NOTE } from '../../shared/wildness.js';
import { formatNumber } from '../../utils/format';
import TrackBanner, { SERIES_PIC } from '../TrackBanner';
import WildnessBadge from '../WildnessBadge';
import { STORE_NAME, buyPack, restoreStorePurchases, shownPrice, storeProvider, useStorePrices } from '../payments';
import GetCoins from '../payments/GetCoins';
import { notEnoughCoins } from '../payments/GetCoins';

/**
 * Track packs in the shop (Moses, 12 Nov 2026; built from the approved design mockup). Shown only
 * while the server sells packs to this player (TRACK_PACKS on for them: GET /api/packs onSale). Every pack:
 * its best track's picture, 20 tracks, its wildness mix, the price, Unlock (or "Coming soon" while it has fewer
 * than 20 live tracks). A pack's page: every track with its picture, one line and wildness, the planned ones, and
 * "Unlock all 20 tracks – $7.99" at the top and the bottom, or with coins (at most 25%: 1,990 coins + $5.99).
 * In the apps the prices are the store's own (local currency); on the website Stripe shows the player's currency.
 */

function Mix({ mix }) {
  return (
    <span className="ms-pack__mix" aria-label={WILDNESS_LEVELS.map((l) => `${mix[l]} ${WILDNESS[l].word}`).join(', ')}>
      {WILDNESS_LEVELS.map((l) => <span key={l} className="ms-pack__mixitem"><WildnessBadge level={l} /> <b>{mix[l]}</b></span>)}
    </span>
  );
}

/** The prices to show: the website's dollars, or the store's own (null until the store answers). */
function usePackPrices(key) {
  const ids = key ? [{ id: packProductId(key) }, { id: packProductId(key, true) }] : [];
  const store = useStorePrices(ids);
  return {
    money: shownPrice(packProductId(key), TRACK_PACK_PRICE.label, store),
    coins: shownPrice(packProductId(key, true), TRACK_PACK_PRICE.withCoins.label, store),
  };
}

/** The shop's Track packs tab: a card for every pack. `data`: GET /api/packs. */
/**
 * The tab's order (Moses, 12 Nov 2026): the packs that can be bought (complete and on sale, not owned) first,
 * then the player's own packs, then the Coming soon ones, fewest tracks still to come first; within a group,
 * the server's order.
 */
export function orderPacks(packs) {
  const group = (p) => (p.owned ? 1 : p.complete ? 0 : 2);
  const toGo = (p) => (p.complete || p.owned ? 0 : p.fullAt - p.live);
  return packs.map((p, i) => [p, i]).sort(([a, i], [b, j]) => group(a) - group(b) || toGo(a) - toGo(b) || i - j).map(([p]) => p);
}

export function TrackPacksTab({ data }) {
  const [restored, setRestored] = useState(null);
  const apple = storeProvider() === 'apple';
  return (
    <section aria-labelledby="packs-h" style={{ display: 'grid', gap: 14 }}>
      <div className="ms-section-head" style={{ justifyContent: 'space-between' }}>
        <h2 id="packs-h">Track packs</h2>
        <span>{data.packs.length} packs · 3 tracks of every series stay free</span>
      </div>
      <p className="ms-wild-note">Every pack is {TRACK_PACK_PRICE.fullAt} tracks of one series, yours for good: race them any time, and with friends in your rooms. Paid leagues can race any track, locked ones included.</p>
      <div className="ms-pack-grid">
        {orderPacks(data.packs).map((p) => <PackCard key={p.key} pack={p} testBuy={data.testBuy} />)}
      </div>
      {apple && (
        <div className="ms-row">
          <button type="button" className="ms-btn ms-btn--sm" onClick={async () => setRestored(await restoreStorePurchases().catch(() => 0))}>Restore purchases</button>
          {restored !== null && <span className="ms-note" role="status">{restored ? `${restored} purchase${restored === 1 ? '' : 's'} restored.` : 'Nothing to restore.'}</span>}
        </div>
      )}
    </section>
  );
}

function PackCard({ pack: p, testBuy }) {
  const prices = usePackPrices(p.key);
  const to = `/shop/packs/${p.key}`;
  return (
    <article className="ms-pack">
      <Link to={to} className="ms-trackcard__pic ms-pack__pic" style={{ background: SERIES_PIC[p.series] }} aria-label={`See the ${p.name} pack`}>
        <TrackBanner slug={p.pic} force />
        <span className="ms-badge-label">{p.series.toUpperCase()}</span>
      </Link>
      <div className="ms-pack__body">
        <h3 className="ms-pack__name">{p.name}</h3>
        <span className="ms-pack__count">{p.complete ? `${p.fullAt} tracks` : `${p.live} of ${p.fullAt} tracks`}</span>
        <Mix mix={p.mix} />
        <div className="ms-pack__buy">
          <span className="ms-pack__price">{prices.money ?? '…'}</span>
          {p.owned
            ? <span className="ms-pack__soon" style={{ color: 'var(--ms-green)', borderColor: 'var(--ms-green)' }}>Unlocked</span>
            : p.complete || testBuy
              ? <Link to={to} className="ms-btn ms-btn--primary ms-btn--sm">{p.complete ? 'Unlock' : 'Test purchase'}</Link>
              : <span className="ms-pack__soon">Coming soon</span>}
        </div>
        <Link to={to} className="ms-pack__see">See the tracks</Link>
      </div>
    </article>
  );
}

/** A pack's page: /shop/packs/:key. */
export function PackPage() {
  const { key } = useParams();
  const { search } = useLocation();
  const { data, error, reload } = useAsync(() => api.pack(key), [key]);
  if (error) return <div className="ms-page"><div className="ms-msg ms-msg--bad" role="alert">{error.message}</div><Link to="/shop" className="ms-btn ms-btn--sm" style={{ justifySelf: 'start' }}>← Shop</Link></div>;
  if (!data) return <div className="ms-page"><p className="ms-note">Loading…</p></div>;
  const { pack } = data;
  const cancelled = new URLSearchParams(search).get('cancelled') === '1';
  return (
    <div className="ms-page">
      <Link to="/shop" className="ms-btn ms-btn--ghost ms-btn--sm" style={{ justifySelf: 'start' }}>← Track packs</Link>
      <section className="ms-pack-hero" aria-labelledby="pack-h">
        <div className="ms-pack-hero__pic" style={{ background: SERIES_PIC[pack.series] }}><TrackBanner slug={pack.pic} force /></div>
        <div className="ms-pack-hero__text">
          <span className="ms-badge-label">TRACK PACK · {pack.fullAt} TRACKS</span>
          <h1 id="pack-h" className="ms-h1 ms-shop-title">{pack.name}</h1>
          <p className="ms-lede" style={{ margin: 0 }}>{ABOUT[pack.key] ?? `Every ${pack.series} track, in one pack.`}</p>
          <Mix mix={pack.mix} />
          <BuyBox data={data} cancelled={cancelled} onBought={reload} />
        </div>
      </section>

      <section aria-labelledby="tracks-h" style={{ display: 'grid', gap: 14 }}>
        <div className="ms-section-head" style={{ justifyContent: 'space-between' }}>
          <h2 id="tracks-h">The tracks</h2>
          <span>{pack.tracks.length} ready{pack.planned.length ? ` · ${pack.planned.length} coming soon` : ''}</span>
        </div>
        <p className="ms-wild-note">{WILDNESS_NOTE}</p>
        <div className="ms-pack-tracks">
          {pack.tracks.map((t) => (
            <Link key={t.slug} to={`/tracks/${t.slug}`} className="ms-trackcard ms-pack-track">
              <div className="ms-trackcard__pic" style={{ background: SERIES_PIC[pack.series] }}><TrackBanner slug={t.slug} force /></div>
              <div className="ms-trackcard__body">
                <b>{t.name}</b>
                <span className="ms-trackcard__meta"><WildnessBadge level={t.wildness} /></span>
                <span className="ms-pack-track__line">{t.line}</span>
              </div>
            </Link>
          ))}
          {pack.planned.map((name) => (
            <article key={name} className="ms-trackcard ms-pack-track is-soon">
              <div className="ms-trackcard__pic" style={{ background: SERIES_PIC[pack.series] }}>
                <span className="ms-pack-track__flag" aria-hidden="true">🏁</span>
                <span className="ms-badge-label">COMING SOON</span>
              </div>
              <div className="ms-trackcard__body"><b>{name}</b></div>
            </article>
          ))}
        </div>
      </section>

      <BuyBox data={data} bottom onBought={reload} />
    </div>
  );
}

const ABOUT = {
  'grand-prix': 'City circuits and motorsport from around the world: street races through famous skylines, ovals, rallies, drag strips and hill runs.',
};

/**
 * Buying: "Unlock all 20 tracks – $7.99", or with coins (1,990 coins + $5.99) when the player has them; on the
 * website the two agreements first (as for coins and the pass). Coming soon: no button (an admin may make a test
 * purchase). Packs not sold to the player: nothing to buy.
 */
function BuyBox({ data, bottom = false, cancelled = false, onBought }) {
  const { pack, onSale, testBuy } = data;
  const { isAuthenticated, user, refreshUser } = useAuth();
  const provider = storeProvider();
  const web = provider === 'stripe' || provider === 'test';
  const prices = usePackPrices(pack.key);
  const [useCoins, setUseCoins] = useState(false);
  const [withdrawal, setWithdrawal] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const C = TRACK_PACK_PRICE.withCoins;
  const canCoins = (user?.coins ?? 0) >= C.coins;
  const test = !pack.complete && testBuy;
  const label = useCoins ? `${formatNumber(C.coins)} coins + ${prices.coins ?? '…'}` : prices.money ?? '…';
  const id = bottom ? 'buy-bottom' : 'buy-top';

  if (!onSale) return bottom ? null : <div className="ms-msg" role="status">Track packs aren't for sale yet: every track is open to race.</div>;
  if (pack.owned) return <div className="ms-msg" role="status">You have the {pack.name} pack: its tracks are yours. <Link to="/play/track">Race one</Link></div>;
  if (!pack.complete && !testBuy) return <div className="ms-pack-page__buy"><span className="ms-pack__soon">Coming soon</span><span className="ms-note" style={{ margin: 0 }}>On sale once all {pack.fullAt} tracks are ready. Paid leagues can race any track, locked ones included.</span></div>;
  if (!isAuthenticated || user?.is_guest) {
    const next = encodeURIComponent(`/shop/packs/${pack.key}`);
    return <div className="ms-pack-page__buy"><Link to={`/signup?next=${next}`} className="ms-btn ms-btn--primary">Make a free account to unlock</Link><span className="ms-note" style={{ margin: 0 }}>So the pack is yours on every device.</span></div>;
  }

  const buy = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await buyPack(pack.key, { useCoins, consent: withdrawal && terms, test });
      setResult(r);
      if (r.status === 'paid') { await refreshUser?.(); onBought?.(); }
    } catch (err) {
      setResult({ status: notEnoughCoins(err) ? 'coins' : 'error', message: err.message });
      refreshUser?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ms-pack-page__buy" aria-label="Unlock the pack">
      {test && <div className="ms-msg" role="status">Admin test purchase: this pack has {pack.live} of its {pack.fullAt} tracks, so it isn't on sale yet. Stripe test mode, Google Play licence testing or the App Store sandbox only.</div>}
      {canCoins && (
        <div className="ms-chips" role="radiogroup" aria-label="How to pay">
          <button type="button" role="radio" aria-checked={!useCoins} aria-pressed={!useCoins} onClick={() => setUseCoins(false)}>{prices.money ?? '…'}</button>
          <button type="button" role="radio" aria-checked={useCoins} aria-pressed={useCoins} onClick={() => setUseCoins(true)}>● {formatNumber(C.coins)} + {prices.coins ?? '…'}</button>
        </div>
      )}
      {useCoins && (
        <div className="ms-pack-split" role="note">
          <span><b>● {formatNumber(C.coins)}</b> coins from your {formatNumber(user.coins)}</span>
          <span><b>{prices.coins ?? '…'}</b> {web ? 'by card, Apple Pay or Google Pay' : `through ${STORE_NAME[provider]}`}</span>
          <span className="ms-note" style={{ margin: 0 }}>Coins pay at most {Math.round(TRACK_PACK_PRICE.maxCoinShare * 100)}% of a pack; the rest is a real payment.{web ? ' The coins are taken when you continue, and given back if you don\'t pay.' : ''}</span>
        </div>
      )}
      {web && !bottom && <span className="ms-note" style={{ margin: 0 }}>One payment, VAT included; shown in your own currency on Stripe's payment page.</span>}
      {web && (
        <>
          <label className="ms-check" htmlFor={`${id}-w`}>
            <input id={`${id}-w`} type="checkbox" checked={withdrawal} onChange={(e) => setWithdrawal(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />
            <span>{CONSENT.packWithdrawal}</span>
          </label>
          <label className="ms-check" htmlFor={`${id}-t`}>
            <input id={`${id}-t`} type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ width: 22, height: 22, flex: 'none' }} />
            <span>{CONSENT.terms.replace(/the terms of sale\.$/, '')}<Link to="/legal#sale">the terms of sale</Link>.</span>
          </label>
        </>
      )}
      {cancelled && !result && <div className="ms-msg" role="status">Payment cancelled: nothing was charged, and any coins are back.</div>}
      {result?.status === 'redirecting' && <div className="ms-msg" role="status">Taking you to Stripe's secure payment page…</div>}
      {result?.status === 'paid' && <div className="ms-msg" role="status">The {pack.name} pack is yours. <Link to="/play/track">Race one</Link></div>}
      {(result?.status === 'pending' || result?.status === 'cancelled') && <div className="ms-msg" role="status">{result.message ?? 'Purchase cancelled: nothing was charged.'}</div>}
      {result?.status === 'coins' && <GetCoins need={Math.max(1, C.coins - (user?.coins ?? 0))} back={`/shop/packs/${pack.key}`} label={`the ${pack.name} pack`} />}
      {(result?.status === 'unavailable' || result?.status === 'error') && <div className="ms-msg ms-msg--bad" role="alert">{result.message}</div>}
      <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" disabled={busy || (web && !(withdrawal && terms))} onClick={buy}>
        {busy ? 'ONE MOMENT…' : `Unlock all ${pack.fullAt} tracks – ${label}`}
      </button>
      <span className="ms-note" style={{ margin: 0 }}>Paid leagues can race any track, locked ones included.{!canCoins && ` Have ${formatNumber(C.coins)} coins? Pay up to ${Math.round(TRACK_PACK_PRICE.maxCoinShare * 100)}% with coins.`}</span>
    </div>
  );
}
