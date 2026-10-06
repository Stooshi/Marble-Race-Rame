import { useEffect, useRef, useState } from 'react';
import { useTrackScene } from '../hooks/useTrackScene';
import MarbleBall from './MarbleBall';
import SceneFailure from './SceneFailure';
import { Spinner } from './Status';
import { formatTime } from '../utils/format';

/**
 * A live race in 3D (tracks on the new physics, e.g. Bobsleigh Run): the
 * marbles wait behind the starting gate during the countdown, then the scene
 * follows the live stream. Same stream contract as RaceViewer (2D): `meta`
 * from the stream header, `sample()` for a smoothly interpolated frame, and
 * the latest `frame` for the standings.
 */
const NOBODY = [];

export default function LiveRaceViewer3D({ meta, sample, frame, startsAt, highlight = NOBODY, footer = null }) {
  const { wrapRef, canvasRef, sceneRef, status, failure, fail } = useTrackScene();
  const [camera, setCamera] = useState('follow'); // follow | overview
  const [follow, setFollow] = useState('leader'); // 'leader' or an entry index
  const [built, setBuilt] = useState(false);
  const dirty = useRef(true);

  useEffect(() => {
    const scene = sceneRef.current;
    if (status !== 'ready' || !scene || !meta) return;
    try {
      scene.setTrack(meta.track);
      scene.setRace(meta.entries, highlight, [], meta.start && meta.firstFrame ? { ...meta.start, frame: meta.firstFrame } : null);
      setBuilt(true);
    } catch (err) {
      fail(`building the race on "${meta.track?.name}"`, err);
    }
  }, [status, meta?.raceId, highlight]); // the header repeats on start; build once per race

  useEffect(() => {
    sceneRef.current?.setCameraMode(camera);
    dirty.current = true;
  }, [camera, built]);

  // Every animation frame: the live (interpolated) frame, or during the
  // countdown the field waiting at the gate, timed up to GO.
  const sampleRef = useRef(sample);
  sampleRef.current = sample;
  const startRef = useRef(startsAt);
  startRef.current = startsAt;
  const firstRef = useRef(meta?.firstFrame);
  firstRef.current = meta?.firstFrame;
  const followRef = useRef(follow);
  followRef.current = follow;
  useEffect(() => {
    if (!built) return undefined;
    let raf;
    let lastNow = performance.now();
    const tick = (now) => {
      const dt = (now - lastNow) / 1000;
      lastNow = now;
      let f = sampleRef.current();
      if (!f && firstRef.current) f = { ...firstRef.current, t: Math.min(0, Date.now() - (startRef.current ?? Date.now())) };
      const scene = sceneRef.current;
      if (f && scene) {
        const who = followRef.current;
        try {
          scene.updateRace(f, who === 'leader' ? (f.s?.[0] ?? 0) : who, dt);
        } catch (err) {
          fail('moving the marbles', err);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [built]);

  const entries = meta?.entries ?? [];
  const standings = frame?.s ?? meta?.firstFrame?.s ?? [];
  const followIndex = follow === 'leader' ? standings[0] : follow;
  const speed = frame?.v && followIndex !== undefined && frame.p[followIndex] < 1 ? frame.v[followIndex] : null;

  return (
    <div className="live3d">
      <div className="preview3d__stage" ref={wrapRef}>
        <canvas ref={canvasRef} className="preview3d__canvas" aria-label="Live race in 3D" />
        {status === 'loading' && <div className="preview3d__overlay"><Spinner label="Loading 3D…" /></div>}
        {status === 'failed' && failure && <SceneFailure failure={failure} />}
        {built && (
          <>
            <div className="replay3d__clock">{formatTime(Math.max(0, frame?.t ?? 0))}</div>
            {speed !== null && (
              <div className="replay3d__speed" aria-label="Speed of the marble the camera follows">
                <strong>{Math.round(speed * 3.6)}</strong> km/h
              </div>
            )}
            <ol className="replay3d__standings" aria-label="Current standings">
              {standings.slice(0, 5).map((i, pos) => {
                const e = entries[i];
                return (
                  <li key={i} className={`${i === followIndex ? 'is-followed' : ''}${highlight.includes(i) ? ' is-mine' : ''}`}>
                    <button type="button" onClick={() => { setFollow(i); setCamera('follow'); }} title={`Follow ${e?.marble.name}`}>
                      <span className="replay3d__pos">{pos + 1}</span>
                      <MarbleBall marble={e?.marble} size={16} />
                      <span className="replay3d__name">{e?.marble.name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
      <div className="segmented" role="group" aria-label="Camera">
        <button type="button" aria-pressed={camera === 'follow' && follow === 'leader'} onClick={() => { setFollow('leader'); setCamera('follow'); }}>
          Follow the leader
        </button>
        {highlight.length > 0 && (
          <button type="button" aria-pressed={camera === 'follow' && follow === highlight[0]} onClick={() => { setFollow(highlight[0]); setCamera('follow'); }}>
            Follow my marble
          </button>
        )}
        <button type="button" aria-pressed={camera === 'overview'} onClick={() => setCamera('overview')}>
          Whole track
        </button>
      </div>
      {footer}
    </div>
  );
}
