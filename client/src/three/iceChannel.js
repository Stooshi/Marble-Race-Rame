/**
 * Ice channels (the bobsleigh run): a U-shaped channel instead of a flat road,
 * maybe starting as a wide funnel, maybe with a splitter where it divides
 * into an inside and an outside channel that merge again. Mirrors the physics (src/game/physicsSimulator.js
 * advanceChannel): a marble's place across is an angle up the wall.
 *
 * Pure maths plus one merged geometry (one draw call), like trackModel.js.
 */
import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three';
import { loopShape } from './loopShape';

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

/**
 * The kit's other themed surfaces (a track file's `surface`, or one section's).
 * Looks only: every surface races exactly like ice (snow is as fast as ice).
 */
export const SNOW_COLORS = {
  iceA: '#fbfdff', iceB: '#eef3f8', rim: '#8fb3d1', outer: '#c9d6e2', outerDark: '#b9c8d6',
  divider: '#ffffff', nose: '#e23b3b',
};
export const STONE_COLORS = {
  iceA: '#b3ada3', iceB: '#a49e94', rim: '#d6d0c4', outer: '#8d877d', outerDark: '#7f796f',
  divider: '#d6d0c4', nose: '#d8322b',
};
export const WATER_COLORS = {
  iceA: '#5fb4d9', iceB: '#4ba3cc', rim: '#e8e2d2', outer: '#8f8778', outerDark: '#82796b',
  divider: '#e8e2d2', nose: '#d8322b',
};
/** Grand Prix asphalt: dark tarmac with a white edge line; races exactly like ice. */
export const ASPHALT_COLORS = {
  iceA: '#45484f', iceB: '#3f4249', rim: '#f2f2ee', outer: '#9b9b97', outerDark: '#8c8c88',
  divider: '#e6e6e2', nose: '#d8322b',
};
/**
 * Track and Field: the channel dressed as an athletics track, red tartan (or Berlin's blue), its
 * white lane lines, start and finish lines drawn over it (./scenery/athletics.js). Races exactly like ice.
 */
export const TARTAN_COLORS = {
  iceA: '#b9493a', iceB: '#b24434', rim: '#f4f1ea', outer: '#8d3b30', outerDark: '#7f342a',
  divider: '#f4f1ea', nose: '#f4f1ea',
};
export const TARTAN_BLUE_COLORS = {
  iceA: '#2f63a3', iceB: '#2b5c98', rim: '#f4f1ea', outer: '#284f80', outerDark: '#234673',
  divider: '#f4f1ea', nose: '#f4f1ea',
};
/** Racing kerbs along the top of both walls on a Grand Prix track's bends: red and white blocks. */
export const KERB_COLORS = { kerbA: '#d8322b', kerbB: '#f4f4f2' };
const KERB_RADIUS = 200; // metres: a bend tighter than this gets kerbs
const LOOK_COLORS = { ice: ICE_COLORS, sand: SAND_COLORS, snow: SNOW_COLORS, stone: STONE_COLORS, water: WATER_COLORS, asphalt: ASPHALT_COLORS, tartan: TARTAN_COLORS, 'tartan-blue': TARTAN_BLUE_COLORS };
export const CHANNEL_LOOKS = Object.keys(LOOK_COLORS);

/** The colours for a channel that is not a street (ice, sand, snow, stone, water), at s metres along it. */
export const channelColors = (channel, s = null) => {
  const base = LOOK_COLORS[lookAt(channel, s)] ?? ICE_COLORS;
  // A coaster's channel: its rims the rails' steel, its outside the ties' darker steel.
  if (!channel?.coaster) return base;
  return { ...base, rim: channel.coaster.rail ?? '#c9ced6', outer: channel.coaster.tie ?? '#5b616b', outerDark: shade(channel.coaster.tie ?? '#5b616b', 0.85) };
};
const shade = (hex, k) => `#${new Color(hex).multiplyScalar(k).getHexString()}`;

