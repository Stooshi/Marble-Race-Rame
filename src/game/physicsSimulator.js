'use strict';

const { createRng } = require('./rng');
const { bearPaw, bearPawSpeed, normaliseFeatures, SOLID_TYPES } = require('./trackFeatures');
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
 * On tracks that switch it on (the bobsleigh run), marbles bump into each
 * other, draft behind each other and finish into a catch area. Deterministic:
 * the same input always gives the same race.
 *
 * Output frames are { t, p, l, h, s }: progress 0..1 along the drawn track,
 * lateral -1..1 (wall to wall, as the 3D view uses it), height of the ball
 * above the floor in metres, and standings.
 */

const PHYSICS_VERSION = 'physics-preview-3'; // 2: ice knocks in metres, growing with speed (a clean start); 3: boost pads, speed bumps, obstacles

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
const ICE_RUTS = 0.5;          // rad/s per √s (in the channel proper): bumps in the ice knock marbles off their line…
const RUTS_FULL_SPEED = 8;     // m/s: …at full strength from this speed (gentler while the field gets going)
// With bumping, drafting and passing the field mixes on its own, so stats
// count for less than before: better marbles win more, without dominating.
const ICE_DRAG_SPREAD = 1.55;  // how much top speed (and form) change drag on ice
const ICE_GLIDE_SPREAD = 0.31; // how much acceleration (and form) change how well a marble glides
const ICE_FORM_PULL = 0.1;     // 1/s: how quickly form drifts back to normal…
const ICE_FORM_DRIFT = 0.02;   // …and how much it wanders (good and bad spells)
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
 * The main channel's radius at distance s: a wide funnel at the top of the
 * run (where the whole field starts side by side) narrowing smoothly to the
 * channel proper.
 */
