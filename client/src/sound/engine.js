/**
 * The game's sound (Moses, 28 Oct 2026): the countdown beeps, the race tunes, the ceremony song, the
 * gate sound and the crowd, all loaded into memory ahead of the race and timed on the race clock.
 *
 * - Two ways to play (./webBackend.js, ./nativeBackend.js):
 *     the website: Web Audio only, started on the player's first tap (Safari's rule), resumed whenever
 *       it is suspended;
 *     the iPhone/iPad and Android apps: the native audio plugin (no tap needed; the iPhone's silent
 *       switch mutes the game; useNativeAudio(), from app/native.js). An older app build without the
 *       plugin uses Web Audio.
 * - Preloaded early (prepare(), from the race page, a room, Quick race and League Night as soon as the
 *   player is there): the start beeps, the gate sound, the crowd, the ceremony song and the next two
 *   race tunes (this race's and the next race's). The tunes come from shuffled rounds of the 6, decided
 *   ahead so they can be loaded: a race's tune is never the previous race's.
 * - Timing on the race clock: raceCountdown(raceId, msToGo) and raceGo(raceId, goAt) give GO as shown
 *   on this screen (a wall-clock moment). The beeps (their fourth beep exactly on GO) and the race's
 *   tune (from GO) are scheduled for it. The tune picked at GO loops seamlessly until the finish
 *   ceremony (Moses, 28 Oct 2026): from memory (a Web Audio buffer, the native player's loop), no
 *   crossfade, no fade and no gap at the loop point. A sound that isn't loaded in time starts when it
 *   arrives, part-way in, in step with the race: never late from its start.
 * - The finish ceremony (unchanged): the tune stops with a short fade and the ceremony song plays,
 *   looping while the player stays, fading out softly (CEREMONY_FADE_S) after CEREMONY_SECONDS.
 * - The crowd: when the player's own marble passes a Grand Prix stand (crowdCheer, once per stand per
 *   race), under the music. The gate sound at GO. (No overtaking whoosh for now.)
 * - The music sits well under the effects (MUSIC_UNDER) and dips under the gate sound (DUCK).
 * - Readiness: whenSoundReady() / soundMissing() for the race page's readiness check and report.
 */
import { createWebBackend } from './webBackend';
import { createNativeBackend } from './nativeBackend';

export const RACE_TRACKS = ['tune-1', 'tune-2', 'tune-3', 'tune-4', 'tune-5', 'tune-6'];
/**
 * Lengths in seconds. The tunes: their exact loop lengths (scripts/convert-audio.sh prints them; no
 * fades, the silence at both ends trimmed, cut at zero crossings), so the loop is seamless.
 */
export const TRACK_SECONDS = { 'tune-1': 71.316542, 'tune-2': 27.4415, 'tune-3': 43.139458, 'tune-4': 37.716083, 'tune-5': 30.733125, 'tune-6': 50.521917, ceremony: 59.1 };
export const CEREMONY = 'ceremony';
export const SOUNDS = { crowd: 'crowd-grand-prix', launch: 'launch', beeps: 'start-beeps' };
/** In "start beeps" the four beeps start at 0.024, 1.026, 2.035 and 3.023 s: the fourth, the GO, this far in. */
export const BEEPS_GO_S = 3.023;
/** The ceremony song fades out (over CEREMONY_FADE_S) this long after it started. */
export const CEREMONY_SECONDS = 45;
export const CEREMONY_FADE_S = 4;
/** At the same slider position the music sits this far under the effects (-10 dB). */
export const MUSIC_UNDER = 0.32;
/** The crowd plays this far under the effects slider (its file 4 LU under the music's): about 6 dB under the music. */
export const CROWD_UNDER = 0.35;
/** While the gate sound plays the music dips by this much more (-6 dB). */
export const DUCK = 0.5;
/** How many upcoming tunes are kept loaded (this race's and the next race's). */
export const AHEAD = 2;
const BASE = '/audio/';

let settings = { music: 0.7, effects: 0.8, muted: false };
let format = null;
function pickFormat() {
  if (format) return format;
  const a = typeof Audio !== 'undefined' ? new Audio() : null;
  format = a && a.canPlayType?.('audio/webm; codecs="opus"') ? 'webm' : 'm4a';
  return format;
}
const urlOf = (name) => `${BASE}${name}.${pickFormat()}`;

