// What goes into each kind of video: a list of shots (what the picture shows, second by second), the
// texts over them and the sounds under them. record.mjs draws and mixes what these return.
//
// Shot: { type, dur (video seconds), … }
//   race  { from, speed }        the game's own cameras (follow, TV moments, finish shot) from race ms `from`
//   pan   { from, speed, eye, follow }   a trackside camera standing at eye.from, turning with a marble
//   look  { from, speed, eye }   a fixed camera
//   fly   { }                    the long flyover (its whole length over `dur`)
//   logo  { version } / end { }  the logo sting (logo.html) / the end card
// Text: { at, dur, top, sub, big } (video seconds). Podium: { at, dur }. Sound: see record.mjs mix().
import { TEXTS, fill } from './assets.mjs';

/** When the leader first reaches share p of the track (race ms). */
export function leaderAt(race, p) {
  const f = race.frames.find((fr) => Math.max(...fr.p) >= p);
  return f ? (f.t ?? race.frames.indexOf(f) * race.tickMs) : race.durationMs;
}
const tOf = (race, i) => race.frames[i].t ?? i * race.tickMs;

/**
 * The race's overtaking moments: 3-second windows ranked by how much the top five reshuffled, at
 * least 5 s apart, away from the first 8 s, the last 6 s before the win and the `avoid` windows.
 * → [{ t (the window's middle, race ms), swaps, p (the leader's share of the track then) }]
 */
export function overtakes(race, winMs, avoid = [], n = 3) {
  const out = [];
  const W = 3000;
  for (let i = 0; i < race.frames.length; i += 4) {
    const t = tOf(race, i);
    if (t < 8000 || t > winMs - 6000 - W) continue;
    let swaps = 0;
    let prev = race.frames[i].s?.slice(0, 5).join();
    for (let j = i + 1; j < race.frames.length && tOf(race, j) < t + W; j += 1) {
      const k = race.frames[j].s?.slice(0, 5).join();
      if (k !== prev) swaps += 1;
      prev = k;
    }
    out.push({ t: t + W / 2, swaps, p: Math.max(...race.frames[i].p) });
  }
  out.sort((a, b) => b.swaps - a.swaps);
  const picked = [];
  for (const o of out) {
    if (picked.length >= n) break;
    if (picked.some((q) => Math.abs(q.t - o.t) < 5000)) continue;
    if (avoid.some(([a, b]) => o.t > a - 1500 && o.t < b + 1500)) continue;
    picked.push(o);
  }
  return picked;
}

/** The race's moments a video is cut from. */
export function moments(info, race) {
  const W = info.winnerMs;
  const close = info.margin < 400;
  // The TV cameras: when the leader reaches each (the game cuts to it from about 50 m before).
  const tv = info.tv.map((c) => ({ ...c, t: leaderAt(race, c.p) }));
  const tvWindows = tv.map((c) => [c.t - 3500, c.t + 2000]);
  return { W, close, tv, moves: overtakes(race, W, tvWindows, 3) };
}

/** The photo-finish camera: 9 m past the line, 3 m up, looking back up the track through the finish arch (checked on all six tracks). */
export const FINISH_EYE = { p: 1, back: -9, beside: 0, up: 3, ahead: -12, lookUp: 0, fov: 34 };

