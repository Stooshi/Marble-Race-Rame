import { Link } from 'react-router-dom';
import { DESIGNS, RARITY_ORDER, catalog, priceLabel, rarityInfo } from '../../shared/marbles';
import MarbleBadge from '../marbles/MarbleBadge';
import { editionLine, useCollection } from '../marbles/useCollection';

const GROUP_NOTE = {
  common: 'your first buys',
  legendary: 'glow on the track',
};

/** Collection 1 · Grand Opening: every design, grouped by rarity, with its story and how it looks in races. */
export default function CollectionPage() {
  const { live, owned } = useCollection();
  const counts = Object.fromEntries(RARITY_ORDER.map((r) => [r, DESIGNS.filter((d) => d.rarity === r).length]));
  return (
    <div className="ms-page">
      <section className="ms-hero">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="ms-badge-label">COLLECTION {catalog.collection.number} · LAUNCH</span>
          <h1 className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>{catalog.collection.name}</h1>
          <p className="ms-lede" style={{ margin: 0 }}>{catalog.collection.tagline}</p>
          <div className="ms-pills">
            {RARITY_ORDER.map((r) => (
              <span key={r} className="ms-pill" style={{ color: rarityInfo(r).colour }}>
                {r === 'limited' ? '+ monthly Limited' : `${counts[r]} ${rarityInfo(r).label}`}
              </span>
            ))}
          </div>
        </div>
        <div className="ms-hero__balls" aria-hidden="true">
          <MarbleBadge slug="galaxy-milky-way" size={96} />
          <MarbleBadge slug="sun-solar" size={140} />
          <MarbleBadge slug="hole-horizon" size={96} />
        </div>
      </section>

      <section className="ms-card" style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.8rem', margin: 0 }}>Collect every shade</h2>
        <p style={{ margin: 0, color: 'var(--ms-muted)' }}>Every design comes in 5 shades, each bought separately at the same price. Complete a set for a Set badge in your Marble Bag. Tap a marble to see all its shades in 3D.</p>
      </section>

      {RARITY_ORDER.map((r) => {
        const designs = DESIGNS.filter((d) => d.rarity === r);
        const info = rarityInfo(r);
        const sub = r === 'limited' ? 'Numbered, credits only, never sold again' : `${priceLabel(info.price).replace('● ', '')} each${GROUP_NOTE[r] ? ` · ${GROUP_NOTE[r]}` : ''}`;
        return (
          <section key={r} style={{ display: 'grid', gap: 16 }} aria-labelledby={`group-${r}`}>
            <div className="ms-section-head">
              <h2 id={`group-${r}`} style={{ color: info.colour }}>{r === 'limited' ? 'Limited edition · October' : info.label}</h2>
              <span>{sub}</span>
            </div>
            <div className="ms-cards">
              {designs.map((d) => {
                const slug = `${d.key}-${d.shades[0].key}`;
                const mine = d.shades.filter((s) => owned.has(`${d.key}-${s.key}`)).length;
                const size = d.limited?.editionSize ?? catalog.editionSize;
                return (
                  <Link key={d.key} to={`/collection/${d.key}`} className="ms-mcard" style={{ borderColor: r === 'legendary' ? 'var(--ms-yellow)' : r === 'limited' ? 'var(--r-limited)' : undefined }}>
                    <MarbleBadge slug={slug} size={128} label={d.name} />
                    <span className="ms-mcard__rarity" style={{ color: info.colour }}>{info.label}</span>
                    <span className="ms-mcard__name">{d.name}</span>
                    <span className="ms-mcard__story">{d.story}</span>
                    <span className="ms-mcard__mat"><b style={{ color: 'var(--ms-soft)' }}>In races:</b> {d.inRaces}</span>
                    <span className="ms-mcard__fe">{d.limited ? `All ${size.toLocaleString('en-US')} are numbered` : editionLine(live[slug], size)}</span>
                    {mine > 0 && <span style={{ color: 'var(--ms-green)', fontWeight: 700, fontSize: '0.9rem' }}>{d.shades.length > 1 ? `${mine} of ${d.shades.length} shades owned` : 'Owned'}</span>}
                    <span className="ms-price-btn">{priceLabel(info.price)}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="ms-note">Material notes under each marble describe the real 3D look in races (glass, stone, glow). Spinning badges have moving patterns. Looks only: every marble races exactly the same.</p>
    </div>
  );
}
