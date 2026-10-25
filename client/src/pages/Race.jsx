import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { useRaceStream } from '../hooks/useRaceStream';
import MarbleBall from '../components/MarbleBall';
import CpuTag from '../components/CpuTag';
import MarbleSelector from '../components/MarbleSelector';
import RaceViewer from '../components/RaceViewer';
import LiveRaceViewer3D from '../components/LiveRaceViewer3D';
import TrackPreview from '../components/TrackPreview';
import NextRace from '../components/NextRace';
import { Empty, ErrorMessage, Spinner } from '../components/Status';
import { formatTime } from '../utils/format';
import StartLights from '../components/StartLights';
import { play as playSound, raceCountdown, raceEnd, raceGo } from '../sound/engine';
import { track, trackingActive } from '../site/consent/tracking';
import { plainName } from '../shared/playerName';
import { isNativeApp } from '../app/native';

const obstacleName = (o) => o?.replace(/_/g, ' ');

const EVENT_TEXT = {
  boost: (name, o) => `${name} got a boost${o ? ` off the ${obstacleName(o)}` : ''}!`,
  bounce: (name, o) => {
    if (o === 'cable_car') return `${name} was caught by the cable car!`;
    if (o === 'marble') return `${name} took a big bump!`;
    if (o === 'splitter') return `${name} clipped the splitter!`;
    if (o === 'wall') return `${name} hit the wall`;
    return `${name} took a bad bounce${o ? ` on the ${obstacleName(o)}` : ''}`;
  },
  jump: (name) => `${name} flew!`,
  stumble: (name) => `${name} stumbled`,
};

