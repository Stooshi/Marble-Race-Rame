import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { useRaceStream } from '../hooks/useRaceStream';
import MarbleBall from '../components/MarbleBall';
import MarbleSelector from '../components/MarbleSelector';
import RaceViewer from '../components/RaceViewer';
import LiveRaceViewer3D from '../components/LiveRaceViewer3D';
import TrackPreview from '../components/TrackPreview';
import NextRace from '../components/NextRace';
import { Empty, ErrorMessage, Spinner } from '../components/Status';
import { formatTime } from '../utils/format';

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
  const { user } = useAuth();

  const details = useAsync(async () => {
    const data = await api.race(raceId);
    const track = await api.track(data.race.track_id).catch(() => null);
    return { ...data, track: track?.track, trackStats: track?.stats };
  }, [raceId]);
  const { reload } = details;

  const stream = useRaceStream(raceId, { onLobbyUpdate: useCallback(() => reload(), [reload]) });

  const race = details.data?.race;
  const status = stream.status !== 'connecting' ? stream.status : race?.status;

  // A race that finished before we opened the page goes straight to results.
  useEffect(() => {
    if (race?.status === 'finished' && stream.status !== 'running') navigate(`/results/${raceId}`, { replace: true });
  }, [race?.status, stream.status, raceId, navigate]);

  // Pick up the decided entry list (bots, lanes) once the countdown starts.
  useEffect(() => {
    if (stream.status === 'countdown') reload();
  }, [stream.status, reload]);

  // Tracks on the new physics (the gate, splitter and catch area live in 3D) open in 3D; 2D stays an option.
  const [view, setView] = useState(null); // null = the track's default
  const myIndexes = useMemo(
    () => (stream.meta?.entries ?? []).filter((e) => e.user?.id && e.user.id === user?.id).map((e) => e.index),
    [stream.meta, user?.id],
  );

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
        <div className="card"><Empty>This race was cancelled. Entry fees have been refunded.</Empty>
          <Link to="/dashboard" className="btn">Back to dashboard</Link></div>
      </div>
    );
  }

  if (status === 'lobby') {
    return <div className="page">{header}<Lobby details={details.data} onChange={reload} /></div>;
  }

  const meta = stream.meta;
  const finished = status === 'finished';
  const newPhysics = Boolean(meta?.track?.physics);
  const shown = view ?? (newPhysics ? '3d' : '2d');
  // The finish show: the official times as marbles cross, then the board with the next race.
  // Skipping to the results: only in a solo race (one real player); a group watches to the end together.
  const session = meta?.session ?? details.data?.session;
  const finish = {
    finishes: stream.finishes,
    complete: finished,
    clock: stream.clock,
    canSkip: Boolean(session?.canSkip),
    next: meta ? <NextRace raceId={raceId} entries={meta.entries} nextRaceId={stream.next?.nextRaceId ?? race?.next_race_id ?? null} /> : null,
  };
  // Race commentary while it runs; once it's over, the results board takes over (inside the view).
  const footer = finished ? null : <EventFeed events={stream.events} entries={meta?.entries ?? []} />;

  return (
    <div className="page race-page">
      {header}
      {status === 'countdown' && <Countdown startsAt={stream.startsAt} />}
      {meta && newPhysics && (
        <div className="segmented segmented--sm" role="group" aria-label="View">
          <button type="button" aria-pressed={shown === '3d'} onClick={() => setView('3d')}>3D</button>
          <button type="button" aria-pressed={shown === '2d'} onClick={() => setView('2d')}>2D</button>
        </div>
      )}
      {meta && shown === '3d' ? (
        <LiveRaceViewer3D
          meta={meta}
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

function Countdown({ startsAt }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);
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
  const { user, isAuthenticated, setCoins, refreshUser } = useAuth();
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
                <span><strong>{e.marble_name}</strong><small>{e.username ?? 'bot'}</small></span>
              </li>
            ))}
            {Array.from({ length: Math.max(0, slots) }, (_, i) => (
              <li key={`slot-${i}`} className="entry-list__empty"><span className="marble-ball marble-ball--empty" /> <small>House marble</small></li>
            ))}
          </ul>
          <p className="muted small">Empty slots are filled with house marbles when the race starts, so every race runs with {race.max_marbles} marbles.</p>
        </section>

        {isAuthenticated && !mine && (
          <section className="card">
            <div className="card__header"><h2>Enter the race</h2></div>
            <MarbleSelector value={marble?.id} onChange={setMarble} disabledIds={takenMarbles} />
            <button type="button" className="btn btn--primary btn--block" disabled={!marble || busy || slots <= 0}
              onClick={run('join', async () => {
                await api.joinRace(race.id, marble.id);
                if (race.entry_fee_coins) setCoins(user.coins - race.entry_fee_coins);
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
            <div><dt>Race time</dt><dd>{track?.physics ? 'About 45 seconds' : '90 seconds'}</dd></div>
            <div><dt>Entry fee</dt><dd>{race.entry_fee_coins ? `${race.entry_fee_coins} coins` : 'Free'}</dd></div>
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
