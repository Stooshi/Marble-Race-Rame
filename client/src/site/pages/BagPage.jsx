import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { ITEM, ITEMS, PLAIN_3D, RARITY_ORDER, passNumber, priceLabel, rarityInfo, shows3d, windowOf } from '../../shared/marbles';
import { retiredLine } from '../marbles/useCollection';
import { importOrReload } from '../../utils/staleCode';
import MarbleBadge from '../marbles/MarbleBadge';

const Turntable = lazy(() => importOrReload(() => import('../marbles/Turntable')));

/** The bag's tiles from GET /api/bag: starters, owned collection marbles, plain marbles, then the ones still to get. */
export function bagTiles(data) {
  if (!data) return [];
  const copies = new Map(data.copies.map((c) => [c.slug, c]));
  const complete = new Set(data.sets.filter((s) => s.complete).map((s) => s.design));
  const collection = ITEMS.map((item) => {
    const copy = copies.get(item.slug);
    const notes = [];
    // (A pass marble: "Holiday 2026 #0001"; any other numbered copy: "#037".)
    if (copy?.editionNo) notes.push(item.kind === 'pass' ? passNumber(item, copy.editionNo) : `#${String(copy.editionNo).padStart(3, '0')}`);
    if (copy && complete.has(item.design.key)) notes.push('Set ★');
    const retired = retiredLine(item);
    if (copy && retired) notes.push(retired);
    return {
      key: item.slug, slug: item.slug, id: item.id, collection: item.collection, owned: Boolean(copy), copy, rarity: item.rarity,
      name: item.design.shades.length > 1 ? `${item.design.name} · ${item.shade.name}` : item.design.name,
      note: notes.join(' · '), shooter: data.shooter?.item === item.slug,
    };
  });
  const originals = data.originals.map((m) => ({
    key: m.id, marble: m, owned: true, rarity: 'original', name: m.name, starterCode: m.marble_code ?? null,
    note: m.is_starter ? `Starter ${m.starter_no ?? ''} of 4`.replace('  ', ' ') : 'Plain marble',
    shooter: data.shooter?.original === m.id,
  }));
  // Marbles not owned: only those that can still be had (never a retired seasonal one, or a pass marble after its season).
  const gettable = (t) => !['retired', 'closed'].includes(windowOf(ITEM[t.slug]));
  // (your own 4 starters first: every player has them, each with its own Marble ID)
  const starters = originals.filter((t) => t.marble.is_starter);
  const plain = originals.filter((t) => !t.marble.is_starter);
  return [...starters, ...collection.filter((t) => t.owned), ...plain, ...collection.filter((t) => !t.owned && gettable(t))];
}

/**
 * The Marble Bag (bag v2, Moses approved 17 Nov 2026; reviewed at /preview/bag-v2, which now lands here). Three parts:
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

export default function BagPage() {
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
          <div className="ms-row"><Link to="/signup?next=/bag" className="ms-btn ms-btn--primary">SAVE YOUR MARBLE</Link><Link to="/signup?mode=login&next=/bag" className="ms-btn">Log in</Link></div>
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

/** The chosen marble: in 3D once its look is approved, its ID, words and buttons. */
export function MarbleDetail({ pick, busy, error, onShooter, onClose }) {
  return (
    <section className="ms-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }} aria-live="polite">
      {(() => {
        // The picked marble in 3D once its look is approved (the picture while it loads).
        const flat = pick.slug ? <MarbleBadge slug={pick.slug} size={110} /> : <MarbleBadge marble={pick.marble} size={110} />;
        const in3d = pick.slug ? shows3d(pick.slug) : PLAIN_3D;
        if (!in3d) return flat;
        return (
          <div className="ms-bag__ball">
            <Suspense fallback={flat}>
              <Turntable key={pick.slug ?? pick.marble?.slug} slug={pick.slug} marble={pick.slug ? null : pick.marble} label={`${pick.name} in 3D`} />
            </Suspense>
          </div>
        );
      })()}
      <div style={{ display: 'grid', gap: 8, flex: '1 1 260px', minWidth: 0 }}>
        <h2 className="ms-h3" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.6rem' }}>{pick.name}</h2>
        {pick.slug && <span className="ms-row" style={{ gap: 8 }}><span className="ms-id ms-id--big">#{pick.id}</span><span className="ms-sheet__col">{pick.collection.toUpperCase()}</span></span>}
        {pick.slug && <p style={{ margin: 0, color: 'var(--ms-soft)' }}>{ITEM[pick.slug].shade.description}</p>}
        {pick.starterCode && <span className="ms-row" style={{ gap: 8 }}><span className="ms-id ms-id--big">{pick.starterCode}</span><span className="ms-sheet__col">YOUR STARTER {pick.marble.starter_no} OF 4</span></span>}
        {pick.starterCode && <p style={{ margin: 0, color: 'var(--ms-soft)' }}>One of your own 4 starter marbles: plain glass, {pick.marble.pattern === 'half' ? 'two colours, half and half' : 'one colour'}. Its Marble ID is yours alone, and in a race nobody else shows the same look.</p>}
        {pick.marble?.description && <p style={{ margin: 0, color: 'var(--ms-soft)' }}>{pick.marble.description}</p>}
        {error && <div className="ms-msg ms-msg--bad">{error}</div>}
        <div className="ms-row">
          {pick.owned && (pick.shooter
            ? <span className="ms-btn" aria-disabled="true">YOUR MARBLE</span>
            : <button type="button" className="ms-btn ms-btn--primary" disabled={busy} onClick={() => onShooter(pick)}>{busy ? 'SAVING…' : 'MAKE IT MY MARBLE'}</button>)}
          {pick.copy && <Link to={`/certificate/${pick.copy.marbleCode}`} className="ms-btn">{pick.copy.editionNo ? 'CERTIFICATE' : 'MARBLE ID'}</Link>}
          {pick.starterCode && <Link to={`/certificate/${pick.starterCode}`} className="ms-btn">MARBLE ID</Link>}
          {!pick.owned && (ITEM[pick.slug].kind === 'pass'
            ? <Link to="/pass" className="ms-btn ms-btn--primary">COMES WITH THE SEASON PASS</Link>
            : <Link to={`/collection/${ITEM[pick.slug].design.key}?shade=${ITEM[pick.slug].shade.key}`} className="ms-btn ms-btn--primary">GET IT IN THE SHOP</Link>)}
          <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </section>
  );
}
