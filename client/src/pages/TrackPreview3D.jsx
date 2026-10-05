import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { ErrorMessage, Spinner } from '../components/Status';

/**
 * Phase 2, step 1: each track rendered in 3D from its waypoints, to look at
 * from any angle. Reached at /preview/3d; the 2D race view stays the default.
 */
export default function TrackPreview3D() {
  const [params, setParams] = useSearchParams();
  const debug = params.has('debug');
  const { data, error, loading, reload } = useAsync(() => api.tracks(), []);
  const tracks = data?.tracks ?? [];
  const slug = params.get('track') || tracks[0]?.slug;
  const track = tracks.find((t) => t.slug === slug) || tracks[0];

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | unsupported | failed
  const [info, setInfo] = useState(null);

  // Load Three.js only when this page opens, then create the scene once.
  useEffect(() => {
    let cancelled = false;
    let observer;
    import('../three/TrackScene')
      .then(({ TrackScene, webglAvailable }) => {
        if (cancelled) return;
        if (!webglAvailable()) {
          setStatus('unsupported');
          return;
        }
        const scene = new TrackScene(canvasRef.current);
        sceneRef.current = scene;
        observer = new ResizeObserver(([entry]) => {
          const { width, height } = entry.contentRect;
          scene.setSize(Math.floor(width), Math.floor(height));
        });
        observer.observe(wrapRef.current);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('failed'));
    return () => {
      cancelled = true;
      observer?.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Build the selected track.
  useEffect(() => {
    const scene = sceneRef.current;
    if (status !== 'ready' || !scene || !track) return;
    scene.setTrack(track);
    const zs = (track.waypoints || []).map((p) => Number(p.z) || 0);
    setInfo({
      drop: zs.length ? Math.round((Math.max(...zs) - Math.min(...zs)) * scene.centerline.scale) : 0,
      points: track.waypoints?.length ?? 0,
    });
    if (debug) setTimeout(() => setInfo((i) => ({ ...i, stats: scene.stats() })), 300);
  }, [status, track, debug]);

  if (loading && !data) return <div className="page"><Spinner label="Loading tracks…" /></div>;
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
        {status === 'unsupported' && (
          <div className="preview3d__overlay">
            <p>This device or browser can't show 3D (WebGL is unavailable). The normal 2D race view still works.</p>
          </div>
        )}
        {status === 'failed' && <div className="preview3d__overlay"><p>The 3D view failed to load. Please try reloading.</p></div>}
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
        Marbles arrive in the next step; the races themselves still use the 2D view.
      </p>
    </div>
  );
}
