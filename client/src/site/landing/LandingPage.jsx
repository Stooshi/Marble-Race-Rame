import PromoBanner from './PromoBanner';
import { lazy, Suspense, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import MarbleBadge from '../marbles/MarbleBadge';
import { FEATURED_DESIGNS, originalSlug, rarityInfo } from '../../shared/marbles';
import { importOrReload } from '../../utils/staleCode';
import { isNativeApp } from '../../app/native';
import TrackBanner from '../TrackBanner';
import { BUILD_TRACK_COUNT, roundedTracks } from '../trackCount';

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

const HeroReplay = lazy(() => importOrReload(() => import('./HeroReplay')));

// The series cards: name, line, gradient (shown while the picture loads), and the track whose picture the card shows;
// a card marked `true` at the end appears only once its series has tracks live (a new series, still switched off).
const SERIES = [
  ['World Tour', 'landmarks around the globe', 'linear-gradient(150deg,#1D3A5C,#3DDC97)', 'san-francisco'],
  ['Grand Prix', 'start lights and crowds', 'linear-gradient(150deg,#C94F3D,#2F5BEA)', 'frostmere-marble-grand-prix'],
  ['Coasters', 'high on steel rails', 'linear-gradient(150deg,#F2A541,#3A6B8C)', 'hong-kong-crossing'],
  ['Canyons', 'through real canyons', 'linear-gradient(150deg,#D9773A,#5A2E1E)', 'grand-canyon-burst'],
  ['Blocks', 'worlds built of blocks', 'linear-gradient(150deg,#5B7FB8,#7FAE5F)', 'spawn-point', true],
  ['Track and Field', 'through famous stadiums', 'linear-gradient(150deg,#B9493A,#2F5D9A)', 'marble-stadium-sprint', true],
  ['Rivers', 'along the great rivers', 'linear-gradient(150deg,#2E86AB,#3F7A4A)', 'danube-night-run', true],
  ['Pinball', 'bumpers and flippers', 'linear-gradient(150deg,#3A1E6B,#FF3FA8)', 'flipper-spins'],
  ['Arcade', 'neon and pixels', 'linear-gradient(150deg,#0A0A12,#3FD8FF)', 'checkpoint-rush'],
];
const FAQ = [
  ['Is Marble Spins free?', 'Yes. Every race is free and unlimited. You can buy extra marble looks in the shop if you want to.'],
  ['Do I need to download anything?', 'No. It plays in your browser on phone or computer. Apps for iPhone and Android are on the way.'],
  ['Can money make my marble faster?', 'Never. Every player\'s marble races at the same level, whatever it looks like: the race itself decides who wins. Purchases only change how it looks.'],
  ['How long is a race?', 'About a minute. Perfect for a quick break, or ten in a row.'],
];

/** The landing page (marblespins.com for visitors): a real race replay up top, then how it works. */
export default function LandingPage() {
  const [search] = useSearchParams();
  const deleted = search.get('deleted') === '1';
  const { data } = useAsync(() => api.tracks().catch(() => ({ tracks: [] })), [], 'tracks');
  const counts = useMemo(() => {
    const c = {};
    for (const t of data?.tracks ?? []) c[t.series] = (c[t.series] ?? 0) + 1;
    return c;
  }, [data]);
  // "80+": the live count rounded down (the build's count before the list loads), so the page that
  // search engines read never states a number that has gone stale (src/site/trackCount.js).
  const total = roundedTracks(data?.tracks?.length || BUILD_TRACK_COUNT);
  // The series with tracks live now (from the live track list, so the heading never goes stale).
  const liveSeries = data?.tracks?.length ? SERIES.filter(([name]) => counts[name]).length : SERIES.filter((s) => !s[4]).length;
  const cards = SERIES.filter(([name, , , , whenLive]) => !whenLive || counts[name]);

  return (
    <div className="ms-landing">
      {deleted && <div className="ms-page" style={{ paddingBottom: 0 }}><div className="ms-msg" role="status">Your account has been deleted. Thanks for racing with us.</div></div>}
      <section aria-label="Intro" className="ms-page ms-landing__intro">
        <div className="ms-two" style={{ alignItems: 'end' }}>
          <div style={{ display: 'grid', gap: 12, flexBasis: 520 }}>
            <span className="ms-heroplay__live" style={{ justifySelf: 'start' }}><i />THE NEXT RACE STARTS WHEN YOU DO</span>
            <h1 className="ms-landing__h1">Don't just watch marble races. Race them.</h1>
          </div>
          <div style={{ display: 'grid', gap: 14, flexBasis: 380 }}>
            <p className="ms-lede" style={{ margin: 0 }}>Pick your marble, drop it into a 20-marble race on one of {total ? `${total} wild tracks` : 'dozens of wild tracks'}, and beat your friends. {isNativeApp() ? 'Free to play.' : 'Free, in your browser, no download.'}</p>
            <div className="ms-row">
              <Link to="/play/start?quick=1" className="ms-btn ms-btn--primary ms-btn--lg">PLAY NOW, FREE</Link>
              <Link to="/play/friends" className="ms-btn ms-btn--lg ms-btn--ghost">Race with friends</Link>
            </div>
            <span className="ms-note">Your first race needs no signup.</span>
          </div>
        </div>
        <Suspense fallback={<div className="ms-heroplay"><div className="ms-heroplay__view"><div className="ms-heroplay__fallback" /></div></div>}>
          <HeroReplay />
        </Suspense>
        <span className="ms-note">A real race replay, picked for a close finish. Every visit shows a different race.</span>
      </section>

      <PromoBanner />

      <section id="how" aria-labelledby="how-h" className="ms-page">
        <h2 id="how-h" className="ms-landing__h2">How to play</h2>
        <div className="ms-grid">
          {[['Pick your Shooter', 'Choose the marble you race with from your Marble Bag. Everyone starts with 4 free starter marbles of their own.'],
            ['Pick a track, or Quick race', 'Race on the track you like, or jump straight into the next race with Quick race.'],
            ['Watch it race', 'A race lasts about a minute. Every finish earns coins, and the top three earn the most.']].map(([h, p], k) => (
            <div key={h} className="ms-card" style={{ display: 'grid', gap: 8 }}>
              <span className="ms-landing__num">{k + 1}</span><h3 className="ms-h3" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.5rem' }}>{h}</h3><p style={{ margin: 0, color: 'var(--ms-soft)' }}>{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tracks" aria-labelledby="tracks-h" className="ms-page">
        <div style={{ display: 'grid', gap: 6 }}>
          <h2 id="tracks-h" className="ms-landing__h2">{total ? `${total} tracks` : 'Tracks'} in {NUMBER_WORDS[liveSeries] ?? liveSeries} series</h2>
          <p className="ms-lede" style={{ margin: 0 }}>From Swedish fjords to pinball tables, every track has its own start, layout and surprises.</p>
        </div>
        <div className="ms-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))' }}>
          {cards.map(([name, line, pic, picture]) => (
            <div key={name} className="ms-trackcard" style={{ cursor: 'default' }}>
              <div className="ms-trackcard__pic" style={{ background: pic }}>
                {picture && <TrackBanner slug={picture} />}
                {!counts[name] && <span className="ms-badge-label">COMING SOON</span>}
              </div>
              <div className="ms-trackcard__body"><b>{name}</b><span>{counts[name] ? `${counts[name]} ${name === 'Pinball' ? 'table' : 'track'}${counts[name] === 1 ? '' : 's'} · ` : ''}{line}</span></div>
            </div>
          ))}
        </div>
      </section>

      <section id="marbles" aria-labelledby="marbles-h" className="ms-page">
        <div className="ms-two" style={{ alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <h2 id="marbles-h" className="ms-landing__h2">Build your Marble Bag</h2>
            <p style={{ margin: 0, color: 'var(--ms-soft)' }}>Collect marbles from Common to Legendary, with stripes, swirls, glitter and glow. Earn coins in every race and spend them in the shop.</p>
            <p style={{ margin: 0, color: 'var(--ms-soft)' }}>Limited-edition marbles drop every month, numbered and gone when they're gone.</p>
            <div className="ms-card" style={{ borderColor: 'var(--ms-yellow)' }}><strong>Looks, never speed.</strong> Every player's marble races at the same level. Money buys style, never wins.</div>
            <Link to="/collection" style={{ color: 'var(--ms-yellow)', fontWeight: 700 }}>See the collection →</Link>
          </div>
          <div className="ms-row" style={{ justifyContent: 'center', gap: 18 }}>
            {FEATURED_DESIGNS.map((d) => (
              <div key={d.key} style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
                <MarbleBadge slug={originalSlug(d)} size={84} />
                <span style={{ color: rarityInfo(d.rarity).colour, fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.06em' }}>{rarityInfo(d.rarity).label.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="friends" aria-labelledby="friends-h" className="ms-page">
        <div className="ms-two" style={{ alignItems: 'center' }}>
          <div className="ms-card" style={{ display: 'grid', gap: 12 }}>
            <span style={{ fontWeight: 700 }}>Your room link</span>
            <div className="ms-row"><div className="ms-field-like" style={{ flexBasis: 200 }}>marblespins.com/r/K7P2QX</div><span className="ms-chip">Copy link</span></div>
            <Link to="/play/friends" className="ms-note">Make a room: friends join from the link, no account needed.</Link>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <h2 id="friends-h" className="ms-landing__h2">Race your friends</h2>
            <p style={{ margin: 0, color: 'var(--ms-soft)' }}>Send one link. Up to 20 players race together, and any empty places are filled with computer players. Lost by a hair? Hit rematch.</p>
            <Link to="/play/friends" className="ms-btn" style={{ justifySelf: 'start' }}>Start a room</Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="daily-h" className="ms-page">
        <h2 id="daily-h" className="ms-landing__h2">Come back every day</h2>
        <div className="ms-grid">
          {[['▲', 'Daily goal', 'Race five times a day for bonus coins, and keep your streak going day after day.'],
            ['★', 'Scoreboards', 'Climb the scoreboard by the coins you earn racing, not the coins you buy.'],
            ['●', 'New tracks', "Fresh tracks and limited marbles arrive regularly, so there's always something new."]].map(([icon, h, p]) => (
            <div key={h} className="ms-card" style={{ display: 'grid', gap: 8 }}>
              <span aria-hidden="true" style={{ color: 'var(--ms-orange)', fontSize: '1.4rem' }}>{icon}</span>
              <h3 className="ms-h3" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800, fontSize: '1.5rem' }}>{h}</h3>
              <p style={{ margin: 0, color: 'var(--ms-soft)' }}>{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" aria-labelledby="faq-h" className="ms-page ms-page--narrow">
        <h2 id="faq-h" className="ms-landing__h2">Questions</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {FAQ.map(([q, a]) => (
            <details key={q} className="ms-card ms-faq"><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
        <Link to="/help" style={{ color: 'var(--ms-yellow)', fontWeight: 700 }}>More answers in the Help Centre →</Link>
      </section>

      <section aria-label="Play now" className="ms-page">
        <div className="ms-hero" style={{ justifyContent: 'space-between' }}>
          <h2 className="ms-landing__h2" style={{ flex: '1 1 300px' }}>The next race starts soon.</h2>
          <Link to="/play/start?quick=1" className="ms-btn ms-btn--primary ms-btn--lg" style={{ flex: '0 0 auto' }}>PLAY NOW, FREE</Link>
        </div>
      </section>
    </div>
  );
}
