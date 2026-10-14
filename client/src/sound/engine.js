/**
 * The game's sound: background music and the race sounds.
 *
 * - Nothing loads or plays before the player's first tap or key (browsers and
 *   phones block sound until then anyway); then the music starts by itself.
 * - Two volumes, music and effects, and a mute (settings.js keeps them per player).
 * - Music: the 4 tracks of a shared pool, shuffled (never the same one twice in a
 *   row), crossfading. Only the playing track is loaded; the next one is fetched in
 *   the background while it plays. The music is mixed well under the effects
 *   (MUSIC_UNDER) and dips further while a race sound plays.
 * - Race sounds: short files decoded once, played at once; never awaited by the
 *   race (play() returns straight away), so nothing ever waits for sound.
 * - Each file comes in two formats (public/audio): Opus in WebM, the smallest,
 *   and AAC in M4A; the engine picks the one this device plays.
 */

export const MUSIC_TRACKS = ['music-1', 'music-2', 'music-3', 'music-4'];
export const SOUNDS = { crowd: 'crowd-grand-prix', launch: 'launch', whoosh: 'whoosh' };

/** At the same slider position the music sits this far under the effects (-10 dB). */
export const MUSIC_UNDER = 0.32;
/** While a race sound plays the music dips by this much more (-6 dB). */
export const DUCK = 0.5;
const CROSSFADE_S = 3;
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
let started = false;
let order = [];
let deck = null; // { el, gain, name }
let nextDeck = null;
let duckUntil = 0;

function pickFormat() {
  if (format) return format;
  const a = typeof Audio !== 'undefined' ? new Audio() : null;
  format = a && a.canPlayType('audio/webm; codecs="opus"') ? 'webm' : 'm4a';
  return format;
}
const urlOf = (name) => `${BASE}${name}.${pickFormat()}`;

/** The next track: a shuffled round of the pool, never repeating the one just played. */
export function nextTrack(last, random = Math.random) {
  if (!order.length) {
    order = [...MUSIC_TRACKS];
    for (let i = order.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    if (order[0] === last && order.length > 1) order.push(order.shift());
  }
  return order.shift();
}
export function _resetOrder() { order = []; }

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
  if (deck?.el) deck.el.muted = settings.muted;
}

function makeDeck(name) {
  const el = new Audio();
  el.preload = 'auto';
  el.crossOrigin = 'anonymous';
  el.src = urlOf(name);
  const source = ctx.createMediaElementSource(el);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(gain).connect(duckBus);
  return { el, gain, name };
}

function fade(d, to, seconds) {
  const t = ctx.currentTime;
  d.gain.gain.cancelScheduledValues(t);
  d.gain.gain.setValueAtTime(d.gain.gain.value, t);
  d.gain.gain.linearRampToValueAtTime(to, t + seconds);
}

/** Plays the next track, crossfading from the one playing; fetches the one after in the background. */
function playNext() {
  const incoming = nextDeck ?? makeDeck(nextTrack(deck?.name));
  nextDeck = null;
  const outgoing = deck;
  deck = incoming;
  deck.el.muted = settings.muted;
  deck.el.play().catch(() => {}); // (plays once loaded; never awaited)
  fade(deck, 1, outgoing ? CROSSFADE_S : 1.5);
  if (outgoing) {
    fade(outgoing, 0, CROSSFADE_S);
    setTimeout(() => { outgoing.el.pause(); outgoing.el.removeAttribute('src'); outgoing.el.load(); }, CROSSFADE_S * 1000 + 200);
  }
  let queued = false;
  deck.el.ontimeupdate = () => {
    const left = deck.el.duration - deck.el.currentTime;
    // Once it is playing (after 5 s): fetch the next track quietly, so only one loads at a time.
    if (!queued && deck.el.currentTime > 5) { queued = true; nextDeck = makeDeck(nextTrack(deck.name)); }
    if (Number.isFinite(left) && left < CROSSFADE_S && deck.el.ontimeupdate) { deck.el.ontimeupdate = null; playNext(); }
  };
  deck.el.onended = () => { if (deck?.el.onended) { deck.el.onended = null; playNext(); } };
}

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
  startMusic();
  // The race sounds, small: fetched and decoded now so they play at once.
  for (const name of Object.values(SOUNDS)) loadSound(name);
}

function startMusic() {
  if (started || !ctx || settings.muted || settings.music === 0) return;
  started = true;
  playNext();
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
 * Plays a race sound now (if loaded; a sound not ready yet is skipped rather than
 * played late). Returns at once. The music dips under it while it plays.
 */
export function play(key) {
  if (!ctx || settings.muted || settings.effects === 0) return false;
  const buf = buffers.get(SOUNDS[key] ?? key);
  if (!buf || typeof buf.then === 'function') return false;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
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
  if (ctx && !settings.muted && settings.music > 0) startMusic();
  if (ctx && deck && settings.muted) deck.el.pause();
  else if (deck && deck.el.paused && started && !settings.muted) deck.el.play().catch(() => {});
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
    deck?.el.pause();
    ctx.suspend?.().catch(() => {});
  } else {
    ctx.resume?.().catch(() => {});
    if (deck && started && !settings.muted && settings.music > 0) deck.el.play().catch(() => {});
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => setBackground(document.visibilityState === 'hidden'));
}
