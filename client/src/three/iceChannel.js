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

/**
 * The ice channel's shape dressed as sand (Table Mountain Run: physics.look
 * 'sand'): a pale sand floor and sandstone walls. It races exactly like ice.
 */
export const SAND_COLORS = {
  iceA: '#ead39f', iceB: '#e0c68e', rim: '#f5e9c8', outer: '#b98f5a', outerDark: '#a67d4b',
  divider: '#f1e3bf', nose: '#d8322b',
};

/** The colours for a channel that is not a street: ice, or sand. */
export const channelColors = (channel) => (channel?.look === 'sand' ? SAND_COLORS : ICE_COLORS);

/**
 * A racing channel dressed as a city street (San Francisco: physics.look
 * 'street'): asphalt floor with a dashed yellow centre line, red-and-white
 * racing kerbs where the floor meets the walls, concrete walls, a white top
 * rail and stone retaining walls outside. The same shape as the ice channel.
 */
export const STREET_COLORS = {
  floorA: '#4b4e56', floorB: '#45484f', line: '#f2c230', kerbA: '#d8322b', kerbB: '#f4f4f2',
  wallA: '#d3cdc1', wallB: '#c8c2b5', rim: '#cfc9bd', outer: '#a99a82', outerDark: '#9d8e77',
  divider: '#e9e4da', nose: '#d8322b',
};
const KERB_FROM = 0.5;  // radians up the wall where the kerb starts (about 29°)…
const KERB_TO = 0.72;   // …and ends (about 41°), where the concrete wall begins
const KERB_LENGTH = 2;  // metres per red or white block
const DASH = 6;         // metres per centre-line dash (and gap)

