/**
 * The game's sound (Moses, 28 Oct 2026, the sound reset): the countdown beeps, one race tune and the crowd.
 *
 * - Nothing loads or plays before the player's first tap or key (browsers and
 *   phones block sound until then anyway).
 * - Two volumes, music ("Game music") and effects, and a mute (settings.js keeps them per player).
 * - A race (raceCountdown → raceGo → raceCeremony → raceEnd, called by the race views):
 *     countdown  "start beeps" over the 3-2-1, its fourth beep exactly on GO (Effects); the
 *                race's tune is fetched meanwhile so it starts on time;
 *     GO         one of the 6 race tunes (shuffled rounds, never the previous race's), played
 *                once: the files fade out at their end (scripts/convert-audio.sh), so a race
 *                longer than its tune goes quiet gently, never an abrupt loop;
 *     ceremony   unchanged (Moses, 28 Oct 2026: only its file is new): when the finish ceremony
 *                appears the race tune stops (a short fade) and the ceremony song starts, looping
 *                while the player stays, fading out softly (CEREMONY_FADE_S) after CEREMONY_SECONDS;
 *     leaving    the music stops. Outside races there is no music, and no other music or ambience.
 * - The crowd: when the player's own marble passes a crowd stand (once per stand per race;
 *   crowdCheer, from the race view), under the music (CROWD_UNDER).
 * - The music is mixed well under the effects (MUSIC_UNDER) and dips further while a
 *   race sound plays (DUCK; not for the crowd).
 * - Race sounds: short files decoded once, played at once; never awaited by the race
 *   (play() returns straight away), so nothing ever waits for sound. The tunes stream (an
 *   <audio> element, loaded during the countdown), so phones keep little in memory.
 * - Each file comes in two formats (public/audio): Opus in WebM, the smallest,
 *   and AAC in M4A; the engine picks the one this device plays.
 */

export const RACE_TRACKS = ['tune-1', 'tune-2', 'tune-3', 'tune-4', 'tune-5', 'tune-6'];
/** Tune lengths in seconds (scripts/convert-audio.sh; each fades out over its last TUNE_FADE_S). */
export const TRACK_SECONDS = { 'tune-1': 71.4, 'tune-2': 27.5, 'tune-3': 43.2, 'tune-4': 37.7, 'tune-5': 30.8, 'tune-6': 50.6, ceremony: 59.1 };
export const CEREMONY = 'ceremony';
export const TUNE_FADE_S = 3;
export const SOUNDS = { crowd: 'crowd-grand-prix', launch: 'launch', whoosh: 'whoosh', beeps: 'start-beeps' };
/** In "start beeps" the four beeps start at 0.024, 1.026, 2.035 and 3.023 s: the fourth, the GO, this far in. */
export const BEEPS_GO_S = 3.023;
/** The ceremony song fades out (over CEREMONY_FADE_S) this long after it started. */
export const CEREMONY_SECONDS = 45;
export const CEREMONY_FADE_S = 4;

/** At the same slider position the music sits this far under the effects (-10 dB). */
export const MUSIC_UNDER = 0.32;
/** The crowd plays this far under the effects slider: with its file 4 LU under the music's, about 6 dB under the music. */
export const CROWD_UNDER = 0.35;
/** While a race sound plays the music dips by this much more (-6 dB). */
export const DUCK = 0.5;
const BASE = '/audio/';

let ctx = null;
let master = null;
let musicBus = null;
let duckBus = null;
let fxBus = null;
let settings = { music: 0.7, effects: 0.8, muted: false };
let format = null;
const buffers = new Map(); // sound name → AudioBuffer (or a promise of one)
let unlocked = false;
let order = [];
let lastTrack = null;
const chosen = new Map(); // raceId → its tune
let want = null; // what should play: { raceId, kind: 'race'|'ceremony', track, at }
let playing = null; // what plays: { raceId, kind, handle }
const ready = new Map(); // tunes loading ahead (the race's tune during the countdown, the ceremony song during the race): `${raceId}:${name}` → <audio>
let beeps = null; // the countdown's source node
let duckUntil = 0;

function pickFormat() {
  if (format) return format;
  const a = typeof Audio !== 'undefined' ? new Audio() : null;
  format = a && a.canPlayType('audio/webm; codecs="opus"') ? 'webm' : 'm4a';
  return format;
}
const urlOf = (name) => `${BASE}${name}.${pickFormat()}`;

