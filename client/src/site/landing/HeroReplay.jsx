import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useTrackScene } from '../../hooks/useTrackScene';
import { frameAtTime } from '../../utils/splits';
import MarbleBadge from '../marbles/MarbleBadge';
import { orderAt, tightestWindow } from './packWindow';

/**
 * The landing page's hero: a real saved race in the 3D replay view, looping
 * the stretch where all 20 marbles run in a tight pack. A different close
 * race on each visit. Silent and starts by itself; with "reduce motion" it
 * shows one still frame instead. The order strip and "Join the next race"
 * sit on top.
 */
export default function HeroReplay() {
  const { wrapRef, canvasRef, sceneRef, status } = useTrackScene();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [order, setOrder] = useState([]);
  const still = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);

  useEffect(() => {
    let stop = false;
    api.showcase()
      .then(({ race }) => api.replay(race.id).then((replay) => ({ race, replay })))
      .then((d) => { if (!stop) setData(d); })
      .catch(() => { if (!stop) setFailed(true); });
    return () => { stop = true; };
  }, []);

  const window_ = useMemo(() => (data ? tightestWindow(data.replay.frames, data.replay.tickMs) : null), [data]);

  const built = useRef(false);
  useEffect(() => {
    const scene = sceneRef.current;
    if (status !== 'ready' || !scene || !data || built.current) return undefined;
    try {
      scene.setTrack(data.replay.track);
      scene.setRace(data.replay.entries, [], data.replay.results, null);
      scene.setCameraMode('follow');
      built.current = true;
    } catch {
      setFailed(true);
      return undefined;
    }
    const { frames, tickMs } = data.replay;
    const span = window_.to - window_.from;
    // Ride along in the pack: follow the marble 6th at the start of the loop, so the leaders are in view ahead.
    const followIndex = orderAt(frameAtTime(frames, tickMs, window_.from))[5] ?? 'leader';
    const t0 = performance.now();
    let raf = 0;
    let lastNow = t0;
    let lastOrder = 0;
    let prevT = null;
    const tick = (now) => {
      const loopT = still ? 5000 : (now - t0) % span;
      const t = window_.from + loopT;
      const frame = frameAtTime(frames, tickMs, t);
      if (prevT !== null && t < prevT) scene.marbles?.balls?.forEach((b) => { b.last = null; }); // (a loop: no rolling jump)
      prevT = t;
      scene.updateRace(frame, followIndex, Math.min(0.1, (now - lastNow) / 1000));
      lastNow = now;
      if (now - lastOrder > 250) { lastOrder = now; setOrder(orderAt(frame)); }
      if (!still) raf = requestAnimationFrame(tick);
    };
    if (still) {
      // One settled frame: let the follow camera ease into place, then stop.
      for (let k = 0; k < 90; k += 1) scene.updateRace(frameAtTime(frames, tickMs, window_.from + 5000), followIndex, 1 / 30);
      tick(performance.now());
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(raf);
  }, [status, data, window_, still, sceneRef]);

  const entries = data?.replay.entries ?? [];
  const seconds = window_ ? Math.round(window_.from / 1000) : 0;
  const track = data?.race;

  return (
    <div className="ms-heroplay" role="img" aria-label="A replay of a real 20-marble race: the whole field rolls along the track in a tight pack, swapping places.">
      <div ref={wrapRef} className="ms-heroplay__view">
        <canvas ref={canvasRef} />
        {(failed || status === 'failed') && <div className="ms-heroplay__fallback" />}
      </div>
      <div className="ms-heroplay__top">
        <span className="ms-heroplay__live"><i />RACE REPLAY</span>
        {track && <span>{track.track_name}</span>}
        {data && <span className="ms-heroplay__time">0:{String(seconds).padStart(2, '0')} · 20 marbles</span>}
      </div>
      <div className="ms-heroplay__bottom">
        <ol className="ms-heroplay__order" aria-label="Places">
          {order.slice(0, 20).map((i, k) => (
            <li key={i}>
              {entries[i]?.marble?.look ? <MarbleBadge slug={entries[i].marble.look} size={22} still /> : <MarbleBadge marble={entries[i]?.marble} size={22} still />}
              <span>{k + 1}</span>
            </li>
          ))}
        </ol>
        <Link to="/play/start?quick=1" className="ms-btn ms-btn--primary">JOIN THE NEXT RACE</Link>
      </div>
    </div>
  );
}
