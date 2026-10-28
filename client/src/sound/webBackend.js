/**
 * The sound on the website (Moses, 28 Oct 2026): Web Audio only, never <audio> elements. Every sound is
 * fetched and decoded into memory ahead of time, and every voice is scheduled on the sound clock at a
 * wall-clock moment (the race clock as shown), so it plays in step:
 *   - a voice whose moment is past (the sound arrived late, the page opened late) starts at once,
 *     part-way in, where it would be by now: never late from its start;
 *   - Safari starts the sound only on a tap (unlock()), and may suspend it (another app's sound, the
 *     tab hidden): it is resumed at the next chance, and the voices restart where the race is by then;
 *   - decoded at 32 kHz where the browser lets us choose (half the memory of 48 kHz, nothing audible
 *     lost from these files), so a phone keeps the tunes in memory comfortably;
 *   - one file decoded at a time, the race's own first (urgent: the beeps, the gate sound, its tune), so a
 *     slow phone has what the start needs soonest (Moses's Android test, 28 Oct 2026);
 *   - timed by when the sound is HEARD, not when it is computed: the output's own timestamp
 *     (getOutputTimestamp, else outputLatency), so a phone whose audio output lags (an Android WebView:
 *     seconds, at first) still plays the GO beep on GO; music checked every 2 s and put back in step if
 *     it drifts.
 * Every step is logged as "[sound] …" (Logcat: Capacitor/Console in the apps).
 */

const RATE = 32000;
const DRIFT_S = 0.06; // (a tune more than this out of step is put back)
const log = (...a) => { try { console.info('[sound]', ...a); } catch { /* (no console) */ } };

