'use strict';

const { createRng } = require('./rng');
const { subSeed } = require('./simulator');
const { TRACK_STYLE, buildCenterline, trackProfile } = require('./trackGeometry');

/**
 * Physics race simulator (preview only: real races still use simulator.js).
 *
 * Each marble is a ball rolling along the track's real shape:
 *   - along the track: gravity on the slope (a rolling ball feels 5/7 of it),
 *     rolling resistance, air drag, and a gentle "stat push" so marbles keep
 *     going on flat or slightly uphill stretches (fades out at speed);
 *   - across the track: it rolls straight. On a bend it keeps going straight
 *     in the world, so it drifts wide until the outer wall turns it; the
 *     floor is a shallow trough that eases it back to the middle. Walls
 *     bounce it back, costing a little speed;
 *   - up and down (level 3): it leaves the floor when the floor drops away
 *     faster than gravity pulls (crests), when a ramp kicks it, or when rough
 *     obstacles knock it; it lands, maybe bounces, and rolls on.
 *
 * Level 2 = rolling only (no air), level 3 = rolling plus air and bounce.
 * Marbles don't collide with each other yet (step 4). Deterministic: the same
 * input always gives the same race.
 *
 * Output frames are { t, p, l, h, s }: progress 0..1 along the drawn track,
 * lateral -1..1 (wall to wall, as the 3D view uses it), height of the ball
 * above the floor in metres, and standings.
 */

const PHYSICS_VERSION = 'physics-preview-1';

const DT = 1 / 120;           // seconds per physics step
const G = 9.81;
const ROLLING = 5 / 7;        // share of gravity a rolling solid ball turns into speed
const CRR = 0.012;            // rolling resistance
const RADIUS = 0.55;          // metres (as drawn)
const TROUGH = 0.35;          // 1/s²: the floor's gentle dip pulling marbles to the middle
const LATERAL_DAMPING = 0.35; // 1/s: sideways rolling settles down
const PUSH = 0.55;            // m/s²: the stat push at a standstill
const PUSH_FADE = 9;          // m/s: the push fades out by this speed
const START_ROW_GAP = 1.4;    // metres between grid rows (a fair starting gate comes in step 5)
const CAP_SECONDS = 90;       // hard cap on race length
const TARGET_SECONDS = 84;    // a weaker-than-average marble finishes about now (tuned per track)
const PACE_MARBLE = { topSpeed: 35, acceleration: 35, handling: 35, luck: 35 };

// Ice channels (tracks with physics.channel, e.g. the bobsleigh run). A game,
// not a simulation: tuned to look fast and to pull the field apart.
const ICE_CRR = 0.003;         // ice: almost no rolling resistance
const FREE_DRAG = 0.00042;     // 1/m: plain air drag, no padding of the clock ("free" pace)
const ICE_SCRUB = 0.008;       // speed lost skidding round bends, per unit of cornering force
const CHANNEL_DAMPING = 0.3;   // 1/s: rocking up and down the channel walls settles slowly on ice
const ICE_RUTS = 0.5;          // rad/s per √s: bumps in the ice knock marbles off their line
const ICE_DRAG_SPREAD = 3.0;   // how much top speed (and form) change drag on ice
const ICE_GLIDE_SPREAD = 0.6;  // how much acceleration (and form) change how well a marble glides: pulls the field apart
const SPLITTER_TIP = 0.35;     // metres either side of dead centre where the wedge's tip is hit

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Linear lookups into the track profile at distance s (metres). */
function profileLookup(profile) {
  const { s: S, y: Y, slope: SL, turn: TU, bend: BE, spacing, total } = profile;
  const last = S.length - 1;
  const at = (arr, s) => {
    const f = clamp(s, 0, total) / spacing;
    const i = Math.min(last - 1, Math.floor(f));
    const w = f - i;
    return arr[i] + (arr[i + 1] - arr[i]) * w;
  };
  return {
    floor: (s) => at(Y, s),
    slope: (s) => at(SL, s),
    turn: (s) => at(TU, s),
    bend: (s) => at(BE, s),
    total,
  };
}

