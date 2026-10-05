import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAsync } from '../hooks/useAsync';
import { ErrorMessage, Spinner } from '../components/Status';
import { describeReport, graphicsReport } from '../three/diagnostics';

/** Records a failure: shown on screen and logged to the console in full. */
function failureFrom(stage, error, report) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[3D preview] failed while ${stage}:`, err);
  console.error('[3D preview] graphics report:', report);
  return { stage, name: err.name, message: err.message, stack: err.stack, report };
}

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
  const [status, setStatus] = useState('loading'); // loading | ready | failed
  const [failure, setFailure] = useState(null);
  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState(null);

  const fail = (stage, error) => {
    setFailure(failureFrom(stage, error, graphicsReport()));
    setStatus('failed');
  };

  // Load Three.js only when this page opens, then create the scene once.
  // Each stage reports its own failure, so the screen says exactly what broke.
  useEffect(() => {
    let cancelled = false;
    let observer;
    // The canvas is rendered from the very first paint (even while the track
    // list is loading), so it always exists here.
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onLost = (e) => {
      e.preventDefault();
      fail('drawing (the browser took the 3D context away)', new Error('WebGL context lost'));
    };
    canvas.addEventListener('webglcontextlost', onLost);
    (async () => {
      let mod;
      try {
        mod = await import('../three/TrackScene');
      } catch (err) {
        if (!cancelled) fail('loading the 3D code', err);
        return;
      }
      if (cancelled) return;
      const report = graphicsReport();
      console.info('[3D preview] graphics report:', report);
      if (!report.webgl2.ok) {
        fail('checking the graphics', new Error(`This browser did not provide WebGL 2, which the 3D view needs${report.webgl1.ok ? ' (only WebGL 1 is available)' : ''}.`));
        return;
      }
      try {
        const scene = new mod.TrackScene(canvas);
        sceneRef.current = scene;
        observer = new ResizeObserver(([entry]) => {
          const { width, height } = entry.contentRect;
          scene.setSize(Math.floor(width), Math.floor(height));
        });
        observer.observe(wrapRef.current);
        setStatus('ready');
      } catch (err) {
        if (!cancelled) fail('starting the 3D renderer', err);
      }
    })();
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
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
        {status === 'failed' && failure && (
          <div className="preview3d__overlay preview3d__overlay--error" role="alert">
            <div>
              <p><strong>The 3D view failed while {failure.stage}.</strong></p>
              <p className="preview3d__errmsg">{failure.name}: {failure.message}</p>
              <ul className="preview3d__report">
                {describeReport(failure.report).map((line) => <li key={line}>{line}</li>)}
              </ul>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  const text = [`Failed while ${failure.stage}`, `${failure.name}: ${failure.message}`, ...describeReport(failure.report), '', failure.stack || ''].join('\n');
                  navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false));
                }}
              >
                {copied ? 'Copied' : 'Copy details'}
              </button>
              <p className="muted small">Full details are also in the browser console. The normal 2D race view is unaffected.</p>
            </div>
          </div>
        )}
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
