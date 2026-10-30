/**
 * TV moments (drawing only, never the race): fixed trackside cameras at a track's dramatic spots
 * (track file `tvCameras`, physics.kit.tv), facing back up the track at the oncoming marbles. The big
 * view cuts to one as the followed marble (the leader, or the player's own) comes up to it, follows
 * it in, then cuts back to the follow camera as it goes by.
 *
 * Everything is worked out from where the followed marble is (its progress), never from the wall
 * clock, so a replay shows the same moments at the same places. No cut in the first seconds (the
 * start keeps its own shots) or near the line (the finish shot stays), and the track recipe keeps a
 * track's cameras well apart, so two cuts never come close together.
 */
import { Raycaster, Vector3 } from 'three';
import { channelLipAt, channelRadiusAt } from './iceChannel';

export const TV = {
  before: 72,      // metres before the camera's spot where the cut comes (about 2.6 s at racing speed)
  after: -6,       // metres past it where it cuts back to the follow camera: just before it reaches it (30 Oct 2026: before, it followed the marble 12 m
                   // past and eased back over 30 m, the blend swinging the view through the barrier or the ground)
  startGuard: 8000, // ms after GO before any cut
  frame: 7,        // metres of the scene across the shot round the followed marble: the TV camera zooms to keep it so…
  lens: [14, 42],  // …within these fields of view (degrees)
  raise: 2,        // metres the cameras stand higher than their track file says, so more of the chasing pack shows, wherever that stays clear of the scenery (30 Oct 2026)
  tilt: 3,         // metres up the track (towards the chasers) the camera aims behind what it follows
  // The pack shot (Moses, 30 Oct 2026): mid race, the TV camera frames the biggest bunch, not only the leader.
  pack: { from: 0.35, to: 0.7, near: [0.25, 0.78], most: 2, bunch: 20, members: 5, share: 0.5, before: 80, hold: 6, margin: 1.35, lens: [14, 55], label: 2600 },
  // (bunch: metres between the first and last of a bunch, about a second at racing speed; members: the fewest that make one (Moses: a real bunch, 5);
  //  share: the races that get one, picked at random but the same for every viewer and the replay (Moses: about every other race);
  //  before: metres out where the shot starts, about 3 s at racing speed so the label can be read; hold: metres short of the camera where the shot cuts back, so it never swings round as they pass;
  //  margin: room round the bunch in the shot; lens: the fields of view it zooms within)
};
const RIM = 0.45;

/**
 * Where a track's TV cameras are: a kit track's `kit.tv` (from its track file's `tvCameras`); the three
 * hand-built tracks (Bobsleigh Run, San Francisco, Table Mountain Run) carry theirs as `physics.tv`,
 * in the same form ({ p, side, distance, height }), drawing only like their `startLook`.
 */
export function tvSpots(physics) {
  if (physics?.kit?.tv?.length) return physics.kit;
  return physics?.tv?.length ? { tv: physics.tv } : null;
}

/**
 * The track's TV cameras: [{ s (metres along), pos (where the camera stands), p }]. Each stands TV.raise
 * higher than its track file says; given the `scenery`, only where that leaves it clear (cameraClear),
 * else at the track file's height.
 */
export function tvCameras(centerline, channel, kit, { scenery = null } = {}) {
  if (!channel || !kit?.tv?.length) return [];
  const { samples, segments } = centerline;
  const solid = scenery ? solidsOf(scenery) : null;
  return kit.tv.map((c) => {
    const i = Math.min(segments, Math.max(0, Math.round(c.p * segments)));
    const s = samples[i];
    const sArc = c.p * channel.arc;
    const half = channelRadiusAt(channel, sArc) * Math.sin(channelLipAt(channel, sArc)) + RIM;
    const side = new Vector3(s.side.x, 0, s.side.z).normalize();
    const sign = (c.side ?? 1) * (kit.mirrored ? -1 : 1);
    const low = s.pos.clone().addScaledVector(side, sign * (half + c.distance)).setY(s.pos.y + c.height);
    const high = low.clone().setY(low.y + TV.raise);
    const pos = !solid || cameraClear(solid, high, s.pos) ? high : low;
    return { s: sArc, pos, p: c.p };
  });
}

/** The scenery's solid meshes (what a camera may not stand in or look through). */
export function solidsOf(scenery) {
  scenery.updateMatrixWorld(true);
  const solid = [];
  scenery.traverse((o) => { if (o.isMesh && o.visible && !o.material?.transparent) solid.push(o); });
  return solid;
}

const DIRS = [];
for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) if (x || y || z) DIRS.push(new Vector3(x, y, z).normalize());