function normaliseObstacles(obstacles, timetableRng, total) {
  return (Array.isArray(obstacles) ? obstacles : [])
    .filter((o) => o && Number.isFinite(o.at) && ['bumper', 'ramp', 'sand', 'spinner', 'funnel', 'cable_car'].includes(o.type))
    .map((o) => {
      const start = clamp(o.at, 0, 1) * total;
      const end = clamp(o.at + (Number.isFinite(o.span) ? o.span : 0.03), 0, 1) * total;
      const period = clamp(Number.isFinite(o.period) ? o.period : 10, 1, 120);
      return {
        type: o.type,
        start,
        end,
        intensity: clamp(Number.isFinite(o.intensity) ? o.intensity : 0.5, 0, 1),
        // Moving obstacles keep the same timetable draw as the classic simulator.
        ...(o.type === 'cable_car' && {
          period,
          duty: clamp(Number.isFinite(o.duty) ? o.duty : 0.4, 0, 1),
          phase: timetableRng.next() * period,
        }),
      };
    })
    .sort((a, b) => a.start - b.start);
}

/** How a marble's stats (1-100) shape its physics. */
function marbleParams(entry, drag) {
  const s = (v) => clamp(Number(v) || 50, 1, 100) / 100;
  const top = s(entry.topSpeed);
  const acc = s(entry.acceleration);
  const hand = s(entry.handling);
  const luck = s(entry.luck);
  return {
    drag: drag * (1.15 - 0.3 * top),           // top speed: less air drag
    push: PUSH * (0.75 + 0.5 * acc),           // acceleration: a stronger push off the mark and up slopes
    pushFade: PUSH_FADE * (0.9 + 0.2 * acc),
    wallBounce: 0.3 + 0.3 * hand,              // handling: comes off walls cleaner…
    wallLoss: 0.14 * (1 - 0.6 * hand),         // …losing less speed
    knockLoss: 1 - 0.5 * hand,                 // and less on obstacles and landings
    luckKick: 1.2 - 0.5 * luck,                // luck: obstacles knock it about less…
    luckBoost: 0.6 + 0.8 * luck,               // …and good bounces come more often
  };
}

/** Funnels pinch the walls in (as a share of the full width). */
function roomFactor(obstacles, s) {
  let f = 1;
  for (const o of obstacles) {
    if (o.type !== 'funnel' || s < o.start || s > o.end) continue;
    f = Math.min(f, 1 - 0.5 * o.intensity * Math.sin((Math.PI * (s - o.start)) / (o.end - o.start || 1)));
  }
  return f;
}

/** Along-track acceleration for a marble rolling on the floor, without random knocks. */
function steadyAccel(look, obstacles, m, s, v, form) {
  let a = -G * ROLLING * look.slope(s) - G * CRR - m.drag * v * Math.abs(v) + m.push * form * Math.max(0, 1 - v / m.pushFade);
  for (const o of obstacles) {
    if (s < o.start) break;
    if (s > o.end) continue;
    if (o.type === 'sand') a -= G * 0.1 * o.intensity * m.knockLoss;
    else if (o.type === 'ramp') a += 1.2 * o.intensity;
    else if (o.type === 'funnel') a -= 0.3 * o.intensity * m.knockLoss;
  }
  return a;
}

function newMarble(index, params, s, x, look) {
  return {
    index, ...params, s, v: 0, x, vx: 0, y: look.floor(s), vy: 0,
    airborne: false, airSince: 0, form: 1, finishedAt: null, splitAt: null, seen: new Set(),
  };
}

/**
 * Moves one marble on by one physics step. `ctx.rng` null means no random
 * knocks at all (used to tune each track's pace); events and stats are
 * only collected when given.
 */