let backend = createWebBackend({ urlOf });
let unlocked = false;

/** The apps: play through the native audio plugin from now on (app/native.js, at start-up). */
export function useNativeAudio(plugin) {
  if (!plugin || backend.kind === 'native') return;
  backend = createNativeBackend({ plugin, durations: TRACK_SECONDS });
  backend.init();
  unlocked = true;
  backend.setLevels(levels());
  if (wantedLoads.size) for (const n of wantedLoads) backend.load(n);
}
export const soundBackend = () => backend.kind;

// ── Which tunes come next ────────────────────────────────────────────────
let order = [];
let lastTrack = null;
let queue = []; // the upcoming tunes, in the order they'll play (kept loaded)
const chosen = new Map(); // raceId → its first tune

/** The next tune from shuffled rounds of the 6, never `last`. */
export function nextTrack(last, random = Math.random) {
  if (!order.length) {
    order = [...RACE_TRACKS];
    for (let i = order.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    if (order[0] === last && order.length > 1) order.push(order.shift());
  }
  return order.shift();
}
export function _resetOrder() { order = []; queue = []; lastTrack = null; chosen.clear(); }

function fillQueue(random) {
  while (queue.length < AHEAD) queue.push(nextTrack(queue.at(-1) ?? lastTrack, random));
}
/** Takes the next tune (never `not`). */
function takeTune(not, random) {
  fillQueue(random);
  let t = queue.shift();
  for (let k = 0; t === not && k < RACE_TRACKS.length; k += 1) { queue.push(t); t = queue.shift(); }
  if (t === not) t = nextTrack(not, random);
  lastTrack = t;
  fillQueue(random);
  for (const n of queue) load(n);
  return t;
}
/** The tune a race starts with (picked once per race, from the loaded queue). */
export function trackFor(raceId, random = Math.random) {
  if (!chosen.has(raceId)) {
    chosen.set(raceId, takeTune(lastTrack, random));
    if (chosen.size > 20) chosen.delete(chosen.keys().next().value);
  }
  return chosen.get(raceId);
}
/** The tunes queued after the current one (for checks). */
export const upcoming = () => [...queue];

// ── Loading ──────────────────────────────────────────────────────────────
const wantedLoads = new Set();
function load(name) { wantedLoads.add(name); return backend.load(name); }
/** What a race needs loaded: the beeps, the gate sound, the crowd, the ceremony song and the next tunes. */
const needed = (raceId) => [...Object.values(SOUNDS), CEREMONY, ...(raceId && chosen.has(raceId) ? [chosen.get(raceId)] : []), ...queue];

/**
 * Preloads everything a race needs (the race page, a room, Quick race, League Night: as soon as the
 * player is there). Safe to call often. → a promise of { ready, missing }.
 */
export function prepare(raceId = null) {
  fillQueue();
  const list = needed(raceId);
  return Promise.all(list.map(load)).then(() => ({ ready: soundMissing(raceId).length === 0, missing: soundMissing(raceId) }));
}
/** The sounds a race needs that aren't loaded yet. */
export function soundMissing(raceId = null) {
  // (Before the website's first tap: fetched into memory counts, it decodes in a moment on the tap.)
  const has = backend.ready() ? backend.loaded : backend.fetched;
  return needed(raceId).filter((n) => !has(n));
}
/** For the readiness report: how the sound stands on this device. */
export function soundReport(raceId = null) {
  return { backend: backend.kind, started: unlocked, running: isRunning(), missing: soundMissing(raceId) };
}
/** Resolves { ready, missing } once the race's sound is loaded, or after `maxMs` with what is missing. */
export function whenSoundReady(raceId = null, maxMs = 12000) {
  const done = prepare(raceId);
  return Promise.race([done, new Promise((ok) => setTimeout(() => ok({ ready: false, missing: soundMissing(raceId) }), maxMs))]);
}
/** (Kept for the start show: resolves when the race's sound is in, at most `maxMs`.) */
export const preloadRace = (raceId, maxMs = 2500) => whenSoundReady(raceId, maxMs).then((r) => r.ready);

// ── Levels ───────────────────────────────────────────────────────────────
export function levels(s = settings) {
  if (s.muted) return { music: 0, effects: 0 };
  return { music: s.music * MUSIC_UNDER, effects: s.effects };
}
const musicOn = () => !settings.muted && settings.music > 0;
const effectsOn = () => !settings.muted && settings.effects > 0;

// ── The race ─────────────────────────────────────────────────────────────
// race: { id, goAt (wall ms, GO as shown), beeps: voice, tune: { name, atWall, voice }, ceremony: { at, voice, timer } }
let race = null;
const now = () => Date.now();

function clearTune(fadeS = 0.4) {
  const t = race?.tune;
  if (!t) return;
  t.voice?.stop(fadeS);
  race.tune = null;
}
function clearBeeps() { race?.beeps?.stop(0.05); if (race) race.beeps = null; }
function clearCeremony(fadeS = 0.4) {
  const c = race?.ceremony;
  if (!c) return;
  clearTimeout(c.timer);
  c.voice?.stop(fadeS);
  c.voice = null;
}

/** The race's tune from `atWall` (GO as shown), looping seamlessly from memory; in step if late. */
function playTune(name, atWall) {
  if (!race || race.ceremony) return;
  race.tune = { name, atWall, voice: null };
  if (!musicOn()) return;
  load(name);
  race.tune.voice = backend.start(name, { atWall, bus: 'music', loop: true, loopLength: TRACK_SECONDS[name] });
}

/** Starts (or re-times) a race on this screen: `goAt` is GO as shown here (wall ms). */
function begin(raceId, goAt) {
  if (race && race.id !== raceId) endRace();
  if (!race) race = { id: raceId, goAt, beeps: null, tune: null, ceremony: null };
  const moved = Math.abs(race.goAt - goAt) > 30;
  race.goAt = goAt;
  return moved;
}

/**
 * The countdown: GO is `msToGo` from now as shown here. Schedules the beeps (the fourth on GO) and the
 * race's first tune from GO. Called again with a new time (a start show re-timed), it re-schedules.
 * → whether beeps are scheduled.
 */
export function raceCountdown(raceId, msToGo) {
  const goAt = now() + msToGo;
  const fresh = !race || race.id !== raceId;
  const moved = begin(raceId, goAt);
  const first = trackFor(raceId);
  prepare(raceId);
  if (fresh || moved || !race.tune) { clearTune(0.05); if (!race.ceremony) playTune(first, goAt); }
  if (fresh || moved || !race.beeps) {
    clearBeeps();
    if (effectsOn() && unlocked && msToGo > 150) {
      race.beeps = backend.start(SOUNDS.beeps, { atWall: goAt - BEEPS_GO_S * 1000, bus: 'fx', until: goAt + 900 });
    }
  }
  return Boolean(race.beeps);
}

/** GO (or a page opened mid-race): the race's tune, from `goAt` (GO as shown here; default now). */
export function raceGo(raceId, goAt = null) {
  // (Already timed: kept, unless GO as shown is more than 0.3 s from what was planned (the hold changed): then the tune follows.)
  if (race?.id === raceId && race.tune && (goAt === null || Math.abs(goAt - race.goAt) <= 300)) return;
  if (race?.id === raceId && race.tune) clearTune(0.05);
  begin(raceId, goAt ?? race?.goAt ?? now());
  if (!race.ceremony) playTune(trackFor(raceId), race.goAt);
}

/** The finish ceremony appears: the tune stops and the ceremony song starts (once per race), as before. */
export function raceCeremony(raceId) {
  if (race?.id !== raceId || race.ceremony) {
    if (race?.id === raceId) return;
    begin(raceId, now());
  }
  clearTune(0.4);
  race.ceremony = { at: now(), voice: null, timer: null };
  startCeremony();
}
function startCeremony() {
  const c = race?.ceremony;
  if (!c || !musicOn()) return;
  const left = CEREMONY_SECONDS * 1000 - (now() - c.at);
  if (left <= 0) return;
  c.voice = backend.start(CEREMONY, { atWall: now(), bus: 'music', loop: true });
  clearTimeout(c.timer);
  c.timer = setTimeout(() => { c.voice?.stop(CEREMONY_FADE_S); c.voice = null; }, left);
}

function endRace() {
  if (!race) return;
  clearBeeps();
  clearTune(0.4);
  clearCeremony(0.4);
  race = null;
}
/** The player left the race (or the next one begins): its music and countdown stop. */
export function raceEnd(raceId) {
  if (raceId !== undefined && race && race.id !== raceId) return;
  endRace();
}
/** The countdown's beeps for this race stopped (a start show re-times them). */
export function stopCountdown(raceId) { if (race?.id === raceId) clearBeeps(); }

/** The player's own marble passes a crowd stand (`key`, once per race): the crowd's cheer, under the music. */
const cheered = new Map();
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

/** A race sound now (only if loaded and the sound is running: never played late). → whether it played. */
export function play(key, { gain = 1, duck = true } = {}) {
  if (!unlocked || !effectsOn()) return false;
  const name = SOUNDS[key] ?? key;
  if (!backend.loaded(name)) { load(name); return false; }
  if (!backend.running()) { backend.wake(); return false; }
  backend.start(name, { atWall: now(), bus: 'fx', gain });
  if (duck) backend.duck(DUCK, backend.duration(name) ?? 2);
  return true;
}

/** What is meant to play now (for tests and checks). */
export function musicState() {
  if (!race) return null;
  if (race.ceremony) return { raceId: race.id, kind: 'ceremony', track: CEREMONY };
  // (Scheduled for GO: playing from GO on, not during the countdown.)
  return race.tune && now() >= race.tune.atWall - 5 ? { raceId: race.id, kind: 'race', track: race.tune.name } : null;
}
export function nowPlaying() {
  if (!race || !musicOn()) return null;
  if (race.ceremony) return race.ceremony.voice ? { raceId: race.id, kind: 'ceremony', name: CEREMONY } : null;
  return race.tune?.voice ? { raceId: race.id, kind: 'race', name: race.tune.name } : null;
}

// ── Starting, settings, background ──────────────────────────────────────
/** The website: starts the sound on the first tap (call from a tap/click/key handler); resumes it after. */
export function unlock() {
  if (unlocked && backend.kind === 'native') return;
  if (unlocked) { backend.wake(); return; }
  if (!backend.init()) return;
  unlocked = true;
  backend.setLevels(levels());
  for (const n of [...Object.values(SOUNDS), ...wantedLoads]) load(n);
  // (Tapped during a race: its tune joins in step, and the beeps if the countdown is still on.)
  if (race?.tune && !race.tune.voice && musicOn()) playTune(race.tune.name, race.tune.atWall);
  if (race && !race.beeps && !race.ceremony && effectsOn() && race.goAt - now() > 150) {
    race.beeps = backend.start(SOUNDS.beeps, { atWall: race.goAt - BEEPS_GO_S * 1000, bus: 'fx', until: race.goAt + 900 });
  }
}

export function setSettings(next) {
  const wasMusic = musicOn();
  const wasFx = effectsOn();
  settings = { ...settings, ...next };
  backend.setLevels(levels());
  if (!race) return;
  // Music off: the tune stops; on again mid-race: it joins in step (or the ceremony song, while it's on).
  if (wasMusic && !musicOn()) { const t = race.tune; clearTune(0.3); if (t) race.tune = { ...t, voice: null }; clearCeremony(0.3); }
  if (!wasMusic && musicOn()) {
    if (race.ceremony) startCeremony();
    else if (race.tune) playTune(race.tune.name, race.tune.atWall);
  }
  if (wasFx && !effectsOn()) clearBeeps();
  if (!wasFx && effectsOn() && unlocked && race.goAt - now() > 150 && !race.beeps) {
    race.beeps = backend.start(SOUNDS.beeps, { atWall: race.goAt - BEEPS_GO_S * 1000, bus: 'fx', until: race.goAt + 900 });
  }
}
export const getSettings = () => ({ ...settings });
export const isUnlocked = () => unlocked;
/** Whether sound is actually running (an iPhone browser may want a second tap). */
export const isRunning = () => unlocked && backend.running();

/** The app or tab went to the background (true) or came back (false): quiet meanwhile, back in step. */
export function setBackground(hidden) { backend.background(hidden); }

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => setBackground(document.visibilityState === 'hidden'));
  // (Back on the page: the sound resumed if Safari suspended it meanwhile.)
  for (const e of ['focus', 'pageshow']) window.addEventListener(e, () => { if (unlocked && document.visibilityState !== 'hidden') backend.wake(); });
}
