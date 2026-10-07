'use strict';

/**
 * Track features on ice channels (tracks with physics.features, e.g.
 * Bobsleigh Run): boost pads, speed bumps and themed obstacles that marbles
 * really collide with. Each feature stands at `at` (share of the track's
 * length) and, across the channel, at `l` (share of the way up the wall, as
 * the frames give it: positive towards the track's left).
 *
 *   boost:  { type: 'boost', at, l, length, halfWidth, kick? }  chevrons on the ice:
 *           rolling over them gives a burst of speed (`kick` m/s, default 9);
 *   bump:   { type: 'bump', at }  a ridge across the channel: marbles hop
 *           over it and lose a little speed;
 *   solid obstacles (ice_block, snowman, icicles, polar_bear): { type, at,
 *           l, radius, height? } a round footprint marbles bounce off. The
 *           polar bear sits on the rim and swipes its paw into the channel on
 *           a fixed timetable (bearPaw), the same in every race and for
 *           every viewer. A sea lion with `flop` (seconds its timetable runs
 *           ahead) instead flops right into the channel on seaLionFlop's
 *           timetable, lies there a while and hops back out (San Francisco's
 *           colony at the pier); without it, it lunges like the bear. Planters,
 *           fire hydrants, newspaper boxes and trash cans stand still.
 *   cable_car: { type: 'cable_car', at, length?, width?, height?, phase? } a cable car
 *           crossing the channel side to side on a fixed timetable
 *           (cableCar): a long solid body (`length` metres across the
 *           channel, `width` along it) that marbles slam into and ricochet
 *           off, back and forth, the same in every race (`phase`: seconds
 *           its timetable runs ahead, to meet the pack).
 *   bus:    { type: 'bus', at, l, length, radius } a bus parked against the
 *           wall, `length` metres down the track from `at`: a row of round
 *           sections (busParts) marbles glance off along its flank.
 *   Any solid can carry `loss` (default 1): how much of the usual speed a
 *   hit on it costs.
 *
 * The 3D view keeps a copy of bearPaw (client/src/three/trackFeatures.js);
 * a test checks the two agree.
 */

const SOLID_TYPES = ['ice_block', 'snowman', 'icicles', 'polar_bear', 'cable_car', 'sea_lion', 'planter', 'hydrant', 'news_box', 'trash_can', 'bus'];
const BUS_STEP = 1.2; // metres between the round sections a parked bus is made of, along its length
const SWIPERS = ['polar_bear', 'sea_lion']; // reach in from the rim on bearPaw's timetable

const BEAR_PERIOD = 2.0;  // seconds between swipes
const BEAR_SWIPE = 1.0;   // seconds a swipe takes (reach in and back)

/**
 * How far the polar bear's paw reaches into the channel at `time` seconds
 * after the start: 0 resting on the rim, 1 at full stretch.
 */
function bearPaw(time) {
  const t = ((time % BEAR_PERIOD) + BEAR_PERIOD) % BEAR_PERIOD;
  if (t >= BEAR_SWIPE) return 0;
  const k = Math.sin((Math.PI * t) / BEAR_SWIPE);
  return k * k;
}

const FLOP_PERIOD = 6.5; // seconds between a sea lion's flops into the channel
const FLOP_IN = 0.7;     // seconds sliding in from its perch
const FLOP_STAY = 2.6;   // seconds lying there
const FLOP_OUT = 0.9;    // seconds hopping back out

/**
 * How far a flopping sea lion is into the channel at `time` seconds: 0 on its
 * perch beyond the rim, 1 lying where it flops to.
 */
function seaLionFlop(time) {
  const t = ((time % FLOP_PERIOD) + FLOP_PERIOD) % FLOP_PERIOD;
  const ease = (x) => x * x * (3 - 2 * x);
  if (t < FLOP_IN) return ease(t / FLOP_IN);
  if (t < FLOP_IN + FLOP_STAY) return 1;
  if (t < FLOP_IN + FLOP_STAY + FLOP_OUT) return 1 - ease((t - FLOP_IN - FLOP_STAY) / FLOP_OUT);
  return 0;
}

/** How fast a flopping sea lion is moving in (+) or out (−), as a share per second. */
function seaLionFlopSpeed(time) {
  const dt = 0.005;
  return (seaLionFlop(time + dt) - seaLionFlop(time - dt)) / (2 * dt);
}

const CABLE_PERIOD = 9;   // seconds between cable car crossings
const CABLE_CROSS = 4;    // seconds a crossing takes, from beyond one side to beyond the other

/**
 * Where the cable car is at `time` seconds after the start: null while it is
 * away, else { k: 0..1 across its crossing, dir: +1 crossing from the right
 * to the left (towards positive l), -1 the other way } (it alternates).
 */
function cableCar(time) {
  const n = Math.floor(time / CABLE_PERIOD);
  const t = time - n * CABLE_PERIOD;
  if (t >= CABLE_CROSS) return null;
  return { k: t / CABLE_CROSS, dir: n % 2 === 0 ? 1 : -1 };
}

/** How fast the paw's reach is changing (share per second), for how hard it swats. */
function bearPawSpeed(time) {
  const dt = 0.005;
  return (bearPaw(time + dt) - bearPaw(time - dt)) / (2 * dt);
}

/** A parked bus's round sections: offsets in metres down the track from its front. */
function busParts(length) {
  const n = Math.max(1, Math.round(length / BUS_STEP));
  return Array.from({ length: n + 1 }, (_, k) => (length * k) / n);
}

/** The track's features in metres along the track (`total` metres long), sorted along it. */
function normaliseFeatures(features, total) {
  return (Array.isArray(features) ? features : [])
    .filter((f) => f && Number.isFinite(f.at) && (f.type === 'boost' || f.type === 'bump' || SOLID_TYPES.includes(f.type)))
    .map((f, id) => ({ ...f, id, s: f.at * total, l: Number(f.l) || 0 }))
    .sort((a, b) => a.s - b.s);
}

module.exports = {
  SOLID_TYPES, SWIPERS, BEAR_PERIOD, BEAR_SWIPE, CABLE_PERIOD, CABLE_CROSS, FLOP_PERIOD, FLOP_IN, FLOP_STAY, FLOP_OUT,
  bearPaw, bearPawSpeed, busParts, cableCar, normaliseFeatures, seaLionFlop, seaLionFlopSpeed,
};
