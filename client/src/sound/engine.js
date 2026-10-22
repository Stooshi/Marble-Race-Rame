/**
 * The game's sound: the race music, the countdown and the race sounds.
 *
 * - Nothing loads or plays before the player's first tap or key (browsers and
 *   phones block sound until then anyway).
 * - Two volumes, music and effects, and a mute (settings.js keeps them per player).
 * - A race (raceCountdown → raceGo → raceCeremony → raceEnd, called by the race page):
 *     countdown  "start beeps" over the 3-2-1, its last beep on GO (Effects);
 *     GO         one of the 8 race tracks for this race (shuffled rounds, never the previous
 *                race's track), looping if the race outlasts it, the only music in that race;
 *     ceremony   the race music stops and the ceremony song starts, looping while the player
 *                stays, fading out softly after 45 s;
 *     leaving    the music stops. Outside races there is no music.
 * - The music is mixed well under the effects (MUSIC_UNDER) and dips further while a
 *   race sound plays (DUCK).
 * - Race sounds: short files decoded once, played at once; never awaited by the race
 *   (play() returns straight away), so nothing ever waits for sound.
 * - Only the files a race needs load: its one track (fetched at the countdown) and the
 *   ceremony song (fetched at GO). Tracks up to 45 s are decoded and loop without a gap;
 *   the longer ones (and the ceremony song, which fades out before it would loop) stream.
 * - Each file comes in two formats (public/audio): Opus in WebM, the smallest,
 *   and AAC in M4A; the engine picks the one this device plays.
 */

export const RACE_TRACKS = ['race-1', 'race-2', 'race-3', 'race-4', 'race-5', 'race-6', 'race-7', 'race-8'];
/** Track lengths in seconds (scripts/convert-audio.sh): up to LOOP_BUFFER_S they are decoded for gapless loops. */
export const TRACK_SECONDS = { 'race-1': 61.9, 'race-2': 38.8, 'race-3': 17.1, 'race-4': 42.7, 'race-5': 35, 'race-6': 30.8, 'race-7': 30.8, 'race-8': 167.3, ceremony: 59.1 };
export const LOOP_BUFFER_S = 45;
export const CEREMONY = 'ceremony';
export const SOUNDS = { crowd: 'crowd-grand-prix', launch: 'launch', whoosh: 'whoosh', beeps: 'start-beeps' };
/** In "start beeps" the fourth beep, the GO, starts this far in. */
export const BEEPS_GO_S = 3.02;
/** The ceremony song fades out (over CEREMONY_FADE_S) this long after it started. */
export const CEREMONY_SECONDS = 45;
export const CEREMONY_FADE_S = 4;

/** At the same slider position the music sits this far under the effects (-10 dB). */
export const MUSIC_UNDER = 0.32;
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
const chosen = new Map(); // raceId → its track
let want = null; // what should play: { raceId, kind: 'race'|'ceremony', track, at }
let playing = null; // what plays: { raceId, kind, handle }
let beeps = null; // the countdown's source node
let duckUntil = 0;

function pickFormat() {
  if (format) return format;
  const a = typeof Audio !== 'undefined' ? new Audio() : null;
  format = a && a.canPlayType('audio/webm; codecs="opus"') ? 'webm' : 'm4a';
  return format;
}
const urlOf = (name) => `${BASE}${name}.${pickFormat()}`;