export function createWebBackend({ urlOf, now = () => Date.now() } = {}) {
  let ctx = null;
  let musicBus = null;
  let fxBus = null;
  let duckBus = null;
  const buffers = new Map(); // name → AudioBuffer | Promise (decoded)
  const bytes = new Map(); // name → Promise<ArrayBuffer> (fetched, even before the first tap)
  const got = new Set(); // the names whose bytes have arrived
  const voices = new Set(); // what is scheduled or playing (restarted in step after a suspension)
  let levels = { music: 0, effects: 0 };
  let heldBack = false; // (the app or tab in the background: kept quiet on purpose)

  /** Where a looping tune's music starts and ends in its decoded buffer (cached per buffer). */
  const regions = new WeakMap();
  function loopRegion(buf, length) {
    if (!regions.has(buf)) {
      const d = buf.getChannelData?.(0);
      let from = 0;
      // (Safari's AAC decoding may keep the encoder's priming: a few ms of silence before the music.)
      if (d) { const max = Math.min(d.length, Math.round(buf.sampleRate * 0.06)); let i = 0; while (i < max && Math.abs(d[i]) < 1e-4) i += 1; if (i < max) from = i / buf.sampleRate; }
      const to = length && from + length <= buf.duration + 0.002 ? Math.min(buf.duration, from + length) : buf.duration;
      regions.set(buf, [from, to]);
    }
    return regions.get(buf);
  }
  /**
   * The sound clock as heard: a sound-clock time and the wall-clock moment it reaches the speaker. From
   * the output's own timestamp where the browser has it, else the context's stated output latency.
   */
  function heard() {
    const ts = ctx.getOutputTimestamp?.();
    const perf = typeof performance !== 'undefined' ? performance : null;
    if (ts && ts.contextTime > 0 && ts.performanceTime > 0 && perf) return { ctx: ts.contextTime, wall: now() - (perf.now() - ts.performanceTime) };
    const lat = (Number(ctx.outputLatency) || 0) + (Number(ctx.baseLatency) || 0);
    return { ctx: ctx.currentTime, wall: now() + lat * 1000 };
  }
  /** The sound-clock time at which a wall-clock moment is heard (never before now). */
  const rawCtxAt = (wall) => { const h = heard(); return h.ctx + (wall - h.wall) / 1000; };
  const ctxAt = (wall) => Math.max(ctx.currentTime, rawCtxAt(wall));
  /** When something started at sound-clock time `t` is heard (wall clock). */
  const wallAt = (t) => { const h = heard(); return h.wall + (t - h.ctx) * 1000; };

  /** (Re)starts a voice's source where it should be by now. */
  function startSource(v) {
    const buf = buffers.get(v.name);
    if (!buf || typeof buf.then === 'function' || !ctx || ctx.state !== 'running' || heldBack) return;
    try { v.src?.stop(); } catch { /* (done) */ }
    v.src = null;
    // On time: at the sound-clock time `atWall` is heard. Late (the sound came late, the output lags):
    // at once, part-way in, by as much as it will be late when heard.
    let at = rawCtxAt(v.atWall);
    const soonest = ctx.currentTime;
    const lateS = at < soonest ? Math.max(0, (wallAt(soonest) - v.atWall) / 1000) : 0;
    if (at < soonest) at = soonest;
    let offset = v.offset + lateS;
    if (!v.loop && offset >= buf.duration - 0.02) { voices.delete(v); log(`${v.name}: over by now, not played (${Math.round(lateS * 1000)} ms late)`); return; }
    if (v.until && wallAt(at) >= v.until) { voices.delete(v); log(`${v.name}: its time has passed, not played (${Math.round(lateS * 1000)} ms late)`); return; }
    if (lateS > 0.04) log(`${v.name}: starts ${Math.round(lateS * 1000)} ms late, ${offset.toFixed(2)} s in (in step)`);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = v.loop;
    if (v.loop) {
      // A seamless loop from memory: exactly the music, sample for sample (a decoder's padding, if any,
      // left out at both ends), so the end runs straight into the start.
      const [from, to] = loopRegion(buf, v.loopLength);
      src.loopStart = from;
      src.loopEnd = to;
      offset = from + (offset % (to - from)); // (the music's own time, in the loop: where the race is)
    }
    src.connect(v.gain);
    src.start(at, offset);
    src.onended = () => { if (v.src === src && !v.loop) voices.delete(v); };
    v.src = src;
    v.startedAt = { ctx: at, since: lateS }; // (sound-clock time `at` is `since` s after atWall, as heard)
    if (v.until) { try { src.stop(ctxAt(v.until)); } catch { /* (fine) */ } }
  }

  function resync() { for (const v of voices) startSource(v); }

  /** Every 2 s: a looping tune whose start, as heard now, has moved more than DRIFT_S is put back in step. */
  let drift = null;
  function watchDrift() {
    if (drift || typeof setInterval === 'undefined') return;
    drift = setInterval(() => {
      if (!ctx || ctx.state !== 'running' || heldBack) return;
      for (const v of voices) {
        if (!v.loop || !v.src || !v.startedAt) continue;
        const off = v.startedAt.ctx - (rawCtxAt(v.atWall) + v.startedAt.since); // (how far its start is off, as heard now)
        if (Math.abs(off) > DRIFT_S) { log(`${v.name}: ${Math.round(off * 1000)} ms out of step, put back`); startSource(v); }
      }
    }, 2000);
    drift.unref?.();
  }

  // One file decoded at a time, urgent ones first.
  const waiting = [];
  let decoding = false;
  function nextDecode() {
    if (decoding || !waiting.length) return;
    decoding = true;
    const job = waiting.shift();
    const t0 = now();
    job.run().then((buf) => {
      log(`${job.name}: ${buf ? `decoded in ${now() - t0} ms` : 'could not be decoded'}`);
      job.done(buf);
    }).finally(() => { decoding = false; nextDecode(); });
  }
  function decode(name, b, urgent) {
    return new Promise((done) => {
      const job = { name, run: () => new Promise((ok, no) => ctx.decodeAudioData(b.slice(0), ok, no)).catch((e) => { log(`${name}: decode failed (${e?.message ?? e})`); return null; }), done };
      if (urgent) waiting.unshift(job); else waiting.push(job);
      nextDecode();
    });
  }

  const api = {
    kind: 'web',
    /** On the first tap (browsers start sound only then). */
    init() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return false;
      try { ctx = new AC({ sampleRate: RATE, latencyHint: 'interactive' }); } catch { ctx = new AC(); }
      log(`web audio started: ${ctx.sampleRate} Hz, ${ctx.state}, output latency ${Math.round(((Number(ctx.outputLatency) || 0) + (Number(ctx.baseLatency) || 0)) * 1000)} ms`);
      watchDrift();
      const master = ctx.createGain();
      musicBus = ctx.createGain();
      duckBus = ctx.createGain();
      fxBus = ctx.createGain();
      duckBus.connect(musicBus).connect(master);
      fxBus.connect(master);
      master.connect(ctx.destination);
      musicBus.gain.value = levels.music;
      fxBus.gain.value = levels.effects;
      // Safari suspends the sound now and then (a call, another app's sound): resumed at the next
      // chance, the voices pick up in step with the race.
      ctx.onstatechange = () => { log(`web audio ${ctx.state}`); if (ctx.state === 'running') resync(); };
      ctx.resume?.().catch(() => {});
      for (const name of [...bytes.keys()]) api.load(name); // (fetched before the tap: decoded now)
      return true;
    },
    ready: () => Boolean(ctx),
    running: () => ctx?.state === 'running',
    /** Keeps the sound running: resumed whenever it isn't (called on taps and when the page shows again). */
    wake() { if (ctx && ctx.state !== 'running' && ctx.state !== 'closed' && !heldBack) ctx.resume().catch(() => {}); },
    load(name, { urgent = false } = {}) {
      // (The file is fetched at once, even before the first tap; it is decoded once the sound has started.)
      if (!bytes.has(name)) {
        const t0 = now();
        bytes.set(name, fetch(urlOf(name))
          .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
          .then((b) => { got.add(name); log(`${name}: fetched in ${now() - t0} ms (${Math.round(b.byteLength / 1000)} KB)`); return b; })
          .catch((e) => { bytes.delete(name); log(`${name}: fetch failed (${e?.message ?? e})`); return null; }));
      }
      if (!ctx) return bytes.get(name).then((b) => Boolean(b));
      const had = buffers.get(name);
      if (had) {
        // (Waiting to be decoded and wanted now: to the front of the line.)
        const k = urgent ? waiting.findIndex((j) => j.name === name) : -1;
        if (k > 0) waiting.unshift(...waiting.splice(k, 1));
        return Promise.resolve(had).then(Boolean);
      }
      const p = bytes.get(name)
        .then((b) => (b ? decode(name, b, urgent) : null))
        .then((buf) => {
          if (!buf) { buffers.delete(name); return null; }
          buffers.set(name, buf);
          for (const v of voices) if (v.name === name && !v.src) startSource(v); // (arrived late: in step)
          return buf;
        })
        .catch(() => { buffers.delete(name); return null; });
      buffers.set(name, p);
      return p.then(Boolean);
    },
    loaded: (name) => { const b = buffers.get(name); return Boolean(b && typeof b.then !== 'function'); },
    /** In memory: decoded, or (before the first tap) fetched and ready to decode. */
    fetched: (name) => got.has(name) || api.loaded(name),
    unload(name) { if (![...voices].some((v) => v.name === name)) { buffers.delete(name); bytes.delete(name); got.delete(name); } },
    duration: (name) => { const b = buffers.get(name); return b && typeof b.then !== 'function' ? b.duration : null; },
    /**
     * A voice: `name` from `offset` s at the wall-clock moment `atWall` (on the music or effects bus).
     * → { stop(fadeS), fadeTo(level, s) }.
     */
    start(name, { atWall = now(), offset = 0, bus = 'fx', gain = 1, loop = false, loopLength = null, fadeIn = 0, until = null } = {}) {
      if (!ctx) return null;
      const g = ctx.createGain();
      g.connect(bus === 'music' ? duckBus : fxBus);
      const v = { name, atWall, offset, loop, loopLength, until, gain: g, src: null };
      if (fadeIn > 0) {
        g.gain.setValueAtTime(0, ctxAt(atWall));
        g.gain.linearRampToValueAtTime(gain, ctxAt(atWall) + fadeIn);
      } else g.gain.value = gain;
      voices.add(v);
      startSource(v);
      const fadeTo = (to, s, fromWall = now()) => {
        const t = ctxAt(fromWall);
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(to, t + s);
      };
      return {
        name,
        fadeTo,
        /** Stops with a fade (from `atWall`, default now). */
        stop(fadeS = 0.4, atWall2 = now()) {
          fadeTo(0, fadeS, atWall2);
          const end = atWall2 + fadeS * 1000;
          v.until = v.until ? Math.min(v.until, end) : end;
          try { v.src?.stop(ctxAt(end) + 0.05); } catch { /* (fine) */ }
          setTimeout(() => { voices.delete(v); try { g.disconnect(); } catch { /* (fine) */ } }, Math.max(0, end - now()) + 200);
        },
        playing: () => Boolean(v.src),
      };
    },
    /** The music dips under a race sound for `seconds`. */
    duck(level, seconds) {
      if (!ctx) return;
      const t = ctx.currentTime;
      duckBus.gain.cancelScheduledValues(t);
      duckBus.gain.setTargetAtTime(level, t, 0.06);
      duckBus.gain.setTargetAtTime(1, t + seconds, 0.4);
    },
    setLevels(next) {
      levels = next;
      if (!ctx) return;
      const t = ctx.currentTime;
      musicBus.gain.setTargetAtTime(next.music, t, 0.08);
      fxBus.gain.setTargetAtTime(next.effects, t, 0.05);
    },
    /** The app or tab went to the background (true) or came back (false). */
    background(hidden) {
      heldBack = hidden;
      if (!ctx) return;
      if (hidden) ctx.suspend?.().catch(() => {});
      else ctx.resume?.().catch(() => {}); // (onstatechange restarts the voices in step)
    },
  };
  return api;
}
