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
import { FINISH_EYE, START_SHOT, analyse, busiest, directRace, reaches } from './director.mjs';

export { FINISH_EYE };

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


/** A plan under construction: shots one after another, the template's one text style, the end card. */
function builder(kind) {
  const p = { shots: [], texts: [], v: 0, lifts: [] };
  p.add = (s) => { const at = p.v; p.shots.push({ ...s, at }); p.v += s.dur; return at; };
  p.say = (at, key, values = {}, dur = TEMPLATE.text.seconds) => p.texts.push({ at, dur, top: fill(TEXTS[key] ?? key, values) });
  p.lift = (a, b) => p.lifts.push([a, b]);
  p.end = () => p.add({ type: 'end', dur: TEMPLATE.endCard.seconds[kind] });
  return p;
}

/**
 * The game's lines (template.json promos): the next `count` in the list for this video (rotating
 * across videos by `key`), placed in calm moments: over the flyover, the race (not the finish) and
 * the podium, at least 1.2 s from any other line, spread across the video.
 */
function promos(p, kind, key, start = null) {
  const P = TEMPLATE.promos;
  const count = P.perVideo[kind] ?? 0;
  if (!count) return;
  // (Where in the list this video starts: given (`--promos <n>`, so a batch of videos rotates through the
  // list evenly), else from the video's name.)
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const first = start ?? h;
  const lines = Array.from({ length: count }, (_, k) => P.lines[(first + k) % P.lines.length]);
  const calm = p.shots.filter((s) => s.type === 'fly' || ((s.type === 'race' || s.type === 'group' || s.type === 'pan') && (s.speed ?? 1) === 1 && s.from >= 0));
  const inCalm = (x) => calm.some((s) => x >= s.at && x <= s.at + s.dur);
  const covered = (a, b) => { for (let x = a; x < b; x += 0.25) if (!inCalm(x)) return false; return inCalm(b); };
  const free = (a, b) => covered(a, b) && !p.texts.some((x) => a < x.at + x.dur + 1.2 && b > x.at - 1.2);
  const placed = [];
  const seg = p.v / (count + 1);
  for (const [k, line] of lines.entries()) {
    const parts = Array.isArray(line) ? line : [line];
    const d = P.seconds * parts.length + 0.3 * (parts.length - 1);
    const want = seg * (k + 1);
    let best = null;
    for (let a = 0; a + d < p.v; a += 0.25) {
      if (!free(a, a + d) || placed.some(([x, y]) => a < y + 2 && a + d > x - 2)) continue;
      if (best === null || Math.abs(a - want) < Math.abs(best - want)) best = a;
    }
    if (best === null) continue;
    parts.forEach((part, j) => p.texts.push({ at: best + j * (P.seconds + 0.3), dur: P.seconds, top: part }));
    placed.push([best, best + d]);
  }
  p.texts.sort((x, y) => x.at - y.at);
}

/** The finish as it happens: the leader into the last stretch, then head-on as the leader and the chasers arrive. */
function liveFinish(p, W, { stretch = 8000, after = 1800 } = {}) {
  const a = p.add({ type: 'race', follow: 'leader', from: W - stretch, dur: (stretch - 1600) / 1000 });
  p.add({ type: 'look', from: W - 1600, dur: (1600 + after) / 1000, eye: FINISH_EYE });
  return a;
}

/** The pack's moment at a TV camera: the marble in the thick of the bunch there, followed through the TV camera's shot. */
function tvPackMoment(A, race, c) {
  const near = busiest(A, Math.max(6000, c.t - 4000), c.t + 6000, 3000) ?? { mid: null };
  const at = near.mid !== null ? reaches(race, near.mid, c.p) : null;
  return at === null ? { follow: 'leader', t: c.t } : { follow: near.mid, t: at };
}

