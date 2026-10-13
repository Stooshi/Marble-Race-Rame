import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DESIGNS, FEATURED_DESIGNS, catalog, originalSlug, priceLabel, rarityInfo } from '../../shared/marbles';
import MarbleBadge from '../marbles/MarbleBadge';
import { useCollection } from '../marbles/useCollection';
import { CREDIT_PACKS } from '../../shared/payments/packs';

const TABS = [['marbles', 'Marbles'], ['limited', 'Limited editions'], ['credits', 'Buy credits']];

function daysLeft(iso) {
  if (!iso) return null;
  const d = Math.ceil((new Date(iso) - Date.now()) / 86400000);
  return d > 0 ? d : 0;
}

/** The shop: this month's limited edition, the Grand Opening marbles (coins), and credit packs. */
export default function ShopPage() {
  const [tab, setTab] = useState('marbles');
  const { live } = useCollection();
  const limited = catalog.designs.find((d) => d.limited);
  const ltdSlug = limited && `${limited.key}-${limited.shades[0].key}`;
  const ltdLive = live[ltdSlug];
  const left = daysLeft(limited?.limited.saleEndsAt);

  const limitedCard = limited && (
    <section aria-labelledby="ltd-h" className="ms-hero" style={{ borderColor: 'var(--r-limited)', background: 'linear-gradient(120deg, #2A0F2E 0%, #142338 60%, var(--ms-bg) 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', flex: '0 1 180px' }}><MarbleBadge slug={ltdSlug} size={150} label={limited.name} /></div>
      <div style={{ display: 'grid', gap: 8 }}>
        <span className="ms-mcard__rarity" style={{ color: 'var(--r-limited)', margin: 0 }}>Limited edition · October</span>
        <h2 id="ltd-h" className="ms-h2" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>{limited.name}</h2>
        <p style={{ margin: 0, color: 'var(--ms-soft)' }}>Glows green and violet in night races. Numbered, and never sold again once the month is over.</p>
        <div className="ms-pills">
          <span className="ms-pill">{ltdLive ? ltdLive.numberedLeft.toLocaleString('en-US') : '[412]'} of {limited.limited.editionSize.toLocaleString('en-US')} left</span>
          <span className="ms-pill">{left === null ? 'Ends in [9 days]' : left === 0 ? 'Sale ended' : `Ends in ${left} day${left === 1 ? '' : 's'}`}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10, flex: '0 1 220px', justifyItems: 'stretch' }}>
        <span className="ms-coins" style={{ fontSize: '1.6rem', color: '#3DB5FF', textAlign: 'center' }}>{priceLabel(rarityInfo('limited').price)}</span>
        <Link to={`/collection/${limited.key}`} className="ms-btn ms-btn--primary">GET IT</Link>
      </div>
    </section>
  );

  return (
    <div className="ms-page">
      <div className="ms-row" style={{ justifyContent: 'space-between', alignItems: 'end' }}>
        <div style={{ display: 'grid', gap: 6, flex: '1 1 320px' }}>
          <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>Shop</h1>
          <p className="ms-lede" style={{ margin: 0 }}>Every marble here changes your look, never your speed. All marbles race at your own skill.</p>
        </div>
        <div role="tablist" aria-label="Shop sections" className="ms-tabs">
          {TABS.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
      </div>

      {(tab === 'marbles' || tab === 'limited') && limitedCard}

      {tab === 'marbles' && (
        <section aria-labelledby="coin-h" style={{ display: 'grid', gap: 14 }}>
          <div className="ms-section-head">
            <h2 id="coin-h">Collection {catalog.collection.number} · {catalog.collection.name}</h2>
            <Link to="/collection" style={{ color: 'var(--ms-yellow)', fontWeight: 700 }}>See all {DESIGNS.filter((d) => !d.limited).length} marbles →</Link>
          </div>
          <span className="ms-note">Bought with coins you earn by racing. Coins can't be bought.</span>
          <div className="ms-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))' }}>
            {FEATURED_DESIGNS.map((d) => {
              const k = d.key;
              const info = rarityInfo(d.rarity);
              return (
                <Link key={k} to={`/collection/${k}`} className="ms-mcard" style={{ padding: 18, borderColor: d.rarity === 'legendary' ? 'var(--ms-yellow)' : undefined }}>
                  <MarbleBadge slug={originalSlug(d)} size={96} label={d.name} />
                  <span className="ms-mcard__rarity" style={{ color: info.colour }}>{info.label}</span>
                  <span className="ms-mcard__name" style={{ fontSize: '1.1rem' }}>{d.name}</span>
                  <span className="ms-price-btn">{priceLabel(info.price)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'limited' && <p className="ms-note">One new limited edition each month: numbered, credits only, never sold again.</p>}

      {(tab === 'marbles' || tab === 'credits') && (
        <section aria-labelledby="cred-h" style={{ display: 'grid', gap: 14 }}>
          <div className="ms-section-head"><h2 id="cred-h">Buy credits</h2><span>1 credit = $1. Credits are for the shop only and can't be cashed out.</span></div>
          <div className="ms-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 160px), 1fr))' }}>
            {CREDIT_PACKS.map((p) => (
              <Link key={p.id} to={`/checkout?pack=${p.id}`} className="ms-mcard" style={{ padding: 18, borderColor: p.popular ? 'var(--ms-yellow)' : undefined }}>
                <span className="ms-coins" style={{ fontSize: '2rem', color: '#3DB5FF' }}>◆ {p.credits}</span>
                <span style={{ color: 'var(--ms-soft)' }}>credits{p.popular ? ' · most popular' : ''}</span>
                <span className="ms-price-btn">{p.priceLabel}</span>
              </Link>
            ))}
          </div>
          <p className="ms-note">Prices shown in your local currency at checkout, including VAT. Under 18? Ask a parent or guardian before buying. <Link to="/legal#sale">Terms of sale</Link></p>
        </section>
      )}
    </div>
  );
}