function advance(m, time, ctx) {
  const { look, obstacles, rng, air, roomFull, events, stats } = ctx;
  if (rng) {
    m.form += 0.5 * (1 - m.form) * DT + 0.03 * rng.gaussian() * Math.sqrt(DT);
    m.form = clamp(m.form, 0.92, 1.08);
  }
  const note = (type, obstacle) => events && events.push({ time, index: m.index, type, ...(obstacle && { obstacle }) });
  // Knocked upwards: only from the floor (a marble already in the air isn't knocked higher).
  const kickUp = (speed) => {
    if (!air || speed <= 0 || m.airborne) return;
    m.airborne = true;
    m.airSince = time;
    m.vy = m.v * look.slope(m.s) + speed;
  };

  // --- along the track -------------------------------------------------------
  let a = m.airborne ? -m.drag * m.v * Math.abs(m.v) : steadyAccel(look, obstacles, m, m.s, m.v, m.form);
  for (const o of obstacles) {
    if (m.s < o.start) break;
    if (m.s > o.end) continue;
    const I = o.intensity;
    if (o.type === 'ramp') {
      if (!m.seen.has(o)) { m.seen.add(o); note('boost', o.type); }
    } else if (o.type === 'cable_car') {
      if (((time + o.phase) % o.period) < o.period * o.duty) {
        // A car in the way: marbles squeeze past it slowly rather than stopping dead.
        if (m.v > 2.5) a = Math.min(a, -3.5 * I * (0.7 + 0.3 * m.knockLoss));
        if (rng && rng.chance(3 * DT)) m.vx += (rng.next() < 0.5 ? -1 : 1) * 3 * m.luckKick;
        if (!m.seen.has(o)) {
          m.seen.add(o);
          note('bounce', o.type);
          if (rng) kickUp(0.8 * rng.next());
        }
      }
    } else if (rng && o.type === 'bumper') {
      if (rng.chance(2.2 * I * DT)) {
        m.vx += (rng.next() < 0.5 ? -1 : 1) * (1.5 + 2.5 * rng.next()) * I * m.luckKick;
        m.v *= 1 - 0.06 * I * m.knockLoss;
        kickUp((0.6 + 1.0 * rng.next()) * I);
        note('bounce', o.type);
      }
    } else if (rng && o.type === 'spinner') {
      if (rng.chance(1.3 * I * DT)) {
        m.vx += (rng.next() < 0.5 ? -1 : 1) * (2.5 + 3 * rng.next()) * I * m.luckKick;
        const good = rng.next() < 0.35 * m.luckBoost;
        m.v *= good ? 1 + 0.12 * I : 1 - 0.1 * I * m.knockLoss;
        kickUp((1 + 2 * rng.next()) * I);
        note(good ? 'boost' : 'bounce', o.type);
      }
    }
  }
  m.v = Math.max(0.2, m.v + a * DT);
  if (stats && m.v > stats.topSpeed) stats.topSpeed = m.v;

  // --- across the track --------------------------------------------------------
  let ax = -look.turn(m.s) * m.v * m.v; // keeps going straight while the track turns beneath it
  if (!m.airborne) ax += -TROUGH * m.x - LATERAL_DAMPING * m.vx;
  m.vx += ax * DT;
  m.x += m.vx * DT;
  const room = Math.max(0.3, roomFull * roomFactor(obstacles, m.s));
  if (Math.abs(m.x) > room) {
    const side = Math.sign(m.x);
    const impact = m.vx * side; // speed into the wall
    m.x = side * room;
    if (impact > 0) {
      m.vx = -side * impact * m.wallBounce;
      m.v = Math.max(0.2, m.v - m.wallLoss * impact);
      if (impact > 2) {
        if (stats) stats.wallHits += 1;
        note('bounce', 'wall');
      }
    }
  }

  // --- forwards, and up and down -----------------------------------------------
  const before = m.s;
  const ramp = air && obstacles.find((o) => o.type === 'ramp' && before < o.end && before + m.v * DT >= o.end);
  m.s += m.v * DT;
  if (!air) {
    m.y = look.floor(m.s);
  } else if (!m.airborne) {
    m.y = look.floor(m.s);
    m.vy = m.v * look.slope(m.s);
    // Over a crest the floor curves away; faster than gravity can follow, the marble flies.
    if (-look.bend(m.s) * m.v * m.v > G * 0.95) {
      m.airborne = true;
      m.airSince = time;
    }
    if (ramp) kickUp(m.v * (0.1 + 0.22 * ramp.intensity) * (rng ? rng.range(0.85, 1.15) : 1));
  } else {
    m.vy -= G * DT;
    m.y += m.vy * DT;
    const floor = look.floor(m.s);
    if (m.y <= floor) {
      const surface = m.v * look.slope(m.s);
      const impact = surface - m.vy; // closing speed with the floor
      const airtime = time - m.airSince;
      if (stats) {
        if (airtime > 0.35) { stats.jumps += 1; note('jump'); }
        if (airtime > stats.longestAir) stats.longestAir = airtime;
      }
      m.y = floor;
      if (impact > 1.2) {
        m.vy = surface + impact * 0.35; // bounce
        m.airSince = time;
      } else {
        m.airborne = false;
        m.vy = surface;
      }
      m.v *= 1 - 0.03 * Math.min(1, impact / 3) * m.knockLoss;
    } else if (stats && m.y - floor > stats.highestAir) {
      stats.highestAir = m.y - floor;
    }
  }
  return before;
}

