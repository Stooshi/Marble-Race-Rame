'use strict';

/**
 * Track features on ice channels (tracks with physics.features, e.g.
 * Bobsleigh Run): boost pads, speed bumps and themed obstacles that marbles
 * really collide with. Each feature stands at `at` (share of the track's
 * length) and, across the channel, at `l` (share of the way up the wall, as
 * the frames give it: positive towards the track's left).
 *
 *   boost:  { type: 'boost', at, l, length, halfWidth }  chevrons on the ice:
 *           rolling over them gives a burst of speed;
 *   bump:   { type: 'bump', at }  a ridge across the channel: marbles hop
 *           over it and lose a little speed;
 *   solid obstacles (ice_block, snowman, icicles, polar_bear): { type, at,
 *           l, radius, height? } a round footprint marbles bounce off. The
 *           polar bear sits on the rim and swipes its paw into the channel on
 *           a fixed timetable (bearPaw), the same in every race and for
 *           every viewer.
 *
 * The 3D view keeps a copy of bearPaw (client/src/three/trackFeatures.js);
 * a test checks the two agree.
 */

const SOLID_TYPES = ['ice_block', 'snowman', 'icicles', 'polar_bear'];

const BEAR_PERIOD = 2.6;  // seconds between swipes
const BEAR_SWIPE = 0.9;   // seconds a swipe takes (reach in and back)

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

/** How fast the paw's reach is changing (share per second), for how hard it swats. */
function bearPawSpeed(time) {
  const dt = 0.005;
  return (bearPaw(time + dt) - bearPaw(time - dt)) / (2 * dt);
}

/** The track's features in metres along the track (`total` metres long), sorted along it. */
function normaliseFeatures(features, total) {
  return (Array.isArray(features) ? features : [])
    .filter((f) => f && Number.isFinite(f.at) && (f.type === 'boost' || f.type === 'bump' || SOLID_TYPES.includes(f.type)))
    .map((f, id) => ({ ...f, id, s: f.at * total, l: Number(f.l) || 0 }))
    .sort((a, b) => a.s - b.s);
}

module.exports = { SOLID_TYPES, BEAR_PERIOD, BEAR_SWIPE, bearPaw, bearPawSpeed, normaliseFeatures };
