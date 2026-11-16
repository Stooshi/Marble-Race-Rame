import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { ITEM, ITEMS, RARITY_ORDER, priceLabel, rarityInfo, windowOf } from '../../shared/marbles';
import MarbleBadge from '../marbles/MarbleBadge';
import { MarbleDetail, bagTiles } from './BagPage';

/**
 * The Marble Bag redesign, for review (Moses, 16 Nov 2026): /preview/bag-v2, noindex like every /preview page,
 * linked from nowhere; the live /bag is unchanged until approved. Three parts:
 *   1. "Your Marble Bag": only the marbles the player owns (their starters included), bigger cards, the one they
 *      race with first and highlighted; "<n> marbles in your bag · <x> of 57 collection marbles".
 *   2. "Grow your collection": own Marble ID and certificate, the first 500 numbered First Editions, looks only.
 *   3. The collection: the marbles they don't own yet, in full colour, rarity and coin price, "Add to my bag"
 *      opening it in the shop; the rarity filters only here.
 */
export const COLLECTION_SIZE = ITEMS.length;

/** The bag's two lists from its tiles: owned (racing marble first), and the collection still to get. */
export function splitBag(tiles) {
  const owned = tiles.filter((t) => t.owned);
  const racing = owned.find((t) => t.shooter);
  return {
    owned: racing ? [racing, ...owned.filter((t) => t !== racing)] : owned,
    toGet: tiles.filter((t) => !t.owned && t.slug),
  };
}

function shopLink(slug) {
  const item = ITEM[slug];
  if (item.kind === 'pass') return { to: '/pass', label: 'Comes with the season pass' };
  if (windowOf(item) === 'coming') return { to: `/collection/${item.design.key}?shade=${item.shade.key}`, label: 'Coming soon' };
  return { to: `/collection/${item.design.key}?shade=${item.shade.key}`, label: 'Add to my bag' };
}

