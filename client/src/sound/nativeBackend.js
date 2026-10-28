/**
 * The sound in the iPhone/iPad and Android apps (Moses, 28 Oct 2026): through the native audio plugin
 * (@capacitor-community/native-audio: AVAudioPlayer on iOS, MediaPlayer on Android), like a normal game:
 *   - every sound preloaded from the app's own files (public/audio/<name>.m4a inside the app), no tap
 *     needed before anything plays;
 *   - iPhone: the "ambient" audio session (configure({ focus: false })), so the silent switch mutes the
 *     game and the player's own music keeps playing under it, as before;
 *   - each voice starts at its wall-clock moment (the race clock as shown); one that is late (the app
 *     was in the background, a file loaded late) starts part-way in, where the race is: in step;
 *   - fades are volume steps (the plugin has no ramps); paused in the background, picked up in step.
 * Only used when the app has the plugin (an older app build falls back to the website's Web Audio).
 */

const STEP_MS = 50;

export function createNativeBackend({ plugin, now = () => Date.now(), durations = {} } = {}) {
  const loads = new Map(); // name → Promise<bool>
  const lengths = new Map(); // name → seconds
  const voices = new Set();
  let levels = { music: 0, effects: 0 };
  let heldBack = false;
  let configured = null;

  const configure = () => {
    configured ??= Promise.resolve(plugin.configure?.({ focus: false, fade: false })).catch(() => {});
    return configured;
  };
  const volumeOf = (v) => Math.max(0, Math.min(1, (v.bus === 'music' ? levels.music : levels.effects) * v.gain * v.fade));
  const setVolume = (v) => plugin.setVolume({ assetId: v.name, volume: volumeOf(v) }).catch(() => {});

  function begin(v) {
    clearTimeout(v.timer);
    if (heldBack || !loads.has(v.name)) return;
    const wait = v.atWall - now();
    if (wait > 15) { v.timer = setTimeout(() => begin(v), wait); return; }
    const lateS = Math.max(0, -wait / 1000);
    const len = lengths.get(v.name) ?? durations[v.name] ?? Infinity;
    const time = v.offset + lateS;
    if (v.until && now() >= v.until) { voices.delete(v); return; }
    if (!v.loop && time >= len - 0.05) { voices.delete(v); return; }
    loads.get(v.name).then((ok) => {
      if (!ok || !voices.has(v) || heldBack) return;
      // (Recomputed: the file may have taken a moment.)
      const t = v.offset + Math.max(0, (now() - v.atWall) / 1000);
      setVolume(v);
      // A loop: played from where the race is, then looping in the player itself (from memory: no gap).
      // (The plugin's loop() keeps the position on iOS and only switches looping on on Android.)
      const len2 = lengths.get(v.name) ?? durations[v.name];
      const at = v.loop && len2 ? t % len2 : t;
      v.on = true;
      Promise.resolve(plugin.play({ assetId: v.name, time: at }))
        .then(() => (v.loop && voices.has(v) ? plugin.loop({ assetId: v.name }) : null))
        .catch(() => { v.on = false; });
      if (v.fadeIn > 0 && v.fade === 0) ramp(v, 1, v.fadeIn);
    });
  }
  function ramp(v, to, seconds, done) {
    clearInterval(v.ramp);
    const from = v.fade;
    const steps = Math.max(1, Math.round((seconds * 1000) / STEP_MS));
    let k = 0;
    v.ramp = setInterval(() => {
      k += 1;
      v.fade = from + ((to - from) * k) / steps;
      setVolume(v);
      if (k >= steps) { clearInterval(v.ramp); done?.(); }
    }, STEP_MS);
  }

  plugin.addListener?.('complete', ({ assetId }) => { for (const v of voices) if (v.name === assetId && !v.loop) { v.on = false; voices.delete(v); } });

  return {
    kind: 'native',
    init() { configure(); return true; },
    ready: () => true,
    running: () => !heldBack,
    wake() {},
    load(name) {
      if (loads.has(name)) return loads.get(name);
      const p = configure()
        .then(() => plugin.preload({ assetId: name, assetPath: `public/audio/${name}.m4a`, audioChannelNum: 1, isUrl: false, volume: 1 }))
        .then(() => plugin.getDuration?.({ assetId: name }).then((d) => { if (d?.duration > 0) lengths.set(name, d.duration); }).catch(() => {}))
        .then(() => {
          for (const v of voices) if (v.name === name && !v.on) begin(v); // (arrived late: in step)
          return true;
        })
        .catch(() => { loads.delete(name); return false; });
      loads.set(name, p);
      p.then((ok) => { if (ok) p.done = true; });
      return p;
    },
    loaded: (name) => Boolean(loads.get(name)?.done),
    fetched: (name) => Boolean(loads.get(name)?.done),
    unload(name) {
      if ([...voices].some((v) => v.name === name)) return;
      loads.delete(name);
      plugin.unload?.({ assetId: name }).catch(() => {});
    },
    duration: (name) => lengths.get(name) ?? durations[name] ?? null,
    start(name, { atWall = now(), offset = 0, bus = 'fx', gain = 1, loop = false, fadeIn = 0, until = null } = {}) {
      // (One voice per file: a new one replaces it, e.g. the same tune again.)
      for (const old of voices) if (old.name === name) { clearTimeout(old.timer); clearInterval(old.ramp); voices.delete(old); }
      const v = { name, atWall, offset, bus, gain, loop, until, fadeIn, fade: fadeIn > 0 ? 0 : 1, on: false };
      voices.add(v);
      if (!loads.has(name)) this.load(name);
      begin(v);
      if (until) setTimeout(() => { if (voices.has(v)) { plugin.stop({ assetId: name }).catch(() => {}); voices.delete(v); } }, Math.max(0, until - now()));
      return {
        name,
        fadeTo: (to, s) => ramp(v, to, s),
        stop(fadeS = 0.4, fromWall = now()) {
          clearTimeout(v.timer);
          const go = () => ramp(v, 0, fadeS, () => { if (voices.has(v)) { voices.delete(v); plugin.stop({ assetId: name }).catch(() => {}); } });
          const wait = fromWall - now();
          if (!v.on && wait <= 0) { voices.delete(v); plugin.stop({ assetId: name }).catch(() => {}); return; }
          if (wait > 0) setTimeout(go, wait); else go();
        },
        playing: () => v.on,
      };
    },
    duck() {}, // (no ducking in the apps: the race sounds are short and sit over the music anyway)
    setLevels(next) { levels = next; for (const v of voices) if (v.on) setVolume(v); },
    background(hidden) {
      heldBack = hidden;
      if (hidden) {
        for (const v of voices) { clearTimeout(v.timer); if (v.on) { v.on = false; plugin.pause({ assetId: v.name }).catch(() => {}); } }
      } else {
        for (const v of voices) begin(v); // (in step with the race, which went on meanwhile)
      }
    },
  };
}
