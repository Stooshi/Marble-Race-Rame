import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TrackBanner, { SERIES_PIC } from '../TrackBanner';
import WildnessBadge from '../WildnessBadge';
import { WILDNESS, WILDNESS_LEVELS, WILDNESS_NOTE } from '../../shared/wildness.js';

/**
 * DESIGN MOCKUP ONLY (Moses, 12 Nov 2026): how a track pack would look in the shop, the Grand Prix pack as the
 * example. /preview/shop-packs (noindex like every /preview page; linked from nowhere). Nothing is for sale:
 * every price is "[price]" and no button buys, unlocks or calls the server. The real shop (/shop) is unchanged.
 *
 * The packs' figures are a snapshot of 12 Nov 2026 (src/packs/list.js, the free set of 30, and the wildness
 * scores in src/tracks/wildness.json): the tracks in each pack today and their levels.
 */

const PRICE = '[price]';
const FULL = 20;

/** The 11 packs: the best-looking track's picture, the tracks in the pack today and their levels. */
export const PACKS = [
  { key: 'grand-prix', name: 'Grand Prix', series: 'Grand Prix', pic: 'pudong-marble-grand-prix', live: 9, mix: { easy: 2, wild: 5, extreme: 2 } },
  { key: 'world-tour', name: 'World Tour', series: 'World Tour', pic: 'saint-tropez', live: 11, mix: { easy: 8, wild: 1, extreme: 2 } },
  { key: 'coasters', name: 'Coasters', series: 'Coasters', pic: 'phantom-peak', live: 9, mix: { easy: 7, wild: 2, extreme: 0 } },
  { key: 'canyons', name: 'Canyons', series: 'Canyons', pic: 'tiger-leaping-spins', live: 12, mix: { easy: 6, wild: 5, extreme: 1 } },
  { key: 'blocks-1', name: 'Blocks 1', series: 'Blocks', pic: 'bonus-round', live: 12, mix: { easy: 7, wild: 5, extreme: 0 } },
  { key: 'blocks-2', name: 'Blocks 2', series: 'Blocks', pic: 'venice-cube-canals', live: 20, mix: { easy: 6, wild: 6, extreme: 8 } },
  { key: 'track-and-field', name: 'Track and Field', series: 'Track and Field', pic: 'stockholm-1912-relay', live: 7, mix: { easy: 5, wild: 1, extreme: 1 } },
  { key: 'rivers', name: 'Rivers', series: 'Rivers', pic: 'zambezi-falls-run', live: 13, mix: { easy: 3, wild: 10, extreme: 0 } },
  { key: 'peaks', name: 'Peaks', series: 'Peaks', pic: 'k2-concordia', live: 12, mix: { easy: 4, wild: 5, extreme: 3 } },
  { key: 'pinball', name: 'Pinball', series: 'Pinball', pic: 'grand-champion', live: 4, mix: { easy: 1, wild: 2, extreme: 1 } },
  { key: 'arcade', name: 'Arcade', series: 'Arcade', pic: 'kill-screen', live: 4, mix: { easy: 2, wild: 0, extreme: 2 } },
];

/** The Grand Prix pack: its 9 live tracks and the 11 planned ones (20). */
export const GRAND_PRIX = [
  { slug: 'pudong-marble-grand-prix', name: 'Pudong Marble Grand Prix', place: 'Shanghai, China', wildness: 'extreme', line: 'A loop with the glittering skyline behind it, then a banked sweep along the Huangpu at night' },
  { slug: 'stockholm-marble-grand-prix', name: 'Stockholm Marble Grand Prix', place: 'Stockholm, Sweden', wildness: 'extreme', line: 'Twin chutes down the Södermalm cliffs and the Slussen drop to the water' },
  { slug: 'nairobi-marble-grand-prix', name: 'Nairobi Marble Grand Prix', place: 'Nairobi, Kenya', wildness: 'wild', line: 'The loop on the Nairobi Expressway, then either side of a great acacia' },
  { slug: 'istanbul-marble-grand-prix', name: 'Istanbul Marble Grand Prix', place: 'Istanbul, Türkiye', wildness: 'wild', line: 'Over the Galata crest and spiralling down round the clock tower by the Grand Bazaar' },
  { slug: 'delhi-red-fort-marble-grand-prix', name: 'Delhi Red Fort Marble Grand Prix', place: 'Delhi, India', wildness: 'wild', line: 'Off the Red Fort’s ramparts and spiralling down round the Qutub Minar' },
  { slug: 'wyrmwood-hollow-marble-grand-prix', name: 'Wyrmwood Hollow Marble Grand Prix', place: 'Our own dragon valley', wildness: 'wild', line: 'A banked coil round the sleeping dragon and over a chasm on a stone bridge' },
  { slug: 'elderglade-marble-grand-prix', name: 'Elderglade Marble Grand Prix', place: 'Our own elven forest', wildness: 'wild', line: 'Down from a giant tree and through a shimmering waterfall' },
  { slug: 'lagos-marble-grand-prix', name: 'Lagos Marble Grand Prix', place: 'Lagos, Nigeria', wildness: 'easy', line: 'A half-pipe into the market and the long banked turn on the lagoon bridge' },
  { slug: 'dubai-marble-grand-prix', name: 'Dubai Marble Grand Prix', place: 'Dubai, UAE', wildness: 'easy', line: 'A floodlit night race from the Burj Khalifa, through the splitter to the Marina' },
  { name: 'Heartland Oval Speedway', place: 'The American Midwest', line: 'Steep banked ovals, lap after lap' },
  { name: 'Lapland Ice Race', place: 'Lapland', line: 'A frozen lake under the northern lights' },
  { name: 'Lombardy Parkland Circuit', place: 'Lombardy, Italy', line: 'Fast straights through old royal parkland' },
  { name: 'Mexico City Stadium Section', place: 'Mexico City, Mexico', line: 'Through a packed stadium in the middle of the lap' },
  { name: 'Nevada Drag Strip', place: 'Nevada, USA', line: 'A dead-straight sprint across the desert' },
  { name: 'Finland Forest Rally', place: 'Central Finland', line: 'Jumps over the crests of forest gravel roads' },
  { name: 'Tokyo Night Street Race', place: 'Tokyo, Japan', line: 'Neon streets and tight city corners at night' },
  { name: 'São Paulo Rain Circuit', place: 'São Paulo, Brazil', line: 'A rain-soaked circuit under heavy skies' },
  { name: 'Atacama Desert Rally', place: 'Atacama, Chile', line: 'Over the dunes of the driest desert on Earth' },
  { name: 'Rocky Mountain Hill Run', place: 'Colorado, USA', line: 'Hairpins all the way up the mountain' },
  { name: 'Outback Red Dirt Rally', place: 'The Australian Outback', line: 'Red dirt, dust and long jumps' },
];

