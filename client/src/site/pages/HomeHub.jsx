import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { daysLeftIn } from './ScoresPage';
import economy from '../../shared/economy.json';
import { BANNERS_ON, bannerSrc } from '../TrackBanner';

/** Today's track: the same for everyone all day, a different one each day. */
export function trackOfTheDay(tracks, date = new Date()) {
  if (!tracks?.length) return null;
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  const sorted = [...tracks].sort((a, b) => a.slug.localeCompare(b.slug));
  return sorted[day % sorted.length];
}

/** The signed-in home: the next race, today's track, quick ways to race, today's training and your season. */
export default function HomeHub() {
  const { user } = useAuth();
  const { data } = useAsync(async () => {
    const [races, tracks, board, day] = await Promise.all([
      api.races('lobby', 10).catch(() => ({ races: [] })),
      api.tracks().catch(() => ({ tracks: [] })),
      api.scoreboard('season').catch(() => null),
      user ? api.economyMe().catch(() => null) : null,
    ]);
    return { races: races.races ?? [], tracks: tracks.tracks ?? tracks ?? [], board, day };
  }, [user?.id]);

  const today = trackOfTheDay(data?.tracks?.filter((t) => t.is_active !== false));
  // The day's track's own picture behind the card (pre-launch item 12), over the gradient until it has loaded.
  const pic = today && BANNERS_ON ? bannerSrc(today.slug) : null;
  const [picLoaded, setPicLoaded] = useState(false);
  const waiting = (data?.races ?? []).reduce((n, r) => n + (r.entry_count ?? r.entries_count ?? 0), 0);
  const me = data?.board?.rows?.find((r) => r.me);
  // The daily goal and its streak (client/src/shared/economy.json): days run midnight to midnight UTC.
  const goal = data?.day?.goal?.races ?? economy.dailyGoal.races;
  const done = Math.min(data?.day?.races ?? 0, goal);
  const streak = data?.day?.streak?.days ?? 0;
  const bonus = data?.day?.goal?.coins ?? economy.dailyGoal.coins;
  const fullLeft = data?.day?.fullRacesLeft ?? economy.dailyLimit.fullRaces;

  return (
    <div className="ms-page">
      <div className="ms-two" style={{ alignItems: 'stretch' }}>
        <section className="ms-hero ms-home-hero" style={{ flexBasis: 520, alignContent: 'end' }} aria-labelledby="tod-h">
          {pic && <img className="ms-home-hero__pic" src={pic.src} srcSet={pic.srcSet} sizes="(max-width: 760px) 100vw, 640px" width="640" height="360" alt="" decoding="async" data-loaded={picLoaded || undefined} onLoad={() => setPicLoaded(true)} onError={() => setPicLoaded(false)} />}
          <div style={{ display: 'grid', gap: 10, position: 'relative' }}>
            <span className="ms-badge-label" style={{ background: 'var(--ms-orange)' }}>
              {data?.races?.length ? `NEXT RACE OPEN · ${waiting || data.races.length} ${waiting ? 'players' : 'races'} waiting` : 'START THE NEXT RACE'}
            </span>
            <span className="ms-eyebrow" style={{ color: 'var(--ms-soft)' }}>Track of the day</span>
            <h1 id="tod-h" className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>{today?.name ?? 'Quick race'}</h1>
            <span style={{ color: 'var(--ms-soft)' }}>{today?.description ?? ''}</span>
          </div>
        </section>
        <aside style={{ display: 'grid', gap: 14, flexBasis: 320, alignContent: 'start' }}>
          {/* (Phones: three identical yellow buttons, stacked full width; Moses, 25 Oct 2026. Computers: as before. site.css .ms-race-choices) */}
          <div className="ms-race-choices">
            <Link to="/play/start?quick=1" className="ms-btn ms-btn--primary ms-btn--lg ms-race-quick">QUICK RACE</Link>
            <div className="ms-row ms-race-more">
              <Link to="/play/track" className="ms-card ms-tile ms-race-choice"><b>Race solo</b><span>Pick a track</span></Link>
              <Link to="/play/friends" className="ms-card ms-tile ms-race-choice"><b>Race with friends</b><span>Invite and go</span></Link>
            </div>
          </div>
          <div className="ms-card" style={{ display: 'grid', gap: 8 }}>
            <div className="ms-row" style={{ justifyContent: 'space-between' }}><b>Daily goal</b><span style={{ color: 'var(--ms-soft)' }}>{done} of {goal} races</span></div>
            <div className="ms-progress"><div><div style={{ width: `${(done / goal) * 100}%` }} /></div></div>
            <span className="ms-note">
              {data?.day?.goal?.met
                ? `Done for today: +${bonus} coins. Streak: ${streak} day${streak === 1 ? '' : 's'} in a row.`
                : `${goal - done} more race${goal - done === 1 ? '' : 's'} for +${bonus} coins${streak ? ` and day ${Math.min(streak + 1, 999)} of your streak` : ''}.`}
            </span>
            <span className="ms-note">
              {fullLeft > 0
                ? `${fullLeft} of today's ${economy.dailyLimit.fullRaces} full-pay races left: ${economy.race.takingPart} coins each, plus a bonus for the top 10.`
                : `Today's ${economy.dailyLimit.fullRaces} full-pay races are done: races pay ${economy.dailyLimit.coinsAfter} coins each until midnight UTC.`}
            </span>
          </div>
          <Link to="/scores" className="ms-card" style={{ display: 'grid', gap: 6, color: 'var(--ms-text)' }}>
            <span style={{ color: 'var(--ms-orange)', fontWeight: 700 }}>{data?.board?.season ? (data.board.season.ended ? `${data.board.season.name} · final standings` : `${data.board.season.name} · ${daysLeftIn(data.board.season)} days left`) : 'Scoreboard'}</span>
            <div className="ms-row" style={{ justifyContent: 'space-between' }}><span style={{ color: 'var(--ms-muted)' }}>Your rank</span><b>{me ? `#${me.rank}` : '—'}</b></div>
            <div className="ms-row" style={{ justifyContent: 'space-between' }}><span style={{ color: 'var(--ms-muted)' }}>{data?.board?.season ? 'Coins earned this season' : 'Coins earned racing'}</span><b>{(me?.coins ?? 0).toLocaleString('en-US')}</b></div>
          </Link>
        </aside>
      </div>
    </div>
  );
}
