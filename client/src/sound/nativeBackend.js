/**
 * The sound in the iPhone/iPad and Android apps (Moses, 28 Oct 2026): through the native audio plugin
 * (@capacitor-community/native-audio: AVAudioPlayer on iOS, MediaPlayer on Android), like a normal game:
 *   - every sound preloaded from the app's own files (public/audio/<name>.m4a inside the app), no tap
 *     needed before anything plays;
 *   - iPhone: the "ambient" audio session (configure({ focus: false })), so the silent switch mutes the
 *     game and the player's own music keeps playing under it, as before;
 *   - each voice starts at its wall-clock moment (the race clock as shown); one that is late (the app
 *     was in the background, a file loaded late) starts part-way in, where the race is: in step;
 *   - fades are volume steps (the plugin has no ramps), the music's dip too (duck(), as on the website, 4 Nov
 *     2026); paused in the background, picked up in step.
 * Only used when the app has the plugin (an older app build falls back to the website's Web Audio).
 *   - The player's start-up time (Android's MediaPlayer: a seek, then the start) is measured on each
 *     play and kept (`lead`), so a sound is started that much early and heard on time.
 *   - A sound whose moment has passed by the time it can play is played in step, part-way in, or not at
 *     all when it's over or its time (`until`, the beeps: GO + 0.9 s) has passed: never late from its start.
 * Every step is logged as "[sound] …" (Logcat: Capacitor/Console).
 *
 * Moses's Android test of 7 Nov 2026 (build 1.0.0 (2): the beeps 30 s into the race, no hit sounds):
 *   - the files load a few at a time (LOADS_AT_ONCE), the race's start and its hit sounds first (urgent):
 *     Android prepares each file in a MediaPlayer, and twenty at once on a phone still building its 3D world
 *     could take longer than LOAD_TIMEOUT_MS;
 *   - a file that takes longer than that is no longer lost for the visit: it still counts once it arrives
 *     (the hit sounds then work from that moment; a sound whose time has passed is not played);
 *   - a play the player hasn't started yet when its voice is stopped (or its `until` passes) is stopped once
 *     it starts: Android's player ignores a stop while it is still seeking to the start position.
 *
 * Moses's Android test of 12 Nov 2026 (build 1.0.0 (4), Galaxy A12: no collision clicks or bumps; the ceremony
 * song playing on through the next race):
 *   - a one-shot effect started for "now" (the click, the bump, the whoosh: `asap`) plays from its start, never
 *     part-way in: the click is 0.12 s long and the player takes 0.2-0.4 s to start, so worked out "in step" it
 *     was always over before it could sound and was never played. It's dropped only when it couldn't start
 *     within LATE_FX_MS of its moment;
 *   - a stop is made sure of (hardStop): the volume goes to 0 at once, then stop(), then the player is asked
 *     (isPlaying) a few times and stopped again while nothing should be playing that file: Android's player
 *     ignores a stop while it is still seeking, and play() and loop() run on another thread than stop().
 */

const STEP_MS = 50;
const LATE_FX_MS = 250; // (a one-shot effect started later than this after its moment is dropped)
const RECHECK_MS = [150, 400, 900, 2000, 4000]; // (after a stop: still playing? stopped again)
const LOAD_TIMEOUT_MS = 8000; // (a file the player hasn't loaded by then counts as failed)
const MAX_LEAD_MS = 400;
const LOADS_AT_ONCE = 2;
const log = (...a) => { try { console.info('[sound]', ...a); } catch { /* (no console) */ } };