/** The big production (horizontal, about 2 minutes). */
export function production(info, race, { logo = TEMPLATE.intro.logo, fly = 15, promoStart = null } = {}) {
  const m = moments(info, race);
  const A = analyse(race, info.arc, m.W + 8000);
  const G = info.countdownMs;
  const p = builder('production');
  const name = { track: info.name, marble: info.podium[0].name };

  // 1. The teaser: the race's busiest moment in the pack, a little slowed.
  const tease = busiest(A, 8000, m.W - 8000, 2500) ?? { t: m.W * 0.5, mid: 'leader' };
  p.add({ type: 'race', follow: tease.mid, from: tease.t - 300, speed: 0.75, dur: 2.6 });
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
  // 5. The race, directed: the start wide, the pack and the leader by where the action is, the finish head-on.
  const { shots, packShare } = directRace(A, { from: 0, to: m.W - 8000 });
  for (const s of shots) {
    const at = p.add(s);
    if (s.follow !== 'leader' && within3(A, s.from, s.from + s.dur * 1000)) p.lift(at, at + s.dur);
  }
  liveFinish(p, m.W, { after: 1800 });
  p.add({ type: 'race', follow: 'leader', from: m.W + 1800, dur: 5.2 });
  p.say(goAt + (m.W - 7500) / 1000, 'lastStretch');
  p.lift(goAt + (m.W - 3000) / 1000, goAt + (m.W + 3000) / 1000);
  p.say(goAt + (m.W + 250) / 1000, m.close ? 'photoFinish' : 'winner', name);
  if (m.close) p.say(goAt + (m.W + 3100) / 1000, 'winner', name);
  // 6. The replays: the finish in slow motion through the game's camera (when it was close), the pack's
  // busiest moment and the pack at the first TV camera, at half speed.
  if (m.close) {
    const at = p.add({ type: 'race', follow: 'leader', from: m.W - 1300, speed: 0.25, dur: 6.4 });
    p.say(at + 0.4, 'slowMotion');
    p.lift(at, at + 6.4);
  }
  if (tease.mid !== 'leader') p.say(p.add({ type: 'race', follow: tease.mid, from: tease.t - 1000, speed: 0.5, dur: 6 }) + 0.4, 'replay');
  if (m.tv[0]) {
    const tv = tvPackMoment(A, race, m.tv[0]);
    p.say(p.add({ type: 'race', follow: tv.follow, from: tv.t - 3200, speed: 0.5, dur: 6 }) + 0.4, 'replay');
  }
  // 7. The podium, over the finish.
  const podAt = p.add({ type: 'race', follow: 'leader', from: m.W + 7000, dur: 11 });
  // 8. The end card, and the game's lines in the calm moments.
  const endAt = p.end();
  promos(p, 'production', `${info.name}|production`, promoStart);
  return {
    shots: p.shots, texts: p.texts, podium: { at: podAt + 0.6, dur: 10.4 }, length: p.v, packShare,
    marks: { logoAt, flyAt, goAt, podAt, endAt },
    sound: { goAt, beeps: true, music: [[flyAt, podAt + 0.4]], teaserMusic: [0, logoAt], lifts: p.lifts, ceremony: [podAt, p.v] },
  };
}
/** A big moment between a and b: several in the air, or a pile of contacts. */
function within3(A, a, b) {
  return A.some((x) => x.t >= a && x.t < b && (x.air >= 3 || x.contacts >= 4));
}

/** The vertical cut-down (30–60 s): the start wide, the pack's best moments, a TV camera, the finish head-on, the podium, the end card. */
export function cutdown(info, race, { promoStart = null } = {}) {
  const m = moments(info, race);
  const A = analyse(race, info.arc, m.W + 8000);
  const p = builder('cutdown');
  const name = { track: info.name, marble: info.podium[0].name };
  const cdAt = p.add({ type: 'race', from: -3400, dur: 3.4 });
  p.say(cdAt + 0.2, 'opening');
  const goAt = p.v;
  p.add(START_SHOT(0, 4.5));
  p.say(goAt + 0.6, 'trackCard', name);
  // The pack's two busiest moments and the pack at a TV camera, in race order.
  const bits = [];
  const a1 = busiest(A, 6000, m.W - 9000, 4000);
  if (a1) bits.push({ type: 'race', follow: a1.mid, from: a1.t - 300, dur: 4 });
  const a2 = busiest(A, 6000, m.W - 9000, 4000, a1 ? [[a1.t - 5000, a1.t + 9000]] : []);
  if (a2) bits.push({ type: 'group', members: a2.members.slice(0, 8), shot: 'a2', from: a2.t - 300, dur: 4 });
  if (m.tv[0]) {
    const tv = tvPackMoment(A, race, m.tv[0]);
    if (!bits.some((b) => Math.abs(b.from - (tv.t - 3200)) < 5000)) bits.push({ type: 'race', follow: tv.follow, from: tv.t - 3200, dur: 5 });
  }
  bits.sort((x, y) => x.from - y.from);
  for (const b of bits) {
    if (b.from < 4500 || b.from + b.dur * 1000 > m.W - 6500) continue;
    const at = p.add(b);
    p.lift(at + 0.5, at + b.dur);
  }
  const finAt = liveFinish(p, m.W, { stretch: 6500, after: 1500 });
  p.say(finAt + 0.5, 'lastStretch');
  p.lift(finAt + 3, p.v);
  p.say(finAt + 6.75, m.close ? 'photoFinish' : 'winner', name);
  if (m.close) {
    const at = p.add({ type: 'race', follow: 'leader', from: m.W - 1100, speed: 0.3, dur: 4.5 });
    p.say(at + 0.2, 'slowMotion', {}, 2);
    p.say(at + 2.3, 'winner', name, 2.2);
    p.lift(at, at + 4.5);
  }
  const podAt = p.add({ type: 'race', follow: 'leader', from: m.W + 4000, dur: 5.5 });
  p.end();
  promos(p, 'cutdown', `${info.name}|cutdown`, promoStart === null ? null : promoStart + TEMPLATE.promos.perVideo.production);
  return {
    shots: p.shots, texts: p.texts, podium: { at: podAt + 0.3, dur: 5.2 }, length: p.v,
    marks: { goAt, podAt },
    sound: { goAt, beeps: true, music: [[0, podAt + 0.4]], lifts: p.lifts, ceremony: [podAt, p.v] },
  };
}