/** The next race's tune: a shuffled round of the 6, never the one the last race had. */
export function nextTrack(last, random = Math.random) {
  if (!order.length) {
    order = [...RACE_TRACKS];
    for (let i = order.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    if (order[0] === last && order.length > 1) order.push(order.shift());
  }
  return order.shift();
}
export function _resetOrder() { order = []; }

/** The tune a race plays (picked once per race). */
export function trackFor(raceId, random = Math.random) {
  if (!chosen.has(raceId)) {
    const t = nextTrack(lastTrack, random);
    lastTrack = t;
    chosen.set(raceId, t);
    if (chosen.size > 20) chosen.delete(chosen.keys().next().value);
  }
  return chosen.get(raceId);
}

/** Gain for the music bus and the effects bus from the settings. */
export function levels(s = settings) {
  if (s.muted) return { music: 0, effects: 0 };
  return { music: s.music * MUSIC_UNDER, effects: s.effects };
}

function applyLevels() {
  if (!ctx) return;
  const { music, effects } = levels();
  const t = ctx.currentTime;
  musicBus.gain.setTargetAtTime(music, t, 0.08);
  fxBus.gain.setTargetAtTime(effects, t, 0.05);
}

/** A tune's <audio> element, loading (not playing) so it starts on time at GO. */
function tuneElement(name) {
  const el = new Audio();
  el.preload = 'auto';
  el.crossOrigin = 'anonymous';
  el.loop = name === CEREMONY; // (a race tune plays once: its file fades out at its end; the ceremony song loops, as before)
  el.src = urlOf(name);
  el.load?.();
  return el;
}

const drop = (el) => { el.removeAttribute('src'); el.load?.(); };
/** Fetches a race's tune (or its ceremony song) ahead, so it starts on time. */
function prepareTune(raceId, name = trackFor(raceId)) {
  if (!ctx || typeof Audio === 'undefined') return;
  const key = `${raceId}:${name}`;
  if (ready.has(key)) return;
  for (const [k, el] of ready) if (!k.startsWith(`${raceId}:`)) { drop(el); ready.delete(k); } // (another race's)
  ready.set(key, tuneElement(name));
}

/** A race's tune on the music bus, played once from the start → { stop(fadeS), pause(), resume() }. */
function startTune(raceId, name, from = 0) {
  const key = `${raceId}:${name}`;
  const el = ready.get(key) ?? tuneElement(name);
  ready.delete(key);
  const gain = ctx.createGain();
  gain.gain.value = 1;
  gain.connect(duckBus);
  ctx.createMediaElementSource(el).connect(gain);
  let stopped = false;
  const fadeTo = (to, seconds) => {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(to, t + seconds);
  };
  const finish = () => { el.pause(); el.removeAttribute('src'); el.load?.(); gain.disconnect(); };
  el.addEventListener?.('ended', () => { if (!stopped) { stopped = true; finish(); } });
  if (from > 0) {
    const seek = () => { try { el.currentTime = from; } catch { /* (not seekable yet) */ } };
    if (el.readyState >= 1) seek(); else el.addEventListener?.('loadedmetadata', seek, { once: true });
  }
  el.play().catch(() => {}); // (never awaited)
  return {
    name,
    stop(fadeS = 0.4) {
      if (stopped) return;
      stopped = true;
      fadeTo(0, fadeS);
      setTimeout(finish, fadeS * 1000 + 100);
    },
    pause() { el.pause(); },
    resume() { if (!stopped) el.play().catch(() => {}); },
  };
}

let ceremonyTimer = null;
/** Makes what plays match what should (a race's tune, its ceremony song, or nothing). */
function sync() {
  if (!ctx) return;
  const allowed = !settings.muted && settings.music > 0;
  let target = allowed ? want : null;
  // The ceremony song plays for CEREMONY_SECONDS, then has faded out for good.
  if (target?.kind === 'ceremony' && Date.now() - target.at > CEREMONY_SECONDS * 1000) target = null;
  const same = playing && target && playing.raceId === target.raceId && playing.kind === target.kind;
  if (same) return;
  if (playing) { playing.handle.stop(0.4); playing = null; }
  clearTimeout(ceremonyTimer);
  if (!target) return;
  if (target.kind === 'ceremony') {
    const mine = { raceId: target.raceId, kind: 'ceremony', handle: startTune(target.raceId, CEREMONY) };
    playing = mine;
    ceremonyTimer = setTimeout(() => {
      if (playing !== mine) return;
      mine.handle.stop(CEREMONY_FADE_S); // (fades out softly)
      playing = null;
    }, Math.max(0, CEREMONY_SECONDS * 1000 - (Date.now() - target.at)));
    return;
  }
  // (A tune plays once from GO: turned on again mid-race, or tapped late, it joins where the race is;
  // past its end, the race stays quiet.)
  const late = Math.max(0, (Date.now() - target.at) / 1000);
  if (late > (TRACK_SECONDS[target.track] ?? Infinity) - TUNE_FADE_S) return;
  playing = { raceId: target.raceId, kind: target.kind, handle: startTune(target.raceId, target.track, late > 0.5 ? late : 0) };
}

/**
 * The countdown of a race: "start beeps", its GO beep `msToGo` from now (a page opened late
 * joins the beeps part-way). Also fetches the race's track so it is ready at GO.
 */
export function raceCountdown(raceId, msToGo) {
  if (want?.raceId !== raceId) { want = null; sync(); }
  prepareTune(raceId);
  if (!ctx || settings.muted || settings.effects === 0 || beeps?.raceId === raceId || !(msToGo > 150)) return false;
  const buf = buffers.get(SOUNDS.beeps);
  if (!buf || typeof buf.then === 'function') return false;
  const goAt = Date.now() + msToGo;
  // Only on a running sound clock (Moses, 22 Oct 2026: on Android the beeps played 20–30 s into the
  // race). A suspended context doesn't advance its clock, so beeps scheduled on it played whenever
  // it next woke, e.g. at a tap mid-race. Suspended: try to wake it, and schedule only if it wakes
  // while there is still a countdown to beep over.
  if (ctx.state !== 'running') {
    beeps = { raceId, src: null };
    ctx.resume().then(() => {
      if (beeps?.raceId !== raceId || beeps.src || ctx.state !== 'running') return;
      const left = goAt - Date.now();
      if (left > 150) startBeeps(raceId, buf, left, goAt);
      else beeps = null;
    }).catch(() => { if (beeps?.raceId === raceId && !beeps.src) beeps = null; });
    return false;
  }
  startBeeps(raceId, buf, msToGo, goAt);
  return true;
}

/** The beeps on the running clock, their GO beep `msToGo` from now; cut off if they would run past their time (the clock paused meanwhile). */
function startBeeps(raceId, buf, msToGo, goAt) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(fxBus);
  const wait = msToGo / 1000 - BEEPS_GO_S;
  if (wait >= 0) src.start(ctx.currentTime + wait);
  else src.start(0, -wait);
  beeps = { raceId, src };
  // The beeps end with the GO beep: never later than that (by the wall clock, which a paused sound clock can't hold up).
  const tailMs = Math.max(0, (buf.duration - BEEPS_GO_S) * 1000) + 250;
  setTimeout(() => {
    if (beeps?.src !== src) return;
    try { src.stop(); } catch { /* (done) */ }
    beeps = null;
  }, Math.max(0, goAt + tailMs - Date.now()));
}