const TABS = [
  { key: 'packs', label: 'Track packs' },
  { key: 'marbles', label: 'Marbles' },
  { key: 'pass', label: 'Season pass' },
  { key: 'coins', label: 'Coins' },
];

function MockBanner() {
  return (
    <div className="ms-mock-banner" role="note">
      <b>Design mockup</b> Nothing here is for sale and no button buys anything. Prices are placeholders.
    </div>
  );
}

function Mix({ mix }) {
  return (
    <span className="ms-pack__mix" aria-label={WILDNESS_LEVELS.map((l) => `${mix[l]} ${WILDNESS[l].word}`).join(', ')}>
      {WILDNESS_LEVELS.map((l) => (
        <span key={l} className={`ms-pack__mixitem ms-wild--${l}`}><WildnessBadge level={l} /> <b>{mix[l]}</b></span>
      ))}
    </span>
  );
}

/** The Track packs tab: a card for each pack. */
function PacksTab({ complete, onOpen }) {
  return (
    <section aria-labelledby="packs-h" style={{ display: 'grid', gap: 14 }}>
      <div className="ms-section-head" style={{ justifyContent: 'space-between' }}>
        <h2 id="packs-h">Track packs</h2>
        <span>{PACKS.length} packs · 3 tracks of every series stay free</span>
      </div>
      <p className="ms-wild-note">Every pack is {FULL} tracks of one series. Unlock a pack to race its tracks any time, and to race them with friends in your rooms. Paid leagues can race any track, locked ones included.</p>
      <div className="ms-pack-grid">
        {PACKS.map((p) => {
          const ready = complete || p.live >= FULL;
          return (
            <article key={p.key} className="ms-pack">
              <button type="button" className="ms-trackcard__pic ms-pack__pic" style={{ background: SERIES_PIC[p.series] }} onClick={() => onOpen(p.key)} aria-label={`See the ${p.name} pack`}>
                <TrackBanner slug={p.pic} force />
                <span className="ms-badge-label">{p.series.toUpperCase()}</span>
              </button>
              <div className="ms-pack__body">
                <h3 className="ms-pack__name">{p.name}</h3>
                <span className="ms-pack__count">{FULL} tracks{!complete && p.live < FULL ? ` · ${p.live} ready, ${FULL - p.live} on the way` : ''}</span>
                <Mix mix={p.mix} />
                <div className="ms-pack__buy">
                  <span className="ms-pack__price">{PRICE}</span>
                  {ready
                    ? <button type="button" className="ms-btn ms-btn--primary ms-btn--sm" onClick={() => {}}>Unlock</button>
                    : <span className="ms-pack__soon">Coming soon</span>}
                </div>
                <button type="button" className="ms-pack__see" onClick={() => onOpen(p.key)}>See the tracks</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OtherTab({ tab }) {
  const what = { marbles: 'the marbles (Schoolyard Classics, bags, the seasonal shelf)', pass: 'the Holiday Season pass', coins: 'the coin packs' }[tab];
  return (
    <section className="ms-card" style={{ display: 'grid', gap: 10 }}>
      <h2 className="ms-h2" style={{ margin: 0 }}>{TABS.find((t) => t.key === tab).label}</h2>
      <p style={{ margin: 0, color: 'var(--ms-soft)' }}>This tab would show {what}, exactly as the shop does today. The mockup is only about track packs.</p>
      <Link className="ms-btn ms-btn--ghost ms-btn--sm" style={{ justifySelf: 'start' }} to="/shop">Open today’s shop</Link>
    </section>
  );
}

function BuyAll() {
  return (
    <div className="ms-pack-page__buy">
      <button type="button" className="ms-btn ms-btn--primary" onClick={() => {}}>Unlock all {FULL} tracks – {PRICE}</button>
      <span className="ms-note" style={{ margin: 0 }}>Paid leagues can race any track, locked ones included.</span>
    </div>
  );
}

/** A pack's own page (the Grand Prix pack is the example). */
function PackPage({ pack, onBack }) {
  const tracks = pack.key === 'grand-prix' ? GRAND_PRIX : [];
  const live = tracks.filter((t) => t.slug);
  return (
    <div style={{ display: 'grid', gap: 22 }}>
      <button type="button" className="ms-btn ms-btn--ghost ms-btn--sm" style={{ justifySelf: 'start' }} onClick={onBack}>← Track packs</button>
      <section className="ms-pack-hero" aria-labelledby="pack-h">
        <div className="ms-pack-hero__pic" style={{ background: SERIES_PIC[pack.series] }}>
          <TrackBanner slug={pack.pic} force />
        </div>
        <div className="ms-pack-hero__text">
          <span className="ms-badge-label">TRACK PACK · {FULL} TRACKS</span>
          <h1 id="pack-h" className="ms-h1 ms-shop-title">{pack.name}</h1>
          <p className="ms-lede" style={{ margin: 0 }}>
            {pack.key === 'grand-prix'
              ? 'City circuits and motorsport from around the world: street races through famous skylines, ovals, rallies, drag strips and hill runs.'
              : `Every ${pack.series} track, in one pack.`}
          </p>
          <Mix mix={pack.mix} />
          <BuyAll />
        </div>
      </section>

      {pack.key === 'grand-prix' ? (
        <section aria-labelledby="tracks-h" style={{ display: 'grid', gap: 14 }}>
          <div className="ms-section-head" style={{ justifyContent: 'space-between' }}>
            <h2 id="tracks-h">The tracks</h2>
            <span>{live.length} ready · {tracks.length - live.length} coming soon</span>
          </div>
          <p className="ms-wild-note">{WILDNESS_NOTE}</p>
          <div className="ms-pack-tracks">
            {tracks.map((t) => (
              <article key={t.name} className={`ms-trackcard ms-pack-track${t.slug ? '' : ' is-soon'}`}>
                <div className="ms-trackcard__pic" style={{ background: SERIES_PIC['Grand Prix'] }}>
                  {t.slug ? <TrackBanner slug={t.slug} force /> : <span className="ms-pack-track__flag" aria-hidden="true">🏁</span>}
                  {!t.slug && <span className="ms-badge-label">COMING SOON</span>}
                </div>
                <div className="ms-trackcard__body">
                  <b>{t.name}</b>
                  <span className="ms-trackcard__meta">{t.place}{t.slug ? <WildnessBadge level={t.wildness} /> : null}</span>
                  <span className="ms-pack-track__line">{t.line}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <p className="ms-note">The mockup shows the Grand Prix pack’s page; the others would look the same.</p>
      )}

      <BuyAll />
    </div>
  );
}

export default function ShopPacksPreview() {
  const [search, setSearch] = useSearchParams();
  const tab = TABS.some((t) => t.key === search.get('tab')) ? search.get('tab') : 'packs';
  const open = PACKS.find((p) => p.key === search.get('pack')) ?? null;
  const complete = search.get('as') === 'complete';
  const set = (next) => setSearch({ ...Object.fromEntries(search), ...next }, { replace: false });
  useEffect(() => { window.scrollTo?.(0, 0); }, [open?.key]);

  return (
    <div className="ms-page">
      <MockBanner />
      {open ? (
        <PackPage pack={open} onBack={() => { const s = Object.fromEntries(search); delete s.pack; setSearch(s); }} />
      ) : (
        <>
          <div style={{ display: 'grid', gap: 12 }}>
            <h1 className="ms-h1 ms-shop-title" style={{ margin: 0 }}>Shop</h1>
            <div className="ms-tabs" role="tablist" aria-label="Shop">
              {TABS.map((t) => (
                <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => set({ tab: t.key })}>{t.label}</button>
              ))}
            </div>
          </div>
          {tab === 'packs' && (
            <div className="ms-chips" role="group" aria-label="Mockup: show the packs">
              <span className="ms-chips__label">Mockup: show the packs</span>
              <button type="button" aria-pressed={!complete} onClick={() => { const s = Object.fromEntries(search); delete s.as; setSearch(s); }}>As today</button>
              <button type="button" aria-pressed={complete} onClick={() => set({ as: 'complete' })}>All at 20 tracks</button>
            </div>
          )}
          {tab === 'packs' ? <PacksTab complete={complete} onOpen={(key) => set({ pack: key })} /> : <OtherTab tab={tab} />}
        </>
      )}
    </div>
  );
}