/** How the channel is dressed at s metres along it: a kit section's own surface, else the track's. */
export function lookAt(channel, s = null) {
  if (s != null) for (const x of channel?.surfaces ?? []) if (s >= x.s0 && s <= x.s1) return x.look;
  return channel?.look ?? 'ice';
}

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
const LOOP_DRAW = 1;    // metres along a loop's path between the U's drawn sections
const LOOP_SKIRT = 0.6; // metres: a loop's outer skin, below its rims (light steel, not the channel's 1.6)
const LOOP_LEG_CLEAR = 5; // metres: the top's legs stand this far out past the loop's own track on the ground
/** A loop's steel legs and the net inside it. */
export const LOOP_COLORS = { leg: '#9aa3ad', legDark: '#7d8690', net: '#2d3138' };
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
    .map((f) => ({ s0: f.from * arc, s1: f.to * arc, radius: f.radius, apart: f.apart, ...(f.chutes && { chutes: true }) }));
  const runout = track.physics.runout;
  return {
    radius: ch.radius,
    maxAngle: (ch.maxAngle * Math.PI) / 180,
    arc,
    fork: forks[0] ?? null, // the first splitter (most tracks have one at most)…
    forks,                  // …and all of them (Table Mountain Run has two)
    funnel: ch.funnel ? { length: ch.funnel.length, radius: ch.funnel.radius } : null, // metres from the start
    // Half-pipes (track kit): where the channel widens into a big U, as the physics has them (metres along).
    wides: (ch.wides ?? []).map((w) => ({ s0: w.from * arc, s1: w.to * arc, radius: w.radius })),
    runout: runout ? { length: runout.length, halfWidth: runout.halfWidth } : null, // the catch area past the line
    look: ['street', ...CHANNEL_LOOKS].includes(track.physics.look) ? track.physics.look : 'ice', // how it is dressed (the shape is the same)
    // Kit sections dressed differently from the rest (a stone stretch on a snow track, say).
    kerbs: Boolean(track.physics.kit?.grandPrix), // red-and-white kerbs on the bends (Grand Prix tracks)
    coaster: track.physics.kit?.coaster?.colours ?? null, // a coaster: steel rims and an outer skin in its colours
    surfaces: (track.physics.kit?.sections ?? [])
      .filter((x) => x.surface && LOOK_COLORS[x.surface])
      .map((x) => ({ s0: x.from * arc, s1: x.to * arc, look: x.surface })),
    // Loops: where they stand, as the physics has them, and their path drawn out.
    loops: (track.physics.features ?? []).filter((f) => f.type === 'loop' && Number.isFinite(f.at)).map((f) => loopFrames(centerline, arc, f)),
  };
}

/**
 * A loop's path in the world (src/game/loopShape.js; 2 Nov 2026): at each of its samples the
 * point on the floor's middle, the way along, the floor's normal (into the loop: its "up") and the way
 * across (its "side", as the track's: towards its left). It stands on the track from s0 (metres along,
 * where it rises) to s1 (the end of its run-out), its path `stretch` times as long as that ground.
 */
export function loopFrames(centerline, arc, feature) {
  const shape = loopShape(feature);
  const s0 = feature.at * arc;
  const pos = [];
  const fwd = new Vector3();
  const ground = new Vector3();
  const side = new Vector3();
  const along = new Vector3();
  const flats = [];
  for (let i = 0; i <= shape.n; i += 1) {
    frameAt(centerline, (s0 + shape.f[i]) / arc, ground, side, along);
    fwd.set(along.x, 0, along.z).normalize();
    flats.push(fwd.clone());
    pos.push(ground.clone().addScaledVector(UP, shape.z[i]).addScaledVector(side, shape.q[i]));
  }
  const tangent = [];
  const normal = [];
  const across = [];
  for (let i = 0; i <= shape.n; i += 1) {
    const t = pos[Math.min(shape.n, i + 1)].clone().sub(pos[Math.max(0, i - 1)]).normalize();
    // The floor's normal: up at the bottom, forwards-and-in on the way up, down at the top…
    const n = UP.clone().multiplyScalar(Math.cos(shape.phi[i])).addScaledVector(flats[i], -Math.sin(shape.phi[i]));
    n.addScaledVector(t, -n.dot(t)).normalize();
    tangent.push(t);
    normal.push(n);
    across.push(new Vector3().crossVectors(t, n).normalize());
  }
  return { s0, s1: s0 + shape.ground, stretch: shape.length / shape.ground, shape, pos, tangent, normal, across };
}