/** GO: this race's tune starts (once per race), played once. */
export function raceGo(raceId) {
  if (want?.raceId === raceId) return;
  want = { raceId, kind: 'race', track: trackFor(raceId), at: Date.now() };
  sync();
  prepareTune(raceId, CEREMONY); // (fetched meanwhile, for the finish)
}

/** The finish ceremony appears: the race tune stops and the ceremony song starts (once per race), as before. */
export function raceCeremony(raceId) {
  if (want?.raceId === raceId && want.kind === 'ceremony') return;
  want = { raceId, kind: 'ceremony', track: CEREMONY, at: Date.now() };
  sync();
}

/**
 * The player's own marble passes a crowd stand (`key`: the stand, once per race): the crowd's cheer,
 * under the music. → whether it played.
 */
const cheered = new Map(); // raceId → Set of stands
export function crowdCheer(raceId, key) {
  if (!cheered.has(raceId)) {
    cheered.set(raceId, new Set());
    if (cheered.size > 20) cheered.delete(cheered.keys().next().value);
  }
  const done = cheered.get(raceId);
  if (done.has(key)) return false;
  done.add(key);
  return play('crowd', { gain: CROWD_UNDER, duck: false });
}

/** The player left the race (or the next one begins): its music and countdown stop. */
export function raceEnd(raceId) {
  if (raceId !== undefined && want && want.raceId !== raceId) return;
  want = null;
  for (const [k, el] of ready) if (raceId === undefined || k.startsWith(`${raceId}:`)) { drop(el); ready.delete(k); }
  if (beeps && (raceId === undefined || beeps.raceId === raceId)) { try { beeps.src.stop(); } catch { /* (done) */ } beeps = null; }
  sync();
}