/** The next race's track: a shuffled round of the 8, never the one the last race had. */
export function nextTrack(last, random = Math.random) {
  if (!order.length) {
    order = [...RACE_TRACKS];
    for (let i = order.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    if (order[0] === last && order.length > 1) order.push(order.shift());
  }
  return order.shift();
}
export function _resetOrder() { order = []; }

/** The track a race plays (picked once per race). */
export function trackFor(raceId, random = Math.random) {
  if (!chosen.has(raceId)) {
    const t = nextTrack(lastTrack, random);
    lastTrack = t;
    chosen.set(raceId, t);
    if (chosen.size > 20) chosen.delete(chosen.keys().next().value);
  }
  return chosen.get(raceId);
}

/** Whether a file loops from a decoded buffer (gapless) rather than streaming. */
export const buffered = (name) => (TRACK_SECONDS[name] ?? Infinity) <= LOOP_BUFFER_S;

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

/**
 * A looping music file on the music bus → { stop(fadeS), pause(), resume() }. Starts
 * (fading in) as soon as it is loaded; a decoded one loops without a gap.
 */
function startLoop(name) {
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(duckBus);
  let stopped = false;
  let src = null;
  let el = null;
  const fadeTo = (to, seconds) => {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(to, t + seconds);
  };
  if (buffered(name)) {
    Promise.resolve(loadSound(name)).then((buf) => {
      if (stopped || !buf) return;
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(gain);
      src.start();
      fadeTo(1, 0.6);
    });
  } else {
    el = new Audio();
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    el.loop = true;
    el.src = urlOf(name);
    ctx.createMediaElementSource(el).connect(gain);
    el.play().catch(() => {}); // (plays once loaded; never awaited)
    fadeTo(1, 0.6);
  }
  return {
    name,
    stop(fadeS = 0.4) {
      if (stopped) return;
      stopped = true;
      fadeTo(0, fadeS);
      setTimeout(() => {
        try { src?.stop(); } catch { /* (never started) */ }
        if (el) { el.pause(); el.removeAttribute('src'); el.load(); }
        gain.disconnect();
      }, fadeS * 1000 + 100);
    },
    fadeOut(seconds) { fadeTo(0, seconds); },
    pause() { el?.pause(); },
    resume() { if (el && !stopped) el.play().catch(() => {}); },
  };
}

let ceremonyTimer = null;
/** Makes what plays match what should (a race's track, its ceremony song, or nothing). */
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
  const name = target.kind === 'ceremony' ? CEREMONY : target.track;
  playing = { raceId: target.raceId, kind: target.kind, handle: startLoop(name) };
  if (target.kind === 'ceremony') {
    const left = CEREMONY_SECONDS * 1000 - (Date.now() - target.at);
    const mine = playing;
    ceremonyTimer = setTimeout(() => {
      if (playing !== mine) return;
      mine.handle.stop(CEREMONY_FADE_S); // (fades out softly)
      playing = null;
    }, Math.max(0, left));
  }
}

/**
 * The countdown of a race: "start beeps", its GO beep `msToGo` from now (a page opened late
 * joins the beeps part-way). Also fetches the race's track so it is ready at GO.
 */
export function raceCountdown(raceId, msToGo) {
  if (want?.raceId !== raceId) { want = null; sync(); }
  const track = trackFor(raceId);
  if (ctx && buffered(track)) loadSound(track);
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

/** GO: this race's track starts (once per race), looping. Fetches the ceremony song meanwhile. */
export function raceGo(raceId) {
  if (want?.raceId === raceId) return;
  want = { raceId, kind: 'race', track: trackFor(raceId), at: Date.now() };
  sync();
  if (ctx && buffered(CEREMONY)) loadSound(CEREMONY);
}

/** The finish ceremony appears: the race music stops and the ceremony song starts (once per race). */
export function raceCeremony(raceId) {
  if (want?.raceId === raceId && want.kind === 'ceremony') return;
  want = { raceId, kind: 'ceremony', at: Date.now() };
  sync();
}

/** The player left the race (or the next one begins): its music and countdown stop. */
export function raceEnd(raceId) {
  if (raceId !== undefined && want && want.raceId !== raceId) return;
  want = null;
  if (beeps && (raceId === undefined || beeps.raceId === raceId)) { try { beeps.src.stop(); } catch { /* (done) */ } beeps = null; }
  sync();
}

/** What is meant to play now (for tests and checks): { raceId, kind, track } or null. */
export const musicState = () => (want ? { raceId: want.raceId, kind: want.kind, track: want.track ?? CEREMONY } : null);
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
  // Tapped during a race: its music starts now (and its track is fetched).
  if (want?.kind === 'race' && buffered(want.track)) loadSound(want.track);
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
export function play(key) {
  if (!ctx || settings.muted || settings.effects === 0) return false;
  const buf = buffers.get(SOUNDS[key] ?? key);
  if (!buf || typeof buf.then === 'function') return false;
  // Not on a paused sound clock: it would play whenever the clock next runs (a launch heard mid-race).
  if (ctx.state !== 'running') { ctx.resume().catch(() => {}); return false; }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(fxBus);
  src.start();
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