/**
 * The follow camera's view of a loop: from beside it, level, the whole loop in the picture.
 * Its spot: across from the loop's top, LOOP_VIEW.side metres out on the side it doesn't lean to, about as
 * high as its top (the track sits in the ground like a trench: from lower down its banks would hide the
 * marble at the bottom of the loop; higher, it would be more than 20 m over the track). `w`: how much of it (0 to 1) for a marble at s metres along: easing in over the
 * last LOOP_VIEW.before metres to the loop, all of it round the loop and LOOP_VIEW.hold metres on (until
 * the camera behind the marble is clear of the loop), easing back out over LOOP_VIEW.after (metres of its path).
 */
export const LOOP_VIEW = { side: 30, up: 0.95, before: 60, hold: 30, after: 60 };
export function loopView(centerline, channel, s) {
  const L = (channel?.loops ?? []).find((x) => s > x.s0 - LOOP_VIEW.before && s < x.s1 + LOOP_VIEW.hold + LOOP_VIEW.after);
  if (!L) return null;
  if (!L.view) {
    const sh = L.shape;
    const iTop = sh.at(sh.rise).i;
    const ground = new Vector3();
    const side = new Vector3();
    const along = new Vector3();
    frameAt(centerline, (L.s0 + sh.f[iTop]) / channel.arc, ground, side, along);
    const centre = ground.clone().addScaledVector(UP, sh.height * 0.5).addScaledVector(side, sh.q[iTop]);
    const cam = ground.clone().addScaledVector(UP, sh.height * LOOP_VIEW.up).addScaledVector(side, sh.q[iTop] - LOOP_VIEW.side);
    L.view = { cam, centre, along, fTop: sh.f[iTop] };
  }
  const ease = (k) => { const x = Math.min(1, Math.max(0, k)); return x * x * (3 - 2 * x); };
  // (Metres along its path; past its end, metres along the track.)
  const u = s < L.s1 ? (s - L.s0) * L.stretch : L.shape.length + (s - L.s1);
  const body = 2 * L.shape.rise;
  // (Held beside it on into the run-out until the camera behind the marble is clear of the loop, then back.)
  const w = u < 0 ? ease(1 + (s - L.s0) / LOOP_VIEW.before) : u <= body + LOOP_VIEW.hold ? 1 : ease(1 - (u - body - LOOP_VIEW.hold) / LOOP_VIEW.after);
  // Once its marble is past the top, the camera slides along with it, keeping abreast of it down the
  // run-out (looking across at it, over the track's banks, rather than along them).
  const f = s < L.s0 ? 0 : s < L.s1 ? L.shape.lerp(L.shape.f, u) : L.shape.ground + (s - L.s1);
  const slide = u > L.shape.rise ? Math.max(0, f - L.view.fTop) : 0;
  // (`pull`: how much the shot is drawn to the loop's middle, so the whole loop stays in it; less as the camera slides on.)
  return { w, cam: L.view.cam.clone().addScaledVector(L.view.along, slide), centre: L.view.centre, pull: 0.35 * Math.max(0, 1 - slide / 30) };
}

/** The loop standing on the track at s metres along, or null. */
export function loopAt(channel, s) {
  for (const L of channel?.loops ?? []) if (s >= L.s0 && s < L.s1) return L;
  return null;
}