export default function Race() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const details = useAsync(async () => {
    const data = await api.race(raceId);
    const track = await api.track(data.race.track_id).catch(() => null);
    return { ...data, track: track?.track, trackStats: track?.stats };
  }, [raceId]);
  const { reload } = details;

  const stream = useRaceStream(raceId, { onLobbyUpdate: useCallback(() => reload(), [reload]) });

  const race = details.data?.race;
  const status = stream.status !== 'connecting' ? stream.status : race?.status;
  // A solo race opened with ?go=1 (the starting line's START THE RACE): its 3D view is built first,
  // then this page starts it, so the player always sees the countdown (Moses, 22 Oct 2026).
  const [search] = useSearchParams();
  const startsHere = search.get('go') === '1';
  const started = useRef(false);
  const startWhenReady = useCallback(() => {
    if (started.current) return;
    started.current = true;
    api.startRace(raceId).catch(() => reload());
  }, [raceId, reload]);

  // (A track without a 3D view to get ready: started at once.)
  useEffect(() => {
    if (startsHere && race?.status === 'lobby' && user && race.created_by === user.id && details.data && !details.data.track?.physics) startWhenReady();
  }, [startsHere, race?.status, race?.created_by, user, details.data, startWhenReady]);

  // A race that finished before we opened the page goes straight to results.
  useEffect(() => {
    if (race?.status === 'finished' && stream.status !== 'running') navigate(`/results/${raceId}`, { replace: true });
  }, [race?.status, stream.status, raceId, navigate]);

  // Pick up the decided entry list (bots, lanes) once the countdown starts.
  useEffect(() => {
    if (stream.status === 'countdown') reload();
  }, [stream.status, reload]);

  // The 2D view's start (the 3D view times its own to the gate): the pack leaving, when the race
  // goes from its countdown to running (not when the page opens mid-race).
  const sawCountdown = useRef(false);
  useEffect(() => {
    if (stream.status === 'countdown') sawCountdown.current = true;
    const twoD = view === '2d' || (view === null && !stream.meta?.track?.physics);
    if (stream.status === 'running' && twoD) {
      if (sawCountdown.current) playSound('launch');
      sawCountdown.current = false;
      raceGo(raceId); // the race's music (the 3D view starts it at its own GO)
    }
  }, [stream.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving the race (or moving on to the next one): its music stops.
  useEffect(() => () => raceEnd(raceId), [raceId]);

  // Tracks on the new physics (the gate, splitter and catch area live in 3D) open in 3D; 2D stays an option.
  const [view, setView] = useState(null); // null = the track's default
  // The countdown's beeps, the GO beep on GO (the 3-2-1 above the view). The 3D view times its own,
  // to the countdown as it shows it.
  const twoDView = view === '2d' || (view === null && !(stream.meta?.track ?? details.data?.track)?.physics);
  useEffect(() => {
    if (twoDView && stream.status === 'countdown' && stream.startsAt) raceCountdown(raceId, stream.startsAt - Date.now());
  }, [stream.status, stream.startsAt, raceId, twoDView]);
  const myIndexes = useMemo(
    () => (stream.meta?.entries ?? []).filter((e) => e.user?.id && e.user.id === user?.id).map((e) => e.index),
    [stream.meta, user?.id],
  );
  // The player's race is over: counted (once per race), and their very first race once per account.
  // Only to what the player allowed in the cookie banner; nothing about who they are.
  const raceOver = stream.status === 'finished';
  const inIt = myIndexes.length > 0;
  // …and the header's coins and streak catch up with what the race paid.
  useEffect(() => { if (raceOver && inIt) refreshUser?.().catch?.(() => {}); }, [raceOver, inIt, refreshUser]);
  useEffect(() => {
    if (!raceOver || !inIt || !trackingActive()) return;
    track('race_finished', { friendRoom: Boolean(race?.room_code) }, { onceKey: `race:${raceId}` });
    if (user?.id) {
      api.myProfile().then(({ stats }) => {
        if (Number(stats?.races_played) === 1) track('first_race', {}, { onceKey: `first-race:${user.id}` });
      }).catch(() => {});
    }
  }, [raceOver, inIt, raceId, user?.id, race?.room_code]);

  if (details.loading && !details.data) return <div className="page"><Spinner label="Loading race…" /></div>;
  if (details.error) return <div className="page"><ErrorMessage error={details.error} onRetry={reload} /></div>;

  const header = (
    <header className="race-header">
      <div>
        <p className="eyebrow">{race.track_name} · <span className={`badge badge--${race.difficulty}`}>{race.difficulty}</span></p>
        <h1>{race.name || race.track_name}</h1>
      </div>
      <span className={`badge badge--${status} badge--lg`}>{statusLabel(status)}</span>
    </header>
  );

  if (status === 'cancelled') {
    return (
      <div className="page">
        {header}
        <div className="card"><Empty>This race was cancelled.</Empty>
          <Link to="/dashboard" className="btn">Back to dashboard</Link></div>
      </div>
    );
  }

  // A friend room's race waits at the start in its room.
  if (status === 'lobby' && race.room_code) return <Navigate to={`/r/${race.room_code}`} replace />;

  // The track known before the countdown (the race's own row): the 3D view builds it straight away.
  const known = details.data?.track;
  const preload = known?.physics ? {
    id: known.id, slug: known.slug, name: known.name, length_m: Number(known.length_m), lane_count: known.lane_count,
    waypoints: known.waypoints, obstacles: known.obstacles, physics: known.physics,
  } : null;
  const isCreator = Boolean(user && race.created_by === user.id);
  const preparing = status === 'lobby' && startsHere && isCreator && Boolean(preload) && view !== '2d';

  if (status === 'lobby' && !preparing) {
    return <div className="page">{header}<Lobby details={details.data} onChange={reload} /></div>;
  }

  const meta = stream.meta;
  const finished = status === 'finished';
  const newPhysics = Boolean((meta?.track ?? preload)?.physics);
  const shown = view ?? (newPhysics ? '3d' : '2d');
  // The finish show: the official times as marbles cross, then the board with the next race.
  // Skipping to the results: only in a solo race (one real player); a group watches to the end together.
  const session = meta?.session ?? details.data?.session;
  const finish = {
    finishes: stream.finishes,
    complete: finished,
    clock: stream.clock,
    canSkip: Boolean(session?.canSkip),
    next: meta ? <NextRace raceId={raceId} entries={meta.entries} nextRaceId={stream.next?.nextRaceId ?? race?.next_race_id ?? null} roomCode={race?.room_code ?? null} /> : null,
  };
  // Race commentary while it runs; once it's over, the results board takes over (inside the view).
  const footer = finished ? null : <EventFeed events={stream.events} entries={meta?.entries ?? []} />;

  return (
    <div className="page race-page">
      {header}
      {status === 'countdown' && shown === '2d' && <Countdown startsAt={stream.startsAt} grandPrix={Boolean((meta?.track ?? details.data?.track)?.physics?.kit?.grandPrix)} />}
      {meta && newPhysics && (
        <div className="segmented segmented--sm" role="group" aria-label="View">
          <button type="button" aria-pressed={shown === '3d'} onClick={() => setView('3d')}>3D</button>
          <button type="button" aria-pressed={shown === '2d'} onClick={() => setView('2d')}>2D</button>
        </div>
      )}
      {(meta || preparing) && shown === '3d' && <RaceFullScreen onLeave={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))} on2d={meta && newPhysics ? () => setView('2d') : null} />}
      {(meta || preparing) && shown === '3d' ? (
        <LiveRaceViewer3D
          meta={meta}
          track={preload}
          onPrepared={preparing ? startWhenReady : null}
          holdBack={stream.holdBack}
          lagNow={stream.lagNow}
          sample={stream.sample}
          frame={stream.frame}
          startsAt={stream.startsAt}
          countdownMs={race?.countdown_ms ?? 5000}
          highlight={myIndexes}
          footer={footer}
          {...finish}
        />
      ) : meta ? (
        <RaceViewer
          live
          meta={meta}
          sample={stream.sample}
          frame={stream.frame}
          splits={finished && stream.results ? officialSplits(meta, stream.results, stream.splits) : stream.splits}
          highlight={myIndexes}
          footer={footer}
          {...finish}
        />
      ) : (
        <Spinner label="Connecting to the race…" />
      )}
      {stream.error && <ErrorMessage error={{ message: stream.error }} />}
    </div>
  );
}