/**
 * The camera clear check: nothing solid within 1.5 m of a camera at `pos` (inside a wall, a roof or a
 * tree), nor between it and the track at `trackPos` (the track's own rim may cut the bottom of the view).
 */
export function cameraClear(solid, pos, trackPos) {
  const ray = new Raycaster();
  for (const d of DIRS) {
    ray.set(pos, d);
    ray.far = 1.5;
    if (ray.intersectObjects(solid, false).length) return false;
  }
  const spot = trackPos.clone().add(new Vector3(0, 0.5, 0));
  ray.set(pos, spot.clone().sub(pos).normalize());
  ray.far = pos.distanceTo(spot) - 2;
  return !ray.intersectObjects(solid, false).some((h) => h.object.name !== 'coaster track');
}

/**
 * The TV moment for a marble `metres` along the track at race time `t` (ms after GO):
 * { cam, w } (w: 1 on the TV camera, falling to 0 as it eases back), or null.
 */
export function tvMoment(cams, metres, t, finishAt) {
  if (!cams.length || !(t >= TV.startGuard) || metres >= finishAt) return null;
  for (const cam of cams) {
    const w = tvWeight(metres - cam.s);
    if (w !== null) return { cam, w };
  }
  return null;
}

/**
 * The pack shot's weight with the bunch d metres past the camera: 1 from TV.pack.before metres out until
 * TV.pack.hold metres short of the camera, then a clean cut back (a blend from a camera beside the track
 * to the one behind the marble swings through the ground), so it never swings round as they pass.
 */
export function packWeight(d) {
  return d >= -TV.pack.before && d <= -TV.pack.hold ? 1 : null;
}

/** Whether a TV camera has the shot when what it watches is d metres past its spot: 1, else null (a clean cut in and out). */
export function tvWeight(d) {
  return d >= -TV.before && d <= TV.after ? 1 : null;
}

/**
 * The biggest bunch in a frame: the most marbles within TV.pack.bunch metres of each other along the
 * track (not yet home), only those between `from` and `to` metres if given (coming up to a camera),
 * → { members: [index], centre (metres) } or null. From the race's own frame, so a replay shows the same.
 */
export function biggestBunch(frame, arc, [from, to] = [-Infinity, Infinity]) {
  const racing = [];
  frame.p.forEach((p, i) => { if (Number.isFinite(p) && p < 1 && p * arc >= from && p * arc <= to) racing.push({ i, m: p * arc }); });
  racing.sort((a, b) => b.m - a.m);
  let best = null;
  for (let a = 0, b = 0; a < racing.length; a += 1) {
    while (b < racing.length && racing[a].m - racing[b].m <= TV.pack.bunch) b += 1;
    if (!best || b - a > best.members.length) best = { members: racing.slice(a, b).map((x) => x.i), centre: racing.slice(a, b).reduce((n, x) => n + x.m, 0) / (b - a) };
  }
  return best;
}

/**
 * The track's cameras for pack shots: the first TV.pack.most standing between TV.pack.from and .to of
 * the way; a track with none there (its cameras near the start and the end), the one nearest the middle
 * within TV.pack.near, so every track has its pack shot.
 */
export function packCams(cams) {
  const mid = cams.filter((c) => c.p >= TV.pack.from && c.p <= TV.pack.to).slice(0, TV.pack.most);
  if (mid.length) return mid;
  const near = cams.filter((c) => c.p >= TV.pack.near[0] && c.p <= TV.pack.near[1]).sort((a, b) => Math.abs(a.p - 0.5) - Math.abs(b.p - 0.5));
  return near.slice(0, 1);
}

/**
 * Whether this race gets its pack shot (TV.pack.share of races): a stable hash of the field (who is in
 * it, in which lane), so it is "random" yet the same live, in the room and in the replay.
 */
export function packRace(entries) {
  const key = (entries ?? []).map((e) => `${e?.entryId ?? e?.marble?.id ?? ''}@${e?.lane ?? ''}`).join('|');
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000 < TV.pack.share;
}

const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th')}`;

/**
 * The player's place for the pack shot's label: "Leader +1.8 s" (ahead of the second), "7th, in the pack"
 * (in the bunch on screen), or "12th, 3.4 s behind" (the leader). `behindLeader(metres)`: how long ago the
 * leader was where those metres are (ms), from the scene's trail of the leader.
 */
export function standingLabel({ place, inPack, aheadMs, behindMs }) {
  if (place === 1) return Number.isFinite(aheadMs) ? `Leader +${(aheadMs / 1000).toFixed(1)} s` : 'Leader';
  if (inPack) return `${ordinal(place)}, in the pack`;
  return Number.isFinite(behindMs) ? `${ordinal(place)}, ${(behindMs / 1000).toFixed(1)} s behind` : ordinal(place);
}