/** A loop's frame at u metres along its path (lerped between samples): { pos, tangent, normal, across }. */
const loopTmp = { pos: new Vector3(), tangent: new Vector3(), normal: new Vector3(), across: new Vector3() };
export function loopFrameAt(L, u, out = loopTmp) {
  const { i, w } = L.shape.at(u);
  out.pos.lerpVectors(L.pos[i], L.pos[i + 1], w);
  out.tangent.lerpVectors(L.tangent[i], L.tangent[i + 1], w).normalize();
  out.normal.lerpVectors(L.normal[i], L.normal[i + 1], w).normalize();
  out.across.lerpVectors(L.across[i], L.across[i + 1], w).normalize();
  return out;
}

/** The half-pipe the main channel is widened into at s, or null (as the physics: WIDE_RAMP metres in and out). */
const WIDE_RAMP = 25;
function wideAt(channel, s) {
  for (const w of channel?.wides ?? []) if (s > w.s0 && s < w.s1) return w;
  return null;
}
function wideShare(w, s) {
  const ramp = Math.min(WIDE_RAMP, (w.s1 - w.s0) / 4);
  const k = Math.min(1, Math.max(0, Math.min(s - w.s0, w.s1 - s) / ramp));
  return k * k * (3 - 2 * k);
}

/** How far up its wall the main channel goes at s (radians): the funnel's walls are as high as the channel's (a half-pipe's rise with it). */
export function channelLipAt(channel, s) {
  if (!channel.funnel || wideAt(channel, s)) return channel.maxAngle;
  const height = channel.radius * (1 - Math.cos(channel.maxAngle));
  return Math.min(channel.maxAngle, Math.acos(Math.max(-1, Math.min(1, 1 - height / channelRadiusAt(channel, s)))));
}

