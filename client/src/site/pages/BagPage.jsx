import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { DESIGN, ITEM, ITEMS, PLAIN_3D, RARITY_ORDER, passNumber, rarityInfo, shows3d, windowOf } from '../../shared/marbles';
import { retiredLine } from '../marbles/useCollection';
import { importOrReload } from '../../utils/staleCode';
import MarbleBadge from '../marbles/MarbleBadge';

const Turntable = lazy(() => importOrReload(() => import('../marbles/Turntable')));

const FILTERS = ['all', ...RARITY_ORDER];

/**
 * The Marble Bag: every marble the player owns (collection shades and their
 * plain marbles: the player's own 4 starters and any bought), the ones still to collect, Set badges, and picking the Shooter.
 */
export default function BagPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const bag = useAsync(() => (isAuthenticated ? api.bag() : Promise.resolve(null)), [isAuthenticated]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const data = bag.data;

  const tiles = useMemo(() => {
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
  }, [data]);

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

  const ownedCount = data ? data.copies.length : 0;
  const shown = tiles.filter((t) => filter === 'all' || t.rarity === filter);
  const shooterTile = tiles.find((t) => t.shooter);
  const pick = tiles.find((t) => t.key === selected);

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
      <div className="ms-row" style={{ justifyContent: 'space-between', alignItems: 'end' }}>
        <div style={{ display: 'grid', gap: 6, flex: '1 1 320px' }}>
          <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>Your Marble Bag</h1>
          <span style={{ color: 'var(--ms-soft)' }}>
            {ownedCount} of {ITEMS.length} marbles collected · Shooter: {shooterTile ? shooterTile.name : 'your starter'} · <Link to="/purchases">Purchases</Link> · <Link to="/settings">Settings</Link>
          </span>
        </div>
        <div className="ms-progress" style={{ flex: '1 1 260px' }}>
          <div><div style={{ width: `${(ownedCount / ITEMS.length) * 100}%` }} /></div>
          <span>Collection progress</span>
        </div>
      </div>

      {data?.badges?.length > 0 && (
        <div className="ms-pills" aria-label="Your badges">
          {data.badges.map((b) => <span key={b.key} className="ms-pill" style={{ color: 'var(--ms-yellow)' }}>★ {b.name}{b.rank ? ` · #${b.rank}` : ''}</span>)}
        </div>
      )}

      <div role="group" aria-label="Filter by rarity" className="ms-tabs">
        {FILTERS.map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : rarityInfo(f).label}</button>
        ))}
        {data?.originals.length > 0 && <button type="button" aria-pressed={filter === 'original'} onClick={() => setFilter('original')}>Plain marbles</button>}
      </div>

      {bag.loading && !data && <p className="ms-note">Opening your Marble Bag…</p>}
      {bag.error && <div className="ms-msg ms-msg--bad">{bag.error.message}</div>}

      {pick && (
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
                ? <span className="ms-btn" aria-disabled="true">YOUR SHOOTER</span>
                : <button type="button" className="ms-btn ms-btn--primary" disabled={busy} onClick={() => makeShooter(pick)}>{busy ? 'SAVING…' : 'MAKE IT MY SHOOTER'}</button>)}
              {pick.copy && <Link to={`/certificate/${pick.copy.marbleCode}`} className="ms-btn">{pick.copy.editionNo ? 'CERTIFICATE' : 'MARBLE ID'}</Link>}
              {pick.starterCode && <Link to={`/certificate/${pick.starterCode}`} className="ms-btn">MARBLE ID</Link>}
              {!pick.owned && (ITEM[pick.slug].kind === 'pass'
                ? <Link to="/pass" className="ms-btn ms-btn--primary">COMES WITH THE SEASON PASS</Link>
                : <Link to={`/collection/${ITEM[pick.slug].design.key}?shade=${ITEM[pick.slug].shade.key}`} className="ms-btn ms-btn--primary">GET IT IN THE SHOP</Link>)}
              <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </section>
      )}

      <section aria-label="Marbles" className="ms-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 150px), 1fr))', gap: 12 }}>
        {shown.map((t) => {
          const colour = t.rarity === 'original' ? 'var(--ms-soft)' : rarityInfo(t.rarity).colour;
          return (
            <button
              key={t.key}
              type="button"
              className="ms-mcard"
              onClick={() => setSelected(t.key)}
              aria-pressed={selected === t.key}
              style={{ padding: 14, gap: 6, cursor: 'pointer', font: 'inherit', opacity: t.owned ? 1 : 0.45, borderColor: t.shooter ? 'var(--ms-yellow)' : undefined }}
            >
              {t.slug ? <MarbleBadge slug={t.slug} size={72} still={!t.owned} /> : <MarbleBadge marble={t.marble} size={72} />}
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.name}</span>
              {t.id && <span className="ms-id">#{t.id}</span>}
              {t.starterCode && <span className="ms-id">{t.starterCode}</span>}
              {t.collection && <span className="ms-mcard__col">{t.collection}</span>}
              <span style={{ color: colour, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {t.rarity === 'original' ? (t.marble.is_starter ? 'Starter' : 'Plain') : rarityInfo(t.rarity).label}
              </span>
              <span style={{ fontSize: '0.8rem', color: t.shooter ? 'var(--ms-yellow)' : 'var(--ms-muted)', minHeight: '1.2em' }}>
                {t.shooter ? 'Shooter' : t.owned ? t.note : 'Not yet'}
              </span>
            </button>
          );
        })}
      </section>
      {data && data.sets.some((s) => s.complete) && (
        <p className="ms-note">Set badges: {data.sets.filter((s) => s.complete).map((s) => DESIGN[s.design].name).join(', ')}.</p>
      )}
      <p className="ms-note">Every marble races at the same level, so pick the one you like looking at. Missing marbles can be earned with coins in the <Link to="/shop">shop</Link>. Trading marbles with friends comes later.</p>
    </div>
  );
}