/**
 * The splitter's shape at distance s: both channels start as the main channel
 * itself, then pull apart (each centre `apart` metres from the middle at the
 * widest) and narrow to their own radius, then come back together as one.
 * So a marble's place across never jumps when it enters or leaves a channel.
 */
function forkSpread(fork, s) {
  const f = clamp((s - fork.s0) / (fork.s1 - fork.s0), 0, 1);
  return Math.sin(Math.PI * f);
}
function forkOffset(fork, s) {
  return fork.apart * forkSpread(fork, s);
}
function forkRadius(fork, mainRadius, s) {
  return mainRadius + (fork.radius - mainRadius) * forkSpread(fork, s);
}
function forkOffsetSlope(fork, s) {
  const f = clamp((s - fork.s0) / (fork.s1 - fork.s0), 0, 1);
  return (fork.apart * Math.PI * Math.cos(Math.PI * f)) / (fork.s1 - fork.s0);
}

/**
 * One physics step in a U-shaped ice channel. The marble's place across the
 * channel is an angle up its wall (m.th, radians; positive towards the
 * track's left): gravity pulls it to the bottom, going round a bend pushes it
 * up the outside wall, where it rides high at speed. Bends cost a little
 * speed (skidding). At the splitter it drops into the inside (tight) or
 * outside (long) channel depending on its line; they merge again later.
 */