/** The main channel's radius at distance s (as the physics): a wide funnel at the top narrowing to the channel. */
export function channelRadiusAt(channel, s) {
  const f = channel.funnel;
  let base = channel.radius;
  if (f && s < f.length) {
    const k = Math.max(0, s) / f.length;
    base = channel.radius + (f.radius - channel.radius) * (1 - k * k * (3 - 2 * k));
  }
  const w = wideAt(channel, s);
  return w ? base + (w.radius - base) * wideShare(w, s) : base;
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
  const s = p * channel.arc;
  const L = channel.loops?.length ? loopAt(channel, s) : null;
  if (L) return placeOnLoop(L, channel, s, l, h, radius, out, normal);
  frameAt(centerline, p, tmpPos, tmpSide, tmpAlong);
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
 * Where a marble in a loop sits (as placeOnChannel): on the U of the loop's own path, the U turned with
 * the floor (upside down at the top). h above 0 in a loop: falling into its net (metres fallen), on its
 * way from where it lost its hold down to where the net lets it out (the physics: src/game/physicsSimulator.js).
 */
const tmpLand = { pos: new Vector3(), tangent: new Vector3(), normal: new Vector3(), across: new Vector3() };
function placeOnLoop(L, channel, s, l, h, radius, out, normal) {
  const u = (s - L.s0) * L.stretch;
  const fr = loopFrameAt(L, u);
  const R = channel.radius;
  const th = Math.max(-1, Math.min(1, l || 0)) * channel.maxAngle;
  const sin = Math.sin(th);
  const cos = Math.cos(th);
  normal.copy(fr.normal).multiplyScalar(cos).addScaledVector(fr.across, -sin).normalize();
  out.copy(fr.pos).addScaledVector(fr.across, R * sin).addScaledVector(fr.normal, R * (1 - cos)).addScaledVector(normal, radius + FACET_CLEARANCE);
  if (h > 0) {
    // Falling into the net: straight towards where it lets the marble out, down as far as it has fallen.
    const land = L.shape.netLanding(u);
    const drop = Math.max(0.5, L.shape.lerp(L.shape.z, u) - L.shape.z[land]);
    const k = Math.min(1, h / drop);
    const to = loopFrameAt(L, L.shape.u[land], tmpLand).pos.clone().addScaledVector(tmpLand.normal, radius + FACET_CLEARANCE);
    const startY = out.y;
    out.lerp(to, k);
    out.y = startY - Math.min(h, startY - to.y);
    normal.copy(UP);
  }
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
  const toColors = (palette) => Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, new Color(v)]));
  const C0 = toColors(street ? STREET_COLORS : channelColors(channel));
  let C = C0;
  const looks = {};
  // The palette for the segment at s (a kit section may be dressed differently from the rest).
  const dressFor = (sMid) => {
    if (street || !channel.surfaces?.length) return C0;
    const look = lookAt(channel, sMid);
    return (looks[look] ??= toColors(channelColors(channel, sMid)));
  };
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
  // Grand Prix kerbs: the top strip of each wall, on segments where the track bends.
  const KERB = { kerbA: new Color(KERB_COLORS.kerbA), kerbB: new Color(KERB_COLORS.kerbB) };
  const kerbed = channel.kerbs && !street ? bendSegments(centerline, KERB_RADIUS) : null;
  let kerbHere = false;
  const quad = (p0, p1, p2, p3, color) => {
    for (const p of [p0, p1, p2, p0, p2, p3]) { positions.push(p.x, p.y, p.z); colors.push(color.r, color.g, color.b); }
  };
  const step = channel.arc / segments;

  // Cross-section points of one channel (centre offset, radius) at a sample.
  // (A loop's sample brings its own way across and its own "up", the floor's normal: `across`, `up`.)
  const section = (sample, offset, R, lip = channel.maxAngle, skirtLength = skirt) => {
    const side = sample.across ?? new Vector3(sample.side.x, 0, sample.side.z).normalize();
    const up = sample.up ?? UP;
    const centre = sample.pos.clone().addScaledVector(side, offset);
    const ring = [];
    const lateral = []; // metres from the main channel's middle, for clipping where split channels overlap
    for (let k = 0; k <= segmentsAcross; k += 1) {
      const th = -lip + (2 * lip * k) / segmentsAcross;
      ring.push(centre.clone().addScaledVector(side, R * Math.sin(th)).addScaledVector(up, R * (1 - Math.cos(th))));
      lateral.push(offset + R * Math.sin(th));
    }
    const top = R * (1 - Math.cos(lip));
    const edge = R * Math.sin(lip);
    const at = (x, y) => centre.clone().addScaledVector(side, x).addScaledVector(up, y);
    return {
      ring,
      lateral,
      rimIn: [at(-edge, top), at(edge, top)],
      rimOut: [at(-edge - rimWidth, top), at(edge + rimWidth, top)],
      foot: [at(-edge - rimWidth, -skirtLength), at(edge + rimWidth, -skirtLength)],
    };
  };

  // half: 0 = whole channel; +1 / -1 = a split channel still overlapping its
  // twin, drawn only on its own side of the middle (no walls crossing the floor).
  const channelStrip = (a, b, stripe, half = 0, s = 0, lip = channel.maxAngle, clip = false) => {
    // Twin chutes still overlapping each other keep only the floor on their own side of
    // the middle: each strip is clipped at the middle (the twins meet there exactly,
    // mirror images of each other), so neither a gap nor a twin's wall shows there.
    const clipped = (k) => {
      const pts = [[a.ring[k], a.lateral[k]], [b.ring[k], b.lateral[k]], [b.ring[k + 1], b.lateral[k + 1]], [a.ring[k + 1], a.lateral[k + 1]]];
      const inside = ([, l]) => (half > 0 ? l >= 0 : l <= 0);
      const out = [];
      for (let j = 0; j < pts.length; j += 1) {
        const p = pts[j];
        const q = pts[(j + 1) % pts.length];
        if (inside(p)) out.push(p[0]);
        if (inside(p) !== inside(q)) out.push(p[0].clone().lerp(q[0], p[1] / (p[1] - q[1])));
      }
      return out;
    };
    for (let k = 0; k < segmentsAcross; k += 1) {
      // The strip's angle up the wall, as a share of the full wall (the funnel's lip is lower: scaled to the main channel's).
      const th = ((-lip + (2 * lip * (k + 0.5)) / segmentsAcross) / lip) * channel.maxAngle;
      let color = street ? streetColor(th, s, stripe) : stripe ? C.iceA : C.iceB;
      if (kerbHere && (k === 0 || k === segmentsAcross - 1)) color = Math.floor(s / KERB_LENGTH) % 2 === 0 ? KERB.kerbA : KERB.kerbB;
      if (!half) { quad(a.ring[k], b.ring[k], b.ring[k + 1], a.ring[k + 1], color); continue; }
      if (!clip) {
        // (Each strip wholly on its own side of the middle: no longer used, see the splitters below.)
        const own = half > 0
          ? Math.min(a.lateral[k], a.lateral[k + 1], b.lateral[k], b.lateral[k + 1]) >= 0
          : Math.max(a.lateral[k], a.lateral[k + 1], b.lateral[k], b.lateral[k + 1]) <= 0;
        if (own) quad(a.ring[k], b.ring[k], b.ring[k + 1], a.ring[k + 1], color);
        continue;
      }
      const poly = clipped(k);
      for (let j = 1; j + 1 < poly.length; j += 1) {
        for (const p of [poly[0], poly[j], poly[j + 1]]) { positions.push(p.x, p.y, p.z); colors.push(color.r, color.g, color.b); }
      }
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

  // Loops: the track under one isn't drawn; its own path is, from where it rises to the end of its run-out.
  const loops = channel.loops ?? [];
  const sampleAt = (s) => {
    const pos = new Vector3();
    const side = new Vector3();
    frameAt(centerline, s / channel.arc, pos, side);
    return { pos, side };
  };
  const plain = (A, B, sa, sb) => channelStrip(section(A, 0, channelRadiusAt(channel, sa), channelLipAt(channel, sa)), section(B, 0, channelRadiusAt(channel, sb), channelLipAt(channel, sb)), Math.floor(((sa + sb) / 2) / 6) % 2 === 0, 0, (sa + sb) / 2, channelLipAt(channel, (sa + sb) / 2));

  // A loop drawn out: its U every LOOP_DRAW metres along its path, then its steel legs and the net inside it.
  function buildLoop(L) {
    const ring = (u) => {
      const fr = loopFrameAt(L, u, { pos: new Vector3(), tangent: new Vector3(), normal: new Vector3(), across: new Vector3() });
      return { pos: fr.pos, across: fr.across, up: fr.normal };
    };
    const count = Math.max(8, Math.ceil(L.shape.length / LOOP_DRAW));
    let prev = ring(0);
    for (let k = 1; k <= count; k += 1) {
      const u = (L.shape.length * k) / count;
      const next = ring(u);
      // (A coaster's light steel: its skirt a third of the channel's.)
      const ua = (L.shape.length * (k - 1)) / count;
      channelStrip(section(prev, 0, channel.radius, L.shape.lipAt(ua, channel.maxAngle), LOOP_SKIRT), section(next, 0, channel.radius, L.shape.lipAt(u, channel.maxAngle), LOOP_SKIRT), Math.floor(u / 6) % 2 === 0, 0, L.s0 + u / L.stretch, L.shape.lipAt(u - LOOP_DRAW / 2, channel.maxAngle));
      prev = next;
    }
    const steel = new Color(LOOP_COLORS.leg);
    const dark = new Color(LOOP_COLORS.legDark);
    // A square leg from a point on the ground straight up to a point under the loop (w metres across).
    const leg = (foot, top, w = 0.5) => {
      const d = new Vector3().subVectors(top, foot);
      const a = new Vector3(1, 0, 0);
      if (Math.abs(d.clone().normalize().dot(a)) > 0.9) a.set(0, 0, 1);
      const x = new Vector3().crossVectors(d, a).normalize().multiplyScalar(w / 2);
      const y = new Vector3().crossVectors(d, x).normalize().multiplyScalar(w / 2);
      const c = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([i, j]) => [foot.clone().addScaledVector(x, i).addScaledVector(y, j), top.clone().addScaledVector(x, i).addScaledVector(y, j)]);
      for (let k = 0; k < 4; k += 1) {
        const [p0, p1] = c[k];
        const [q0, q1] = c[(k + 1) % 4];
        quad(p0, q0, q1, p1, k % 2 ? steel : dark);
      }
    };
    // A point in the loop's own terms (f forwards, z up, q aside from the track it stands on).
    const local = (f, z, q) => { const g = sampleAt(L.s0 + f); return g.pos.clone().addScaledVector(UP, z).addScaledVector(new Vector3(g.side.x, 0, g.side.z).normalize(), q); };
    const sh = L.shape;
    const iTop = sh.at(sh.rise).i;
    const fTop = sh.f[iTop];
    const qTop = sh.q[iTop];
    // Two legs to the top, an A-frame either side, their feet well clear of the loop's own track on the ground.
    const half = channel.radius + 0.5;
    const top = ring(sh.rise);
    const under = top.pos.clone().addScaledVector(top.up, -(LOOP_SKIRT + 0.2));
    for (const side of [-1, 1]) {
      const foot = local(fTop, -1.6, qTop + side * (sh.shift / 2 + half + LOOP_LEG_CLEAR));
      leg(foot, under.clone().addScaledVector(top.across, side * channel.radius * 0.8));
    }
    // The net: under the top, strung between the two tracks where they pass each other at the bottom
    // (the gap between their walls), sloping down towards the way down: a marble that lost its hold
    // over the top would drop into it and roll out onto the way down.
    const net = new Color(LOOP_COLORS.net);
    const rows = 8;
    const cols = 3;
    const qIn = channel.radius + 0.5;            // the way in's wall, on the side of the gap
    const qOut = sh.shift - channel.radius - 0.5; // the way down's wall
    const netPoint = (r, c) => {
      const f = fTop - 7 + (14 * r) / rows;
      const k = c / cols;
      return local(f, 3.2 - 1.2 * k - 0.5 * Math.sin(Math.PI * (r / rows)), qIn + (qOut - qIn) * k);
    };
    const bar = (p, q) => {
      const d = new Vector3().subVectors(q, p).normalize();
      const w = new Vector3().crossVectors(d, UP).normalize().multiplyScalar(0.06);
      if (w.lengthSq() < 1e-6) w.set(0.06, 0, 0);
      quad(p.clone().sub(w), q.clone().sub(w), q.clone().add(w), p.clone().add(w), net);
      quad(p.clone().add(w), q.clone().add(w), q.clone().sub(w), p.clone().sub(w), net);
    };
    for (let r = 0; r <= rows; r += 1) for (let c = 0; c < cols; c += 1) bar(netPoint(r, c), netPoint(r, c + 1));
    for (let c = 0; c <= cols; c += 1) for (let r = 0; r < rows; r += 1) bar(netPoint(r, c), netPoint(r + 1, c));
  }

  const starts = []; // where each segment's triangles begin (vertex index), for cutting the channel into pieces
  for (let i = 0; i < segments; i += 1) {
    starts.push(positions.length / 3);
    const a = samples[i];
    const b = samples[i + 1];
    const sMid = (i + 0.5) * step;
    const under = loops.length ? loops.find((L) => (i + 1) * step > L.s0 && i * step < L.s1) : null;
    if (under) {
      // Only the bits of this segment either side of the loop: up to where it rises, on from the end of its run-out.
      C = dressFor(sMid);
      if (i * step < under.s0) plain(a, sampleAt(under.s0), i * step, under.s0);
      if ((i + 1) * step > under.s1) plain(sampleAt(under.s1), b, under.s1, (i + 1) * step);
      if (i * step <= under.s0 && (i + 1) * step > under.s0) buildLoop(under);
      continue;
    }
    const stripe = Math.floor(sMid / 6) % 2 === 0;
    C = dressFor(sMid);
    kerbHere = Boolean(kerbed?.[i]);
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
      // Both channels' floors clipped at the middle while they overlap, so neither a gap nor a wall shows
      // there. (Until 25 Oct 2026 a splitter's kept only the strips wholly on their own side: the strip
      // across the middle was missing from both, a slit along the ridge where a split opens and closes.)
      channelStrip(inA, inB, stripe, apart ? 0 : 1, 0, channel.maxAngle, true);
      channelStrip(outA, outB, stripe, apart ? 0 : -1, 0, channel.maxAngle, true);
      if (apart) {
        const nose = gap((oa + ob) / 2) < 1.2 && sMid < (fork.s0 + fork.s1) / 2;
        quad(outA.rimOut[1], outB.rimOut[1], inB.rimOut[0], inA.rimOut[0], nose ? C.nose : C.divider);
      } else if (oa > Ra * Math.sin(channel.maxAngle) || ob > Rb * Math.sin(channel.maxAngle)) {
        // The inner lips past the middle but their rims not yet apart: the divider from lip to lip
        // (before, nothing: a notch down between the two channels).
        const lipAt = (smp, o, R, k) => {
          const side = new Vector3(smp.side.x, 0, smp.side.z).normalize();
          return smp.pos.clone().addScaledVector(side, k * Math.max(0, o - R * Math.sin(channel.maxAngle))).addScaledVector(UP, R * (1 - Math.cos(channel.maxAngle)));
        };
        const nose = sMid < (fork.s0 + fork.s1) / 2;
        quad(lipAt(a, oa, Ra, -1), lipAt(b, ob, Rb, -1), lipAt(b, ob, Rb, 1), lipAt(a, oa, Ra, 1), nose ? C.nose : C.divider);
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
 * How finely the channel is drawn (buildIceChannelGeometry's options): on phones a street's U in fewer
 * strips across, a kit track's coarser, a coaster's (seen from further out) coarser still.
 */
export function channelDetail(track, channel, lite) {
  if (!lite) return undefined;
  if (channel?.look === 'street') return { segmentsAcross: 20 };
  return track?.physics?.kit ? { segmentsAcross: track.physics.kit.coaster ? 8 : 10 } : undefined;
}

/** How many segments each drawn piece of the channel holds (channelPieces). */
export function channelPieceSize(track, lite) {
  return track?.physics?.kit ? (lite ? 200 : 150) : lite ? 60 : 40; // (phones: the older tracks in 60 m pieces, 27 Oct 2026)
}

/**
 * Which segments of the centre line bend tighter than `radius` metres (seen from
 * above): their turn over a few metres either side, against the distance.
 */
export function bendSegments(centerline, radius) {
  const { samples, segments } = centerline;
  const out = new Array(segments).fill(false);
  const K = 3;
  for (let i = 0; i < segments; i += 1) {
    const a = samples[Math.max(0, i - K)];
    const b = samples[Math.min(segments, i + 1 + K)];
    const ta = new Vector3(a.tangent.x, 0, a.tangent.z).normalize();
    const tb = new Vector3(b.tangent.x, 0, b.tangent.z).normalize();
    const turn = Math.acos(Math.max(-1, Math.min(1, ta.dot(tb))));
    const dist = new Vector3(b.pos.x - a.pos.x, 0, b.pos.z - a.pos.z).length();
    out[i] = turn > 1e-4 && dist / turn < radius;
  }
  return out;
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
