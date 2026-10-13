import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { daysLeftIn } from './ScoresPage';

const TRAINING_GOAL = 5; // races a day that keep the streak and train skill ([placeholder] rule)

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
    const [races, tracks, board, mine] = await Promise.all([
      api.races('lobby', 10).catch(() => ({ races: [] })),
      api.tracks().catch(() => ({ tracks: [] })),
      api.scoreboard('season').catch(() => null),
      user ? api.userRaces?.(user.id).catch(() => null) : null,
    ]);
    return { races: races.races ?? [], tracks: tracks.tracks ?? tracks ?? [], board, mine };
  }, [user?.id]);

  const today = trackOfTheDay(data?.tracks?.filter((t) => t.is_active !== false));
  const waiting = (data?.races ?? []).reduce((n, r) => n + (r.entry_count ?? r.entries_count ?? 0), 0);
  const me = data?.board?.rows?.find((r) => r.me);
  const todayRaces = (data?.mine?.races ?? []).filter((r) => r.finished_at && new Date(r.finished_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="ms-page">
      <div className="ms-two" style={{ alignItems: 'stretch' }}>
        <section className="ms-hero ms-home-hero" style={{ flexBasis: 520, alignContent: 'end' }} aria-labelledby="tod-h">
          <div style={{ display: 'grid', gap: 10 }}>
            <span className="ms-badge-label" style={{ background: 'var(--ms-orange)' }}>
              {data?.races?.length ? `NEXT RACE OPEN · ${waiting || data.races.length} ${waiting ? 'players' : 'races'} waiting` : 'START THE NEXT RACE'}
            </span>
            <span className="ms-eyebrow" style={{ color: 'var(--ms-soft)' }}>Track of the day</span>
            <h1 id="tod-h" className="ms-h1" style={{ fontFamily: 'var(--ms-cond)', fontWeight: 800 }}>{today?.name ?? '[Track]'}</h1>
            <span style={{ color: 'var(--ms-soft)' }}>{today?.description ?? ''}</span>
          </div>
        </section>
        <aside style={{ display: 'grid', gap: 14, flexBasis: 320, alignContent: 'start' }}>
          <Link to="/play/start?quick=1" className="ms-btn ms-btn--primary ms-btn--lg" style={{ minHeight: 72, fontSize: '1.6rem' }}>QUICK RACE</Link>
          <div className="ms-row" style={{ flexWrap: 'nowrap' }}>
            <Link to="/play/track" className="ms-card ms-tile"><b>Race solo</b><span>Pick a track</span></Link>
            <Link to="/play/friends" className="ms-card ms-tile"><b>Race with friends</b><span>Invite and go</span></Link>
          </div>
          <div className="ms-card" style={{ display: 'grid', gap: 8 }}>
            <div className="ms-row" style={{ justifyContent: 'space-between' }}><b>Today's training</b><span style={{ color: 'var(--ms-soft)' }}>{Math.min(todayRaces, TRAINING_GOAL)} of {TRAINING_GOAL} races</span></div>
            <div className="ms-progress"><div><div style={{ width: `${(Math.min(todayRaces, TRAINING_GOAL) / TRAINING_GOAL) * 100}%` }} /></div></div>
            <span className="ms-note">{todayRaces >= TRAINING_GOAL ? 'Done for today: your streak is safe.' : `${TRAINING_GOAL - todayRaces} more race${TRAINING_GOAL - todayRaces === 1 ? '' : 's'} keep your streak and train your skill.`}</span>
          </div>
          <Link to="/scores" className="ms-card" style={{ display: 'grid', gap: 6, color: 'var(--ms-text)' }}>
            <span style={{ color: 'var(--ms-orange)', fontWeight: 700 }}>{data?.board?.season ? `${data.board.season.name} · ${daysLeftIn(data.board.season)} days left` : 'This season'}</span>
            <div className="ms-row" style={{ justifyContent: 'space-between' }}><span style={{ color: 'var(--ms-muted)' }}>Your rank</span><b>{me ? `#${me.rank}` : '—'}</b></div>
            <div className="ms-row" style={{ justifyContent: 'space-between' }}><span style={{ color: 'var(--ms-muted)' }}>Coins earned this season</span><b>{(me?.coins ?? 0).toLocaleString('en-US')}</b></div>
          </Link>
        </aside>
      </div>
    </div>
  );
}
