/**
 * Ice channels (the bobsleigh run): a U-shaped channel instead of a flat road,
 * maybe starting as a wide funnel, maybe with a splitter where it divides
 * into an inside and an outside channel that merge again. Mirrors the physics (src/game/physicsSimulator.js
 * advanceChannel): a marble's place across is an angle up the wall.
 *
 * Pure maths plus one merged geometry (one draw call), like trackModel.js.
 */
import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three';

export const ICE_COLORS = {
  iceA: '#e4f4ff', iceB: '#d3ecfb', rim: '#ffffff', outer: '#a9cde4', outerDark: '#97bfd9',
  divider: '#f4fbff', nose: '#e23b3b',
};

/** Channel settings from a track (null for ordinary tracks). Fork distances are along the drawn track. */
export function channelOf(track, centerline) {
  const ch = track?.physics?.channel;
  if (!ch) return null;
  let arc = 0;
  for (let i = 1; i < centerline.samples.length; i += 1) arc += centerline.samples[i].pos.distanceTo(centerline.samples[i - 1].pos);
  const fork = track.physics.fork;
  const runout = track.physics.runout;
  return {
    radius: ch.radius,
    maxAngle: (ch.maxAngle * Math.PI) / 180,
    arc,
    fork: fork ? { s0: fork.from * arc, s1: fork.to * arc, radius: fork.radius, apart: fork.apart } : null,
    funnel: ch.funnel ? { length: ch.funnel.length, radius: ch.funnel.radius } : null, // metres from the start
    runout: runout ? { length: runout.length, halfWidth: runout.halfWidth } : null, // the catch area past the line
  };
}

/** How far up its wall the main channel goes at s (radians): the funnel's walls are as high as the channel's. */
export function channelLipAt(channel, s) {
  if (!channel.funnel) return channel.maxAngle;
  const height = channel.radius * (1 - Math.cos(channel.maxAngle));
  return Math.min(channel.maxAngle, Math.acos(Math.max(-1, Math.min(1, 1 - height / channelRadiusAt(channel, s)))));
}

/** The main channel's radius at distance s (as the physics): a wide funnel at the top narrowing to the channel. */
export function channelRadiusAt(channel, s) {
  const f = channel.funnel;
  if (!f || s >= f.length) return channel.radius;
  const k = Math.max(0, s) / f.length;
  return channel.radius + (f.radius - channel.radius) * (1 - k * k * (3 - 2 * k));
}

/**
 * The splitter's shape at distance s (as the physics): both channels start as
 * the main channel itself, pull apart and narrow, then become one again.
 */
function forkSpread(fork, s) {
  const f = Math.min(1, Math.max(0, (s - fork.s0) / (fork.s1 - fork.s0)));
  return Math.sin(Math.PI * f);
}
export function forkOffset(fork, s) {
  return fork.apart * forkSpread(fork, s);
}
export function forkRadius(fork, mainRadius, s) {
  return mainRadius + (fork.radius - mainRadius) * forkSpread(fork, s);
}

const inFork = (channel, s) => channel.fork && s > channel.fork.s0 && s < channel.fork.s1;

/** Centre-line point, level sideways direction and (optionally) direction along the track at progress p (0..1). */
function frameAt(centerline, p, pos, side, along = null) {
  const { samples, segments } = centerline;
  const f = Math.min(1, Math.max(0, p)) * segments;
  const i = Math.min(segments - 1, Math.floor(f));
  const t = f - i;
  const a = samples[i];
  const b = samples[i + 1];
  pos.lerpVectors(a.pos, b.pos, t);
  side.set(a.side.x + (b.side.x - a.side.x) * t, 0, a.side.z + (b.side.z - a.side.z) * t).normalize();
  if (along) along.subVectors(b.pos, a.pos).normalize();
}

const UP = new Vector3(0, 1, 0);
const tmpPos = new Vector3();
const tmpSide = new Vector3();
const tmpAlong = new Vector3();
const tmpRound = new Vector3();
// The ice is drawn as flat panels, a hair inside the true curve: marbles sit this much off it so none dips in.
const FACET_CLEARANCE = 0.02;

/**
 * Where a marble sits: progress p, angle share l (-1..1 of the way up the
 * wall, positive towards the track's left), channel b (1 inside, -1 outside,
 * 0 main), height h above the ice. Also returns the wall's inward normal.
 */
export function placeOnChannel(centerline, channel, p, l, b, h, radius, out = new Vector3(), normal = new Vector3()) {
  frameAt(centerline, p, tmpPos, tmpSide, tmpAlong);
  const s = p * channel.arc;
  let R = channelRadiusAt(channel, s);
  if (b && inFork(channel, s)) {
    tmpPos.addScaledVector(tmpSide, b * forkOffset(channel.fork, s));
    R = forkRadius(channel.fork, channel.radius, s);
  }
  const th = Math.max(-1, Math.min(1, l || 0)) * channel.maxAngle;
  const sin = Math.sin(th);
  const cos = Math.cos(th);
  // A point on the U's inner surface, then out along the surface's normal by
  // the marble's radius. The normal leans with the slope along the track: on
  // a steep drop (the starting ramp) a marble lifted straight up from the
  // cross-section would sit partly inside the ice.
  // (Square to both the track's direction and the way round the U at this angle.)
  tmpRound.copy(tmpSide).multiplyScalar(cos).addScaledVector(UP, sin);
  normal.crossVectors(tmpRound, tmpAlong).normalize();
  if (normal.dot(UP) * cos - normal.dot(tmpSide) * sin < 0) normal.negate(); // pointing into the channel
  out.copy(tmpPos).addScaledVector(tmpSide, R * sin).addScaledVector(UP, R * (1 - cos));
  out.addScaledVector(normal, radius + FACET_CLEARANCE).addScaledVector(UP, h || 0);
  return out;
}

