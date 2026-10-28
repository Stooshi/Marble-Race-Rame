// What goes into each kind of video: a list of shots (what the picture shows, second by second), the
// texts over them and the sounds under them. record.mjs draws and mixes what these return.
//
// Shot: { type, dur (video seconds), … }
//   race  { from, speed }        the game's own cameras (follow, TV moments, finish shot) from race ms `from`
//   pan   { from, speed, eye, follow }   a trackside camera standing at eye.from, turning with a marble
//   look  { from, speed, eye }   a fixed camera
//   fly   { }                    the long flyover (its whole length over `dur`)
//   logo  { version } / end { }  the logo sting (logo.html) / the end card
// Text: { at, dur, top } (video seconds; one line, the template's one style). Podium: { at, dur }.
// Sound: { goAt (GO in video seconds, or null), beeps, music: [[from, to]], lifts: [[from, to]] (the music lifted
// a little: the big moments), ceremony: [from, to] } (record.mjs mix(); the end card's signature sound is always added).
import { TEMPLATE, TEXTS, fill } from './assets.mjs';

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

/** A plan under construction: shots one after another, the template's one text style, the end card. */
function builder(kind) {
  const p = { shots: [], texts: [], v: 0, lifts: [] };
  p.add = (s) => { const at = p.v; p.shots.push({ ...s, at }); p.v += s.dur; return at; };
  p.say = (at, key, values = {}, dur = TEMPLATE.text.seconds) => p.texts.push({ at, dur, top: fill(TEXTS[key] ?? key, values) });
  p.lift = (a, b) => p.lifts.push([a, b]);
  p.end = () => p.add({ type: 'end', dur: TEMPLATE.endCard.seconds[kind] });
  return p;
}

/** The big production (horizontal, about 2 minutes). */
export function production(info, race, { logo = TEMPLATE.intro.logo, fly = 15 } = {}) {
  const m = moments(info, race);
  const G = info.countdownMs;
  const p = builder('production');
  const name = { track: info.name, marble: info.podium[0].name };

  // 1. The teaser: the race's best moment (the game's camera at the last TV camera), a little slowed.
  const tease = m.tv[m.tv.length - 1] ?? { t: m.W * 0.7 };
  p.add({ type: 'race', from: tease.t - 2200, speed: 0.75, dur: 2.6 });
  // 2. Intro A.
  const logoAt = p.add({ type: 'logo', version: logo, dur: 2 });
  // 3. The flyover: the wide overview, then slowly to the highlights.
  const flyAt = p.add({ type: 'fly', dur: fly });
  p.say(flyAt + 1, 'trackCard', name);
  p.say(flyAt + fly * 0.55, 'opening');
  // 4. The countdown, with the beeps (the fourth on GO).
  const cdAt = p.add({ type: 'race', from: -G, dur: G / 1000 });
  p.say(cdAt + 1.2, 'countdown');
  const goAt = p.v;
  // 5. The race: the game's cameras and the track's TV cameras, start to finish.
  p.add({ type: 'race', from: 0, dur: (m.W + 7000) / 1000 });
  for (const c of m.tv) p.lift(goAt + (c.t - 3000) / 1000, goAt + (c.t + 1500) / 1000);
  p.say(goAt + (m.W - 7500) / 1000, 'lastStretch');
  p.lift(goAt + (m.W - 3000) / 1000, goAt + (m.W + 3000) / 1000);
  p.say(goAt + (m.W + 250) / 1000, m.close ? 'photoFinish' : 'winner', name);
  if (m.close) p.say(goAt + (m.W + 3100) / 1000, 'winner', name);
  // 6. The replays: the finish in slow motion head-on through the finish arch (when it was close), then
  // the best overtaking moment and the first TV camera's moment again, at half speed, through the game's cameras.
  if (m.close) {
    const at = p.add({ type: 'look', from: m.W - 1300, speed: 0.25, dur: 6.4, eye: FINISH_EYE });
    p.say(at + 0.4, 'slowMotion');
    p.lift(at, at + 6.4);
  }
  if (m.moves[0]) p.say(p.add({ type: 'race', from: m.moves[0].t - 2500, speed: 0.5, dur: 6 }) + 0.4, 'replay');
  if (m.tv[0]) p.say(p.add({ type: 'race', from: m.tv[0].t - 3000, speed: 0.5, dur: 6 }) + 0.4, 'replay');
  // 7. The podium, over the finish.
  const podAt = p.add({ type: 'race', from: m.W + 7000, dur: 11 });
  // 8. The end card.
  const endAt = p.end();
  return {
    shots: p.shots, texts: p.texts, podium: { at: podAt + 0.6, dur: 10.4 }, length: p.v,
    marks: { logoAt, flyAt, goAt, podAt, endAt },
    sound: { goAt, beeps: true, music: [[flyAt, podAt + 0.4]], teaserMusic: [0, logoAt], lifts: p.lifts, ceremony: [podAt, p.v] },
  };
}