/**
 * A short clip (vertical, 10–30 s), one of four kinds (`clip`):
 *   flyover  the calm helicopter flight with the track's name
 *   close    the last stretch, the finish head-on (the leader and the chasers), "Photo finish!", again in slow motion
 *   wild     a big moment in the pack (`at`: race ms; else the race's busiest), then again at half speed
 *   pick     the field at the gate, "Who wins?", the start wide, a cut to the finish head-on, "Did you pick <marble>?"
 */
export function clip(info, race, { clip: kind, at = null, fly = 12, promoStart = null } = {}) {
  const m = moments(info, race);
  const A = analyse(race, info.arc, m.W + 8000);
  const p = builder('clip');
  const name = { track: info.name, marble: info.podium[0].name };
  let goAt = null;
  let beeps = false;
  if (kind === 'flyover') {
    const a = p.add({ type: 'fly', dur: fly });
    p.say(a + 1, 'trackCard', name, 3);
  } else if (kind === 'close') {
    const a = liveFinish(p, m.W, { stretch: 8000, after: 1500 });
    p.say(a + 0.6, 'lastStretch');
    p.say(a + 8.25, 'photoFinish', name, 2.2);
    p.lift(a + 4, p.v);
    const b = p.add({ type: 'race', follow: 'leader', from: m.W - 1100, speed: 0.3, dur: 4.5 });
    p.say(b + 0.2, 'slowMotion', {}, 2);
    p.say(b + 2.3, 'winner', name, 2.2);
    p.lift(b, b + 4.5);
  } else if (kind === 'wild') {
    // (A given moment: the marble highest in the air then, the jumper; if none is in the air, e.g. an
    // overtake on the line, the one leading just after it.)
    const jumper = (t) => {
      const f = race.frames[Math.max(0, Math.min(race.frames.length - 1, Math.round(t / race.tickMs)))];
      const h = f.h ?? [];
      const top = h.reduce((b, x, i) => (x > (h[b] ?? 0) ? i : b), 0);
      if ((h[top] ?? 0) > 0.2) return top;
      const g = race.frames[Math.min(race.frames.length - 1, Math.round((t + 300) / race.tickMs))];
      return g.s?.[0] ?? 'leader';
    };
    const w = at !== null ? { t: at, mid: jumper(at) } : busiest(A, 6000, m.W - 6000, 3000);
    const a = p.add({ type: 'race', follow: w.mid, from: w.t - 2500, dur: 5.5 });
    p.say(a + 0.3, 'trackCard', name);
    p.lift(a + 2, a + 5.5);
    const b = p.add({ type: 'race', follow: w.mid, from: w.t - 1200, speed: 0.5, dur: 5 });
    p.say(b + 0.3, 'slowMotion', {}, 2.2);
    p.lift(b, b + 5);
  } else if (kind === 'pick') {
    const a = p.add({ type: 'race', from: -4000, dur: 4 });
    p.say(a + 0.3, 'pickYourWinner', name, 3.4);
    goAt = p.v;
    beeps = true;
    p.add(START_SHOT(0, 3.5));
    const b = liveFinish(p, m.W, { stretch: 7000, after: 2000 });
    p.say(b + 0.4, 'trackCard', name);
    p.lift(b + 3, p.v);
    p.say(b + 7.2, 'pickYourWinnerAnswer', name, 2.3);
  } else throw new Error(`No clip kind "${kind}"`);
  p.end();
  promos(p, 'clip', `${info.name}|clip|${kind}`, promoStart);
  return {
    shots: p.shots, texts: p.texts, podium: null, length: p.v,
    marks: {},
    sound: { goAt, beeps, music: [[0, p.v - TEMPLATE.endCard.seconds.clip + 0.6]], lifts: p.lifts, ceremony: null },
  };
}
