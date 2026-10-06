import { useMemo } from 'react';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { formatTime } from '../utils/format';
import TrackPreview from './TrackPreview';
import { ErrorMessage, Spinner } from './Status';

/**
 * Choose a track manually, or let the server pick one at random when the race
 * is created.
 *
 * value: { mode: 'manual', trackId } | { mode: 'random' }
 * records: optional track-records list, to show your best time per track
 */
export default function TrackSelector({ value, onChange, records = [] }) {
  const { data, error, loading, reload } = useAsync(() => api.tracks(), []);
  const tracks = data?.tracks ?? [];
  const bestByTrack = useMemo(() => Object.fromEntries(records.map((r) => [r.track_id, r])), [records]);
  const mode = value?.mode ?? 'manual';

  /** Pick a random track client-side so the player can see it before racing. */
  function shuffle() {
    if (!tracks.length) return;
    const pool = tracks.filter((t) => t.id !== value?.trackId);
    const pick = (pool.length ? pool : tracks)[Math.floor(Math.random() * (pool.length || tracks.length))];
    onChange({ mode: 'manual', trackId: pick.id });
  }

  if (loading && !data) return <Spinner label="Loading tracks…" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  return (
    <div className="track-selector">
      <div className="track-selector__bar">
        <div className="segmented segmented--sm" role="tablist" aria-label="Track selection mode">
          <button type="button" role="tab" aria-selected={mode === 'manual'}
            onClick={() => onChange({ mode: 'manual', trackId: value?.trackId ?? tracks[0]?.id })}>
            Choose track
          </button>
          <button type="button" role="tab" aria-selected={mode === 'random'} onClick={() => onChange({ mode: 'random' })}>
            Random track
          </button>
        </div>
        {mode === 'manual' && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={shuffle} title="Pick a random track for me">
            Shuffle
          </button>
        )}
      </div>

      {mode === 'random' ? (
        <div className="track-random card card--inset">
          <div className="track-random__dice" aria-hidden="true">?</div>
          <div>
            <strong>Mystery track</strong>
            <p className="muted">The server picks one of {tracks.length} tracks at random when you create the race.</p>
          </div>
        </div>
      ) : (
        <div className="track-grid" role="radiogroup" aria-label="Tracks">
          {tracks.map((t) => {
            const selected = value?.trackId === t.id;
            const best = bestByTrack[t.id];
            return (
              <button
                type="button"
                key={t.id}
                role="radio"
                aria-checked={selected}
                className={`track-card${selected ? ' is-selected' : ''}`}
                onClick={() => onChange({ mode: 'manual', trackId: t.id })}
              >
                <TrackPreview track={t} />
                <span className="track-card__body">
                  <strong>{t.name}</strong>
                  <span className={`badge badge--${t.difficulty}`}>{t.difficulty}</span>
                  {t.new_physics && <span className="badge badge--physics" title="Collisions, a starting gate and a catch area, watched in 3D">New physics</span>}
                  <small>{Number(t.length_m)} m · {t.new_physics ? 'about 45 s' : `${t.obstacle_count} obstacles`}</small>
                  <small className="track-card__best">
                    {best ? `Your best: ${formatTime(best.best_time_ms)}` : 'Not raced yet'}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