/** The big production (horizontal, about 2 minutes). */
export function production(info, race, { logo = 'A', fly = 15 } = {}) {
  const m = moments(info, race);
  const G = info.countdownMs;
  const shots = [];
  const texts = [];
  let v = 0; // video seconds so far
  const add = (s) => { const at = v; shots.push({ ...s, at }); v += s.dur; return at; };
  const say = (at, key, values = {}, o = {}) => texts.push({ at, dur: 2.6, top: fill(TEXTS[key] ?? key, values), ...o });
  const podium = info.podium;
  const name = { track: info.name, marble: podium[0].name };

  // 1. The teaser: the race's best moment (the game's camera at the last TV camera), a little slowed.
  const tease = m.tv[m.tv.length - 1] ?? { t: m.W * 0.7 };
  add({ type: 'race', from: tease.t - 2200, speed: 0.75, dur: 2.6 });
  // 2. The logo.
  const logoAt = add({ type: 'logo', version: logo, dur: 2 });
  // 3. The flyover: the wide overview, then slowly to the highlights.
  const flyAt = add({ type: 'fly', dur: fly });
  say(flyAt + 0.8, 'trackCard', name, { big: true, sub: 'Marble Spins' });
  say(flyAt + fly * 0.55, 'opening');
  // 4. The countdown, with the beeps (the fourth on GO).
  const cdAt = add({ type: 'race', from: -G, dur: G / 1000 });
  say(cdAt + 1.2, 'countdown');
  const goAt = v;
  // 5. The race: the game's cameras and the track's TV cameras, start to finish.
  const raceEnd = m.W + 7000;
  add({ type: 'race', from: 0, dur: raceEnd / 1000 });
  say(goAt + leaderAt(race, 0.5) / 1000, 'midRace', {}, { top: TEXTS.midRace[1] });
  say(goAt + (m.W - 7500) / 1000, 'lastStretch');
  say(goAt + (m.W + 250) / 1000, m.close ? 'photoFinish' : 'winner', name, { big: m.close });
  if (m.close) say(goAt + (m.W + 2900) / 1000, 'winner', name);
  // 6. The replays: the finish in slow motion head-on through the finish arch (when it was close), then
  // the best overtaking moment and the first TV camera's moment again, at half speed, through the game's cameras.
  if (m.close) {
    const at = add({ type: 'look', from: m.W - 1300, speed: 0.25, dur: 6.4, eye: FINISH_EYE });
    say(at + 0.3, 'replay', {}, { sub: TEXTS.slowMotion, dur: 2.4 });
  }
  const best = m.moves[0];
  if (best) {
    const at = add({ type: 'race', from: best.t - 2500, speed: 0.5, dur: 6 });
    say(at + 0.3, 'replay', {}, { sub: TEXTS.slowMotion, dur: 2.4 });
  }
  const tvBest = m.tv[0];
  if (tvBest) {
    const at = add({ type: 'race', from: tvBest.t - 3000, speed: 0.5, dur: 6 });
    say(at + 0.3, 'replay', {}, { sub: TEXTS.slowMotion, dur: 2.4 });
  }
  // 7. The podium, over the finish.
  const podAt = add({ type: 'race', from: m.W + 7000, dur: 11 });
  const pod = { at: podAt + 0.6, dur: 10.4 };
  // 8. The end card.
  const endAt = add({ type: 'end', dur: 5 });
  return {
    shots, texts, podium: pod, length: v,
    marks: { logoAt, flyAt, goAt, podAt, endAt, teaseEnd: logoAt },
    sound: { goAt, beeps: true, music: [[flyAt, podAt + 0.4]], teaserMusic: [0, logoAt], ceremony: [podAt, endAt + 5] },
  };
}

/** The vertical cut-down (30–60 s): the start, the TV moments, a pan, the finish, the podium, the end card. */
export function cutdown(info, race) {
  const m = moments(info, race);
  const shots = [];
  const texts = [];
  let v = 0;
  const add = (s) => { const at = v; shots.push({ ...s, at }); v += s.dur; return at; };
  const say = (at, key, values = {}, o = {}) => texts.push({ at, dur: 2.5, top: fill(TEXTS[key] ?? key, values), ...o });
  const name = { track: info.name, marble: info.podium[0].name };
  const cdAt = add({ type: 'race', from: -3400, dur: 3.4 });
  say(cdAt + 0.2, 'opening');
  const goAt = v;
  add({ type: 'race', from: 0, dur: 5 });
  say(goAt + 0.5, 'trackCard', name, { sub: 'Marble Spins', dur: 2.6 });
  const bits = [];
  for (const c of m.tv) bits.push({ t: c.t - 3200, type: 'race', dur: 5 });
  if (m.moves[0]) bits.push({ t: m.moves[0].t - 2000, type: 'race', dur: 4 });
  bits.sort((a, b) => a.t - b.t);
  for (const b of bits) {
    if (b.t < 5500 || b.t + b.dur * 1000 > m.W - 8500) continue;
    const at = add({ ...b, from: b.t });
    if (b === bits[1]) say(at + 0.6, 'midRace', {}, { top: TEXTS.midRace[1] });
  }
  const finAt = add({ type: 'race', from: m.W - 8000, dur: 10.5 });
  say(finAt + 0.8, 'lastStretch');
  say(finAt + 8.25, m.close ? 'photoFinish' : 'winner', name, { big: m.close });
  if (m.close) {
    const at = add({ type: 'look', from: m.W - 1000, speed: 0.25, dur: 5, eye: { ...FINISH_EYE, fov: 40 } });
    say(at + 0.2, 'slowMotion', {}, { dur: 2 });
    say(at + 2.6, 'winner', name, { dur: 2.4 });
  }
  const podAt = add({ type: 'race', from: m.W + 4000, dur: 5.5 });
  const endAt = add({ type: 'end', dur: 4 });
  return {
    shots, texts, podium: { at: podAt + 0.3, dur: 5.2 }, length: v,
    marks: { goAt, podAt, endAt },
    sound: { goAt, beeps: true, music: [[0, podAt + 0.4]], ceremony: [podAt, endAt + 4] },
  };
}