export default function BagV2Preview() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const bag = useAsync(() => (isAuthenticated ? api.bag() : Promise.resolve(null)), [isAuthenticated]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const data = bag.data;
  const tiles = useMemo(() => bagTiles(data), [data]);
  const { owned, toGet } = useMemo(() => splitBag(tiles), [tiles]);

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="ms-page ms-page--narrow">
        <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
          <h1 className="ms-h2">Your Marble Bag</h1>
          <p className="ms-lede" style={{ margin: 0 }}>Make a free account to keep the marbles you collect, your coins and your records.</p>
          <div className="ms-row"><Link to="/signup?next=/preview/bag-v2" className="ms-btn ms-btn--primary">SAVE YOUR MARBLE</Link><Link to="/signup?mode=login&next=/preview/bag-v2" className="ms-btn">Log in</Link></div>
        </div>
      </div>
    );
  }

  const collected = data ? data.copies.length : 0;
  const pick = tiles.find((t) => t.key === selected);
  const shownToGet = toGet.filter((t) => filter === 'all' || t.rarity === filter);
  const rarities = RARITY_ORDER.filter((r) => toGet.some((t) => t.rarity === r));
  const makeShooter = async (t) => {
    setBusy(true);
    setError(null);
    try {
      await api.setShooter(t.slug ? { item: t.slug } : { original: t.marble.id });
      await bag.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ms-page">
      <div className="ms-msg" role="note">Preview of the new Marble Bag. The live <Link to="/bag">Marble Bag</Link> is unchanged.</div>

      <section aria-labelledby="bag-h" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <h1 id="bag-h" className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>Your Marble Bag</h1>
          <span className="ms-bag2__count">
            <b>{owned.length}</b> {owned.length === 1 ? 'marble' : 'marbles'} in your bag · <b>{collected}</b> of {COLLECTION_SIZE} collection marbles
            <span className="ms-bag2__links"> · <Link to="/purchases">Purchases</Link> · <Link to="/settings">Settings</Link></span>
          </span>
        </div>
        {data?.badges?.length > 0 && (
          <div className="ms-pills" aria-label="Your badges">
            {data.badges.map((b) => <span key={b.key} className="ms-pill" style={{ color: 'var(--ms-yellow)' }}>★ {b.name}{b.rank ? ` · #${b.rank}` : ''}</span>)}
          </div>
        )}
        {bag.loading && !data && <p className="ms-note">Opening your Marble Bag…</p>}
        {bag.error && <div className="ms-msg ms-msg--bad">{bag.error.message}</div>}
        {pick && pick.owned && <MarbleDetail pick={pick} busy={busy} error={error} onShooter={makeShooter} onClose={() => setSelected(null)} />}
        <div className="ms-bag2__grid" aria-label="Your marbles">
          {owned.map((t) => (
            <button key={t.key} type="button" className={`ms-bag2__card${t.shooter ? ' is-racing' : ''}`} onClick={() => setSelected(t.key)} aria-pressed={selected === t.key}>
              {t.shooter && <span className="ms-bag2__racing">YOUR RACING MARBLE</span>}
              {t.slug ? <MarbleBadge slug={t.slug} size={120} /> : <MarbleBadge marble={t.marble} size={120} />}
              <b className="ms-bag2__name">{t.name}</b>
              {t.id && <span className="ms-id">#{t.id}</span>}
              {t.starterCode && <span className="ms-id">{t.starterCode}</span>}
              <span className="ms-bag2__rarity" style={{ color: t.rarity === 'original' ? 'var(--ms-soft)' : rarityInfo(t.rarity).colour }}>
                {t.rarity === 'original' ? (t.marble.is_starter ? 'Starter' : 'Plain') : rarityInfo(t.rarity).label}
              </span>
              {t.note && <span className="ms-bag2__note">{t.note}</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="ms-bag2__grow" aria-labelledby="grow-h">
        <div style={{ display: 'grid', gap: 8, minWidth: 0 }}>
          <span className="ms-badge-label" style={{ justifySelf: 'start' }}>THE COLLECTION</span>
          <h2 id="grow-h" className="ms-bag2__growh">Grow your collection</h2>
          <ul className="ms-bag2__points">
            <li>Every collection marble has its own Marble ID and certificate.</li>
            <li>The first 500 of each are numbered First Editions.</li>
            <li>Looks only: every marble races the same, so pick the ones you like looking at.</li>
          </ul>
        </div>
        <Link to="/shop" className="ms-btn ms-btn--primary">To the shop</Link>
      </section>

      {toGet.length > 0 && (
        <section aria-labelledby="col-h" style={{ display: 'grid', gap: 14 }}>
          <div className="ms-section-head" style={{ justifyContent: 'space-between' }}>
            <h2 id="col-h">Still to collect</h2>
            <span>{toGet.length} {toGet.length === 1 ? 'marble' : 'marbles'}</span>
          </div>
          <div role="group" aria-label="Filter by rarity" className="ms-tabs">
            {['all', ...rarities].map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : rarityInfo(f).label}</button>
            ))}
          </div>
          <div className="ms-bag2__grid ms-bag2__grid--shop" aria-label="Marbles still to collect">
            {shownToGet.map((t) => {
              const item = ITEM[t.slug];
              const link = shopLink(t.slug);
              return (
                <article key={t.key} className="ms-bag2__card ms-bag2__card--shop">
                  <Link to={link.to} className="ms-bag2__pic" aria-label={`${t.name} in the shop`}><MarbleBadge slug={t.slug} size={104} /></Link>
                  <b className="ms-bag2__name">{t.name}</b>
                  <span className="ms-id">#{t.id}</span>
                  <span className="ms-bag2__rarity" style={{ color: rarityInfo(t.rarity).colour }}>{rarityInfo(t.rarity).label}</span>
                  {item.kind !== 'pass' && <span className="ms-bag2__price">{priceLabel(item.price)}</span>}
                  <Link to={link.to} className={`ms-btn ms-btn--sm${link.label === 'Add to my bag' ? ' ms-btn--primary' : ''}`}>{link.label}</Link>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
