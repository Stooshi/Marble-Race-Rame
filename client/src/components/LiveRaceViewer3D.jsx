import { useEffect, useRef, useState } from 'react';
import { standingsRows } from '../utils/standingsRows';
import { entryLabel } from '../shared/playerName';
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
import { play as playSound, raceCeremony, raceCountdown, raceGo } from '../sound/engine';
import StartLights from './StartLights';

const WHOOSH_GAP_MS = 3500; // an overtaking whoosh at most this often
const HOLD_FROM_MS = 250;     // the view held back when it gets ready later than this after the countdown began…
const JOIN_LIVE_AFTER_MS = 8000; // …unless the race is already this far past GO: then it joins live

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
/**
 * How far to hold the view back when it is ready at `now`: as late as it is after the countdown began
 * (from HOLD_FROM_MS), unless the race is already JOIN_LIVE_AFTER_MS past GO (then 0: it joins live).
 * `go`: GO by the wall clock, known only when this page saw the countdown (then the frames from the
 * start are kept, see useRaceStream).
 */
export function holdFor(go, countdownMs, now = Date.now()) {
  if (!go) return 0;
  const late = now - (go - countdownMs);
  return late > HOLD_FROM_MS && now < go + JOIN_LIVE_AFTER_MS ? late : 0;
}

/**
 * Getting ready (Moses, 22 Oct 2026: on phones the view was ready only after the countdown): `track`
 * (the race's track, known before the countdown) is built as soon as the 3D view exists, and
 * `onPrepared()` is called once its whole world is built and compiled (the solo race then starts its
 * countdown). When the race's marbles are in and drawn, the view holds itself back
 * (`holdBack(ms, startsAt)` from useRaceStream) if it got ready after the countdown began, so the
 * countdown, its beeps and the gates opening always show from the start, and then catches up
 * (`lagNow()`).
 */