/**
 * The channel as one merged geometry: the U-shaped ice inside, a white rim,
 * and the outside skirt, cut into the two splitter channels with a divider
 * (red nose at the wedge) between them.
 */
export function buildIceChannelGeometry(centerline, channel, { segmentsAcross = 14, rimWidth = 0.45, skirt = 1.6 } = {}) {
  const C = Object.fromEntries(Object.entries(ICE_COLORS).map(([k, v]) => [k, new Color(v)]));
  const { samples, segments } = centerline;
  const positions = [];
  const colors = [];
  const quad = (p0, p1, p2, p3, color) => {
    for (const p of [p0, p1, p2, p0, p2, p3]) { positions.push(p.x, p.y, p.z); colors.push(color.r, color.g, color.b); }
  };
  const step = channel.arc / segments;

  // Cross-section points of one channel (centre offset, radius) at a sample.
  const section = (sample, offset, R, lip = channel.maxAngle) => {
    const side = new Vector3(sample.side.x, 0, sample.side.z).normalize();
    const centre = sample.pos.clone().addScaledVector(side, offset);
    const ring = [];
    const lateral = []; // metres from the main channel's middle, for clipping where split channels overlap
    for (let k = 0; k <= segmentsAcross; k += 1) {
      const th = -lip + (2 * lip * k) / segmentsAcross;
      ring.push(centre.clone().addScaledVector(side, R * Math.sin(th)).addScaledVector(UP, R * (1 - Math.cos(th))));
      lateral.push(offset + R * Math.sin(th));
    }
    const top = R * (1 - Math.cos(lip));
    const edge = R * Math.sin(lip);
    const at = (x, y) => centre.clone().addScaledVector(side, x).addScaledVector(UP, y);
    return {
      ring,
      lateral,
      rimIn: [at(-edge, top), at(edge, top)],
      rimOut: [at(-edge - rimWidth, top), at(edge + rimWidth, top)],
      foot: [at(-edge - rimWidth, -skirt), at(edge + rimWidth, -skirt)],
    };
  };

  // half: 0 = whole channel; +1 / -1 = a split channel still overlapping its
  // twin, drawn only on its own side of the middle (no walls crossing the floor).
  const channelStrip = (a, b, stripe, half = 0) => {
    const mine = (k) => !half || (half > 0
      ? Math.min(a.lateral[k], a.lateral[k + 1], b.lateral[k], b.lateral[k + 1]) >= 0
      : Math.max(a.lateral[k], a.lateral[k + 1], b.lateral[k], b.lateral[k + 1]) <= 0);
    for (let k = 0; k < segmentsAcross; k += 1) {
      if (mine(k)) quad(a.ring[k], b.ring[k], b.ring[k + 1], a.ring[k + 1], stripe ? C.iceA : C.iceB);
    }
    for (const sideIdx of [0, 1]) {
      if (half && (sideIdx === 0) === (half > 0)) continue; // its inner wall is still inside the twin channel
      const flip = sideIdx === 0;
      const faces = [
        [a.rimIn[sideIdx], a.rimOut[sideIdx], b.rimOut[sideIdx], b.rimIn[sideIdx], C.rim],
        [a.rimOut[sideIdx], a.foot[sideIdx], b.foot[sideIdx], b.rimOut[sideIdx], stripe ? C.outer : C.outerDark],
      ];
      for (const [p0, p1, p2, p3, color] of faces) {
        if (flip) quad(p3, p2, p1, p0, color);
        else quad(p0, p1, p2, p3, color);
      }
    }
  };

  for (let i = 0; i < segments; i += 1) {
    const a = samples[i];
    const b = samples[i + 1];
    const sMid = (i + 0.5) * step;
    const stripe = Math.floor(sMid / 6) % 2 === 0;
    if (inFork(channel, sMid)) {
      const sa = i * step;
      const sb = (i + 1) * step;
      const Ra = forkRadius(channel.fork, channel.radius, sa);
      const Rb = forkRadius(channel.fork, channel.radius, sb);
      const oa = forkOffset(channel.fork, sa);
      const ob = forkOffset(channel.fork, sb);
      const inA = section(a, oa, Ra);
      const inB = section(b, ob, Rb);
      const outA = section(a, -oa, Ra);
      const outB = section(b, -ob, Rb);
      // The divider between the two channels, once they have pulled apart: a
      // flat top joining their inner rims, with a red nose where it starts.
      const gap = (o) => 2 * o - 2 * (forkRadius(channel.fork, channel.radius, sMid) * Math.sin(channel.maxAngle) + rimWidth);
      const apart = gap(oa) > 0 && gap(ob) > 0;
      channelStrip(inA, inB, stripe, apart ? 0 : 1);
      channelStrip(outA, outB, stripe, apart ? 0 : -1);
      if (apart) {
        const nose = gap((oa + ob) / 2) < 1.2 && sMid < (channel.fork.s0 + channel.fork.s1) / 2;
        quad(outA.rimOut[1], outB.rimOut[1], inB.rimOut[0], inA.rimOut[0], nose ? C.nose : C.divider);
      }
    } else {
      const sa = i * step;
      const sb = (i + 1) * step;
      channelStrip(
        section(a, 0, channelRadiusAt(channel, sa), channelLipAt(channel, sa)),
        section(b, 0, channelRadiusAt(channel, sb), channelLipAt(channel, sb)),
        stripe,
      );
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
