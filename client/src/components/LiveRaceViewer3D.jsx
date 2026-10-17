import { useEffect, useRef, useState } from 'react';
import { useTrackScene } from '../hooks/useTrackScene';
import MarbleBall from './MarbleBall';
import CpuTag from './CpuTag';
import SceneFailure from './SceneFailure';
import CornerView, { cornerFollow, followedNow, followLabel } from './CornerView';
import { Spinner } from './Status';
import { formatTime } from '../utils/format';
import { COUNTDOWN_MS } from '../three/startCamera';
import { BUFFER_MS } from '../hooks/useRaceStream';
import FinishShow, { useFinishShow } from './FinishShow';
import { CEREMONY_PHASES } from '../utils/finishShow';
import SkipToResults from './SkipToResults';
import FrameMeter, { useFrameMeter } from './FrameMeter';
import { useTvMoments } from './tvMomentsSetting';
import { play as playSound, raceCeremony, raceGo } from '../sound/engine';

const WHOOSH_GAP_MS = 3500; // an overtaking whoosh at most this often

/**
 * A live race in 3D (tracks on the new physics, e.g. Bobsleigh Run): the
 * marbles wait behind the starting gate during the countdown, then the scene
 * follows the live stream. Same stream contract as RaceViewer (2D): `meta`
 * from the stream header, `sample()` for a smoothly interpolated frame, and
 * the latest `frame` for the standings.
 */
const NOBODY = [];
const NONE = {};

/**
 * The finish: `finishes` (entry index → official finish ms, as marbles cross),
 * `complete` (the race is over), `clock()` (the stream's race clock, running
 * on after the last frame) and `next` (the next-race panel for the board).
 */