function funnelShare(channel, s) {
  const f = channel.funnel;
  if (!f || s >= f.length) return 0;
  const k = Math.max(0, s) / f.length;
  return 1 - k * k * (3 - 2 * k);
}
function channelRadius(channel, s) {
  const f = channel.funnel;
  return f ? channel.radius + (f.radius - channel.radius) * funnelShare(channel, s) : channel.radius;
}
/** How far up its wall the channel goes at s (radians): the walls keep the same height through the funnel. */
function channelLip(channel, s) {
  if (!channel.funnel) return channel.maxAngle;
  const height = channel.radius * (1 - Math.cos(channel.maxAngle));
  return Math.min(channel.maxAngle, Math.acos(clamp(1 - height / channelRadius(channel, s), -1, 1)));
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
    // Form on the ice drifts slowly: a marble can have a good or bad spell lasting several seconds.
    m.form += ICE_FORM_PULL * (1 - m.form) * DT + ICE_FORM_DRIFT * rng.gaussian() * Math.sqrt(DT);
    m.form = clamp(m.form, 0.92, 1.08);
  }
  const note = (type, obstacle) => events && events.push({ time, index: m.index, type, ...(obstacle && { obstacle }) });

  // Geometry where the marble is: the main channel, or one side of the splitter.
  const turnMain = look.turn(m.s);
  let stretch = 1; // channel length per metre of main track
  let radius = channelRadius(channel, m.s);
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
  let a = -(m.iceDrag * ice.drag * (m.draft ?? 1) / (m.form * m.form)) * m.v * Math.abs(m.v); // draft: slipstream
  if (!m.airborne) {
    a += -G * ROLLING * slope * m.glide * m.form - G * ICE_CRR + m.push * m.form * Math.max(0, 1 - m.v / m.pushFade);
    a -= ICE_SCRUB * ice.scrub * m.knockLoss * m.v * m.v * Math.abs(turn); // handling: skids less in the bends
    // Boost pads: a burst of speed while rolling over the chevrons (on the right line).
    for (const f of ctx.boosts ?? []) {
      if (m.branch || m.s < f.s || m.s > f.s + f.length) continue;
      if (Math.abs(radius * m.th - f.x) > f.halfWidth) continue;
      a += BOOST_ACCEL;
      if (m.lastBoost !== f.id) {
        m.lastBoost = f.id;
        if (stats) stats.features.boost += 1;
        note('boost', 'boost_pad');
      }
    }
  }
  m.v = Math.max(0.5, m.v + a * DT);
  if (stats && m.v > stats.topSpeed) stats.topSpeed = m.v;

  // --- up and down the channel walls ------------------------------------------
  const cornering = turn * m.v * m.v; // sideways push of the bend (towards the outside)
  let thAcc = (-cornering * Math.cos(m.th)) / radius;
  if (!m.airborne) thAcc += (-ROLLING * G * Math.sin(m.th)) / radius - CHANNEL_DAMPING * m.thv;
  m.thv += thAcc * DT;
  if (rng && !m.airborne) {
    // Bumpy ice (luck: fewer knocks). A knock is a sideways shove of the same
    // size in metres wherever the marble is, so up the wide starting funnel
    // (a bigger radius) it is a smaller angle; and it grows with speed, so a
    // marble just let go by the gate rolls straight down the slope rather
    // than jittering from side to side.
    const ruts = ICE_RUTS * (channel.radius / radius) * Math.min(1, m.v / RUTS_FULL_SPEED);
    m.thv += ruts * m.luckKick * rng.gaussian() * Math.sqrt(DT);
  }
  m.th += m.thv * DT;
  const lip = m.branch ? channel.maxAngle : channelLip(channel, m.s);
  if (Math.abs(m.th) > lip) {
    const side = Math.sign(m.th);
    const impact = m.thv * side * radius; // speed over the lip
    m.th = side * lip;
    if (impact > 0) {
      m.thv = -side * (impact / radius) * 0.25;
      // In a crowd marbles get leant against the lip: only a real knock costs speed.
      const knock = ctx.collisions ? Math.max(0, impact - LIP_GRACE) : impact;
      m.v = Math.max(0.5, m.v - m.wallLoss * knock * 0.5);
      if (impact > 2) {
        if (stats) stats.wallHits += 1;
        note('bounce', 'wall');
      }
    }
  }

  // --- forwards ------------------------------------------------------------------
  const before = m.s;
  m.s += (m.v * DT) / stretch;

  // Speed bumps: a ridge across the channel; marbles hop over it and lose a little speed.
  for (const f of ctx.bumps ?? []) {
    if (m.branch || before >= f.s - BUMP_HALF || m.s < f.s - BUMP_HALF) continue;
    if (m.airborne) continue; // flying over it
    m.v = Math.max(0.5, m.v * (1 - BUMP_LOSS * m.knockLoss));
    kickUp(Math.min(BUMP_HOP_MAX, BUMP_HOP * m.v));
    if (stats) stats.features.bump += 1;
  }

  if (fork && !m.branch && before < fork.s0 && m.s >= fork.s0) {
    // The splitter: the marble's line decides its channel; dead centre clips the wedge.
    // The wedge may stand a little off centre (fork.tipOffset, metres towards the inside).
    let across = channel.radius * Math.sin(m.th) - fork.tipOffset;
    if (Math.abs(across) < SPLITTER_TIP) {
      const side = rng ? (rng.next() < 0.5 ? -1 : 1) : (m.index % 2 ? 1 : -1);
      across = side * SPLITTER_TIP;
      m.v *= 1 - 0.06 * m.knockLoss;
      if (rng) kickUp(0.6 + 0.8 * rng.next());
      note('bounce', 'splitter');
    }
    m.branch = across > 0 ? 1 : -1;
    // Here the channel it drops into is still the main channel itself: same place across.
    m.th = Math.asin(clamp((across + fork.tipOffset) / channel.radius, -Math.sin(channel.maxAngle), Math.sin(channel.maxAngle)));
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

// Marble-to-marble collisions (tracks with physics.collisions, e.g. the
// bobsleigh run). Equal-weight balls: a hit swaps speed between them, a
// glancing one throws them apart across the ice, and a crowd scatters.
const BUMP_BOUNCE = 0.55;      // how bouncy a hit is (0 = they stick, 1 = perfectly elastic)
const BUMP_SCATTER = 0.7;      // random spin-off sideways, as a share of the hit
const BUMP_SIDESTEP = 2;       // a hit from behind knocks the two aside (share of the hit), so the faster one can get past
const DRAFT = 0.25;            // up to this much less air drag tucked in behind another marble (slipstream)…
const DRAFT_REACH = 10;        // …fading out by this many metres back
const DRAFT_WIDTH = 1.4;       // …and this far off its line
const LIP_GRACE = 1;           // m/s: leaning on the channel's lip in a crowd costs nothing, a real knock does
const BUMP_NEWS = 6;           // m/s: a hit this hard makes the race commentary
const NEWS_GAP = 8;            // seconds: on the ice, at most one commentary line per marble this often
const BUMP_MIN = 0.4;          // m/s: slower than this, marbles are just leaning on each other
const DIAMETER = 2 * RADIUS;

/** Where a marble sits in the channel's cross-section: metres across and up (from the main channel's middle). */
function crossSection(m, ctx) {
  const { channel, fork, look } = ctx;
  let off = 0;
  let R = channelRadius(channel, m.s);
  if (m.branch) {
    off = m.branch * forkOffset(fork, m.s);
    R = forkRadius(fork, channel.radius, m.s);
  }
  const lift = m.airborne ? Math.max(0, m.y - look.floor(m.s)) : 0;
  return { x: off + R * Math.sin(m.th), y: R * (1 - Math.cos(m.th)) + lift, R };
}

/**
 * Resolves touching marbles in an ice channel after a physics step: pushes
 * them apart and exchanges an impulse along the line between their centres.
 * The along-track part changes speed (a shove from behind passes speed on),
 * the across part throws them up and down the wall. Marbles in different
 * splitter channels are kept apart by the divider.
 */
function collideChannel(marbles, time, ctx) {
  const { rng, stats, events } = ctx;
  const live = marbles.filter((m) => m.finishedAt === null).sort((a, b) => a.s - b.s || a.index - b.index);
  const n = live.length;
  for (const m of live) m.draft = 1;
  if (n < 2) return;
  const cs = live.map((m) => crossSection(m, ctx));
  // Slipstream for the next step: the nearest marble just ahead on the same line.
  for (let i = 0; i < n; i += 1) {
    const a = live[i];
    for (let j = i + 1; j < n; j += 1) {
      const gap = live[j].s - a.s;
      if (gap > DRAFT_REACH) break;
      if (a.branch !== live[j].branch || Math.abs(cs[j].x - cs[i].x) > DRAFT_WIDTH) continue;
      a.draft = 1 - DRAFT * (1 - gap / DRAFT_REACH);
      break;
    }
  }
  for (let i = 0; i < n; i += 1) {
    const a = live[i];
    for (let j = i + 1; j < n; j += 1) {
      const b = live[j];
      const ds = b.s - a.s;
      if (ds >= DIAMETER) break; // sorted along the track: nobody further on can touch
      if (a.branch && b.branch && a.branch !== b.branch) continue;
      const dx = cs[j].x - cs[i].x;
      const dy = cs[j].y - cs[i].y;
      const d2 = ds * ds + dx * dx + dy * dy;
      if (d2 >= DIAMETER * DIAMETER) continue;
      const d = Math.sqrt(d2) || 1e-6;
      // Normal from a to b: along the track, and across (the wall's direction at their middle).
      const ns = d2 > 1e-12 ? ds / d : 1;
      const nx = d2 > 1e-12 ? dx / d : 0;
      const ny = d2 > 1e-12 ? dy / d : 0;
      // Across-the-wall speeds turned into cross-section velocities.
      const ua = a.thv * cs[i].R;
      const ub = b.thv * cs[j].R;
      const ta = { x: Math.cos(a.th), y: Math.sin(a.th) };
      const tb = { x: Math.cos(b.th), y: Math.sin(b.th) };
      // Closing speeds along the track and across it, each along the line between centres.
      const closeAlong = -(b.v - a.v) * ns;
      const tna = nx * ta.x + ny * ta.y; // how much of the line between them is across, for each
      const tnb = nx * tb.x + ny * tb.y;
      const closeAcross = -(ub * tnb - ua * tna);
      const vrel = -(closeAlong + closeAcross);
      // A marble still held at the starting gate doesn't budge: the other takes it all.
      const heldA = a.releaseAt > time;
      const heldB = b.releaseAt > time;
      if (heldA && heldB) continue;
      const wa = heldA ? 0 : heldB ? 1 : 0.5;
      const wb = 1 - wa;
      // Push apart (half each), along the track and across.
      const overlap = DIAMETER - d;
      a.s -= wa * overlap * ns;
      b.s += wb * overlap * ns;
      a.th -= (wa * overlap * tna) / cs[i].R;
      b.th += (wb * overlap * tnb) / cs[j].R;
      if (vrel >= 0) continue; // already moving apart
      // Equal weights. A hit from behind passes speed on along the track; a
      // shove from the side pushes sideways (it doesn't squirt marbles forwards).
      const Js = (1 + BUMP_BOUNCE) * Math.max(0, closeAlong);
      const Jx = (1 + BUMP_BOUNCE) * Math.max(0, closeAcross);
      const J = (Js + Jx) / 2;
      a.v = Math.max(0.5, a.v - wa * Js * ns);
      b.v = Math.max(0.5, b.v + wb * Js * ns);
      a.thv -= (wa * Jx * tna) / cs[i].R;
      b.thv += (wb * Jx * tnb) / cs[j].R;
      if (-vrel < BUMP_MIN) continue; // resting against each other, not a hit
      // Hit from behind: the two are knocked aside, opposite ways, so the faster one can come past.
      let way = Math.sign(dx);
      if (Math.abs(dx) < 0.05) way = rng ? (rng.next() < 0.5 ? -1 : 1) : (a.index < b.index ? 1 : -1);
      a.thv -= (2 * wa * way * BUMP_SIDESTEP * Js / 2) / cs[i].R;
      b.thv += (2 * wb * way * BUMP_SIDESTEP * Js / 2) / cs[j].R;
      if (rng) {
        // A real crowd doesn't part neatly: each one spins off a little to one side.
        a.thv += (2 * wa * BUMP_SCATTER * J * a.luckKick * rng.gaussian()) / cs[i].R;
        b.thv += (2 * wb * BUMP_SCATTER * J * b.luckKick * rng.gaussian()) / cs[j].R;
      }
      if (stats) {
        stats.bumps += 1;
        if (-vrel > 3) stats.bigBumps += 1;
        if (-vrel > BUMP_NEWS && events) events.push({ time, index: b.index, type: 'bounce', obstacle: 'marble' });
      }
    }
  }
}

// Boost pads, speed bumps and solid obstacles (tracks with physics.features).
const BOOST_ACCEL = 11;      // m/s² while on a boost pad (about +3 m/s over an 8 m pad at race speed)
const BUMP_HALF = 1.1;       // metres from a bump's crest to where it throws marbles up (the 3D view's ridge: 1.2)
const BUMP_LOSS = 0.05;      // share of speed a bump costs (less with good handling)
const BUMP_HOP = 0.08;       // how high a bump throws a marble (m/s upwards per m/s of speed)…
const BUMP_HOP_MAX = 3;      // …up to this: a hop, not a flight
const SOLID_BOUNCE = 0.45;   // how bouncy the obstacles are
const SOLID_LOSS = 0.06;     // share of speed a hit costs on top of the bounce (less with good handling)
const SOLID_SCATTER = 0.35;  // a hit never bounces quite the same way twice
const SOLID_MAX_LOSS = 0.4;  // a hit, however square, costs at most this share of speed: the rest throws it aside…
const SOLID_MAX_KNOCK = 12;  // …across the channel at up to this (m/s)
const PAW_SWAT = 1.0;        // how much of the paw's own speed it passes on

/**
 * A marble against the obstacles near it: a round footprint (metres along
 * the track and along the wall) it bounces off, losing some speed and
 * thrown across the channel. Airborne marbles clear an obstacle lower than
 * they fly (the icicles hang down from above, so nothing clears them). The
 * polar bear's paw moves: at full swing it swats marbles harder.
 */
function hitSolids(m, time, ctx) {
  const { channel, look, rng, stats, events } = ctx;
  if (m.branch) return;
  const R = channelRadius(channel, m.s);
  for (const o of ctx.solids) {
    const ds = m.s - o.s;
    if (ds < -3 || ds > 3) continue;
    let ox = o.x;
    let ou = 0; // the obstacle's own speed across the channel
    if (o.type === 'polar_bear') {
      const k = bearPaw(time);
      ox = o.x + (o.reach - o.x) * k;
      ou = (o.reach - o.x) * bearPawSpeed(time) * PAW_SWAT;
    }
    const lift = m.airborne ? Math.max(0, m.y - look.floor(m.s)) : 0;
    if (o.type !== 'icicles' && lift > o.height) continue;
    const dx = R * m.th - ox;
    const reach = o.radius + RADIUS;
    if (ds * ds + dx * dx >= reach * reach) continue;
    // A round obstacle: the marble glances off to the side it was on and
    // carries on round it (it never ends up stuck behind it).
    const side = Math.abs(dx) > 0.05 ? Math.sign(dx) : rng ? (rng.next() < 0.5 ? -1 : 1) : (m.index % 2 ? 1 : -1);
    m.th = (ox + side * Math.sqrt(Math.max(0, reach * reach - ds * ds))) / R;
    if (m.lastSolid === o.id && time - m.lastSolidAt < 0.4) continue; // still the same contact
    m.lastSolid = o.id;
    m.lastSolidAt = time;
    // How square the hit is (1: dead centre, 0: a graze) decides what it costs
    // and how hard it throws the marble aside. A game, not a simulation: a
    // marble never stops dead, it is knocked about and races on.
    const square = Math.max(0, -ds / reach);
    m.v = Math.max(0.5, m.v * (1 - SOLID_MAX_LOSS * square * square - SOLID_LOSS * m.knockLoss * square));
    let knock = side * (1 + SOLID_BOUNCE) * Math.min(SOLID_MAX_KNOCK, 0.3 * m.v * square + 2);
    knock += (1 + SOLID_BOUNCE) * ou * (Math.sign(ou) === side ? 1 : 0); // the paw swats it on its way
    if (rng) knock += SOLID_SCATTER * Math.abs(knock) * m.luckKick * rng.gaussian();
    m.thv = Math.max(-SOLID_MAX_KNOCK, Math.min(SOLID_MAX_KNOCK, m.thv * R * 0.3 + knock)) / R;
    if (stats) stats.features[o.type] += 1;
    if (square > 0.4 && events) events.push({ time, index: m.index, type: 'bounce', obstacle: o.type, news: true });
  }
}

// The catch area past the finish line (tracks with physics.runout): a pen
// with brushes that slow marbles down, its floor tipped gently towards a
// cushioned end wall.
// Finishers roll in and bump into the ones already there. The finishing
// order was settled at the line; this is only what happens afterwards.
const PEN_BRUSH = 0.07;        // 1/m: the brushes' drag (strong at speed)
const PEN_ROLL = 0.25;         // m/s²: and a little grip, so marbles come to rest…
const PEN_TILT = 1.2;          // m/s²: …on a floor tipped gently towards the end cushion, where they gather
const PEN_BOUNCE = 0.2;        // off the pen's walls and cushion
const PEN_HIT_BOUNCE = 0.25;   // finishers rolling into the pile shove it rather than rebound
const PEN_SETTLE = 6;          // seconds after the last finisher that the replay may keep rolling while they settle

function enterPen(m, overshoot, ctx) {
  const { channel, pen } = ctx;
  const R = channel.radius;
  // Off the channel wall onto the pen floor: same place across, the wall's swing becomes sideways speed.
  m.pa = Math.max(0, overshoot);
  m.px = clamp(R * Math.sin(m.th), -pen.room, pen.room);
  m.pv = m.v;
  m.pvx = clamp(R * Math.cos(m.th) * m.thv * 0.5, -3, 3);
}

function movePen(marbles, ctx) {
  const { pen, stats } = ctx;
  const inPen = marbles.filter((m) => m.pa !== undefined);
  if (!inPen.length) return;
  const slow = (v, drag) => {
    const dv = (drag * v * Math.abs(v) + PEN_ROLL * Math.sign(v)) * DT;
    return Math.abs(dv) >= Math.abs(v) ? 0 : v - dv;
  };
  for (const m of inPen) {
    m.pv += PEN_TILT * DT;
    m.pv = slow(m.pv, PEN_BRUSH);
    m.pvx = slow(m.pvx, PEN_BRUSH);
    m.pa += m.pv * DT;
    m.px += m.pvx * DT;
    if (Math.abs(m.px) > pen.room) {
      m.px = Math.sign(m.px) * pen.room;
      m.pvx = -m.pvx * PEN_BOUNCE;
    }
    if (m.pa > pen.length - RADIUS) {
      m.pa = pen.length - RADIUS;
      m.pv = -Math.abs(m.pv) * PEN_BOUNCE;
    } else if (m.pa < RADIUS && m.pv < 0) {
      m.pa = RADIUS; // rolled back to the line: a soft gate behind it
      m.pv = -m.pv * PEN_BOUNCE;
    }
  }
  // Bumps in the pen: flat, so plain 2D equal-weight hits.
  for (let i = 0; i < inPen.length; i += 1) {
    const a = inPen[i];
    for (let j = i + 1; j < inPen.length; j += 1) {
      const b = inPen[j];
      const da = b.pa - a.pa;
      const dx = b.px - a.px;
      const d2 = da * da + dx * dx;
      if (d2 >= DIAMETER * DIAMETER) continue;
      const d = Math.sqrt(d2) || 1e-6;
      const na = d2 > 1e-12 ? da / d : 1;
      const nx = d2 > 1e-12 ? dx / d : 0;
      const overlap = DIAMETER - d;
      a.pa -= 0.5 * overlap * na;
      b.pa += 0.5 * overlap * na;
      a.px = clamp(a.px - 0.5 * overlap * nx, -pen.room, pen.room);
      b.px = clamp(b.px + 0.5 * overlap * nx, -pen.room, pen.room);
      const vrel = (b.pv - a.pv) * na + (b.pvx - a.pvx) * nx;
      if (vrel >= 0) continue;
      const J = 0.5 * (1 + PEN_HIT_BOUNCE) * -vrel;
      a.pv -= J * na;
      a.pvx -= J * nx;
      b.pv += J * na;
      b.pvx += J * nx;
      if (stats && -vrel > 0.5) stats.penBumps += 1;
    }
  }
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
  const stats = { topSpeed: 0, wallHits: 0, jumps: 0, longestAir: 0, highestAir: 0, bumps: 0, bigBumps: 0 };
  const ctx = { look, obstacles, rng: physicsRng, air, roomFull, events: rawEvents, stats };
  // Ice channel tracks (bobsleigh): a U-shaped channel, maybe a splitter, free pace.
  const tp = track.physics;
  if (tp?.channel) {
    ctx.channel = { radius: tp.channel.radius, maxAngle: (tp.channel.maxAngle * Math.PI) / 180, funnel: tp.channel.funnel ?? null };
    if (tp.fork) {
      ctx.fork = {
        s0: tp.fork.from * total, s1: tp.fork.to * total, radius: tp.fork.radius, apart: tp.fork.apart,
        insideScrub: tp.fork.insideScrub ?? 1,
        tipOffset: tp.fork.tipOffset ?? 0,
        outsideDrag: tp.fork.outsideDrag ?? 1,
      };
      stats.fork = { inside: { count: 0, seconds: [] }, outside: { count: 0, seconds: [] } };
    }
  }
  // Marbles bump into each other (ice channels only), and finish into a catch area.
  const collisions = Boolean(ctx.channel && tp.collisions);
  const pen = ctx.channel && tp.runout ? { length: tp.runout.length, room: tp.runout.halfWidth - RADIUS } : null;
  ctx.pen = pen;
  ctx.collisions = collisions;
  // Boost pads, speed bumps and obstacles (ice channels with physics.features).
  if (ctx.channel && tp.features) {
    const features = normaliseFeatures(tp.features, total);
    const across = (l) => ctx.channel.radius * l * ctx.channel.maxAngle; // metres along the wall from the middle
    ctx.boosts = features.filter((f) => f.type === 'boost').map((f) => ({ ...f, x: across(f.l), length: f.length ?? 8, halfWidth: f.halfWidth ?? 1.3 }));
    ctx.bumps = features.filter((f) => f.type === 'bump');
    ctx.solids = features.filter((f) => SOLID_TYPES.includes(f.type)).map((f) => ({
      ...f,
      x: across(f.l),
      reach: f.reach === undefined ? null : across(f.reach), // the bear's paw: from its rim (l) in to here
      radius: f.radius ?? 0.7,
      height: f.height ?? 1.2,
    }));
    stats.features = { boost: 0, bump: 0, ...Object.fromEntries(SOLID_TYPES.map((t) => [t, 0])) };
  }
  if (pen) stats.penBumps = 0;
  const moveMarble = ctx.channel ? advanceChannel : advance;
  const key = `${level}:${track.slug ?? ''}:${total.toFixed(3)}:${lanes}:${JSON.stringify(track.obstacles ?? [])}`;
  const drag = tp?.pace === 'free' ? FREE_DRAG : calibrateDrag(ctx, key);

  // Starting grid. With a funnel at the top (ice channels) the whole field
  // waits in one row, side by side, behind the starting gate.
  const funnel = ctx.channel?.funnel;
  const releaseRng = funnel?.release ? createRng(subSeed(seed, 6)) : null;
  const laneCount = funnel ? entries.length : Math.max(1, Math.min(entries.length, lanes));
  const rows = Math.ceil(entries.length / laneCount);
  const marbles = entries.map((entry, index) => {
    const lane = Number.isInteger(entry.lane) ? entry.lane : index;
    const row = Math.floor(lane / laneCount);
    const across = laneCount === 1 ? 0 : -1 + (2 * (lane % laneCount)) / (laneCount - 1);
    // Staggered like a running track's lanes: the outer places, with further to come in, start a little further on.
    const slot = funnel ? Math.abs((lane % laneCount) - (laneCount - 1) / 2) / ((laneCount - 1) / 2 || 1) : 0;
    const stagger = funnel ? (funnel.stagger ?? 0) * slot * slot : 0;
    const m = newMarble(index, marbleParams(entry, drag), 0.6 + stagger + (rows - 1 - row) * START_ROW_GAP, across * roomFull * 0.85, look);
    // Staggered release: the gate lets each marble go at its own moment, in a random order each race.
    if (releaseRng) m.releaseAt = releaseRng.next() * funnel.release;
    if (ctx.channel) {
      const top = clamp(Number(entry.topSpeed) || 50, 1, 100) / 100;
      const acc = clamp(Number(entry.acceleration) || 50, 1, 100) / 100;
      Object.assign(m, {
        th: funnel
          ? clamp(((lane % laneCount) - (laneCount - 1) / 2) * funnel.spacing / funnel.radius, -0.97 * channelLip(ctx.channel, 0), 0.97 * channelLip(ctx.channel, 0))
          : across * 0.5 * ctx.channel.maxAngle,
        thv: 0, branch: 0,
        iceDrag: drag * (1 + ICE_DRAG_SPREAD * (0.5 - top)),
        glide: 1 + ICE_GLIDE_SPREAD * (acc - 0.5),
      });
    }
    return m;
  });

  const stepsPerTick = Math.round(1 / tickRateHz / DT);
  const tickMs = Math.round(1000 / tickRateHz);
  const trace = marbles.map(() => ({ s: [], x: [], h: [], v: [], b: [], a: [] }));
  const record = () => {
    for (const m of marbles) {
      const t = trace[m.index];
      if (m.pa !== undefined) {
        // In the catch area: metres past the line, and across given as the
        // channel angle it would be at (so crossing the line is seamless): px = R·sin(x·maxAngle).
        t.s.push(total);
        t.x.push(Math.asin(clamp(m.px / ctx.channel.radius, -1, 1)) / ctx.channel.maxAngle);
        t.h.push(0);
        t.v.push(Math.hypot(m.pv, m.pvx));
        t.b.push(0);
        t.a.push(m.pa);
        continue;
      }
      t.s.push(m.s);
      t.x.push(ctx.channel ? m.th / ctx.channel.maxAngle : m.x / roomFull);
      t.h.push(air ? Math.max(0, m.y - look.floor(m.s)) : 0);
      t.v.push(m.v);
      t.b.push(m.branch || 0);
      t.a.push(0);
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
      if (m.releaseAt && time < m.releaseAt) { m.before = m.s - 1e-6; continue; } // still held at the gate
      m.before = moveMarble(m, time, ctx);
    }
    if (collisions) collideChannel(marbles, time, ctx);
    if (ctx.solids?.length) for (const m of marbles) if (m.finishedAt === null && !(m.releaseAt && time < m.releaseAt)) hitSolids(m, time, ctx);
    for (const m of marbles) {
      if (m.finishedAt !== null) continue;
      const before = Math.min(m.before, m.s - 1e-9); // a shove can move it on (or back) a little
      if (m.splitAt === null && m.s >= half) m.splitAt = time - DT + ((half - before) / (m.s - before)) * DT;
      if (m.s >= total) {
        m.finishedAt = time - DT + ((total - before) / (m.s - before)) * DT;
        if (pen) enterPen(m, m.s - total, ctx);
        m.s = total;
        remaining -= 1;
      }
    }
    if (pen) movePen(marbles, ctx);
    if (step % stepsPerTick === 0) record();
  }
  // Everyone's home: let the catch area settle before the replay ends.
  const raceEnd = time;
  if (pen && remaining === 0) {
    const still = () => marbles.every((m) => Math.abs(m.pv) < 0.15 && Math.abs(m.pvx) < 0.15);
    // …but never past the 90 s ceiling.
    while (time < Math.min(raceEnd + PEN_SETTLE, CAP_SECONDS) && !(time > raceEnd + 1 && still())) {
      time += DT;
      step += 1;
      movePen(marbles, ctx);
      if (step % stepsPerTick === 0) record();
    }
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
  const raceMs = unfinished.length ? CAP_SECONDS * 1000 : lastFinish;
  // With a catch area the replay runs on a little after the race, while finishers settle.
  const durationMs = pen && !unfinished.length ? Math.max(raceMs, Math.floor((time * 1000) / 50) * 50) : raceMs;

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
    const a = [];
    for (const m of marbles) {
      const done = finishMs.get(m.index) !== null && t >= finishMs.get(m.index);
      const tr = trace[m.index];
      // In the catch area the finisher's frame shows where it is in the pen (a: metres past the line).
      const inPen = pen && done && tr.a[j] > 0;
      p.push(done ? 1 : Math.min(0.99999, Math.round((tr.s[j] / total) * 1e5) / 1e5));
      l.push(Math.round(clamp(tr.x[j], -1, 1) * 1000) / 1000);
      h.push(done ? 0 : Math.round(tr.h[j] * 1000) / 1000);
      v.push(done && !inPen ? 0 : Math.round(tr.v[j] * 10) / 10); // speed, m/s (for the speed readout)
      b.push(done ? 0 : tr.b[j]); // splitter channel: 1 inside, -1 outside, 0 main channel
      // In its last few metres a marble's distance before the line comes as a negative, so a
      // replay blending frames across the line moves it on smoothly into the catch area.
      const toGo = total - tr.s[j];
      a.push(inPen ? Math.round(tr.a[j] * 100) / 100 : pen && !done && toGo < 5 ? -Math.round(toGo * 100) / 100 : 0);
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
    frames.push({ t, p, l, h, v, ...(ctx.fork && { b }), ...(pen && { a }), s: standings });
  }

  // On the ice (bumps and lip knocks all the time) keep the commentary readable: one line per marble every few seconds.
  const lastNews = new Map();
  const newsworthy = (e) => {
    if (!ctx.channel) return true;
    if (e.news) { // hitting the track's obstacles always makes the news
      lastNews.set(e.index, e.time);
      return true;
    }
    if (e.time - (lastNews.get(e.index) ?? -Infinity) < NEWS_GAP) return false;
    lastNews.set(e.index, e.time);
    return true;
  };
  const events = rawEvents
    .filter(newsworthy)
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
    // The starting gate (tracks with physics.gate): the countdown before the
    // start, and when each marble's paddle let it go (ms after the start).
    ...(funnel && tp.gate && {
      start: { countdownMs: tp.gate.countdownMs, releaseMs: marbles.map((m) => Math.round((m.releaseAt ?? 0) * 1000)) },
    }),
    stats: {
      winnerMs: results[0]?.finishTimeMs ?? null,
      lastMs: finishers.length === marbles.length ? lastFinish : null,
      unfinished: unfinished.length,
      topSpeed: Math.round(stats.topSpeed * 10) / 10,
      wallHits: stats.wallHits,
      jumps: stats.jumps,
      longestAirSeconds: Math.round(stats.longestAir * 100) / 100,
      highestAirMetres: Math.round(stats.highestAir * 100) / 100,
      ...(collisions && { bumps: stats.bumps, bigBumps: stats.bigBumps }),
      ...(pen && { penBumps: stats.penBumps }),
      averageSpeed: results[0]?.finishTimeMs ? Math.round((total / (results[0].finishTimeMs / 1000)) * 10) / 10 : null,
      trackMetres: Math.round(total),
      ...(stats.features && { features: stats.features }),
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