/** The vertical cut-down (30–60 s): the start, the TV moments, an overtake, the finish, the podium, the end card. */
export function cutdown(info, race) {
  const m = moments(info, race);
  const p = builder('cutdown');
  const name = { track: info.name, marble: info.podium[0].name };
  const cdAt = p.add({ type: 'race', from: -3400, dur: 3.4 });
  p.say(cdAt + 0.2, 'opening');
  const goAt = p.v;
  p.add({ type: 'race', from: 0, dur: 5 });
  p.say(goAt + 0.6, 'trackCard', name);
  const bits = m.tv.map((c) => ({ t: c.t - 3200, dur: 5, tv: true }));
  if (m.moves[0]) bits.push({ t: m.moves[0].t - 2000, dur: 4 });
  bits.sort((a, b) => a.t - b.t);
  for (const b of bits) {
    if (b.t < 5500 || b.t + b.dur * 1000 > m.W - 8500) continue;
    const at = p.add({ type: 'race', from: b.t, dur: b.dur });
    if (b.tv) p.lift(at + 0.5, at + b.dur);
  }
  const finAt = p.add({ type: 'race', from: m.W - 8000, dur: 10.5 });
  p.say(finAt + 0.8, 'lastStretch');
  p.lift(finAt + 5, finAt + 10.5);
  p.say(finAt + 8.25, m.close ? 'photoFinish' : 'winner', name);
  if (m.close) {
    const at = p.add({ type: 'look', from: m.W - 1000, speed: 0.25, dur: 5, eye: { ...FINISH_EYE, fov: 40 } });
    p.say(at + 0.2, 'slowMotion', {}, 2.2);
    p.say(at + 2.6, 'winner', name, 2.3);
    p.lift(at, at + 5);
  }
  const podAt = p.add({ type: 'race', from: m.W + 4000, dur: 5.5 });
  p.end();
  return {
    shots: p.shots, texts: p.texts, podium: { at: podAt + 0.3, dur: 5.2 }, length: p.v,
    marks: { goAt, podAt },
    sound: { goAt, beeps: true, music: [[0, podAt + 0.4]], lifts: p.lifts, ceremony: [podAt, p.v] },
  };
}

/**
 * A short clip (vertical, 10–30 s), one of four kinds (`clip`):
 *   flyover  the calm helicopter flight with the track's name
 *   close    the last 8 s, "Photo finish!", the finish again in slow motion head-on, the winner
 *   wild     a big moment (`at`: race ms; a jump, a drop, a splitter, an overtake on the line), then again at half speed
 *   pick     the field at the gate, "Who wins?", the start, a cut to the finish, "Did you pick <marble>?"
 */
export function clip(info, race, { clip: kind, at = null, fly = 12 } = {}) {
  const m = moments(info, race);
  const p = builder('clip');
  const name = { track: info.name, marble: info.podium[0].name };
  let goAt = null;
  let beeps = false;
  if (kind === 'flyover') {
    const a = p.add({ type: 'fly', dur: fly });
    p.say(a + 1, 'trackCard', name, 3);
  } else if (kind === 'close') {
    const a = p.add({ type: 'race', from: m.W - 8000, dur: 9.5 });
    p.say(a + 0.6, 'lastStretch');
    p.say(a + 8.25, 'photoFinish', name, 2.2);
    p.lift(a + 5, a + 9.5);
    const b = p.add({ type: 'look', from: m.W - 1000, speed: 0.25, dur: 5, eye: { ...FINISH_EYE, fov: 40 } });
    p.say(b + 0.2, 'slowMotion', {}, 2.2);
    p.say(b + 2.6, 'winner', name, 2.3);
    p.lift(b, b + 5);
  } else if (kind === 'wild') {
    const a = p.add({ type: 'race', from: at - 3000, dur: 5.5 });
    p.say(a + 0.3, 'trackCard', name);
    p.lift(a + 2, a + 5.5);
    const b = p.add({ type: 'race', from: at - 1500, speed: 0.5, dur: 5 });
    p.say(b + 0.3, 'slowMotion', {}, 2.2);
    p.lift(b, b + 5);
  } else if (kind === 'pick') {
    const a = p.add({ type: 'race', from: -4000, dur: 4 });
    p.say(a + 0.3, 'pickYourWinner', name, 3.4);
    goAt = p.v;
    beeps = true;
    p.add({ type: 'race', from: 0, dur: 3 });
    const b = p.add({ type: 'race', from: m.W - 7000, dur: 9.5 });
    p.say(b + 0.4, 'trackCard', name);
    p.lift(b + 4, b + 9.5);
    p.say(b + 7.25, 'pickYourWinnerAnswer', name, 2.25);
  } else throw new Error(`No clip kind "${kind}"`);
  p.end();
  return {
    shots: p.shots, texts: p.texts, podium: null, length: p.v,
    marks: {},
    sound: { goAt, beeps, music: [[0, p.v - TEMPLATE.endCard.seconds.clip + 0.6]], lifts: p.lifts, ceremony: null },
  };
}
