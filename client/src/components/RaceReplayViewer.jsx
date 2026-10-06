import { useEffect, useRef, useState } from 'react';
import { useReplay } from '../hooks/useReplay';
import { useTrackScene } from '../hooks/useTrackScene';
import MarbleBall from './MarbleBall';
import SceneFailure from './SceneFailure';
import { Spinner } from './Status';
import { formatTime } from '../utils/format';

/**
 * A finished race (or physics preview) played back in 3D: the scene, the
 * standings, the clock, playback controls and camera choices. `data` is a
 * replay ({ track, entries, frames, results, tickMs, durationMs }); mount it
 * again (with a new key) for a different race.
 */
const NOBODY = [];
const countdownLabel = (t) => (t >= 0 ? 'GO!' : String(Math.ceil(-t / 1000)));

export default function RaceReplayViewer({ data, loading = false, mine = NOBODY, children }) {
  const replay = useReplay(data);
  const { wrapRef, canvasRef, sceneRef, status, failure, fail } = useTrackScene();
  const [camera, setCamera] = useState('follow'); // follow | overview
  const [follow, setFollow] = useState('leader'); // 'leader' or an entry index
  const [built, setBuilt] = useState(false);
  const dirty = useRef(true); // something besides the clock changed: redraw

  // Build the track and its marbles once both the scene and the race are here.
  useEffect(() => {
    const scene = sceneRef.current;
    if (status !== 'ready' || !scene || !data) return;
    try {
      scene.setTrack(data.track);
      scene.setRace(data.entries, mine, data.results, data.start ? { ...data.start, countdownMs: -replay.start, frame: data.frames[0] } : null);
      setBuilt(true);
    } catch (err) {
      fail(`building the race on "${data.track?.name}"`, err);
    }
  }, [status, data, mine]);

  // Start playing as soon as everything is built.
  const started = useRef(false);
  useEffect(() => {
    if (built && !started.current) {
      started.current = true;
      replay.toggle();
    }
  }, [built]);

  useEffect(() => {
    sceneRef.current?.setCameraMode(camera);
    dirty.current = true;
  }, [camera, built]);

  // The frame loop: move marbles every animation frame while something changes,
  // then go quiet (no drawing) while paused so phones don't burn battery.
  const sampleRef = useRef(replay.sample);
  sampleRef.current = replay.sample;
  const followRef = useRef(follow);
  followRef.current = follow;
  useEffect(() => { dirty.current = true; }, [follow]);
  useEffect(() => {
    if (!built) return undefined;
    let raf;
    let lastT = -1;
    let lastNow = performance.now();
    let settle = 0;
    const tick = (now) => {
      const dt = (now - lastNow) / 1000;
      lastNow = now;
      const frame = sampleRef.current();
      const scene = sceneRef.current;
      if (frame && scene) {
        if (frame.t !== lastT || dirty.current) settle = 90; // keep easing the camera ~1.5 s after a change
        if (settle > 0) {
          settle -= 1;
          lastT = frame.t;
          dirty.current = false;
          const f = followRef.current;
          const index = f; // 'leader' or an entry index (the scene keeps the leader steady)
          try {
            scene.updateRace(frame, index, dt);
          } catch (err) {
            fail('moving the marbles', err);
            return;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [built]);

  const entries = data?.entries ?? [];
  const standings = replay.frame?.s ?? [];
  const finished = data && replay.time >= replay.duration;
  const winner = data?.results?.[0] && entries[data.results[0].index];
  const followIndex = follow === 'leader' ? standings[0] : follow;

  return (
    <>
      <div className="preview3d__stage" ref={wrapRef}>
        <canvas ref={canvasRef} className="preview3d__canvas" aria-label="Race replay in 3D" />
        {status === 'loading' && <div className="preview3d__overlay"><Spinner label="Loading 3D…" /></div>}
        {status === 'ready' && loading && !data && <div className="preview3d__overlay"><Spinner label="Loading the race…" /></div>}
        {status === 'failed' && failure && <SceneFailure failure={failure} />}
        {built && (
          <>
            <div className="replay3d__clock">{formatTime(Math.max(0, replay.time))}</div>
            {replay.start < 0 && replay.time < 700 && (
              <div className="replay3d__countdownwrap" aria-live="polite">
                {/* Keyed by what it shows, so each number pops in afresh. */}
                <span key={countdownLabel(replay.time)} className={`replay3d__countdown${replay.time >= 0 ? ' is-go' : ''}`}>
                  {countdownLabel(replay.time)}
                </span>
              </div>
            )}
            {replay.frame?.v && followIndex !== undefined && replay.frame.p[followIndex] < 1 && (
              <div className="replay3d__speed" aria-label="Speed of the marble the camera follows">
                <strong>{Math.round((replay.frame.v[followIndex] ?? 0) * 3.6)}</strong> km/h
              </div>
            )}
            <ol className="replay3d__standings" aria-label="Current standings">
              {standings.slice(0, 5).map((i, pos) => {
                const e = entries[i];
                return (
                  <li key={i} className={`${i === followIndex ? 'is-followed' : ''}${mine.includes(i) ? ' is-mine' : ''}`}>
                    <button type="button" onClick={() => { setFollow(i); setCamera('follow'); }} title={`Follow ${e?.marble.name}`}>
                      <span className="replay3d__pos">{pos + 1}</span>
                      <MarbleBall marble={e?.marble} size={16} />
                      <span className="replay3d__name">{e?.marble.name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {finished && winner && (
              <div className="replay3d__winner">
                <MarbleBall marble={winner.marble} size={24} />
                <span><strong>{winner.marble.name}</strong> wins in {formatTime(data.results[0].finishTimeMs)}!</span>
              </div>
            )}
          </>
        )}
      </div>

      {data && (
        <div className="replay__controls">
          <button type="button" className="btn btn--primary btn--sm" onClick={replay.toggle} disabled={!built}>
            {replay.playing ? 'Pause' : finished ? 'Restart' : 'Play'}
          </button>
          <input
            type="range"
            min={replay.start}
            max={replay.duration}
            step={100}
            value={replay.time}
            onChange={(e) => { replay.seek(Number(e.target.value)); dirty.current = true; }}
            aria-label="Replay position"
          />
          <div className="segmented segmented--sm" role="group" aria-label="Playback speed">
            {[1, 2, 4].map((s) => (
              <button key={s} type="button" aria-pressed={replay.speed === s} onClick={() => replay.setSpeed(s)}>{s}×</button>
            ))}
          </div>
        </div>
      )}

      {data && (
        <div className="segmented" role="group" aria-label="Camera">
          <button type="button" aria-pressed={camera === 'follow' && follow === 'leader'} onClick={() => { setFollow('leader'); setCamera('follow'); }}>
            Follow the leader
          </button>
          {mine.length > 0 && (
            <button type="button" aria-pressed={camera === 'follow' && follow === mine[0]} onClick={() => { setFollow(mine[0]); setCamera('follow'); }}>
              Follow my marble
            </button>
          )}
          <button type="button" aria-pressed={camera === 'overview'} onClick={() => setCamera('overview')}>
            Whole track
          </button>
        </div>
      )}

      {children}
    </>
  );
}
