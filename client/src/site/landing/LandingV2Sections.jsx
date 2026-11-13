import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import MarbleBadge from '../marbles/MarbleBadge';
import TrackBanner from '../TrackBanner';
import { DESIGN, catalog, rarityInfo, shows3d } from '../../shared/marbles';
import starters from '../../shared/marbles/starters.json';
import { importOrReload } from '../../utils/staleCode';

/**
 * The landing page draft v2 (Moses, 13 Nov 2026): "How it works" under the hero race, the "Collect" display
 * case and "Your Marble Bag", for visitors who have never seen marble racing. Shown only on
 * /preview/landing-v2 (noindex, linked from nowhere): the live landing page does not use these.
 * Wording rules: no buy, pay or upgrade words; never suggests a marble from the shop is faster;
 * nothing aimed at children (neutral for all ages).
 */

const Turntable = lazy(() => importOrReload(() => import('../marbles/Turntable')));

const COLOUR = Object.fromEntries(starters.palette);
const shade = (key, no = 0) => DESIGN[key].shades[no];
const itemOf = (key, no = 0) => ({ key, slug: `${key}-${shade(key, no).key}`, design: DESIGN[key], shade: shade(key, no) });
const idOf = ({ design, shade: s }) => `${catalog.collection.code}${String(design.no).padStart(2, '0')}${s.no}`;

/** Six Schoolyard Classics for the display case, Common to Epic (the Champion Shooter stays in the collection). */
const CASE = [itemOf('clearie'), itemOf('aggie'), itemOf('cats-eye'), itemOf('corkscrew'), itemOf('oxblood'), itemOf('flame-swirl')];

/** A new player's 4 starter marbles, as an example: one in one colour, three in two (src/marbles/starters.js makes the real ones). */
const BAG = [
  { color_primary: COLOUR.Red, pattern: 'solid', name: 'Red', id: 'STRQ4M27' },
  { color_primary: COLOUR.Blue, color_secondary: COLOUR.Yellow, pattern: 'half', name: 'Blue and Yellow', id: 'STKW8D51' },
  { color_primary: COLOUR.Teal, color_secondary: COLOUR.Pink, pattern: 'half', name: 'Teal and Pink', id: 'STHN2V93' },
  { color_primary: COLOUR.Purple, color_secondary: COLOUR.Orange, pattern: 'half', name: 'Purple and Orange', id: 'STBX6P18' },
];

