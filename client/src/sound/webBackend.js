/**
 * The sound on the website (Moses, 28 Oct 2026): Web Audio only, never <audio> elements. Every sound is
 * fetched and decoded into memory ahead of time, and every voice is scheduled on the sound clock at a
 * wall-clock moment (the race clock as shown), so it plays in step:
 *   - a voice whose moment is past (the sound arrived late, the page opened late) starts at once,
 *     part-way in, where it would be by now: never late from its start;
 *   - Safari starts the sound only on a tap (unlock()), and may suspend it (another app's sound, the
 *     tab hidden): it is resumed at the next chance, and the voices restart where the race is by then;
 *   - decoded at 32 kHz where the browser lets us choose (half the memory of 48 kHz, nothing audible
 *     lost from these files), so a phone keeps the tunes in memory comfortably.
 */

const RATE = 32000;

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
  const ctxAt = (wall) => ctx.currentTime + Math.max(0, (wall - now()) / 1000);

  /** (Re)starts a voice's source where it should be by now. */
  function startSource(v) {
    const buf = buffers.get(v.name);
    if (!buf || typeof buf.then === 'function' || !ctx || ctx.state !== 'running' || heldBack) return;
    try { v.src?.stop(); } catch { /* (done) */ }
    v.src = null;
    const lateS = Math.max(0, (now() - v.atWall) / 1000);
    let offset = v.offset + lateS;
    if (!v.loop && offset >= buf.duration - 0.02) { voices.delete(v); return; } // (over by now)
    if (v.until && now() >= v.until) { voices.delete(v); return; }
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
    const at = lateS > 0 ? ctx.currentTime : ctxAt(v.atWall);
    src.start(at, offset);
    src.onended = () => { if (v.src === src && !v.loop) voices.delete(v); };
    v.src = src;
    v.startedAt = { ctx: at, wall: lateS > 0 ? now() : v.atWall, offset };
    if (v.until) { try { src.stop(ctxAt(v.until)); } catch { /* (fine) */ } }
  }

  function resync() { for (const v of voices) startSource(v); }

  const api = {
    kind: 'web',
    /** On the first tap (browsers start sound only then). */
    init() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return true; }
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return false;
      try { ctx = new AC({ sampleRate: RATE, latencyHint: 'interactive' }); } catch { ctx = new AC(); }
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
      ctx.onstatechange = () => { if (ctx.state === 'running') resync(); };
      ctx.resume?.().catch(() => {});
      for (const name of [...bytes.keys()]) api.load(name); // (fetched before the tap: decoded now)
      return true;
    },
    ready: () => Boolean(ctx),
    running: () => ctx?.state === 'running',
    /** Keeps the sound running: resumed whenever it isn't (called on taps and when the page shows again). */
    wake() { if (ctx && ctx.state !== 'running' && ctx.state !== 'closed' && !heldBack) ctx.resume().catch(() => {}); },
    load(name) {
      // (The file is fetched at once, even before the first tap; it is decoded once the sound has started.)
      if (!bytes.has(name)) {
        bytes.set(name, fetch(urlOf(name))
          .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
          .then((b) => { got.add(name); return b; })
          .catch(() => { bytes.delete(name); return null; }));
      }
      if (!ctx) return bytes.get(name).then((b) => Boolean(b));
      const had = buffers.get(name);
      if (had) return Promise.resolve(had).then(Boolean);
      const p = bytes.get(name)
        .then((b) => (b ? new Promise((ok, no) => ctx.decodeAudioData(b.slice(0), ok, no)) : null))
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
