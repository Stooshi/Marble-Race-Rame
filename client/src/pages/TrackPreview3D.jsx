import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { useTrackScene } from '../hooks/useTrackScene';
import SceneFailure from '../components/SceneFailure';
import { ErrorMessage, Spinner } from '../components/Status';
import { timeAgo } from '../utils/format';

/**
 * Phase 2, step 1: each track rendered in 3D from its waypoints, to look at
 * from any angle. Reached at /preview/3d; the 2D race view stays the default.
 * Below it, recent finished races link to their 3D replay (step 2).
 */
export default function TrackPreview3D() {
  const [params, setParams] = useSearchParams();
  const debug = params.has('debug');
  const { data, error, loading, reload } = useAsync(() => api.tracks(), []);
  const tracks = data?.tracks ?? [];
  const slug = params.get('track') || tracks[0]?.slug;
  const track = tracks.find((t) => t.slug === slug) || tracks[0];
  const recent = useAsync(() => api.races('finished', 8), []);

  const { wrapRef, canvasRef, sceneRef, status, failure, fail } = useTrackScene();
  const [info, setInfo] = useState(null);

  // Build the selected track.
  useEffect(() => {
    const scene = sceneRef.current;
    if (status !== 'ready' || !scene || !track) return;
    try {
      scene.setTrack(track);
    } catch (err) {
      fail(`building the track "${track.name}"`, err);
      return;
    }
    const zs = (track.waypoints || []).map((p) => Number(p.z) || 0);
    setInfo({
      drop: zs.length ? Math.round((Math.max(...zs) - Math.min(...zs)) * scene.centerline.scale) : 0,
      points: track.waypoints?.length ?? 0,
    });
    if (debug) setTimeout(() => setInfo((i) => ({ ...i, stats: scene.stats() })), 300);
  }, [status, track, debug]);

  if (error) return <div className="page"><ErrorMessage error={error} onRetry={reload} /></div>;

  return (
    <div className="page preview3d">
      <header className="race-header">
        <div>
          <p className="eyebrow">3D preview · beta</p>
          <h1>{track ? track.name : 'Tracks'} in 3D</h1>
        </div>
        <Link to="/" className="btn btn--ghost btn--sm">Back to the game</Link>
      </header>

      <div className="segmented" role="tablist" aria-label="Track">
        {tracks.map((t) => (
          <button key={t.slug} type="button" role="tab" aria-selected={t.slug === track?.slug}
            onClick={() => setParams((p) => { p.set('track', t.slug); return p; }, { replace: true })}>
            {t.name}
          </button>
        ))}
      </div>

      <div className="preview3d__stage" ref={wrapRef}>
        <canvas ref={canvasRef} className="preview3d__canvas" aria-label={`${track?.name ?? 'Track'} in 3D`} />
        {status === 'loading' && <div className="preview3d__overlay"><Spinner label="Loading 3D…" /></div>}
        {status === 'ready' && loading && !data && <div className="preview3d__overlay"><Spinner label="Loading tracks…" /></div>}
        {status === 'failed' && failure && <SceneFailure failure={failure} />}
        {debug && info?.stats && (
          <div className="preview3d__debug">
            {info.stats.calls} draw calls · {info.stats.triangles.toLocaleString()} triangles · pixel ratio {info.stats.pixelRatio}
          </div>
        )}
      </div>

      {track && (
        <div className="preview3d__bar">
          <span className={`badge badge--${track.difficulty}`}>{track.difficulty}</span>
          <span>{Number(track.length_m)} m</span>
          <span>{track.lane_count} lanes</span>
          {info && <span>{info.drop} m drop</span>}
          {info && <span>{info.points} waypoints</span>}
          <button type="button" className="btn btn--sm" onClick={() => { sceneRef.current?.frameTrack(); sceneRef.current?.render(); }}>
            Reset view
          </button>
        </div>
      )}
      <p className="muted small">
        Drag to turn the view · scroll or pinch to zoom · right-drag or two-finger drag to move.
        Live races still use the 2D view.
      </p>

      <p><Link to={`/preview/physics?track=${track?.slug ?? ''}`}>New: try the new physics (preview) →</Link></p>

      <section className="card preview3d__races">
        <div className="card__header"><h2>Watch a real race in 3D</h2></div>
        {recent.loading && !recent.data && <Spinner label="Loading recent races…" />}
        {recent.error && <ErrorMessage error={recent.error} onRetry={recent.reload} />}
        {recent.data && !recent.data.races.length && <p className="muted">No finished races yet. Run one from the dashboard, then come back.</p>}
        <ul className="preview3d__racelist">
          {(recent.data?.races ?? []).map((r) => (
            <li key={r.id}>
              <Link to={`/preview/3d/race/${r.id}`}>
                <strong>{r.name || r.track_name}</strong>
                <small className="muted">{r.track_name} · {r.entry_count} marbles · {timeAgo(r.finished_at)}</small>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