function advanceChannel(m, time, ctx) {
  const { look, rng, air, events, stats, channel, fork } = ctx;
  if (rng) {
    m.form += 0.5 * (1 - m.form) * DT + 0.03 * rng.gaussian() * Math.sqrt(DT);
    m.form = clamp(m.form, 0.92, 1.08);
  }
  const note = (type, obstacle) => events && events.push({ time, index: m.index, type, ...(obstacle && { obstacle }) });

  // Geometry where the marble is: the main channel, or one side of the splitter.
  const turnMain = look.turn(m.s);
  let stretch = 1; // channel length per metre of main track
  let radius = channel.radius;
  if (m.branch) {
    const o = m.branch * forkOffset(fork, m.s);
    stretch = Math.hypot(1 - o * turnMain, forkOffsetSlope(fork, m.s));
    radius = forkRadius(fork, channel.radius, m.s);
  }
  const turn = turnMain / stretch;
  const slope = clamp(look.slope(m.s) / stretch, -0.97, 0.97);
  const kickUp = (speed) => {
    if (!air || speed <= 0 || m.airborne) return;
    m.airborne = true;
    m.airSince = time;
    m.vy = m.v * slope + speed;
  };

  // --- along the channel ------------------------------------------------------
  // At these speeds air drag decides it: a marble's top speed and its form on the day.
  // The splitter's channels have their own ice: rough on the tight inside
  // (more skidding), glassy on the long outside (less drag), balanced so
  // neither is faster for an average marble.
  const ice = m.branch > 0 ? { drag: 1, scrub: fork.insideScrub } : m.branch < 0 ? { drag: fork.outsideDrag, scrub: 1 } : { drag: 1, scrub: 1 };
  let a = -(m.iceDrag * ice.drag / (m.form * m.form)) * m.v * Math.abs(m.v);
  if (!m.airborne) {
    a += -G * ROLLING * slope * m.glide * m.form - G * ICE_CRR + m.push * m.form * Math.max(0, 1 - m.v / m.pushFade);
    a -= ICE_SCRUB * ice.scrub * m.knockLoss * m.v * m.v * Math.abs(turn); // handling: skids less in the bends
  }
  m.v = Math.max(0.5, m.v + a * DT);
  if (stats && m.v > stats.topSpeed) stats.topSpeed = m.v;

  // --- up and down the channel walls ------------------------------------------
  const cornering = turn * m.v * m.v; // sideways push of the bend (towards the outside)
  let thAcc = (-cornering * Math.cos(m.th)) / radius;
  if (!m.airborne) thAcc += (-ROLLING * G * Math.sin(m.th)) / radius - CHANNEL_DAMPING * m.thv;
  m.thv += thAcc * DT;
  if (rng && !m.airborne) m.thv += ICE_RUTS * m.luckKick * rng.gaussian() * Math.sqrt(DT); // bumpy ice (luck: fewer)
  m.th += m.thv * DT;
  if (Math.abs(m.th) > channel.maxAngle) {
    const side = Math.sign(m.th);
    const impact = m.thv * side * radius; // speed over the lip
    m.th = side * channel.maxAngle;
    if (impact > 0) {
      m.thv = -side * (impact / radius) * 0.25;
      m.v = Math.max(0.5, m.v - m.wallLoss * impact * 0.5);
      if (impact > 2) {
        if (stats) stats.wallHits += 1;
        note('bounce', 'wall');
      }
    }
  }

  // --- forwards ------------------------------------------------------------------
  const before = m.s;
  m.s += (m.v * DT) / stretch;

  if (fork && !m.branch && before < fork.s0 && m.s >= fork.s0) {
    // The splitter: the marble's line decides its channel; dead centre clips the wedge.
    let across = channel.radius * Math.sin(m.th);
    if (Math.abs(across) < SPLITTER_TIP) {
      const side = rng ? (rng.next() < 0.5 ? -1 : 1) : (m.index % 2 ? 1 : -1);
      across = side * SPLITTER_TIP;
      m.v *= 1 - 0.06 * m.knockLoss;
      if (rng) kickUp(0.6 + 0.8 * rng.next());
      note('bounce', 'splitter');
    }
    m.branch = across > 0 ? 1 : -1;
    // Here the channel it drops into is still the main channel itself: same place across.
    m.th = Math.asin(clamp(across / channel.radius, -Math.sin(channel.maxAngle), Math.sin(channel.maxAngle)));
    m.forkIn = time;
    if (stats) stats.fork[m.branch > 0 ? 'inside' : 'outside'].count += 1;
  } else if (m.branch && before < fork.s1 && m.s >= fork.s1) {
    // The channels have become one again: same place across, now in the main channel.
    if (stats) stats.fork[m.branch > 0 ? 'inside' : 'outside'].seconds.push(time - m.forkIn);
    m.branch = 0;
  }

  // --- up and down (air) --------------------------------------------------------
  if (!air) {
    m.y = look.floor(m.s);
  } else if (!m.airborne) {
    m.y = look.floor(m.s);
    m.vy = m.v * slope;
    if ((-look.bend(m.s) / (stretch * stretch)) * m.v * m.v > G * 0.95) {
      m.airborne = true;
      m.airSince = time;
    }
  } else {
    m.vy -= G * DT;
    m.y += m.vy * DT;
    const floor = look.floor(m.s);
    if (m.y <= floor) {
      const surface = m.v * slope;
      const impact = surface - m.vy;
      const airtime = time - m.airSince;
      if (stats) {
        if (airtime > 0.35) { stats.jumps += 1; note('jump'); }
        if (airtime > stats.longestAir) stats.longestAir = airtime;
      }
      m.y = floor;
      if (impact > 1.2) {
        m.vy = surface + impact * 0.3;
        m.airSince = time;
      } else {
        m.airborne = false;
        m.vy = surface;
      }
      m.v *= 1 - 0.02 * Math.min(1, impact / 3) * m.knockLoss;
    } else if (stats && m.y - floor > stats.highestAir) {
      stats.highestAir = m.y - floor;
    }
  }
  return before;
}