/** A phone's screen (portrait up to 700 px wide, landscape up to 500 px tall), as site.css has it. */
export const PHONE_QUERY = '(max-width: 700px), (orientation: landscape) and (max-height: 500px)';

/**
 * The 3D race on the whole screen, from the countdown to the results: html.is-race-full while the 3D
 * view is shown. In the apps (Moses, 22 Oct 2026) the header becomes floating back and menu buttons; on
 * a phone's website (html.is-race-web, Moses, 25 Oct 2026) the header and footer go, a ✕ leaves the
 * race and a ⋯ holds the 2D view. The camera buttons lie over the race and in landscape the whole race is
 * on screen (site.css). Computers keep the page as it was.
 */
function RaceFullScreen({ onLeave, on2d }) {
  const native = isNativeApp();
  const [phone, setPhone] = useState(() => !native && typeof window !== 'undefined' && Boolean(window.matchMedia?.(PHONE_QUERY).matches));
  const [more, setMore] = useState(false);
  useEffect(() => {
    if (native || !window.matchMedia) return undefined;
    const mq = window.matchMedia(PHONE_QUERY);
    const change = () => setPhone(mq.matches);
    mq.addEventListener?.('change', change);
    return () => mq.removeEventListener?.('change', change);
  }, [native]);
  const full = native || phone;
  useEffect(() => {
    if (!full) return undefined;
    const root = document.documentElement;
    root.classList.add('is-race-full');
    if (!native) root.classList.add('is-race-web');
    window.scrollTo?.(0, 0);
    return () => root.classList.remove('is-race-full', 'is-race-web');
  }, [full, native]);
  if (native || !phone) return null;
  return (
    <>
      <button type="button" className="race-float race-float--exit" aria-label="Leave the race" onClick={onLeave}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      {on2d && (
        <>
          <button type="button" className="race-float race-float--more" aria-label="More" aria-expanded={more} onClick={() => setMore((v) => !v)}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </button>
          {more && (
            <div className="race-more-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setMore(false); on2d(); }}>Switch to the 2D view</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function statusLabel(status) {
  return { lobby: 'Lobby', countdown: 'Starting', running: 'Live', finished: 'Finished', cancelled: 'Cancelled' }[status] || '…';
}

/** Replace live (approximate) splits with the official ones once results arrive. */
function officialSplits(meta, results, live) {
  const indexByEntry = Object.fromEntries(meta.entries.map((e) => [e.entryId, e.index]));
  const out = { ...live };
  for (const r of results) {
    const i = indexByEntry[r.entry_id];
    if (i !== undefined && r.split_time_ms) out[i] = r.split_time_ms;
  }
  return out;
}

function Countdown({ startsAt, grandPrix = false }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
  // A Grand Prix track: five start lights instead of the numbers.
  if (grandPrix) return <div className="countdown"><StartLights t={now - (startsAt ?? now)} /></div>;
  const left = Math.max(0, Math.ceil(((startsAt ?? now) - now) / 1000));
  return (
    <div className="countdown" role="timer" aria-live="assertive">
      <span key={left}>{left || 'GO!'}</span>
    </div>
  );
}

function EventFeed({ events, entries }) {
  if (!events.length) return <p className="event-feed muted small">Race commentary appears here.</p>;
  return (
    <ul className="event-feed" aria-live="polite">
      {events.slice(0, 4).map((e, k) => {
        const name = entries[e.i]?.marble.name ?? 'A marble';
        return <li key={`${e.t}-${e.i}-${k}`} className={`event event--${e.type}`}>{formatTime(e.t)} · {EVENT_TEXT[e.type]?.(name, e.obstacle) ?? e.type}</li>;
      })}
    </ul>
  );
}

function Lobby({ details, onChange }) {
  const { race, entries, track, trackStats } = details;
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [marble, setMarble] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const mine = entries.find((e) => e.user_id && e.user_id === user?.id);
  const isCreator = user && (race.created_by === user.id || user.role === 'admin');
  const takenMarbles = entries.map((e) => e.marble_id);
  const slots = race.max_marbles - entries.length;

  const run = (label, fn) => async () => {
    setBusy(label);
    setError(null);
    try {
      await fn();
      await onChange();
      refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid grid--main">
      <div className="stack">
        <section className="card">
          <div className="card__header">
            <h2>Entries <small className="muted">{entries.length}/{race.max_marbles}</small></h2>
          </div>
          <ul className="entry-list">
            {entries.map((e) => (
              <li key={e.id} className={e.user_id === user?.id ? 'is-me' : undefined}>
                <MarbleBall marble={e} size={24} />
                <span><strong>{e.marble_name}</strong><small>{e.username ? plainName(e.username) : <CpuTag />}</small></span>
              </li>
            ))}
            {Array.from({ length: Math.max(0, slots) }, (_, i) => (
              <li key={`slot-${i}`} className="entry-list__empty"><span className="marble-ball marble-ball--empty" /> <small>Computer player</small></li>
            ))}
          </ul>
          <p className="muted small">Empty slots are filled with computer players when the race starts, so every race runs with {race.max_marbles} marbles.</p>
        </section>

        {isAuthenticated && !mine && (
          <section className="card">
            <div className="card__header"><h2>Enter the race</h2></div>
            <MarbleSelector value={marble?.id} onChange={setMarble} disabledIds={takenMarbles} />
            <button type="button" className="btn btn--primary btn--block" disabled={!marble || busy || slots <= 0}
              onClick={run('join', async () => {
                await api.joinRace(race.id, marble.id);
              })}>
              {busy === 'join' ? 'Joining…' : marble ? `Enter ${marble.name}` : 'Pick a marble'}
            </button>
          </section>
        )}
        {!isAuthenticated && (
          <section className="card"><p><Link to="/">Sign in</Link> to enter a marble — or just watch.</p></section>
        )}
      </div>

      <div className="stack">
        <section className="card">
          {track && <TrackPreview track={track} width={320} height={200} />}
          <dl className="kv">
            <div><dt>Track</dt><dd>{race.track_name}</dd></div>
            <div><dt>Length</dt><dd>{track ? `${Number(track.length_m)} m` : '—'}</dd></div>
            <div><dt>Race time</dt><dd>{track?.physics ? 'About a minute' : '90 seconds'}</dd></div>
            <div><dt>Track record</dt><dd>{trackStats?.record_ms ? `${formatTime(trackStats.record_ms)} (${trackStats.record_marble})` : '—'}</dd></div>
            <div><dt>Best halfway</dt><dd>{formatTime(trackStats?.best_split_ms)}</dd></div>
          </dl>
        </section>

        <section className="card lobby-actions">
          {error && <p className="error" role="alert">{error}</p>}
          {mine && (
            <div className="lobby-actions__mine">
              <MarbleBall marble={mine} size={28} ring />
              <span>You're in with <strong>{mine.marble_name}</strong></span>
            </div>
          )}
          {isCreator ? (
            <>
              <button type="button" className="btn btn--primary btn--lg btn--block" disabled={Boolean(busy)}
                onClick={run('start', () => api.startRace(race.id))}>
                {busy === 'start' ? 'Starting…' : 'Start race'}
              </button>
              <button type="button" className="btn btn--ghost btn--block" disabled={Boolean(busy)}
                onClick={run('cancel', () => api.cancelRace(race.id))}>
                Cancel race
              </button>
            </>
          ) : (
            <p className="muted">Waiting for the host to start the race…</p>
          )}
          {mine && (
            <button type="button" className="btn btn--ghost btn--block" disabled={Boolean(busy)}
              onClick={run('leave', () => api.leaveRace(race.id))}>
              Leave race
            </button>
          )}
          <p className="muted small">Share this page's link to invite friends.</p>
        </section>
      </div>
    </div>
  );
}
