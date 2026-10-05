import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { useReplay } from '../hooks/useReplay';
import MarbleBall from '../components/MarbleBall';
import RaceViewer from '../components/RaceViewer';
import { ErrorMessage, Spinner } from '../components/Status';
import { formatDelta, formatTime, ordinal } from '../utils/format';

export default function Results() {
  const { raceId } = useParams();
  const { user, refreshUser } = useAuth();
  const { data, error, loading, reload } = useAsync(() => api.results(raceId), [raceId]);

  // Prize coins were paid when the race finished; show the new balance.
  useEffect(() => {
    if (data) refreshUser();
  }, [data, refreshUser]);
  const [showReplay, setShowReplay] = useState(false);

  // Rank at halfway, to show who gained or lost places in the second half.
  const splitRank = useMemo(() => {
    if (!data) return {};
    const sorted = [...data.results].sort((a, b) => a.split_time_ms - b.split_time_ms);
    return Object.fromEntries(sorted.map((r, i) => [r.entry_id, i + 1]));
  }, [data]);

  if (loading && !data) return <div className="page"><Spinner label="Loading results…" /></div>;
  if (error) {
    return (
      <div className="page">
        <ErrorMessage error={error} onRetry={reload} />
        {error.status === 409 && <Link to={`/race/${raceId}`} className="btn">Go to the race</Link>}
      </div>
    );
  }

  const { race, results } = data;
  const mine = results.filter((r) => r.user_id && r.user_id === user?.id);
  const humans = results.filter((r) => !r.is_bot);
  const podium = results.slice(0, 3);

  return (
    <div className="page results">
      <header className="race-header">
        <div>
          <p className="eyebrow">
            {race.track_name} · <span className={`badge badge--${race.difficulty}`}>{race.difficulty}</span> · {results.length} marbles
          </p>
          <h1>{race.name || race.track_name} — Results</h1>
        </div>
        <div className="results__actions">
          <button type="button" className="btn" onClick={() => setShowReplay((v) => !v)}>
            {showReplay ? 'Hide replay' : 'Watch replay'}
          </button>
          <Link to={`/preview/3d/race/${raceId}`} className="btn btn--ghost">Watch in 3D (beta)</Link>
        </div>
      </header>

      {showReplay && <Replay raceId={raceId} userId={user?.id} />}

      <section className="podium" aria-label="Podium">
        {[podium[1], podium[0], podium[2]].filter(Boolean).map((r) => (
          <div key={r.entry_id} className={`podium__step podium__step--${r.position}`}>
            <MarbleBall marble={r} size={r.position === 1 ? 56 : 44} />
            <strong>{r.marble_name}</strong>
            <small>{r.username ?? 'bot'}</small>
            <span className="podium__time">{formatTime(r.finish_time_ms)}</span>
            {r.comparison.is_track_record && <span className="badge badge--gold">Track record</span>}
            <span className="podium__block">{r.position}</span>
          </div>
        ))}
      </section>

      {mine.map((r) => (
        <YourRace key={r.entry_id} result={r} winner={results[0]} splitRank={splitRank[r.entry_id]} total={results.length} />
      ))}

      <section className="card">
        <div className="card__header">
          <h2>Full results</h2>
          <small className="muted">{humans.length} player{humans.length === 1 ? '' : 's'} · finished {new Date(race.finished_at).toLocaleString()}</small>
        </div>
        <table className="table table--stack results-table">
          <thead>
            <tr>
              <th className="num">Pos.</th>
              <th>Marble</th>
              <th className="num">Halfway</th>
              <th className="num">± places</th>
              <th className="num">Finish</th>
              <th className="num">Gap</th>
              <th className="num">vs PB</th>
              <th className="num">Coins</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const moved = splitRank[r.entry_id] - r.position;
              const c = r.comparison;
              return (
                <tr key={r.entry_id} className={r.user_id && r.user_id === user?.id ? 'is-me' : undefined}>
                  <td data-label="Pos." className="num stack-head"><span className={`pos pos--${r.position}`}>{r.position}</span></td>
                  <td data-label="Marble" className="stack-head">
                    <span className="inline-marble">
                      <MarbleBall marble={r} size={20} />
                      <span>
                        <strong>{r.marble_name}</strong>
                        <small className="muted block">
                          {r.user_id ? <Link to={`/profile/${r.user_id}`}>{r.username}</Link> : 'bot'}
                        </small>
                      </span>
                    </span>
                  </td>
                  <td data-label="Halfway" className="num">
                    {formatTime(r.split_time_ms)} <small className="muted">P{splitRank[r.entry_id]}</small>
                  </td>
                  <td data-label="± places" className="num">
                    <span className={moved > 0 ? 'up' : moved < 0 ? 'down' : 'muted'}>{moved > 0 ? `▲${moved}` : moved < 0 ? `▼${-moved}` : '–'}</span>
                  </td>
                  <td data-label="Finish" className="num"><strong>{formatTime(r.finish_time_ms)}</strong></td>
                  <td data-label="Gap" className="num">{r.position === 1 ? '—' : formatDelta(r.gap_to_winner_ms)}</td>
                  <td data-label="vs PB" className="num">
                    {r.is_bot ? <span className="muted">—</span> : <PbCell result={r} />}
                    {c.is_split_personal_best && !r.is_bot && c.previous_best_split_ms !== null && <span className="badge badge--split">Split PB</span>}
                  </td>
                  <td data-label="Coins" className="num">{r.coins_awarded ? `+${r.coins_awarded}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function PbCell({ result: r }) {
  const prev = r.comparison.previous_best_time_ms;
  if (prev === null || prev === undefined) return <span className="badge badge--pb">First run</span>;
  if (r.comparison.is_personal_best) return <span className="badge badge--pb">PB {formatDelta(r.finish_time_ms - prev)}</span>;
  return <span className="muted">{formatDelta(r.finish_time_ms - prev)}</span>;
}

/** Personal summary card: this race against your history on the track. */
function YourRace({ result: r, winner, splitRank, total }) {
  const c = r.comparison;
  const firstTime = c.previous_best_time_ms === null || c.previous_best_time_ms === undefined;
  // If you set the record, compare with the one you beat (null on a track's
  // first race). Otherwise compare with the record as it stands after this race.
  const oldRecord = c.previous_track_record_ms ?? null;
  const record = c.is_track_record
    ? oldRecord
    : Math.min(oldRecord ?? Infinity, winner.finish_time_ms);
  const rows = [
    {
      label: 'Finish time',
      value: formatTime(r.finish_time_ms),
      previous: firstTime ? null : formatTime(c.previous_best_time_ms),
      delta: firstTime ? null : r.finish_time_ms - c.previous_best_time_ms,
      flag: c.is_personal_best && 'New PB',
    },
    {
      label: 'Halfway split',
      value: `${formatTime(r.split_time_ms)} (P${splitRank})`,
      previous: c.previous_best_split_ms === null ? null : formatTime(c.previous_best_split_ms),
      delta: c.previous_best_split_ms === null ? null : r.split_time_ms - c.previous_best_split_ms,
      flag: c.is_split_personal_best && 'Split PB',
    },
    {
      label: c.is_track_record ? 'Track record' : 'vs track record',
      value: formatTime(r.finish_time_ms),
      // When you set the record, compare against the one you beat.
      previous: record === null ? null : formatTime(record),
      delta: record === null ? null : r.finish_time_ms - record,
      flag: c.is_track_record && 'New record',
    },
  ];

  return (
    <section className="card your-race">
      <div className="your-race__hero">
        <MarbleBall marble={r} size={52} ring />
        <div>
          <p className="eyebrow">Your race · {r.marble_name}</p>
          <p className="your-race__pos">{ordinal(r.position)} <small>of {total}</small></p>
          <p className="muted">
            {r.position === 1 ? 'Winner!' : `${formatDelta(r.gap_to_winner_ms)} behind the winner`}
            {r.coins_awarded ? ` · +${r.coins_awarded} coins` : ''}
          </p>
        </div>
      </div>
      <table className="table compare-table">
        <thead>
          <tr><th /><th className="num">This race</th><th className="num">Compared with</th><th className="num">Difference</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label} {row.flag && <span className="badge badge--pb">{row.flag}</span>}</th>
              <td className="num">{row.value}</td>
              <td className="num">{row.previous ?? <span className="muted">—</span>}</td>
              <td className="num">
                {row.delta === null ? <span className="muted">first run</span> : (
                  <span className={row.delta < 0 ? 'up' : row.delta > 0 ? 'down' : 'muted'}>{formatDelta(row.delta)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        {firstTime
          ? 'Your first finish on this track — this time is now your personal best.'
          : `Race ${c.previous_races_on_track + 1} on this track. Previous best finish: ${ordinal(c.previous_best_position)}, average ${c.previous_avg_position}.`}
      </p>
    </section>
  );
}

function Replay({ raceId, userId }) {
  const { data, error, loading, reload } = useAsync(() => api.replay(raceId), [raceId]);
  const replay = useReplay(data);
  const highlight = useMemo(
    () => (data?.entries ?? []).filter((e) => e.user?.id && e.user.id === userId).map((e) => e.index),
    [data, userId],
  );

  if (loading && !data) return <Spinner label="Loading replay…" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  return (
    <section className="replay">
      <RaceViewer
        meta={data}
        sample={replay.sample}
        frame={replay.frame}
        splits={replay.splits}
        highlight={highlight}
        footer={(
          <div className="replay__controls">
            <button type="button" className="btn btn--primary btn--sm" onClick={replay.toggle}>
              {replay.playing ? 'Pause' : replay.time >= replay.duration ? 'Restart' : 'Play'}
            </button>
            <input
              type="range"
              min={0}
              max={replay.duration}
              step={100}
              value={replay.time}
              onChange={(e) => replay.seek(Number(e.target.value))}
              aria-label="Replay position"
            />
            <div className="segmented segmented--sm" role="group" aria-label="Playback speed">
              {[1, 2, 4].map((s) => (
                <button key={s} type="button" aria-pressed={replay.speed === s} onClick={() => replay.setSpeed(s)}>{s}×</button>
              ))}
            </div>
          </div>
        )}
      />
    </section>
  );
}
