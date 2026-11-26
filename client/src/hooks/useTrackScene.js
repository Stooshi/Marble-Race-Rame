import { useEffect, useRef, useState } from 'react';
import { graphicsReport } from '../three/diagnostics';
import { importOrReload } from '../utils/staleCode';
import { takeScene } from '../three/scenePool';

/** Records a failure: shown on screen and logged to the console in full. */
function failureFrom(stage, error, report) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[3D] failed while ${stage}:`, err);
  console.error('[3D] graphics report:', report);
  return { stage, name: err.name, message: err.message, stack: err.stack, report };
}

/**
 * Loads Three.js on demand and creates one TrackScene on the returned canvas.
 * Render the canvas from the very first paint (even while data loads) so it
 * always exists when the scene starts. Each stage reports its own failure.
 */
export function useTrackScene({ adoptFor = null } = {}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const adopted = useRef(null); // the slug of a pooled scene taken over (its track already built)
  const [status, setStatus] = useState('loading'); // loading | ready | failed
  const [failure, setFailure] = useState(null);

  const fail = (stage, error) => {
    setFailure(failureFrom(stage, error, graphicsReport()));
    setStatus('failed');
  };

  useEffect(() => {
    let cancelled = false;
    let observer;
    let canvas = canvasRef.current;
    if (!canvas) return undefined;
    // A scene already built for this race (the room page, during the wait: three/scenePool.js): its
    // canvas goes in beside this one (which hides), and its scene is this view's.
    const pooled = adoptFor ? takeScene(adoptFor) : null;
    if (pooled) {
      canvas.style.display = 'none';
      wrapRef.current.insertBefore(pooled.canvas, canvas);
      canvas = pooled.canvas;
      adopted.current = pooled.slug;
    }
    const onLost = (e) => {
      e.preventDefault();
      fail('drawing (the browser took the 3D context away)', new Error('WebGL context lost'));
    };
    canvas.addEventListener('webglcontextlost', onLost);
    (async () => {
      let mod;
      try {
        mod = await importOrReload(() => import('../three/TrackScene'));
      } catch (err) {
        if (!cancelled) fail('loading the 3D code', err);
        return;
      }
      if (cancelled) return;
      const report = graphicsReport();
      console.info('[3D] graphics report:', report);
      if (!report.webgl2.ok) {
        fail('checking the graphics', new Error(`This browser did not provide WebGL 2, which the 3D view needs${report.webgl1.ok ? ' (only WebGL 1 is available)' : ''}.`));
        return;
      }
      try {
        const scene = pooled?.scene ?? new mod.TrackScene(canvas);
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
      if (pooled) pooled.canvas.remove();
    };
  }, []);

  return { wrapRef, canvasRef, sceneRef, status, failure, fail, adopted };
}