/** Channel settings from a track (null for ordinary tracks). Fork distances are along the drawn track. */
export function channelOf(track, centerline) {
  const ch = track?.physics?.channel;
  if (!ch) return null;
  let arc = 0;
  for (let i = 1; i < centerline.samples.length; i += 1) arc += centerline.samples[i].pos.distanceTo(centerline.samples[i - 1].pos);
  const forks = (track.physics.forks ?? (track.physics.fork ? [track.physics.fork] : []))
    .map((f) => ({ s0: f.from * arc, s1: f.to * arc, radius: f.radius, apart: f.apart }));
  const runout = track.physics.runout;
  return {
    radius: ch.radius,
    maxAngle: (ch.maxAngle * Math.PI) / 180,
    arc,
    fork: forks[0] ?? null, // the first splitter (most tracks have one at most)…
    forks,                  // …and all of them (Table Mountain Run has two)
    funnel: ch.funnel ? { length: ch.funnel.length, radius: ch.funnel.radius } : null, // metres from the start
    runout: runout ? { length: runout.length, halfWidth: runout.halfWidth } : null, // the catch area past the line
    look: ['street', 'sand'].includes(track.physics.look) ? track.physics.look : 'ice', // how it is dressed (the shape is the same)
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

/** The splitter at distance s, or null. */
export function forkAt(channel, s) {
  for (const f of channel.forks ?? (channel.fork ? [channel.fork] : [])) if (s > f.s0 && s < f.s1) return f;
  return null;
}

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
  const fork = b ? forkAt(channel, s) : null;
  if (fork) {
    tmpPos.addScaledVector(tmpSide, b * forkOffset(fork, s));
    R = forkRadius(fork, channel.radius, s);
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
export function buildIceChannelGeometry(centerline, channel, {
  segmentsAcross = channel.look === 'street' ? 28 : 14,
  rimWidth = channel.look === 'street' ? 3 : 0.45, // a street's rims are its pavements
  skirt = channel.look === 'street' ? 7 : 1.6,     // and a stone retaining wall below them, down to the ground
} = {}) {
  const street = channel.look === 'street';
  const C = Object.fromEntries(Object.entries(street ? STREET_COLORS : channelColors(channel)).map(([k, v]) => [k, new Color(v)]));
  // The street's paint, by how far up the wall a strip is (th, radians) and how far down the track (s, metres).
  const streetColor = (th, s, stripe) => {
    const a = Math.abs(th);
    const step = (2 * channel.maxAngle) / segmentsAcross;
    if (a < step * 0.99) return Math.floor(s / DASH) % 2 === 0 ? C.line : C.floorA; // the two strips either side of the middle
    if (a < KERB_FROM) return stripe ? C.floorA : C.floorB;
    if (a < KERB_TO) return Math.floor(s / KERB_LENGTH) % 2 === 0 ? C.kerbA : C.kerbB;
    return stripe ? C.wallA : C.wallB;
  };
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
  const channelStrip = (a, b, stripe, half = 0, s = 0, lip = channel.maxAngle) => {
    const mine = (k) => !half || (half > 0
      ? Math.min(a.lateral[k], a.lateral[k + 1], b.lateral[k], b.lateral[k + 1]) >= 0
      : Math.max(a.lateral[k], a.lateral[k + 1], b.lateral[k], b.lateral[k + 1]) <= 0);
    for (let k = 0; k < segmentsAcross; k += 1) {
      // The strip's angle up the wall, as a share of the full wall (the funnel's lip is lower: scaled to the main channel's).
      const th = ((-lip + (2 * lip * (k + 0.5)) / segmentsAcross) / lip) * channel.maxAngle;
      const color = street ? streetColor(th, s, stripe) : stripe ? C.iceA : C.iceB;
      if (mine(k)) quad(a.ring[k], b.ring[k], b.ring[k + 1], a.ring[k + 1], color);
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

  const starts = []; // where each segment's triangles begin (vertex index), for cutting the channel into pieces
  for (let i = 0; i < segments; i += 1) {
    starts.push(positions.length / 3);
    const a = samples[i];
    const b = samples[i + 1];
    const sMid = (i + 0.5) * step;
    const stripe = Math.floor(sMid / 6) % 2 === 0;
    const fork = forkAt(channel, sMid);
    if (fork) {
      const sa = i * step;
      const sb = (i + 1) * step;
      const Ra = forkRadius(fork, channel.radius, sa);
      const Rb = forkRadius(fork, channel.radius, sb);
      const oa = forkOffset(fork, sa);
      const ob = forkOffset(fork, sb);
      const inA = section(a, oa, Ra);
      const inB = section(b, ob, Rb);
      const outA = section(a, -oa, Ra);
      const outB = section(b, -ob, Rb);
      // The divider between the two channels, once they have pulled apart: a
      // flat top joining their inner rims, with a red nose where it starts.
      const gap = (o) => 2 * o - 2 * (forkRadius(fork, channel.radius, sMid) * Math.sin(channel.maxAngle) + rimWidth);
      const apart = gap(oa) > 0 && gap(ob) > 0;
      channelStrip(inA, inB, stripe, apart ? 0 : 1);
      channelStrip(outA, outB, stripe, apart ? 0 : -1);
      if (apart) {
        const nose = gap((oa + ob) / 2) < 1.2 && sMid < (fork.s0 + fork.s1) / 2;
        quad(outA.rimOut[1], outB.rimOut[1], inB.rimOut[0], inA.rimOut[0], nose ? C.nose : C.divider);
      }
    } else {
      const sa = i * step;
      const sb = (i + 1) * step;
      channelStrip(
        section(a, 0, channelRadiusAt(channel, sa), channelLipAt(channel, sa)),
        section(b, 0, channelRadiusAt(channel, sb), channelLipAt(channel, sb)),
        stripe,
        0,
        sMid,
        channelLipAt(channel, sMid),
      );
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData.segmentStarts = starts;
  return geometry;
}

/**
 * The channel cut into pieces of `per` segments along the track (each its own
 * geometry, bounding sphere and all), so a camera down in the channel only
 * draws the pieces in front of it, not the whole course every frame.
 */
export function channelPieces(geometry, per = 40) {
  const starts = geometry.userData.segmentStarts ?? [0];
  const total = geometry.getAttribute('position').count;
  const pieces = [];
  for (let i = 0; i < starts.length; i += per) {
    const from = starts[i];
    const to = i + per < starts.length ? starts[i + per] : total;
    const g = new BufferGeometry();
    for (const name of Object.keys(geometry.attributes)) {
      const attr = geometry.getAttribute(name);
      g.setAttribute(name, new Float32BufferAttribute(attr.array.slice(from * attr.itemSize, to * attr.itemSize), attr.itemSize));
    }
    g.computeBoundingSphere();
    pieces.push(g);
  }
  return pieces;
}