export default function LiveRaceViewer3D({
  meta, sample, frame, startsAt, countdownMs = COUNTDOWN_MS, highlight = NOBODY, footer = null,
  finishes = NONE, complete = false, clock = null, next = null, canSkip = false,
  track = null, onPrepared = null, holdBack = null, lagNow = null,
}) {
  const { wrapRef, canvasRef, sceneRef, status, failure, fail } = useTrackScene();
  const [camera, setCamera] = useState('follow'); // follow | overview
  const [follow, setFollow] = useState('leader'); // 'leader' or an entry index
  const [built, setBuilt] = useState(false);
  const [trackReady, setTrackReady] = useState(false);
  const [ready, setReady] = useState(false); // the race's marbles in and drawn, the hold decided
  const [shownT, setShownT] = useState(null); // the countdown as shown (whole tenths), for its overlay
  const [shown, setShown] = useState(null); // the race as shown (its clock and order), when held back
  const builtSlug = useRef(null);
  const onPreparedRef = useRef(onPrepared);
  onPreparedRef.current = onPrepared;
  const theTrack = meta?.track ?? track;

  // The track first (before the countdown when it is known), its whole world built and compiled.
  useEffect(() => {
    const scene = sceneRef.current;
    if (status !== 'ready' || !scene || !theTrack || builtSlug.current === theTrack.slug) return;
    try {
      scene.setTrack(theTrack);
      builtSlug.current = theTrack.slug;
    } catch (err) {
      fail(`building "${theTrack?.name}"`, err);
      return;
    }
    let live = true;
    scene.whenReady().then(() => {
      if (!live) return;
      setTrackReady(true);
      onPreparedRef.current?.();
    });
    return () => { live = false; };
  }, [status, theTrack?.slug]); // eslint-disable-line react-hooks/exhaustive-deps
  const meter = useFrameMeter();
  const tv = useTvMoments();
  useEffect(() => { sceneRef.current?.setTvMoments(tv.on); }, [tv.on, sceneRef, status]);
  const dirty = useRef(true);

  useEffect(() => {
    const scene = sceneRef.current;
    if (status !== 'ready' || !scene || !meta || builtSlug.current !== meta.track?.slug) return;
    try {
      // Live, the starting camera runs over the race's whole countdown (the gate's own is shorter).
      scene.setRace(meta.entries, highlight, [], meta.start && meta.firstFrame ? { ...meta.start, countdownMs, frame: meta.firstFrame } : null);
      setBuilt(true);
    } catch (err) {
      fail(`building the race on "${meta.track?.name}"`, err);
    }
  }, [status, meta?.raceId, highlight.join(','), trackReady]); // the header repeats (countdown, start): build once per race

  // Ready: the marbles compiled and drawn too. Hold the view back if that came after the countdown began.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!built || !trackReady || !scene || ready) return undefined;
    let live = true;
    scene.whenReady().then(() => {
      if (!live) return;
      const go = startRef.current;
      const lag = holdFor(go, countdownMs);
      holdBack?.(lag, go);
      lagRef.current = lagNow;
      // The countdown's beeps, timed to the countdown as shown (none if it is already over).
      if (go && meta?.raceId) raceCountdown(meta.raceId, go + lag - Date.now());
      setReady(true);
    });
    return () => { live = false; };
  }, [built, trackReady, ready, startsAt]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const lagRef = useRef(null);
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
    if (!built || !ready) return undefined;
    let raf;
    let lastShown = null;
    let lastShownClock = null;
    let lastNow = performance.now();
    let lastT = null;
    const grandPrix = Boolean(meta?.track?.physics?.kit?.grandPrix);
    const tick = (now) => {
      const dt = (now - lastNow) / 1000;
      lastNow = now;
      let f = sampleRef.current();
      // (Running BUFFER_MS behind, as the live race itself does, so GO flows straight on into the race.)
      const lag = lagRef.current ? lagRef.current() : 0;
      if (!f && firstRef.current) f = { ...firstRef.current, t: Math.max(-countdownMs, Math.min(0, Date.now() - BUFFER_MS - lag - (startRef.current ?? Date.now()))) };
      // The countdown's overlay follows the countdown as shown (tenths: the start lights need them).
      const tenth = f && f.t < 600 ? Math.floor(f.t / 100) : null;
      if (tenth !== lastShown) { lastShown = tenth; setShownT(tenth === null ? null : tenth * 100); }
      // While held back, the clock and the order on screen are the race as shown, not the live stream.
      if (lag > 0 && f && Math.floor(f.t / 50) !== lastShownClock) { lastShownClock = Math.floor(f.t / 50); setShown({ t: f.t, s: f.s }); }
      else if (lag === 0 && lastShownClock !== null) { lastShownClock = null; setShown(null); }
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
  }, [built, ready]);

  // The finish ceremony appears: the race music gives way to the ceremony song.
  useEffect(() => {
    if (meta?.raceId && CEREMONY_PHASES.includes(show.phase)) raceCeremony(meta.raceId);
  }, [show.phase, meta?.raceId]);

  const entries = meta?.entries ?? [];
  const standings = shown?.s ?? frame?.s ?? meta?.firstFrame?.s ?? [];

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
        {status === 'ready' && !ready && <div className="preview3d__overlay"><Spinner label="Getting the track ready…" /></div>}
        {ready && shownT !== null && (
          <div className="replay3d__countdownwrap" aria-live="polite">
            {theTrack?.physics?.kit?.grandPrix
              ? <StartLights t={shownT} className="replay3d__lights" />
              : <span key={shownT >= 0 ? 'go' : Math.ceil(-shownT / 1000)} className={`replay3d__countdown${shownT >= 0 ? ' is-go' : ''}`}>{shownT >= 0 ? 'GO!' : Math.ceil(-shownT / 1000)}</span>}
          </div>
        )}
        {status === 'failed' && failure && <SceneFailure failure={failure} />}
        {built && ready && (
          <>
            {show.phase !== 'winner' && <div className="replay3d__clock">{formatTime(Math.max(0, shown?.t ?? frame?.t ?? 0))}</div>}
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
                {standingsRows(standings, highlight).map(({ index: i, pos, own }) => {
                  const e = entries[i];
                  return (
                    <li key={i} className={`${i === followIndex ? 'is-followed' : ''}${highlight.includes(i) ? ' is-mine' : ''}${own ? ' is-own-below' : ''}`}>
                      <button type="button" onClick={() => { setFollow(i); setCamera('follow'); }} title={`Follow ${entryLabel(e)}${e?.user ? ` (${e.marble.name})` : ''}`}>
                        <span className="replay3d__pos">{pos + 1}</span>
                        <MarbleBall marble={e?.marble} size={16} />
                        <span className="replay3d__name">{entryLabel(e)}</span>{e?.isBot && <CpuTag />}
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
          <span className="ms-wide-only">Whole track</span><span className="ms-narrow-only">Track</span>
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
