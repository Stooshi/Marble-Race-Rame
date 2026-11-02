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
import { FINISH_EYE, START_SHOT, analyse, busiest, directRace, packScore, reaches } from './director.mjs';

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
  p.end = () => {
    const dur = TEMPLATE.endCard.seconds[kind];
    const readable = dur - TEMPLATE.endCard.linesIn;
    if (!(readable >= TEMPLATE.endCard.minSeconds - 1e-9)) throw new Error(`The ${kind} end card's lines are readable ${readable.toFixed(1)} s: at least ${TEMPLATE.endCard.minSeconds} s (template.json endCard)`);
    return p.add({ type: 'end', dur });
  };
  return p;
}

/** The big lines' fade in and out (record.mjs, hooks). */
export const HOOK_FADE = 0.12;

/**
 * The vertical broadcasts' end card (template.json endCard.hold): the play line held on a calm frame,
 * `shot` frozen (speed 0) and slowly dimmed, readable for at least endCard.minSeconds before the loop
 * fade. Adds the shot, pushes the line onto `bigs` and returns the dim for the plan.
 */
export function endHold(p, shot, bigs, text, { loopFade = 0 } = {}) {
  const H = TEMPLATE.endCard.hold;
  const at = p.add({ ...shot, speed: 0, dur: H.seconds });
  const line = { at: at + 0.05, dur: H.seconds - 0.05, text };
  const readable = (line.at + line.dur - loopFade) - (line.at + HOOK_FADE);
  if (readable < TEMPLATE.endCard.minSeconds - 1e-9) throw new Error(`The end card is readable ${readable.toFixed(2)} s: at least ${TEMPLATE.endCard.minSeconds} s (template.json endCard)`);
  bigs.push(line);
  return { at, dur: H.seconds, k: H.dim, fin: H.dimIn, readable };
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
    // (A given moment: the marble highest in the air then, the jumper, when it is really flying (1.5 m
    // or more: a small hop at the back is not the moment); otherwise, e.g. an overtake on the line, the
    // one leading just after it.)
    const jumper = (t) => {
      const f = race.frames[Math.max(0, Math.min(race.frames.length - 1, Math.round(t / race.tickMs)))];
      const h = f.h ?? [];
      const top = h.reduce((b, x, i) => (x > (h[b] ?? 0) ? i : b), 0);
      if ((h[top] ?? 0) >= 1.5) return top;
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

/**
 * Cuts every 2–4 s (the broadcast, Moses 1 Nov 2026): a directed shot longer than the template's longest
 * cut is split into pieces, every other one from another camera on the same action: the leader's follow
 * camera alternates with a chase camera behind the leading group, the pack's chase with the follow camera
 * on the bunch's last marble.
 */
function cutUp(shots, A, [lo, hi]) {
  const out = [];
  const at = (t) => A.find((x) => x.t >= t) ?? A[A.length - 1];
  for (const s of shots) {
    if (s.dur <= hi || s.type === 'pan') { out.push(s); continue; }
    const n = Math.ceil(s.dur / hi);
    const len = s.dur / n;
    for (let k = 0; k < n; k += 1) {
      const from = s.from + k * len * 1000;
      if (k % 2 === 0) { out.push({ ...s, from, dur: len, shot: `${s.shot ?? 'r'}-${k}` }); continue; }
      const a = at(from);
      if (s.type === 'group') out.push({ type: 'race', follow: a.mid ?? 'leader', from, dur: len });
      else if (s.follow === 'leader') out.push({ type: 'group', members: leadGroup(a), shot: `lead-${from}`, from, dur: len, back: 9, up: 5, ahead: 8, fov: 42 });
      else out.push({ type: 'group', members: a.members.slice(0, 8), shot: `pk-${from}`, from, dur: len });
    }
  }
  void lo;
  return out;
}
let LEAD_GROUP = null;
/** The finish from beside the line (the broadcast): a camera a few metres before the line and to the side, turning with the leader. */
export const LINE_EYE = { p: 1, back: 14, beside: 5, up: 6, ahead: 0, lookUp: 0.3, fov: 32 }; // (close on the leaders, the stand behind)
/** The live finish: high behind the line, looking down the last bend to it. */
/** The hook: the camera beside the last metres (LINE_EYE), the three contenders side by side as it freezes. */
export const HOOK_EYE = LINE_EYE;
export const LINE_HIGH = { p: 1, back: 8, beside: 0, up: 7, ahead: 0, lookUp: 0.3, fov: 36 };
const leadGroup = (x) => (LEAD_GROUP ? LEAD_GROUP(x.t) : [x.lead]);

/**
 * The broadcast production (horizontal, about 2 minutes; Moses, 1 Nov 2026): the hook (the closest moment,
 * slowed), the intro card over the flyover, the countdown, the whole race with the overlay and cuts every
 * 2–4 s, the finish live and in slow motion, the results board with the winner's card, the end card. The
 * words are the template's broadcast captions (lower third), placed at the race's own moments.
 */
export function broadcast(info, race, { fly = 4.5, slug = null } = {}) {
  const m = moments(info, race);
  const A = analyse(race, info.arc, m.W + 8000);
  const G = info.countdownMs;
  const BC = TEMPLATE.broadcast;
  // (A track's own caption set, where it has one, replaces the shared lines; template.json broadcast.captionSets.)
  const C = { ...BC.captions, ...(slug && BC.captionSets?.[slug]) };
  const p = builder('broadcast');
  const city = info.name.replace(/\s*Marble Grand Prix$/i, '').trim();
  const clock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}.${String(Math.round(ms % 1000)).padStart(3, '0')}`;
  const name = { track: info.name, marble: info.podium[0].name, city: city.toUpperCase(), margin: (info.margin / 1000).toFixed(3), time: clock(info.winnerMs) };
  // (The leading group at race ms t: the leader and the marbles within 6 m of it.)
  LEAD_GROUP = (t) => {
    const f = race.frames[Math.max(0, Math.min(race.frames.length - 1, Math.round(t / race.tickMs)))];
    const top = Math.max(...f.p.filter((x) => x < 1));
    return f.p.map((x, i) => [x, i]).filter(([x]) => x < 1 && (top - x) * info.arc < 6).map(([, i]) => i);
  };
  const bc = []; // [from, to, { label }]: where the overlay shows
  const on = (a, b, o = {}) => bc.push([a, b, o]);
  const want = []; // captions wanted: { v (video s), key, dur?, after? (must start at or after), before? }
  // 1. The hook (the first 5 s): the final metres in slow motion, frozen just before the line with the three
  // contenders side by side (the winner not shown), markers on them, a quick rewind, then the race.
  const pod = info.podium.map((x) => x.index);
  const H = BC.hookLines;
  const freeze = m.W - 400; // (0.4 s before the winner's line: the three side by side, a few metres out, nobody across)
  const hookShot = { type: 'pan', eye: HOOK_EYE, members: pod, fov: HOOK_EYE.fov };
  const h1 = p.add({ ...hookShot, from: freeze - 1000, speed: 0.5, dur: 2 });
  const h2 = p.add({ ...hookShot, from: freeze, speed: 0, dur: 2 });
  const h3 = p.add({ ...hookShot, from: freeze, speed: -3.35, dur: 1 });
  // (The video's length, for the rewind's line: worked out once the plan is complete, below.)
  const hooks = [
    { at: h1 + 0.1, dur: 1.9, text: fill(H.close, name) },
    { at: h2 + 0.05, dur: 1.95, text: fill(H.pick, name) },
    { at: h3, dur: 1, text: fill(H.rewind, name) },
  ];
  const markers = { at: h2 + 0.15, dur: 1.85, members: pod };
  const rewind = { at: h3, dur: 1 };
  p.lift(h1, h3 + 1);
  // 2. The flyover, short (4.5 s), the intro card on it for 1.5 s, then a caption.
  const flyAt = p.add({ type: 'fly', dur: fly });
  const intro = { at: flyAt + 0.1, dur: 1.5, title: fill(BC.introCard, name), sub: fill(BC.introSub, name) };
  want.push({ v: flyAt + 1.75, key: 'flyover', dur: 2.6, fixed: true });
  // 3. The countdown, the tower showing the gates.
  const cdAt = p.add({ type: 'race', from: -3500, dur: 3.5 });
  on(cdAt + 0.2, p.v);
  want.push({ v: cdAt + 0.4, key: 'grid', dur: 2.4 });
  void G;
  const goAt = p.v;
  want.push({ v: goAt + 0.3, key: 'go' });
  // 4. The race, cut every 2–4 s.
  const { shots } = directRace(A, { from: 0, to: m.W - 8000 });
  const raceShots = cutUp(shots, A, BC.cutSeconds);
  for (const s of raceShots) {
    const at = p.add(s);
    if (s.follow !== undefined && s.follow !== 'leader' && within3(A, s.from, s.from + s.dur * 1000)) p.lift(at, at + s.dur);
  }
  // The last 8 s: the leader, the leading group, the finish from high behind the line.
  p.add({ type: 'race', follow: 'leader', from: m.W - 8000, dur: 3 });
  p.add({ type: 'group', members: LEAD_GROUP(m.W - 5000), shot: 'final', from: m.W - 5000, dur: 3.4, back: 9, up: 5, ahead: 8, fov: 42 });
  p.add({ type: 'pan', from: m.W - 1600, dur: 3.4, eye: LINE_HIGH, follow: 'leader', fov: 36 });
  p.add({ type: 'race', follow: 'leader', from: m.W + 1800, dur: 2.6 });
  on(goAt, p.v);
  p.lift(goAt + (m.W - 3000) / 1000, goAt + (m.W + 3000) / 1000);
  // The race's moments (race ms → video s: the race runs at its own speed from GO to the finish).
  const rv = (t) => goAt + t / 1000;
  const W = m.W;
  const firstBunch = A.find((x) => x.t >= 5000 && x.t < W - 12000 && x.contacts >= 3);
  if (firstBunch) want.push({ v: rv(firstBunch.t), key: 'firstBunch' });
  // (The first big overtake: a marble in the top ten gaining three places or more within 3 s, after the start's shuffle.)
  const placeAt = (t) => { const f = race.frames[Math.max(0, Math.min(race.frames.length - 1, Math.round(t / race.tickMs)))]; return f.s ?? []; };
  let move = null;
  for (let t = 8000; t < W - 10000 && !move; t += 250) {
    const a = placeAt(t);
    const b = placeAt(t + 3000);
    if (b.slice(0, 10).some((i, k) => a.indexOf(i) - k >= 3)) move = t;
  }
  if (move !== null) want.push({ v: rv(move + 800), key: 'firstOvertake' });
  const lead = A.find((x) => x.t >= 6000 && x.t < W - 9000 && x.leadChange);
  if (lead) want.push({ v: rv(lead.t), key: 'leadChange' });
  // (A pack shot in the middle of the race: the chase camera on the bunch, between 35% and 70% of the way.)
  const mid = raceShots.find((s) => s.type === 'group' && s.from > W * 0.35 && s.from < W * 0.7 && s.members?.length >= 4);
  if (mid) want.push({ v: rv(mid.from + 300), key: 'packShot' });
  // (A calm stretch: the quietest 3 s between a quarter and three quarters of the way, no lead change in it.)
  let calm = null;
  for (const x of A) {
    if (x.t < W * 0.25 || x.t > W * 0.75) continue;
    const w = A.filter((y) => y.t >= x.t && y.t < x.t + 3000);
    if (w.some((y) => y.leadChange)) continue;
    const sc = packScore(A, x.t, x.t + 3000);
    if (!calm || sc < calm.s) calm = { t: x.t, s: sc };
  }
  if (calm) want.push({ v: rv(calm.t), key: 'calm' });
  // (The three contenders close together mid-race: the moment they are closest, if within 20 m, before the last stretch.)
  let close = null;
  for (const f of race.frames) {
    const t = f.t;
    if (t < W * 0.3 || t > W - 10000) continue;
    const ps = pod.map((i) => f.p[i]);
    const spread = (Math.max(...ps) - Math.min(...ps)) * info.arc;
    if (spread < 20 && (!close || spread < close.spread)) close = { t, spread };
  }
  if (close) want.push({ v: rv(close.t - 600), key: 'pickStill' });
  want.push({ v: rv(W - 7800), key: 'finalStretch' });
  // 5. The finish in slow motion: from beside the line, then the follow camera on the winner.
  const s1 = p.add({ type: 'pan', from: m.W - 1400, speed: 0.25, dur: 7.2, eye: LINE_EYE, follow: 'leader', fov: 32 });
  const s2 = p.add({ type: 'race', follow: 'leader', from: m.W - 1300, speed: 0.3, dur: 5.6 });
  on(s1, p.v, { label: BC.slowMotion });
  if (m.close) want.push({ v: s1 + 4.2, key: 'photoFinish', dur: 2.8, fixed: true });
  want.push({ v: s2 + 1.6, key: 'winnerTime', dur: 3, fixed: true });
  p.lift(s1, p.v);
  // 6. The results board over the finish.
  const resAt = p.add({ type: 'race', follow: 'leader', from: m.W + 4000, dur: 12 });
  // (The board for 8.4 s, then its caption over the finish area, so the board never hides the caption.)
  const results = { at: resAt + 0.4, dur: 8.4, title: BC.resultsTitle, sub: fill(BC.resultsSub, { ...name, city }), winnerLabel: BC.winner, columns: BC.columns };
  want.push({ v: resAt + 9.1, key: 'results', fixed: true });
  // 7. The end card (the broadcast's own lines).
  const endAt = p.end();
  // The captions: in time order, never two at once (one that would overlap the last is moved a little later,
  // or left out when its moment has gone), never inside the intro card or the hook's end.
  const secs = Math.round(p.v / 10) * 10;
  const length = `${Math.floor(secs / 60)} minute${Math.floor(secs / 60) === 1 ? '' : 's'}${secs % 60 ? ` ${secs % 60}` : ''}`;
  hooks[2].text = fill(H.rewind, { ...name, length });
  const captions = [];
  const D = C.seconds;
  const busyUntil = (v) => (v >= intro.at - 0.3 && v < intro.at + intro.dur + 0.3 ? intro.at + intro.dur + 0.3 : null);
  for (const w of want.sort((a, b) => a.v - b.v)) {
    const dur = w.dur ?? D;
    let v = w.v;
    const last = captions[captions.length - 1];
    if (last && v < last.at + last.dur + 0.35) v = last.at + last.dur + 0.35;
    v = busyUntil(v) ?? v;
    if (v - w.v > (w.fixed ? 0.6 : 2.2)) continue; // (its moment has gone)
    if (v < 5) continue; // (the hook has its own big lines)
    if (v + dur > endAt - 0.2 && w.key !== 'results') continue;
    captions.push({ at: v, dur, key: w.key, text: fill(C[w.key], name) });
  }
  return {
    shots: p.shots, texts: [], captions, hooks, markers, rewind, podium: null, length: p.v, intro, results, bc, city,
    endLines: BC.endCard,
    marks: { flyAt, goAt, resAt, endAt },
    sound: { goAt, beeps: true, music: [[flyAt, resAt + 0.4]], teaserMusic: [0, h3], lifts: p.lifts, ceremony: [resAt, p.v], extra: [{ key: 'whoosh', at: h3 - 0.35, gain: 0.5, dur: 1.6 }] },
  };
}

/**
 * The broadcast's vertical cut (25 s; Moses, 1 Nov 2026): 0–3 s the hook (the final metres slowed, frozen
 * before the line, the three contenders marked), 3–4 s a quick rewind to GO, 4–18 s the best moments cut
 * every 2–3 s (the start scramble, the biggest bunch, the biggest overtake, a lead change), 18–23 s the final
 * stretch and the photo finish in slow motion, 23–25 s the winner and the game's address. It ends on the
 * hook's camera, so it loops.
 */
export function broadcastTall(info, race) {
  const m = moments(info, race);
  const W = m.W;
  const A = analyse(race, info.arc, W + 8000);
  const T = TEMPLATE.broadcast.tall;
  const p = builder('broadcast');
  const name = { marble: info.podium[0].name, margin: (info.margin / 1000).toFixed(3) };
  const pod = info.podium.map((x) => x.index);
  // (A phone's picture is narrow: wider lenses, so the three side by side and the whole field fit across it.)
  // (A phone's picture is narrow: a wide lens, so the three side by side fit across it. The hook and the end
  // share one camera and one view: the end turns to where the hook's first picture looked, so it loops.)
  const line = { type: 'pan', eye: { ...LINE_EYE, fov: 72 }, members: pod, fov: 72 };
  const still = { ...line, useAim: 'loop' };
  const bigs = [];
  const bc = [];
  // 0–3 s: the hook.
  const freeze = W - 650; // (a phone's narrower picture: frozen a little earlier, the three still side by side in it)
  const h1 = p.add({ ...line, saveAim: 'loop', from: freeze - 700, speed: 0.5, dur: 1.4 });
  const h2 = p.add({ ...line, from: freeze, speed: 0, dur: 1.6 });
  bigs.push({ at: h1 + 0.05, dur: 1.35, text: fill(T.hookClose, name) }, { at: h2 + 0.05, dur: 1.55, text: fill(T.hookPick, name) });
  const markers = { at: h2 + 0.1, dur: 1.5, members: pod };
  // 3–4 s: the quick rewind, the line then the gate.
  const r1 = p.add({ ...line, from: freeze, speed: -5, dur: 0.5 });
  p.add({ ...START_SHOT(2500, 0.5), fov: 72, speed: -5 });
  const rewind = { at: r1, dur: 1 };
  // 4–18 s: the best moments, in race order, cut every 2–3 s.
  const goAt = p.v;
  const cut = 14 / 6;
  const taken = [[0, 3500], [W - 9000, W + 9000]];
  const free = (a, b) => !taken.some(([x, y]) => a < y && b > x);
  const picks = [{ shot: { ...START_SHOT(0, cut), fov: 72 }, t: 0 }];
  // The biggest bunch with collisions: two cuts, the chase camera on it, then the follow camera inside it.
  const bunch = busiest(A, 4000, W - 9000, cut * 2000, taken);
  if (bunch) {
    taken.push([bunch.t - 500, bunch.t + cut * 2000 + 500]);
    picks.push({ t: bunch.t, shot: { type: 'group', members: bunch.members.slice(0, 8), shot: 'bunch', from: bunch.t, dur: cut, fov: 60, back: 13, up: 9 } });
    picks.push({ t: bunch.t + cut * 1000, shot: { type: 'race', follow: bunch.mid, from: bunch.t + cut * 1000, dur: cut } });
  }
  // The biggest overtake: the most places gained in the top ten within 2.5 s.
  const order = (t) => race.frames[Math.max(0, Math.min(race.frames.length - 1, Math.round(t / race.tickMs)))].s ?? [];
  let best = null;
  for (let t = 4000; t < W - 9000; t += 250) {
    if (!free(t - 800, t - 800 + cut * 1000)) continue;
    const a = order(t);
    const b = order(t + 2500);
    b.slice(0, 10).forEach((i, k) => { const g = a.indexOf(i) - k; if (g > 0 && (!best || g > best.g)) best = { t, i, g }; });
  }
  if (best) {
    taken.push([best.t - 800, best.t - 800 + cut * 1000]);
    picks.push({ t: best.t - 800, shot: { type: 'race', follow: best.i, from: best.t - 800, dur: cut } });
  }
  // A lead change: the follow camera on the new leader, then the chase camera on the leading group.
  const lc = A.find((x) => x.t > 6000 && x.leadChange && free(x.t - 1400, x.t - 1400 + cut * 2000));
  if (lc) {
    taken.push([lc.t - 1400, lc.t - 1400 + cut * 2000]);
    picks.push({ t: lc.t - 1400, shot: { type: 'race', follow: 'leader', from: lc.t - 1400, dur: cut } });
    picks.push({ t: lc.t - 1400 + cut * 1000, shot: { type: 'group', members: LEAD_GROUP_AT(race, info, lc.t), shot: 'lc', from: lc.t - 1400 + cut * 1000, dur: cut, back: 9, up: 5, ahead: 8, fov: 64 } });
  }
  // (Fewer than six cuts: the busiest moments left, followed in the pack.)
  while (picks.length < 6) {
    const b = busiest(A, 4000, W - 9000, cut * 1000, taken);
    if (!b) break;
    taken.push([b.t - 500, b.t + cut * 1000 + 500]);
    picks.push({ t: b.t, shot: { type: 'race', follow: b.mid, from: b.t, dur: cut } });
  }
  for (const k of picks.sort((a, b) => a.t - b.t).slice(0, 6)) p.add(k.shot);
  // 18–23 s: the final stretch, then the photo finish in slow motion.
  const fin = p.add({ type: 'race', follow: 'leader', from: W - 4200, dur: 1.6 });
  const slow = p.add({ ...line, from: W - 950, speed: 0.3, dur: 3.4 });
  bigs.push({ at: slow + 0.2, dur: 3.1, text: T.photoFinish });
  // 23–27 s: the winner, then the address held on the frozen, dimmed finish (the hook's camera: the loop back to the start).
  const end = p.add({ ...still, from: W + 70, speed: 0.3, dur: 1.3 });
  bigs.push({ at: end + 0.05, dur: 1.2, text: fill(T.winner, name) });
  const dim = endHold(p, { ...still, from: W + 70 + 390 }, bigs, T.play);
  bc.push([goAt, end, {}]);
  return {
    shots: p.shots, texts: [], captions: [], hooks: bigs, markers, rewind, podium: null, length: p.v, bc, city: info.name.replace(/\s*Marble Grand Prix$/i, '').trim(),
    tall: { towerRows: T.towerRows },
    dim,
    marks: { goAt, fin },
    sound: { goAt, beeps: false, music: [[0, p.v]], lifts: [[slow, p.v]], ceremony: null, extra: [{ key: 'whoosh', at: r1 - 0.35, gain: 0.5, dur: 1.6 }], loop: true },
  };
}
/** The leading group at race ms t (the leader and the marbles within 6 m of it). */
function LEAD_GROUP_AT(race, info, t) {
  const f = race.frames[Math.max(0, Math.min(race.frames.length - 1, Math.round(t / race.tickMs)))];
  const top = Math.max(...f.p.filter((x) => x < 1));
  return f.p.map((x, i) => [x, i]).filter(([x]) => x < 1 && (top - x) * info.arc < 6).map(([, i]) => i);
}

/**
 * A vertical cut in one of the template's variants (broadcast.tallVariants: `--variant A|B`; Moses, 1 Nov
 * 2026, Sognefjord for TikTok and Instagram): 25 s, the hook ('finish': frozen before the line with the
 * contenders marked; 'overtake': the race's biggest overtake frozen as it starts, the marble marked), a quick
 * rewind to GO, the intro tag, six cuts of the race's moments with the variant's lines one at a time, the
 * photo finish in slow motion, the winner and the gap, the address. Variant B films from other cameras
 * (chase cameras where A follows, the finish from high behind the line) so the two never look alike.
 */
export function broadcastTallV(info, race, { variant = 'A' } = {}) {
  const m = moments(info, race);
  const W = m.W;
  const A = analyse(race, info.arc, W + 8000);
  const V = TEMPLATE.broadcast.tallVariants[variant];
  const B = variant !== 'A';
  const p = builder('broadcast');
  const name = { marble: info.podium[0].name, margin: (info.margin / 1000).toFixed(3), track: info.name.toUpperCase() };
  // (The contenders: the winner and whoever finished within 0.5 s of it, at least two.)
  const fin = [...race.results].filter((r) => Number.isFinite(r.finishTimeMs)).sort((a, b) => a.finishTimeMs - b.finishTimeMs);
  const pod = fin.filter((r, k) => k < 2 || r.finishTimeMs - fin[0].finishTimeMs < 500).slice(0, 3).map((r) => r.index);
  const order = (t) => race.frames[Math.max(0, Math.min(race.frames.length - 1, Math.round(t / race.tickMs)))].s ?? [];
  const bigs = [];
  const cut = 14 / 6;
  const taken = [[0, 3500], [W - 9000, W + 9000]];
  const free = (a, b) => !taken.some(([x, y]) => a < y && b > x);
  // The finish cameras: A beside the last metres (the hook's camera, so it loops), B high behind the line.
  const lineA = { type: 'pan', eye: { ...LINE_EYE, fov: 52 }, members: pod, fov: 52 };
  const lineB = { type: 'pan', eye: { ...LINE_HIGH, fov: 70 }, members: pod, fov: 70 };
  const line = B ? lineB : lineA;
  // The race's biggest overtake: the most places gained in the top ten within 2.5 s.
  let best = null;
  for (let t = 5000; t < W - 9000; t += 250) {
    const a = order(t);
    const b = order(t + 2500);
    b.slice(0, 10).forEach((i, k) => { const g = a.indexOf(i) - k; if (g > 0 && (!best || g > best.g)) best = { t, i, g, place: a.indexOf(i) + 1 }; });
  }
  // 0–3 s: the hook.
  let markers;
  let r1;
  if (!B) {
    const freeze = W - 650;
    const h1 = p.add({ ...lineA, saveAim: 'loop', from: freeze - 700, speed: 0.5, dur: 1.4 });
    const h2 = p.add({ ...lineA, from: freeze, speed: 0, dur: 1.6 });
    bigs.push({ at: h2 + 0.05, dur: 1.55, text: fill(V.hookText, name) });
    markers = { at: h1 + 1.2, dur: 1.8, members: pod };
    r1 = p.add({ ...lineA, from: freeze, speed: -5, dur: 0.5 });
    p.add({ ...START_SHOT(2500, 0.5), fov: 72, speed: -5 });
  } else {
    const o = best ?? { t: W * 0.5, i: order(W * 0.5)[3], place: 4 };
    const h1 = p.add({ type: 'group', members: [o.i], shot: 'hook', from: o.t - 1400, speed: 0.5, dur: 1.4, back: 7, up: 3.5, ahead: 6, fov: 64 });
    const h2 = p.add({ type: 'group', members: [o.i], shot: 'hook', from: o.t - 700, speed: 0, dur: 1.6, back: 7, up: 3.5, ahead: 6, fov: 64 });
    bigs.push({ at: h1 + 0.1, dur: 2.85, text: fill(V.hookText, { ...name, place: o.place }) });
    markers = { at: h2 + 0.05, dur: 1.55, members: [o.i] };
    r1 = p.add({ type: 'group', members: [o.i], shot: 'hook', from: o.t - 700, speed: -5, dur: 0.5, back: 7, up: 3.5, ahead: 6, fov: 64 });
    p.add({ ...START_SHOT(2500, 0.5), fov: 72, speed: -5 });
    taken.push([o.t - 1500, o.t + 2500]);
    void h2;
  }
  const rewind = { at: r1, dur: 1 };
  // 4–18 s: six cuts, in race order.
  const goAt = p.v;
  const intro = { at: goAt + 0.15, dur: 1.8, title: fill(V.introTag, name), sub: '' };
  const all = Array.from({ length: race.entries.length }, (_, i) => i);
  const picks = [{ t: 0, shot: B ? { type: 'group', members: all, shot: 'start', from: 0, dur: cut, back: 14, up: 9, ahead: 10, fov: 70 } : { ...START_SHOT(0, cut), fov: 72 } }];
  if (B && best) picks.push({ t: best.t - 700, shot: { type: 'race', follow: best.i, from: best.t - 700, dur: cut } }); // (the hook's overtake, now live)
  const bunch = busiest(A, 4000, W - 9000, cut * 2000, taken);
  if (bunch) {
    taken.push([bunch.t - 500, bunch.t + cut * 2000 + 500]);
    const chase = { type: 'group', members: bunch.members.slice(0, 8), shot: 'bunch', from: bunch.t, dur: cut, fov: 60, back: 13, up: 9 };
    const inside = { type: 'race', follow: bunch.mid, from: bunch.t, dur: cut };
    picks.push({ t: bunch.t, shot: B ? inside : chase });
    picks.push({ t: bunch.t + cut * 1000, shot: { ...(B ? chase : inside), from: bunch.t + cut * 1000 } });
  }
  if (!B && best && free(best.t - 800, best.t - 800 + cut * 1000)) {
    taken.push([best.t - 800, best.t - 800 + cut * 1000]);
    picks.push({ t: best.t - 800, shot: { type: 'race', follow: best.i, from: best.t - 800, dur: cut } });
  }
  const lc = A.find((x) => x.t > 6000 && x.leadChange && free(x.t - 1400, x.t - 1400 + cut * 2000));
  if (lc) {
    taken.push([lc.t - 1400, lc.t - 1400 + cut * 2000]);
    const group = { type: 'group', members: LEAD_GROUP_AT(race, info, lc.t), shot: 'lc', from: lc.t - 1400, dur: cut, back: 9, up: 5, ahead: 8, fov: 64 };
    const follow = { type: 'race', follow: 'leader', from: lc.t - 1400, dur: cut };
    picks.push({ t: lc.t - 1400, shot: B ? group : follow });
    picks.push({ t: lc.t - 1400 + cut * 1000, shot: { ...(B ? follow : group), from: lc.t - 1400 + cut * 1000 } });
  }
  while (picks.length < 6) {
    const b = busiest(A, 4000, W - 9000, cut * 1000, taken);
    if (!b) break;
    taken.push([b.t - 500, b.t + cut * 1000 + 500]);
    picks.push({ t: b.t, shot: B ? { type: 'group', members: b.members.slice(0, 8), shot: `p${b.t}`, from: b.t, dur: cut, fov: 60, back: 12, up: 8 } : { type: 'race', follow: b.mid, from: b.t, dur: cut } });
  }
  for (const k of picks.sort((a, b) => a.t - b.t).slice(0, 6)) p.add(k.shot);
  // The variant's lines, one at a time, after the intro tag.
  V.lines.forEach((text, k) => bigs.push({ at: goAt + 2.3 + k * 3.9, dur: 2.5, text }));
  // 18–23 s: the final stretch, then the photo finish in slow motion.
  const finAt = p.add(B ? { type: 'group', members: LEAD_GROUP_AT(race, info, W - 4200), shot: 'fin', from: W - 4200, dur: 1.6, back: 9, up: 5, ahead: 8, fov: 64 } : { type: 'race', follow: 'leader', from: W - 4200, dur: 1.6 });
  const slow = p.add({ ...line, ...(B && { saveAim: 'loopB' }), from: W - 950, speed: 0.3, dur: 3.4 });
  bigs.push({ at: slow + 0.2, dur: 3.1, text: V.photoFinish });
  // 23–27 s: the winner and the gap, then the address held 3 s on the frozen, dimmed finish
  // (template.json endCard.hold). A ends on the hook's view (it loops); B holds the finish view.
  const loopFade = 0.25;
  const endShot = { ...line, useAim: B ? 'loopB' : 'loop' };
  const end = p.add({ ...endShot, from: W + 70, speed: 0.3, dur: 1.3 });
  bigs.push({ at: end + 0.05, dur: 1.2, text: fill(V.winner, name) });
  const dim = endHold(p, { ...endShot, from: W + 70 + 390 }, bigs, V.play, { loopFade });
  return {
    shots: p.shots, texts: [], captions: [], hooks: bigs, markers, rewind, intro, podium: null, length: p.v, bc: [[goAt, end, {}]], city: info.name,
    tall: { towerRows: TEMPLATE.broadcast.tall.towerRows },
    loopFade,
    dim,
    marks: { goAt, finAt },
    sound: { goAt, beeps: false, music: [[0, p.v]], lifts: [[slow, p.v]], ceremony: null, extra: [{ key: 'whoosh', at: r1 - 0.35, gain: 0.5, dur: 1.6 }], loop: true },
  };
}

/**
 * The A/B opening test (Moses, 2 Nov 2026; template.json abTall): a 15 s vertical race video whose only
 * difference is the opening. `opening`:
 *   'old'  frozen just before the line, the contenders marked, "Who wins? Pick one.", a quick rewind;
 *   'new'  no freeze: frame 1 is already the race's busiest chaos, the track's own big line from frame 1.
 * Then the same for both: fast cuts (1.5–2.5 s) of collisions and overtakes with the small lines, the finish
 * as a speed ramp (a low chase camera: slow approach, then full speed at the line, the marbles flying into the
 * finish area; never looking back up the track), the winner and the gap, and the big end card ("Play free",
 * the address) on the frozen, dimmed winner, held endCard.hold (the 2.5 s rule), fading into frame 1 (loops).
 */
export function abTall(info, race, { opening = 'old', slug = null } = {}) {
  const T = TEMPLATE.abTall;
  const m = moments(info, race);
  const W = m.W;
  const A = analyse(race, info.arc, W + 8000);
  const p = builder('abTall');
  const name = { marble: info.podium[0].name, margin: (info.margin / 1000).toFixed(3) };
  const win = info.podium[0].index;
  const fin = [...race.results].filter((r) => Number.isFinite(r.finishTimeMs)).sort((a, b) => a.finishTimeMs - b.finishTimeMs);
  const pod = fin.filter((r, k) => k < 2 || r.finishTimeMs - fin[0].finishTimeMs < 500).slice(0, 3).map((r) => r.index);
  const bigs = [];
  const taken = [[0, 3000], [W - 6000, W + 9000]];
  let markers = null;
  let rewind = null;
  // 0–3 s: the opening (the same length for both, so everything after it is identical).
  if (opening === 'new') {
    // (the game's own follow camera inside the two busiest bunches after the start: movement from frame 1)
    const c1 = busiest(A, 8000, W - 9000, 1500, taken);
    taken.push([c1.t - 300, c1.t + 1800]);
    const c2 = busiest(A, 8000, W - 9000, 1500, taken);
    taken.push([c2.t - 300, c2.t + 1800]);
    for (const c of [c1, c2].sort((a, b) => a.t - b.t)) p.add({ type: 'race', follow: c.mid, from: c.t, dur: 1.5 });
    bigs.push({ at: 0, dur: 2.2, text: T.newHooks[slug] ?? T.newHooks.default });
  } else {
    const freeze = W - 650;
    const line = { type: 'pan', eye: { ...LINE_EYE, fov: T.oldFov }, members: pod, fov: T.oldFov };
    const h1 = p.add({ ...line, from: freeze - 500, speed: 0.5, dur: 1.0 });
    const h2 = p.add({ ...line, from: freeze, speed: 0, dur: 1.5 });
    bigs.push({ at: h2 + 0.05, dur: 1.45, text: T.oldHook });
    markers = { at: h1 + 0.8, dur: 1.7, members: pod };
    const r1 = p.add({ ...line, from: freeze, speed: -5, dur: 0.5 });
    rewind = { at: r1, dur: 0.5 };
  }
  // 3–8 s: three fast cuts of collisions and overtakes (1.5–2.5 s), the small lines.
  const cutsAt = p.v;
  const cuts = [];
  for (const dur of T.cuts) {
    const b = busiest(A, 4000, W - 7000, dur * 1000, taken);
    if (!b) break;
    taken.push([b.t - 400, b.t + dur * 1000 + 400]);
    cuts.push({ t: b.t, dur, b });
  }
  // (the game's own follow camera in the bunch: reliable on every kind of track, roofs and walls included)
  cuts.sort((a, b) => a.t - b.t).forEach((c, k) => p.add({ type: 'race', follow: k % 2 ? c.b.mid : c.b.members[0] ?? c.b.mid, from: c.t, dur: c.dur }));
  const lines = T.lines.map((text, k) => ({ at: cutsAt + 0.2 + k * 2.5, dur: 2.2, text }));
  // 8–11 s: the finish as a speed ramp: a low chase camera on the leading group, slow, then full speed at the line.
  // (the winner, close and low behind it, for the gap and the end card)
  const r = T.ramp;
  const low = (from, dur, speed) => ({ type: 'group', members: pod.slice(0, 2), shot: 'won', from, dur, speed, ...T.rampChase });
  // (the ramp: low and close behind the first two, one camera through both speeds, looking on into the finish area)
  const ramp = (from, dur, speed) => ({ ...low(from, dur, speed), shot: 'ramp' });
  const rampAt = p.add(ramp(W - r.slowMs, r.slowSeconds, (r.slowMs - r.lineLeadMs) / 1000 / r.slowSeconds));
  p.add(ramp(W - r.lineLeadMs, r.fastSeconds, 1));
  // 11–12 s: the winner and the gap.
  // (the winner from a little higher, looking down on it, so marbles arriving behind never hide it)
  const top = (from, dur, speed) => ({ type: 'group', members: [win], shot: 'won', from, dur, speed, ...T.wonChase });
  const won = p.add(top(W + r.fastSeconds * 1000 - r.lineLeadMs, 1.0, 0.35));
  bigs.push({ at: won + 0.05, dur: 0.95, text: fill(T.winner, name) });
  // 12–15 s: the big end card on the frozen, dimmed winner (the template's 2.5 s rule), then the loop fade.
  const loopFade = 0.25;
  const H = TEMPLATE.endCard.hold;
  const holdFrom = W + r.fastSeconds * 1000 - r.lineLeadMs + 350;
  const endAt = p.add(top(holdFrom, H.seconds, 0));
  const endBig = { at: endAt + 0.05, l1: T.endCard[0], l2: T.endCard[1] };
  const readable = p.v - loopFade - (endBig.at + 0.18);
  if (readable < TEMPLATE.endCard.minSeconds - 1e-9) throw new Error(`The end card is readable ${readable.toFixed(2)} s: at least ${TEMPLATE.endCard.minSeconds} s (template.json endCard)`);
  return {
    shots: p.shots, texts: [], captions: [], hooks: bigs, lines, markers, rewind, podium: null, length: p.v, bc: [], city: info.name,
    tall: { towerRows: TEMPLATE.broadcast.tall.towerRows },
    loopFade, endBig, dim: { at: endAt, dur: H.seconds, k: T.endDim ?? H.dim, fin: H.dimIn },
    marks: { cutsAt, rampAt, won, endAt, readable, gate: info.podium[0].gate },
    sound: { goAt: 0, beeps: false, music: [[0, p.v]], lifts: [[rampAt, p.v]], ceremony: null, extra: [{ key: 'whoosh', at: Math.max(0, rampAt + r.slowSeconds - 0.4), gain: 0.5, dur: 1.6 }], loop: true },
  };
}
