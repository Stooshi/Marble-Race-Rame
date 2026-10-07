import { useEffect, useMemo, useRef, useState } from 'react';
import { useReplay } from '../hooks/useReplay';
import { useTrackScene } from '../hooks/useTrackScene';
import MarbleBall from './MarbleBall';
import SceneFailure from './SceneFailure';
import CornerView, { cornerFollow, followedNow, followLabel } from './CornerView';
import { Spinner } from './Status';
import { formatTime } from '../utils/format';
import FinishShow, { useFinishShow } from './FinishShow';
import FrameMeter, { useFrameMeter } from './FrameMeter';
import { BOARD_HOLD_MS, finishPlan } from '../utils/finishShow';

/**
 * A finished race (or physics preview) played back in 3D: the scene, the
 * standings, the clock, playback controls and camera choices. `data` is a
 * replay ({ track, entries, frames, results, tickMs, durationMs }); mount it
 * again (with a new key) for a different race. The finish show plays at the
 * end (the replay runs on for it); raceId (a real race's) brings the track
 * record and personal-best flags, and `next` is the next-race panel for its board.
 */
const NOBODY = [];
const countdownLabel = (t) => (t >= 0 ? 'GO!' : String(Math.ceil(-t / 1000)));

export default function RaceReplayViewer({ data, loading = false, mine = NOBODY, raceId = null, next = null, children }) {
  // Every finish time is known up front: the show's timing, and how long the replay runs on for it.
  const finishes = useMemo(() => Object.fromEntries((data?.results ?? []).filter((r) => Number.isFinite(r.finishTimeMs)).map((r) => [r.index, r.finishTimeMs])), [data]);
  const plan = finishPlan(finishes, data?.entries?.length ?? 0, true);
  const replay = useReplay(data, { tailMs: plan && data ? Math.max(0, plan.boardAt + BOARD_HOLD_MS - data.durationMs) : 0 });
  const show = useFinishShow({ finishes, count: data?.entries?.length ?? 0, complete: true, clock: replay.now });
  const finishing = show.phase !== 'racing' && show.phase !== 'winner';
  const { wrapRef, canvasRef, sceneRef, status, failure, fail } = useTrackScene();
  const [camera, setCamera] = useState('follow'); // follow | overview
  const [follow, setFollow] = useState('leader'); // 'leader' or an entry index
  const [built, setBuilt] = useState(false);
  const meter = useFrameMeter();
  // The winner's moment in the scene: the golden spotlight and the camera pushing in.
  const winnerIndex = show.plan ? Number(Object.keys(finishes).find((i) => finishes[i] === show.plan.winnerMs)) : null;
  useEffect(() => {
    sceneRef.current?.setCelebration(show.plan && Number.isInteger(winnerIndex) ? { index: winnerIndex, ms: show.plan.winnerMs } : null);
  }, [built, winnerIndex, show.plan?.winnerMs]);
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
  // After the winner's moment, the camera following the leader watches the rest come home.
  followRef.current = follow === 'leader' && finishing ? 'arriving' : follow;
  // The small corner view follows the other one of leader / my marble (not in
  // the whole-track view, and gone once the winner's moment has passed).
  const over = data && replay.time >= replay.duration;
  const inset = camera === 'follow' && !finishing ? cornerFollow(follow, mine) : null;
  useEffect(() => { dirty.current = true; }, [finishing]);
  const insetRef = useRef(inset);
  insetRef.current = inset;
  useEffect(() => { dirty.current = true; }, [follow, inset]);
  const swapViews = () => {
    if (inset === null) return;
    // Tell the frame loop at once, so not even one frame drives the swapped cameras the old way.
    followRef.current = inset;
    insetRef.current = follow;
    sceneRef.current?.swapViews();
    dirty.current = true;
    setFollow(inset);
  };
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
          try {
            // 'leader', 'second' or an entry index (the scene keeps the leader steady).
            scene.updateRace(frame, followRef.current, dt, insetRef.current);
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
  const finished = over;
  const followIndex = followedNow(follow, standings);
  const insetIndex = inset === null ? undefined : followedNow(inset, standings);

  return (
    <>
      <div className="preview3d__stage" ref={wrapRef}>
        <canvas ref={canvasRef} className="preview3d__canvas" aria-label="Race replay in 3D" />
        {status === 'loading' && <div className="preview3d__overlay"><Spinner label="Loading 3D…" /></div>}
        {status === 'ready' && loading && !data && <div className="preview3d__overlay"><Spinner label="Loading the race…" /></div>}
        {status === 'failed' && failure && <SceneFailure failure={failure} />}
        {built && (
          <>
            {show.phase !== 'winner' && <div className="replay3d__clock">{formatTime(Math.max(0, replay.time))}</div>}
            {replay.start < 0 && replay.time < 700 && (
              <div className="replay3d__countdownwrap" aria-live="polite">
                {/* Keyed by what it shows, so each number pops in afresh. */}
                <span key={countdownLabel(replay.time)} className={`replay3d__countdown${replay.time >= 0 ? ' is-go' : ''}`}>
                  {countdownLabel(replay.time)}
                </span>
              </div>
            )}
            {show.phase === 'racing' && replay.frame?.v && followIndex !== undefined && replay.frame.p[followIndex] < 1 && (
              <div className="replay3d__speed" aria-label="Speed of the marble the camera follows">
                <strong>{Math.round((replay.frame.v[followIndex] ?? 0) * 3.6)}</strong> km/h
              </div>
            )}
            <CornerView
              sceneRef={sceneRef}
              ready={built}
              visible={inset !== null}
              label={inset === null ? '' : followLabel(inset, mine, entries)}
              marble={entries[insetIndex]?.marble}
              onSwap={swapViews}
            />
            {show.phase === 'racing' && (
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
            )}
            {meter.on && <FrameMeter sceneRef={sceneRef} />}
            <FinishShow show={show} finishes={finishes} entries={entries} mine={mine} raceId={raceId} trackName={data?.track?.name} next={next}
              onSkip={() => { replay.seek(plan.boardAt); dirty.current = true; }} />
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
          <button type="button" aria-pressed={meter.on} onClick={meter.toggle} title="Show the frame rate">
            FPS
          </button>
        </div>
      )}

      {children}
    </>
  );
}