/**
 * The start show's loading (Moses, 26 Oct 2026: the race begins only once everything is ready): the
 * race sounds and this race's music, fetched and decoded. Resolves when they're in, at once when the
 * sound isn't started yet (no gesture yet: nothing to load into), and never later than `maxMs`.
 */
export function preloadRace(raceId, maxMs = 2500) {
  if (!ctx) return Promise.resolve(false);
  prepareTune(raceId);
  const loads = Object.values(SOUNDS).map((name) => Promise.resolve(loadSound(name)));
  return Promise.race([Promise.all(loads).then(() => true), new Promise((ok) => setTimeout(() => ok(false), maxMs))]);
}

/** The countdown's beeps for this race stopped (the start show re-times them when the flyover is skipped). */
export function stopCountdown(raceId) {
  if (beeps && beeps.raceId === raceId) { try { beeps.src?.stop(); } catch { /* (done) */ } beeps = null; }
}

/** What is meant to play now (for tests and checks): { raceId, kind, track } or null. */
export const musicState = () => (want ? { raceId: want.raceId, kind: want.kind, track: want.track } : null);
export const nowPlaying = () => (playing ? { raceId: playing.raceId, kind: playing.kind, name: playing.handle.name } : null);

/** Starts the sound system on the first gesture (call from a tap/click/key handler). */
export function unlock() {
  if (unlocked) { if (ctx?.state === 'suspended') ctx.resume().catch(() => {}); return; }
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return;
  unlocked = true;
  ctx = new AC();
  master = ctx.createGain();
  musicBus = ctx.createGain();
  duckBus = ctx.createGain();
  fxBus = ctx.createGain();
  duckBus.connect(musicBus).connect(master);
  fxBus.connect(master);
  master.connect(ctx.destination);
  musicBus.gain.value = 0;
  fxBus.gain.value = 0;
  ctx.resume?.().catch(() => {});
  applyLevels();
  // The race sounds, small: fetched and decoded now so they play at once.
  for (const name of Object.values(SOUNDS)) loadSound(name);
  // Tapped during a race: its tune joins where the race is.
  sync();
}

function loadSound(name) {
  if (buffers.has(name)) return buffers.get(name);
  const p = fetch(urlOf(name))
    .then((r) => r.arrayBuffer())
    .then((b) => new Promise((ok, no) => ctx.decodeAudioData(b, ok, no)))
    .then((buf) => { buffers.set(name, buf); return buf; })
    .catch(() => { buffers.delete(name); return null; });
  buffers.set(name, p);
  return p;
}

/**
 * Plays a race sound now (if loaded and the sound is running; a sound not ready yet is skipped rather
 * than played late). Returns at once. The music dips under it while it plays.
 */
export function play(key, { gain = 1, duck = true } = {}) {
  if (!ctx || settings.muted || settings.effects === 0) return false;
  const buf = buffers.get(SOUNDS[key] ?? key);
  if (!buf || typeof buf.then === 'function') return false;
  // Not on a paused sound clock: it would play whenever the clock next runs (a launch heard mid-race).
  if (ctx.state !== 'running') { ctx.resume().catch(() => {}); return false; }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  if (gain === 1) src.connect(fxBus);
  else { const g = ctx.createGain(); g.gain.value = gain; src.connect(g).connect(fxBus); }
  src.start();
  if (!duck) return true;
  // Duck the music under it.
  const t = ctx.currentTime;
  const until = t + buf.duration;
  duckBus.gain.cancelScheduledValues(t);
  duckBus.gain.setTargetAtTime(DUCK, t, 0.06);
  duckUntil = Math.max(duckUntil, until);
  duckBus.gain.setTargetAtTime(1, duckUntil, 0.4);
  return true;
}

/** New settings ({ music, effects, muted }, levels 0–1). */
export function setSettings(next) {
  settings = { ...settings, ...next };
  applyLevels();
  sync(); // (muted or music at 0: the music stops; turned back up mid-race: it starts again)
}

export const getSettings = () => ({ ...settings });
export const isUnlocked = () => unlocked;
/** Whether sound is actually running (an iPhone may want a second tap). */
export const isRunning = () => ctx?.state === 'running';

let paused = false;
/**
 * The app or tab went to the background (true) or came back (false): sound stops while nobody is
 * looking (phones keep a web view's audio playing otherwise) and picks up where it was.
 */
export function setBackground(hidden) {
  if (!ctx || hidden === paused) return;
  paused = hidden;
  if (hidden) {
    playing?.handle.pause();
    ctx.suspend?.().catch(() => {});
  } else {
    ctx.resume?.().catch(() => {});
    playing?.handle.resume();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => setBackground(document.visibilityState === 'hidden'));
}
