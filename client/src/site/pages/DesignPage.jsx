import { lazy, Suspense, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { DESIGN, catalog, priceLabel, rarityInfo } from '../../shared/marbles';
import { importOrReload } from '../../utils/staleCode';
import MarbleBadge from '../marbles/MarbleBadge';
import { editionLine, useCollection } from '../marbles/useCollection';

const Turntable = lazy(() => importOrReload(() => import('../marbles/Turntable')));

/** One design: its shades in 3D, their stories and colours, First Edition counts, and buying. */
export default function DesignPage() {
  const { design: key } = useParams();
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { live, owned, buy } = useCollection();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const d = DESIGN[key];
  if (!d) {
    return (
      <div className="ms-page ms-page--narrow">
        <h1 className="ms-h1">No such marble</h1>
        <Link to="/collection" className="ms-btn ms-btn--primary">See the collection</Link>
      </div>
    );
  }
  const info = rarityInfo(d.rarity);
  const shade = d.shades.find((s) => s.key === search.get('shade')) ?? d.shades[0];
  const slug = `${d.key}-${shade.key}`;
  const item = live[slug];
  const size = d.limited?.editionSize ?? catalog.editionSize;
  const have = owned.has(slug);
  const mine = d.shades.filter((s) => owned.has(`${d.key}-${s.key}`)).length;
  const credits = info.price.coins === undefined;
  const pick = (s) => { setSearch({ shade: s.key }, { replace: true }); setConfirming(false); setMessage(null); };

  const onBuy = async () => {
    if (!isAuthenticated) { navigate(`/signup?next=${encodeURIComponent(`/collection/${d.key}?shade=${shade.key}`)}`); return; }
    if (credits) { navigate(`/checkout?item=${slug}`); return; }
    if (!confirming) { setConfirming(true); return; }
    setBusy(true);
    try {
      const { copy } = await buy(slug);
      setMessage({ ok: true, copy });
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="ms-page">
      <Link to="/collection" style={{ color: 'var(--ms-soft)', fontWeight: 600 }}>← The whole collection</Link>
      <div className="ms-two">
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <Suspense fallback={<div className="ms-turntable" style={{ display: 'grid', placeItems: 'center' }}><MarbleBadge slug={slug} size={160} /></div>}>
            <Turntable slug={slug} label={`${d.name}, ${shade.name}, in 3D`} />
          </Suspense>
          <p className="ms-note">The real 3D marble, as it looks in races. Drag to spin it.</p>
        </div>
        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <span className="ms-tag" style={{ color: info.colour, justifySelf: 'start' }}>{info.label}{d.limited ? ' · October' : ''}</span>
          <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>{d.name}</h1>
          <div className="ms-quote"><span style={{ color: info.colour }}>Series · {d.name}</span><span style={{ fontStyle: 'italic' }}>{d.story}</span></div>
          <div className="ms-quote">
            <span style={{ color: 'var(--ms-orange)' }}>Shade · {shade.name}{shade.original ? ' (original)' : ''}</span>
            <span>{shade.description}</span>
            <span className="ms-swatches">{shade.colours.map((c) => <i key={c.name} style={{ background: c.hex }} title={c.hex} />)}{shade.colours.map((c) => c.name).join(' · ')}</span>
          </div>
          <p style={{ margin: 0, color: 'var(--ms-muted)' }}><b style={{ color: 'var(--ms-soft)' }}>In races:</b> {d.inRaces}</p>
          <p className="ms-mcard__fe" style={{ margin: 0 }}>{d.limited ? `${item ? item.numberedLeft.toLocaleString('en-US') : `[${size.toLocaleString('en-US')}]`} of ${size.toLocaleString('en-US')} left · all numbered` : editionLine(item, size)}</p>
          {message?.ok && (
            <div className="ms-msg" role="status">
              It's yours: <b>{d.name} · {shade.name}</b>{message.copy.editionNo ? <>, First Edition <b>#{String(message.copy.editionNo).padStart(3, '0')}</b></> : null}.{' '}
              <Link to={`/certificate/${message.copy.marbleCode}`}>See its certificate</Link> · <Link to="/bag">Marble Bag</Link>
            </div>
          )}
          {message && !message.ok && <div className="ms-msg ms-msg--bad" role="alert">{message.text}</div>}
          {have ? (
            <span className="ms-btn" aria-disabled="true">OWNED</span>
          ) : item && !item.onSale ? (
            <span className="ms-btn" aria-disabled="true">NO LONGER FOR SALE</span>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <button type="button" className="ms-btn ms-btn--primary ms-btn--lg" onClick={onBuy} disabled={busy}>
                {busy ? 'BUYING…' : confirming ? `CONFIRM: ${priceLabel(info.price).replace(/^[●◆] /, '')}` : `BUY · ${priceLabel(info.price).replace(/^[●◆] /, '')}`}
              </button>
              {confirming && <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" onClick={() => setConfirming(false)}>Cancel</button>}
              {isAuthenticated && !credits && <span className="ms-note">You have {(user?.coins ?? 0).toLocaleString('en-US')} coins. Coins are earned by racing; they can't be bought.</span>}
            </div>
          )}
        </div>
      </div>

      {d.shades.length > 1 && (
        <section className="ms-card" style={{ display: 'grid', gap: 16 }} aria-labelledby="shades-h">
          <div style={{ display: 'grid', gap: 4 }}>
            <h2 id="shades-h" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.8rem', margin: 0 }}>Collect every shade</h2>
            <span style={{ color: 'var(--ms-muted)' }}>5 shades, each bought separately at the same price. Complete the set for a Set badge in your Marble Bag.</span>
          </div>
          <div className="ms-shades">
            {d.shades.map((s) => {
              const sSlug = `${d.key}-${s.key}`;
              return (
                <button key={s.key} type="button" className="ms-shade" aria-pressed={s.key === shade.key} onClick={() => pick(s)}>
                  <MarbleBadge slug={sSlug} size={84} />
                  <b>{s.name}</b>
                  <small>{s.description}</small>
                  <small style={{ color: owned.has(sSlug) ? 'var(--ms-green)' : 'var(--ms-muted)', fontWeight: 700 }}>{owned.has(sSlug) ? 'Owned' : priceLabel(info.price)}</small>
                </button>
              );
            })}
          </div>
          <div className="ms-progress">
            <div><div style={{ width: `${(mine / d.shades.length) * 100}%` }} /></div>
            <span>{d.name} set · {mine} of {d.shades.length}{mine === d.shades.length ? ' · Set badge earned' : ''}</span>
          </div>
        </section>
      )}
    </div>
  );
}