export function createNativeBackend({ plugin, now = () => Date.now(), durations = {} } = {}) {
  const loads = new Map(); // name → Promise<bool>
  const lengths = new Map(); // name → seconds
  const voices = new Set();
  let levels = { music: 0, effects: 0 };
  let heldBack = false;
  let configured = null;
  let lead = 0; // ms: how long the player takes from play() to sound (measured on each play, see measure())
  const failed = new Set(); // names the player couldn't load (the readiness report)
  // The load queue: at most LOADS_AT_ONCE preloads at a time, the urgent ones (the race's start, its hits) first.
  const queue = [];
  let loading = 0;
  const pump = () => {
    while (loading < LOADS_AT_ONCE && queue.length) {
      const k = queue.findIndex((q) => q.urgent);
      const job = queue.splice(k >= 0 ? k : 0, 1)[0];
      loading += 1;
      job.run().finally(() => { loading -= 1; pump(); });
    }
  };
  const enqueue = (run, urgent) => new Promise((ok, no) => { queue.push({ urgent, run: () => run().then(ok, no) }); pump(); });

  const configure = () => {
    configured ??= Promise.resolve(plugin.configure?.({ focus: false, fade: false })).catch(() => {});
    return configured;
  };
  let dip = 1; // the music's dip under a sound that dips it (the speed pad), as on the website (4 Nov 2026)
  let dipTimer = null;
  let dipRamp = null;
  const volumeOf = (v) => Math.max(0, Math.min(1, (v.bus === 'music' ? levels.music * dip : levels.effects) * v.gain * v.fade));
  const setVolume = (v) => plugin.setVolume({ assetId: v.name, volume: volumeOf(v) }).catch(() => {});
  const live = (name) => [...voices].some((v) => v.name === name);
  /**
   * Stops a file for sure: volume 0 at once (silent even if the player starts after all), stop(), and while no
   * voice wants that file any more, asked again a few times (isPlaying) and stopped again if it plays.
   */
  function hardStop(name) {
    Promise.resolve(plugin.setVolume({ assetId: name, volume: 0 })).catch(() => {});
    Promise.resolve(plugin.stop({ assetId: name })).catch(() => {});
    if (!plugin.isPlaying) return;
    for (const ms of RECHECK_MS) {
      setTimeout(() => {
        if (live(name)) return; // (started again meanwhile: that voice is in charge)
        Promise.resolve(plugin.isPlaying({ assetId: name })).then((r) => {
          if (!r?.isPlaying || live(name)) return;
          log(`${name}: still playing after its stop: stopped again`);
          plugin.setVolume({ assetId: name, volume: 0 }).catch(() => {});
          plugin.stop({ assetId: name }).catch(() => {});
        }).catch(() => {});
      }, ms);
    }
  }

  /** Where a voice should be heard from if played now (s into the file), or null if it's over. */
  function position(v) {
    if (v.asap) return now() - v.atWall > LATE_FX_MS ? null : 0; // (a one-shot: from its start, or not at all)
    const heardAt = now() + lead; // (the player sounds `lead` ms after play())
    if (v.until && heardAt >= v.until) return null;
    const t = v.offset + Math.max(0, (heardAt - v.atWall) / 1000);
    const len = lengths.get(v.name) ?? durations[v.name];
    if (!v.loop) return len && t >= len - 0.05 ? null : t;
    return len ? t % len : t;
  }
  function begin(v) {
    clearTimeout(v.timer);
    if (heldBack || !loads.has(v.name)) return;
    const wait = v.asap ? 0 : v.atWall - lead - now();
    if (wait > 15) { v.timer = setTimeout(() => begin(v), wait); return; }
    const p = loads.get(v.name);
    p.then((ok) => {
      if (!(ok || p.done) || !voices.has(v) || heldBack || v.on) return; // (p.done: arrived after its timeout)
      // (Worked out again now: the file or the app may have taken a moment.)
      const at = position(v);
      if (at === null) { voices.delete(v); log(`${v.name}: its time has passed, not played (${Math.round(now() - v.atWall)} ms late)`); return; }
      const late = now() + lead - v.atWall;
      if (late > 40 && !v.asap) log(`${v.name}: starts ${Math.round(late)} ms late, ${at.toFixed(2)} s in (in step)`);
      setVolume(v);
      // A loop: played from where the race is, then looping in the player itself (from memory: no gap).
      // (The plugin's loop() keeps the position on iOS and only switches looping on on Android.)
      v.on = true;
      const calledAt = now();
      Promise.resolve(plugin.play({ assetId: v.name, time: at }))
        .then(() => {
          // (Stopped, or past its `until`, while the player was still getting ready: stopped now that it plays.)
          if (!voices.has(v) || (v.until && now() >= v.until)) {
            if (!live(v.name)) hardStop(v.name); // (Android: again once its seek is done: hardStop's rechecks)
            v.on = false;
            voices.delete(v);
            return;
          }
          if (v.loop && voices.has(v)) plugin.loop({ assetId: v.name }); // (not awaited: Android never answers it)
          measure(v, at, calledAt);
        })
        .catch((e) => { v.on = false; log(`${v.name}: play failed (${e?.message ?? e})`); });
      if (v.fadeIn > 0 && v.fade === 0) ramp(v, 1, v.fadeIn);
    });
  }
  /**
   * How late the player really started: 0.5 s after play(), its position against where it should be by
   * then. Kept (smoothed) as `lead`, so the next sound is started that much early.
   */
  function measure(v, at, calledAt) {
    if (!plugin.getCurrentTime) return;
    setTimeout(() => {
      if (!voices.has(v) || !v.on) return;
      Promise.resolve(plugin.getCurrentTime({ assetId: v.name })).then((r) => {
        const pos = Number(r?.currentTime);
        if (!Number.isFinite(pos) || pos <= 0) return;
        const shouldBe = at + (now() - calledAt) / 1000; // (had it sounded the moment play() was called)
        const startup = Math.round((shouldBe - pos) * 1000);
        if (startup < -50 || startup > 2000) return; // (a loop wrapped, or nonsense)
        lead = Math.max(0, Math.min(MAX_LEAD_MS, Math.round(0.6 * lead + 0.4 * startup)));
        log(`${v.name}: the player took ${startup} ms to start; starting sounds ${lead} ms early from now`);
      }).catch(() => {});
    }, 500);
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
    load(name, { urgent = false } = {}) {
      if (loads.has(name)) return loads.get(name);
      const t0 = now();
      const work = configure()
        .then(() => enqueue(() => Promise.resolve(plugin.preload({ assetId: name, assetPath: `public/audio/${name}.m4a`, audioChannelNum: 1, isUrl: false, volume: 1 })), urgent || /^(start-|marble-)/.test(name)))
        .then(() => Promise.race([
          Promise.resolve(plugin.getDuration?.({ assetId: name })).then((d) => { if (d?.duration > 0) lengths.set(name, d.duration); }).catch(() => {}),
          new Promise((ok) => setTimeout(ok, 1000)), // (the length is only a check: never waited for long)
        ]))
        .then(() => { log(`${name}: loaded in ${now() - t0} ms`); return true; })
        .catch((e) => {
          // (Already loaded by an earlier start of the page: fine.)
          if (/already exists/i.test(e?.message ?? '')) { log(`${name}: already loaded`); return true; }
          log(`${name}: load failed (${e?.message ?? e})`);
          return false;
        });
      const arrived = () => {
        p.done = true;
        failed.delete(name);
        for (const v of voices) if (v.name === name && !v.on) begin(v); // (arrived late: in step, or not at all if its time has passed)
      };
      const p = Promise.race([work, new Promise((ok) => setTimeout(() => ok('timeout'), LOAD_TIMEOUT_MS))]).then((r) => {
        if (r === 'timeout') {
          log(`${name}: not loaded after ${LOAD_TIMEOUT_MS / 1000} s (still loading: it counts once it arrives)`);
          failed.add(name);
          work.then((ok) => { if (ok && loads.get(name) === p) { log(`${name}: arrived after ${now() - t0} ms`); arrived(); } });
          return false;
        }
        if (!r) { failed.add(name); loads.delete(name); return false; }
        arrived();
        return true;
      });
      loads.set(name, p);
      return p;
    },
    loaded: (name) => Boolean(loads.get(name)?.done),
    failed: () => [...failed],
    fetched: (name) => Boolean(loads.get(name)?.done),
    unload(name) {
      if ([...voices].some((v) => v.name === name)) return;
      loads.delete(name);
      plugin.unload?.({ assetId: name }).catch(() => {});
    },
    duration: (name) => lengths.get(name) ?? durations[name] ?? null,
    start(name, { atWall = now(), offset = 0, bus = 'fx', gain = 1, loop = false, fadeIn = 0, until = null, asap = false } = {}) {
      // (One voice per file: a new one replaces it, e.g. the same tune again.)
      for (const old of voices) if (old.name === name) { clearTimeout(old.timer); clearInterval(old.ramp); voices.delete(old); }
      const v = { name, atWall, offset, bus, gain, loop, until, fadeIn, fade: fadeIn > 0 ? 0 : 1, on: false, asap: asap && !loop };
      voices.add(v);
      if (!loads.has(name)) this.load(name);
      begin(v);
      if (until) setTimeout(() => { if (voices.has(v)) { voices.delete(v); if (!live(name)) hardStop(name); } }, Math.max(0, until - now()));
      return {
        name,
        fadeTo: (to, s) => ramp(v, to, s),
        stop(fadeS = 0.4, fromWall = now()) {
          clearTimeout(v.timer);
          const go = () => ramp(v, 0, fadeS, () => { if (voices.has(v)) { voices.delete(v); if (!live(name)) hardStop(name); } });
          const wait = fromWall - now();
          if (!v.on && wait <= 0) { voices.delete(v); if (!live(name)) hardStop(name); return; }
          if (wait > 0) setTimeout(go, wait); else go();
        },
        playing: () => v.on,
      };
    },
    /** The music dips to `level` for `seconds`, then comes back over 0.4 s (volume steps: the plugin has no ramps). */
    duck(level, seconds) {
      clearTimeout(dipTimer);
      clearInterval(dipRamp);
      const music = () => { for (const v of voices) if (v.on && v.bus === 'music') setVolume(v); };
      dip = level;
      music();
      dipTimer = setTimeout(() => {
        const from = dip;
        const steps = Math.round(400 / STEP_MS);
        let k = 0;
        dipRamp = setInterval(() => { k += 1; dip = from + ((1 - from) * k) / steps; music(); if (k >= steps) clearInterval(dipRamp); }, STEP_MS);
      }, seconds * 1000);
    },
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