const H3 = { fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.5rem', margin: 0 };

/** 1. How it works: three steps, each with a small picture. */
export function HowItWorks() {
  const yours = itemOf('cats-eye', 1);
  return (
    <section id="how" aria-labelledby="how-h" className="ms-page">
      <div style={{ display: 'grid', gap: 6 }}>
        <h2 id="how-h" className="ms-landing__h2">How it works</h2>
        <p className="ms-lede" style={{ margin: 0 }}>Every race is a new story, and your marble is the star.</p>
      </div>
      <ol className="ms-how">
        <li className="ms-card ms-how__step">
          <div className="ms-how__pic ms-how__pic--marble">
            <MarbleBadge slug={yours.slug} size={92} label={`${yours.design.name}, ${yours.shade.name}`} />
            <span className="ms-how__tag"><b>{yours.design.name}</b><span className="ms-id">#{idOf(yours)}</span></span>
          </div>
          <span className="ms-landing__num">1</span>
          <h3 style={H3}>Pick your marble</h3>
          <p>It's yours, with its own name and Marble ID.</p>
        </li>
        <li className="ms-card ms-how__step">
          <div className="ms-how__pic ms-how__pic--race" style={{ background: 'linear-gradient(150deg,#C94F3D,#2F5BEA)' }}>
            <TrackBanner slug="frostmere-marble-grand-prix" />
            <span className="ms-how__live"><i />LIVE · 20 MARBLES</span>
          </div>
          <span className="ms-landing__num">2</span>
          <h3 style={H3}>Drop it into a live race</h3>
          <p>Against 19 others. Real physics, so anything can happen.</p>
        </li>
        <li className="ms-card ms-how__step">
          <div className="ms-how__pic ms-how__pic--win">
            <span className="ms-coins ms-how__coins">● +120</span>
            <span className="ms-how__trio" aria-hidden="true">
              <MarbleBadge slug={itemOf('oxblood').slug} size={46} />
              <MarbleBadge slug={itemOf('corkscrew', 2).slug} size={46} />
              <MarbleBadge slug={itemOf('aggie', 3).slug} size={46} />
            </span>
          </div>
          <span className="ms-landing__num">3</span>
          <h3 style={H3}>Win, collect, race your friends</h3>
          <p>Win coins, collect marbles, and challenge your friends to a rematch.</p>
        </li>
      </ol>
    </section>
  );
}

/** 2. Collect: a display case of real Schoolyard Classics, spinning in 3D. */
export function CollectCase() {
  return (
    <section id="collect" aria-labelledby="collect-h" className="ms-page">
      <div className="ms-case">
        <div className="ms-case__text">
          <span className="ms-case__kicker">COLLECTION {catalog.collection.number} · {catalog.collection.name.toUpperCase()}</span>
          <h2 id="collect-h" className="ms-landing__h2">Collect</h2>
          <p className="ms-lede" style={{ margin: 0 }}>Classic marbles, made in 3D down to the swirl, and the same ones you race with.</p>
          <ul className="ms-case__facts">
            <li><b>Every marble has its own ID and certificate.</b></li>
            <li><b>The first {catalog.editionSize} of each are numbered First Editions.</b></li>
            <li>Looks only: every marble races exactly the same.</li>
          </ul>
          <Link to="/collection" className="ms-btn ms-btn--primary ms-btn--lg" style={{ justifySelf: 'start' }}>Browse the collection</Link>
        </div>
        <ul className="ms-case__shelf" aria-label="Marbles from the Schoolyard Classics">
          {CASE.map((m) => {
            const info = rarityInfo(m.design.rarity);
            const label = `${m.design.name}, ${m.shade.name}`;
            return (
              <li key={m.slug} className="ms-case__slot">
                <div className="ms-case__ball">
                  {shows3d(m.slug) ? (
                    <Suspense fallback={<MarbleBadge slug={m.slug} size={96} still />}>
                      <Turntable slug={m.slug} label={`${label}, in 3D`} />
                    </Suspense>
                  ) : <MarbleBadge slug={m.slug} size={96} label={label} />}
                </div>
                <b>{m.design.name}</b>
                <span className="ms-case__meta"><span style={{ color: info.colour }}>{info.label}</span><span className="ms-id">#{idOf(m)}</span></span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** 3. Your Marble Bag: a new player's 4 starter marbles, theirs right away. */
export function StarterBag() {
  return (
    <section id="bag" aria-labelledby="bag-h" className="ms-page">
      <div className="ms-two" style={{ alignItems: 'center' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <h2 id="bag-h" className="ms-landing__h2">Your Marble Bag</h2>
          <p style={{ margin: 0, color: 'var(--ms-soft)' }}>Start your first race and 4 starter marbles are yours, free, right away. Each one has its own Marble ID and certificate, and no one else races the same look as you.</p>
          <p style={{ margin: 0, color: 'var(--ms-soft)' }}>Race with any of them, then add to your bag with the coins you win.</p>
          <Link to="/play/start?quick=1" className="ms-btn ms-btn--lg" style={{ justifySelf: 'start' }}>Get my 4 marbles</Link>
        </div>
        <div className="ms-bagdemo" aria-label="Example: a new player's Marble Bag">
          <span className="ms-bagdemo__title">MARBLE BAG · 4 MARBLES</span>
          <ul className="ms-bagdemo__grid">
            {BAG.map((m) => (
              <li key={m.id} className="ms-bagdemo__slot">
                <MarbleBadge marble={m} size={72} label={`${m.name} starter marble`} />
                <span className="ms-id">#{m.id}</span>
              </li>
            ))}
          </ul>
          <span className="ms-note" style={{ textAlign: 'center' }}>An example: your own 4 get their own colours and IDs.</span>
        </div>
      </div>
    </section>
  );
}