export default function LiveRaceViewer3D({
  meta, sample, frame, startsAt, countdownMs = COUNTDOWN_MS, highlight = NOBODY, footer = null,
  finishes = NONE, complete = false, clock = null, next = null, canSkip = false,
}) {
  const { wrapRef, canvasRef, sceneRef, status, failure, fail } = useTrackScene();
  const [camera, setCamera] = useState('follow'); // follow | overview
  const [follow, setFollow] = useState('leader'); // 'leader' or an entry index
  const [built, setBuilt] = useState(false);
  const meter = useFrameMeter();
  const tv = useTvMoments();
  useEffect(() => { sceneRef.current?.setTvMoments(tv.on); }, [tv.on, sceneRef, status]);
  const dirty = useRef(true);

  useEffect(() => {
    const scene = sceneRef.current;
    if (status !== 'ready' || !scene || !meta) return;
    try {
      scene.setTrack(meta.track);
      // Live, the starting camera runs over the race's whole countdown (the gate's own is shorter).
      scene.setRace(meta.entries, highlight, [], meta.start && meta.firstFrame ? { ...meta.start, countdownMs, frame: meta.firstFrame } : null);
      setBuilt(true);
    } catch (err) {
      fail(`building the race on "${meta.track?.name}"`, err);
    }
  }, [status, meta?.raceId, highlight.join(',')]); // the header repeats (countdown, start): build once per race

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
  const entryCount = meta?.entries?.length ?? 0;
  const show = useFinishShow({ finishes, count: entryCount, complete, clock });
  // Once the winner's moment has passed, the camera following the leader
  // watches the rest come home instead; the corner view bows out.
  const finishing = show.phase !== 'racing' && show.phase !== 'winner';
  // The winner's moment in the scene: the golden spotlight and the camera pushing in.
  const winnerIndex = show.plan ? Number(Object.keys(finishes).find((i) => finishes[i] === show.plan.winnerMs)) : null;
  useEffect(() => {
    sceneRef.current?.setCelebration(show.plan && Number.isInteger(winnerIndex) ? { index: winnerIndex, ms: show.plan.winnerMs } : null);
  }, [built, winnerIndex, show.plan?.winnerMs]);
  const followRef = useRef(follow);
  followRef.current = follow === 'leader' && finishing ? 'arriving' : follow;
  // The small corner view follows the other one of leader / my marble (none in the whole-track view).
  const inset = camera === 'follow' && !finishing ? cornerFollow(follow, highlight) : null;
  const insetRef = useRef(inset);
  insetRef.current = inset;
  const swapViews = () => {
    if (inset === null) return;
    // Tell the frame loop at once, so not even one frame drives the swapped cameras the old way.
    followRef.current = inset;
    insetRef.current = follow;
    sceneRef.current?.swapViews();
    setFollow(inset);
  };
  useEffect(() => {
    if (!built) return undefined;
    let raf;
    let lastNow = performance.now();
    let lastT = null;
    const grandPrix = Boolean(meta?.track?.physics?.kit?.grandPrix);
    const tick = (now) => {
      const dt = (now - lastNow) / 1000;
      lastNow = now;
      let f = sampleRef.current();
      // (Running BUFFER_MS behind, as the live race itself does, so GO flows straight on into the race.)
      if (!f && firstRef.current) f = { ...firstRef.current, t: Math.max(-countdownMs, Math.min(0, Date.now() - BUFFER_MS - (startRef.current ?? Date.now()))) };
      const scene = sceneRef.current;
      // The gates open (GO, as drawn): the pack leaving the gate, and on a Grand Prix the crowd.
      // (Or within its first 1.5 s if the 3D world was still being built at GO.)
      if (f && f.t >= 0 && ((lastT !== null && lastT < 0) || (lastT === null && f.t < 1500))) {
        playSound('launch');
        if (grandPrix) playSound('crowd');
      }
      // GO: the race's music (once per race; also when the page opens mid-race).
      if (f && f.t >= 0 && (lastT === null || lastT < 0) && meta?.raceId) raceGo(meta.raceId);
      if (f) lastT = f.t;
      if (f && scene) {
        const who = followRef.current;
        try {
          scene.updateRace(f, who, dt, insetRef.current); // 'leader', 'second' or an entry index (the scene keeps the leader steady)
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

  // The finish ceremony appears: the race music gives way to the ceremony song.
  useEffect(() => {
    if (meta?.raceId && CEREMONY_PHASES.includes(show.phase)) raceCeremony(meta.raceId);
  }, [show.phase, meta?.raceId]);

  const entries = meta?.entries ?? [];
  const standings = frame?.s ?? meta?.firstFrame?.s ?? [];

  // Your own marble overtakes or is overtaken while the camera follows it: a whoosh (now and then).
  const rankRef = useRef(null);
  const whooshAt = useRef(0);
  const mine = typeof follow === 'number' && highlight.includes(follow) ? follow : null;
  useEffect(() => {
    if (mine === null || camera !== 'follow' || show.phase !== 'racing' || !frame?.s || frame.t < 2000 || frame.p?.[mine] >= 1) { rankRef.current = null; return; }
    const rank = frame.s.indexOf(mine);
    if (rankRef.current !== null && rank !== rankRef.current && Date.now() - whooshAt.current > WHOOSH_GAP_MS) {
      if (playSound('whoosh')) whooshAt.current = Date.now();
    }
    rankRef.current = rank;
  }, [frame, mine, camera, show.phase]);
  const followIndex = followedNow(follow, standings);
  const insetIndex = inset === null ? undefined : followedNow(inset, standings);
  const speed = show.phase === 'racing' && frame?.v && followIndex !== undefined && frame.p[followIndex] < 1 ? frame.v[followIndex] : null;

  return (
    <div className="live3d">
      <div className={`preview3d__stage${show.phase !== 'racing' ? ' is-finishing' : ''}`} ref={wrapRef}>
        <canvas ref={canvasRef} className="preview3d__canvas" aria-label="Live race in 3D" />
        {status === 'loading' && <div className="preview3d__overlay"><Spinner label="Loading 3D…" /></div>}
        {status === 'failed' && failure && <SceneFailure failure={failure} />}
        {built && (
          <>
            {show.phase !== 'winner' && <div className="replay3d__clock">{formatTime(Math.max(0, frame?.t ?? 0))}</div>}
            {speed !== null && (
              <div className="replay3d__speed" aria-label="Speed of the marble the camera follows">
                <strong>{Math.round(speed * 3.6)}</strong> km/h
              </div>
            )}
            <CornerView
              sceneRef={sceneRef}
              ready={built}
              visible={inset !== null}
              label={inset === null ? '' : followLabel(inset, highlight, entries)}
              marble={entries[insetIndex]?.marble}
              onSwap={swapViews}
            />
            {meter.on && <FrameMeter sceneRef={sceneRef} />}
            <FinishShow show={show} finishes={finishes} entries={entries} mine={highlight} raceId={meta?.raceId} trackName={meta?.track?.name} next={next} />
            {show.phase === 'racing' && (
              <ol className="replay3d__standings" aria-label="Current standings">
                {standings.slice(0, 5).map((i, pos) => {
                  const e = entries[i];
                  return (
                    <li key={i} className={`${i === followIndex ? 'is-followed' : ''}${highlight.includes(i) ? ' is-mine' : ''}`}>
                      <button type="button" onClick={() => { setFollow(i); setCamera('follow'); }} title={`Follow ${e?.marble.name}`}>
                        <span className="replay3d__pos">{pos + 1}</span>
                        <MarbleBall marble={e?.marble} size={16} />
                        <span className="replay3d__name">{e?.marble.name}</span>{e?.isBot && <CpuTag />}
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </div>
      <SkipToResults show={show} allowed={canSkip} onSkip={show.skip} />
      <div className="segmented segmented--camera" role="group" aria-label="Camera">
        <button type="button" aria-pressed={camera === 'follow' && follow === 'leader'} onClick={() => { setFollow('leader'); setCamera('follow'); }}>
          <span className="ms-wide-only">Follow the leader</span><span className="ms-narrow-only">Leader</span>
        </button>
        {highlight.length > 0 && (
          <button type="button" aria-pressed={camera === 'follow' && follow === highlight[0]} onClick={() => { setFollow(highlight[0]); setCamera('follow'); }}>
            <span className="ms-wide-only">Follow my marble</span><span className="ms-narrow-only">My marble</span>
          </button>
        )}
        <button type="button" aria-pressed={camera === 'overview'} onClick={() => setCamera('overview')}>
          Whole track
        </button>
        <button type="button" aria-pressed={tv.on} onClick={tv.toggle} title="TV moments: cut to trackside cameras as the marble you follow comes by">
          TV
        </button>
        <button type="button" aria-pressed={meter.on} onClick={meter.toggle} title="Show the frame rate">
          FPS
        </button>
      </div>
      {footer}
    </div>
  );
}