/**
 * Air drag for this track so that a weaker-than-average marble takes about
 * TARGET_SECONDS, leaving room for bad luck under the 90 s cap: tracks differ
 * in length and drop, races shouldn't. Tuned with exactly the race physics
 * (bends, walls, air and the knocks of a fixed practice run), using a few
 * such marbles across the track.
 */
const dragCache = new Map();
function calibrateDrag(ctx, key) {
  if (dragCache.has(key)) return dragCache.get(key);
  const timeFor = (drag) => {
    let sum = 0;
    const starts = [-0.6, -0.2, 0.2, 0.6];
    starts.forEach((across, k) => {
      const m = newMarble(0, marbleParams(PACE_MARBLE, drag), 0.6, across * ctx.roomFull, ctx.look);
      const run = { ...ctx, rng: createRng(9001 + k), events: null, stats: null };
      let t = 0;
      while (m.s < ctx.look.total && t < 300) {
        t += DT;
        advance(m, t, run);
      }
      sum += t;
    });
    return sum / starts.length;
  };
  let lo = Math.log(1e-5);
  let hi = Math.log(0.5);
  for (let k = 0; k < 18; k += 1) {
    const mid = (lo + hi) / 2;
    if (timeFor(Math.exp(mid)) < TARGET_SECONDS) lo = mid; else hi = mid;
  }
  const drag = Math.exp((lo + hi) / 2);
  if (dragCache.size > 50) dragCache.clear();
  dragCache.set(key, drag);
  return drag;
}

/**
 * @param {object} input
 * @param {number} input.seed
 * @param {object} input.track   { slug?, length_m, lane_count, waypoints, obstacles }
 * @param {Array}  input.entries [{ id, topSpeed, acceleration, handling, luck, lane }]
 * @param {number} [input.level=3] 2 = rolling only, 3 = rolling + air and bounce
 * @param {number} [input.tickRateHz=20]
 */
function simulatePhysicsRace({ seed, track, entries, level = 3, tickRateHz = 20 }) {
  if (!Number.isInteger(seed) || seed < 0) throw new Error('seed must be a non-negative integer');
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('entries must be a non-empty array');
  const air = level >= 3;

  const physicsRng = createRng(subSeed(seed, 1));
  const timetableRng = createRng(subSeed(seed, 4));

  const centerline = buildCenterline(track);
  const look = profileLookup(trackProfile(centerline));
  const total = look.total;
  const obstacles = normaliseObstacles(track.obstacles, timetableRng, total);
  const lanes = Math.max(1, Number(track.lane_count) || 4);
  const roomFull = (lanes * TRACK_STYLE.laneWidth) / 2 - RADIUS;
  const rawEvents = [];
  const stats = { topSpeed: 0, wallHits: 0, jumps: 0, longestAir: 0, highestAir: 0 };
  const ctx = { look, obstacles, rng: physicsRng, air, roomFull, events: rawEvents, stats };
  // Ice channel tracks (bobsleigh): a U-shaped channel, maybe a splitter, free pace.
  const tp = track.physics;
  if (tp?.channel) {
    ctx.channel = { radius: tp.channel.radius, maxAngle: (tp.channel.maxAngle * Math.PI) / 180 };
    if (tp.fork) {
      ctx.fork = {
        s0: tp.fork.from * total, s1: tp.fork.to * total, radius: tp.fork.radius, apart: tp.fork.apart,
        insideScrub: tp.fork.insideScrub ?? 1,
        outsideDrag: tp.fork.outsideDrag ?? 1,
      };
      stats.fork = { inside: { count: 0, seconds: [] }, outside: { count: 0, seconds: [] } };
    }
  }
  const moveMarble = ctx.channel ? advanceChannel : advance;
  const key = `${level}:${track.slug ?? ''}:${total.toFixed(3)}:${lanes}:${JSON.stringify(track.obstacles ?? [])}`;
  const drag = tp?.pace === 'free' ? FREE_DRAG : calibrateDrag(ctx, key);

  // Starting grid (step 5 replaces it with a fair starting gate).
  const laneCount = Math.max(1, Math.min(entries.length, lanes));
  const rows = Math.ceil(entries.length / laneCount);
  const marbles = entries.map((entry, index) => {
    const lane = Number.isInteger(entry.lane) ? entry.lane : index;
    const row = Math.floor(lane / laneCount);
    const across = laneCount === 1 ? 0 : -1 + (2 * (lane % laneCount)) / (laneCount - 1);
    const m = newMarble(index, marbleParams(entry, drag), 0.6 + (rows - 1 - row) * START_ROW_GAP, across * roomFull * 0.85, look);
    if (ctx.channel) {
      const top = clamp(Number(entry.topSpeed) || 50, 1, 100) / 100;
      const acc = clamp(Number(entry.acceleration) || 50, 1, 100) / 100;
      Object.assign(m, {
        th: across * 0.5 * ctx.channel.maxAngle, thv: 0, branch: 0,
        iceDrag: drag * (1 + ICE_DRAG_SPREAD * (0.5 - top)),
        glide: 1 + ICE_GLIDE_SPREAD * (acc - 0.5),
      });
    }
    return m;
  });

  const stepsPerTick = Math.round(1 / tickRateHz / DT);
  const tickMs = Math.round(1000 / tickRateHz);
  const trace = marbles.map(() => ({ s: [], x: [], h: [], v: [], b: [] }));
  const record = () => {
    for (const m of marbles) {
      const t = trace[m.index];
      t.s.push(m.s);
      t.x.push(ctx.channel ? m.th / ctx.channel.maxAngle : m.x / roomFull);
      t.h.push(air ? Math.max(0, m.y - look.floor(m.s)) : 0);
      t.v.push(m.v);
      t.b.push(m.branch || 0);
    }
  };
  record();

  let time = 0;
  let step = 0;
  let remaining = marbles.length;
  const half = total / 2;
  while (remaining > 0 && time < CAP_SECONDS - 1e-9) {
    time += DT;
    step += 1;
    for (const m of marbles) {
      if (m.finishedAt !== null) continue;
      const before = moveMarble(m, time, ctx);
      if (m.splitAt === null && m.s >= half) m.splitAt = time - DT + ((half - before) / (m.s - before)) * DT;
      if (m.s >= total) {
        m.finishedAt = time - DT + ((total - before) / (m.s - before)) * DT;
        m.s = total;
        remaining -= 1;
      }
    }
    if (step % stepsPerTick === 0) record();
  }

  // --- results --------------------------------------------------------------
  const finishers = marbles.filter((m) => m.finishedAt !== null).sort((a, b) => a.finishedAt - b.finishedAt || a.index - b.index);
  const unfinished = marbles.filter((m) => m.finishedAt === null).sort((a, b) => b.s - a.s || a.index - b.index);
  const results = [...finishers, ...unfinished].map((m, i) => ({
    index: m.index,
    entryId: entries[m.index].id,
    position: i + 1,
    finishTimeMs: m.finishedAt === null ? null : Math.max(1, Math.round(m.finishedAt * 1000)),
    splitTimeMs: m.splitAt === null ? null : Math.max(1, Math.round(m.splitAt * 1000)),
    ...(m.finishedAt === null && { dnf: true }),
  }));
  for (let i = 1; i < finishers.length; i += 1) {
    if (results[i].finishTimeMs <= results[i - 1].finishTimeMs) results[i].finishTimeMs = results[i - 1].finishTimeMs + 1;
  }
  const lastFinish = finishers.length ? results[finishers.length - 1].finishTimeMs : 0;
  const durationMs = unfinished.length ? CAP_SECONDS * 1000 : lastFinish;

  // --- frames -------------------------------------------------------------------
  const finishMs = new Map(results.map((r) => [r.index, r.finishTimeMs]));
  const ticks = trace[0].s.length;
  const frames = [];
  const frameCount = Math.ceil(durationMs / tickMs) + 1;
  for (let k = 0; k < frameCount; k += 1) {
    const t = Math.min(k * tickMs, durationMs);
    const j = Math.min(ticks - 1, Math.round(t / tickMs));
    const p = [];
    const l = [];
    const h = [];
    const v = [];
    const b = [];
    for (const m of marbles) {
      const done = finishMs.get(m.index) !== null && t >= finishMs.get(m.index);
      const tr = trace[m.index];
      p.push(done ? 1 : Math.min(0.99999, Math.round((tr.s[j] / total) * 1e5) / 1e5));
      l.push(Math.round(clamp(tr.x[j], -1, 1) * 1000) / 1000);
      h.push(done ? 0 : Math.round(tr.h[j] * 1000) / 1000);
      v.push(done ? 0 : Math.round(tr.v[j] * 10) / 10); // speed, m/s (for the speed readout)
      b.push(done ? 0 : tr.b[j]); // splitter channel: 1 inside, -1 outside, 0 main channel
    }
    const standings = marbles.map((m) => m.index).sort((a, b) => {
      const fa = finishMs.get(a);
      const fb = finishMs.get(b);
      const da = fa !== null && t >= fa;
      const db = fb !== null && t >= fb;
      if (da && db) return fa - fb;
      if (da !== db) return da ? -1 : 1;
      return p[b] - p[a] || a - b;
    });
    frames.push({ t, p, l, h, v, ...(ctx.fork && { b }), s: standings });
  }

  const events = rawEvents
    .map((e) => ({ t: Math.round(e.time * 1000), i: e.index, type: e.type, ...(e.obstacle && { obstacle: e.obstacle }) }))
    .filter((e) => e.t <= durationMs);

  return {
    seed,
    physics: PHYSICS_VERSION,
    level,
    durationMs,
    tickMs,
    tickRateHz,
    marbleCount: marbles.length,
    results,
    frames,
    events,
    stats: {
      winnerMs: results[0]?.finishTimeMs ?? null,
      lastMs: finishers.length === marbles.length ? lastFinish : null,
      unfinished: unfinished.length,
      topSpeed: Math.round(stats.topSpeed * 10) / 10,
      wallHits: stats.wallHits,
      jumps: stats.jumps,
      longestAirSeconds: Math.round(stats.longestAir * 100) / 100,
      highestAirMetres: Math.round(stats.highestAir * 100) / 100,
      averageSpeed: results[0]?.finishTimeMs ? Math.round((total / (results[0].finishTimeMs / 1000)) * 10) / 10 : null,
      trackMetres: Math.round(total),
      ...(stats.fork && {
        splitter: Object.fromEntries(Object.entries(stats.fork).map(([side, f]) => [side, {
          marbles: f.count,
          seconds: f.seconds.length ? Math.round((f.seconds.reduce((a, x) => a + x, 0) / f.seconds.length) * 100) / 100 : null,
        }])),
      }),
    },
  };
}

module.exports = { simulatePhysicsRace, PHYSICS_VERSION };
