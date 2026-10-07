/**
 * The marbles of a race in 3D: glossy cartoon balls in each marble's own
 * colours, rolling along the track with a soft blob shadow underneath.
 *
 * Phone budget: 20 small spheres (one draw call each, tiny textures) plus one
 * instanced mesh for all the shadows. No real-time shadows or reflections.
 */
import {
  CanvasTexture, CircleGeometry, Color, DynamicDrawUsage, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial,
  MeshPhongMaterial, Quaternion, SphereGeometry, SRGBColorSpace, Vector3, ConeGeometry, Group,
} from 'three';
import { pointOnTrack, TRACK_STYLE } from './trackModel';
import { channelRadiusAt, placeOnChannel } from './iceChannel';

export const MARBLE_RADIUS = 0.55; // metres: a lane is 1.6 m wide

/**
 * Where a marble sits for a race frame: on the floor (centre raised by its
 * radius) and kept between the walls whatever the lateral value.
 */
export function placeMarble(centerline, progress, lateral, lanes, radius = MARBLE_RADIUS, style = TRACK_STYLE, out = new Vector3()) {
  const half = (lanes * style.laneWidth) / 2;
  const room = Math.max(0, half - radius) / half; // fraction of the half-width the centre can use
  pointOnTrack(centerline, progress, Math.max(-1, Math.min(1, lateral || 0)) * room, lanes, style, out);
  out.y += radius;
  return out;
}

export const RUNOUT_LENGTH = 12; // metres of flat floor past the finish line
export const PEN_DROP = 0.05;     // the catch area's floor falls gently towards its end cushion (metres per metre)

/** The parking grid past the finish: columns across the track, rows down the run-out. */
export function parkingGrid(lanes, total = 20, style = TRACK_STYLE) {
  const width = lanes * style.laneWidth;
  const cols = Math.max(1, Math.floor(width / 1.3));
  const rows = Math.ceil(Math.max(1, total) / cols);
  return {
    cols,
    rows,
    across: (col) => (col - (cols - 1) / 2) * (width / cols),
    along: (row) => 2.5 + row * 1.3,
  };
}

/**
 * Parking spots for finishers, given in finishing order with where and when
 * each crossed the line ({ index, across } in metres, t in ms). Each takes the
 * column straight ahead of it, filled from the far end; a full column, or one
 * that took a finisher less than a second earlier (two marbles can't merge
 * into one column at once), sends it to the nearest other column. So nobody
 * passes a parked marble and paths barely cross. Returns Map(index → { along, across }).
 */
export function assignParking(finishers, lanes, total = 20, style = TRACK_STYLE) {
  const grid = parkingGrid(lanes, total, style);
  const used = new Array(grid.cols).fill(0);
  const lastAt = new Array(grid.cols).fill(-Infinity);
  const spots = new Map();
  for (const { index, across, t = 0 } of finishers) {
    let best = -1;
    let bestCost = Infinity;
    for (let c = 0; c < grid.cols; c += 1) {
      if (used[c] >= grid.rows) continue;
      const cost = Math.abs(grid.across(c) - across) + (t - lastAt[c] < 1000 ? 3 : 0);
      if (cost < bestCost) { best = c; bestCost = cost; }
    }
    if (best < 0) break; // more finishers than spots (never with 20 marbles)
    const row = grid.rows - 1 - used[best];
    used[best] += 1;
    lastAt[best] = t;
    spots.set(index, { along: grid.along(row), across: grid.across(best) });
  }
  return spots;
}

const LINE_UP = 1.5;  // metres past the line in which a finisher glides across to its column
const PARK_SPEED = 7; // m/s rolling down its column to the parking spot

/**
 * Where a finisher is `seconds` after crossing the line: first a gentle
 * diagonal glide across to its column (over the first two metres), then straight down the column to its
 * spot. Returns { along, across } in metres from the finish line's centre.
 */
export function parkingPath(seconds, startAcross, slot) {
  const lineUp = 0.6; // seconds
  if (seconds <= lineUp) {
    const k = seconds / lineUp;
    const ease = k * k * (3 - 2 * k);
    return { along: LINE_UP * k, across: startAcross + (slot.across - startAcross) * ease };
  }
  const left = slot.along - LINE_UP;
  const time = Math.max(0.2, left / PARK_SPEED);
  const k = Math.min(1, (seconds - lineUp) / time);
  return { along: LINE_UP + left * (1 - (1 - k) ** 2), across: slot.across };
}

/** Arc length of the drawn centre line (3D), cached per centre line. */
const arcLengths = new WeakMap();
function arcLength(centerline) {
  let len = arcLengths.get(centerline);
  if (len === undefined) {
    len = 0;
    const { samples } = centerline;
    for (let i = 1; i < samples.length; i += 1) len += samples[i].pos.distanceTo(samples[i - 1].pos);
    arcLengths.set(centerline, len);
  }
  return len;
}

/** Sideways and forward (level) directions of the track at a progress value. */
function directionsAt(centerline, progress, side, forward) {
  const { samples, segments } = centerline;
  const f = Math.min(1, Math.max(0, progress)) * segments;
  const i = Math.min(segments - 1, Math.floor(f));
  const t = f - i;
  const a = samples[i];
  const b = samples[i + 1];
  side.set(a.side.x + (b.side.x - a.side.x) * t, 0, a.side.z + (b.side.z - a.side.z) * t).normalize();
  forward.set(a.tangent.x + (b.tangent.x - a.tangent.x) * t, 0, a.tangent.z + (b.tangent.z - a.tangent.z) * t).normalize();
}

const TOUCH_GAP = 0.02; // metres of daylight kept between neighbours

/**
 * Positions of every marble for a frame, drawn so that no two ever touch.
 *
 * The server already keeps marbles apart along a straightened-out track, but
 * on the inside of a bend, between server frames during a fast overtake, and
 * in the finish parking area they could still graze. A last pass here nudges
 * any touching pair apart in real 3D space: sideways within the walls, or a
 * little along the track. Only where marbles are drawn changes, never results.
 *
 * finish: Map(entry index → { rank, t }) from the official results.
 * crossedAt: Map(entry index → metres across where it crossed the line),
 *   filled in the first time each finisher is seen; keep it for the race so
 *   parking spots stay put while scrubbing back and forth.
 * Returns an array of Vector3 (reusing `out` when given).
 */
export function layoutMarbles(centerline, frame, lanes, finish, {
  radius = MARBLE_RADIUS, separate = true, style = TRACK_STYLE, out = [], crossedAt = new Map(), channel = null, normals = null,
  memory = null, solids = null, contacts = null,
} = {}) {
  const n = frame.p.length;
  // A physical catch area (frames carry where finishers are in it) or the classic parking run-out.
  const pen = channel?.runout && frame.a ? channel.runout : null;
  const half = pen ? pen.halfWidth : (lanes * style.laneWidth) / 2;
  const runLength = pen ? pen.length : RUNOUT_LENGTH;
  // On an ice channel "across" is metres along the curved wall (angle × radius).
  const room = channel ? channel.maxAngle * channel.radius : Math.max(0, half - radius);
  const length = arcLength(centerline);
  const end = centerline.samples[centerline.samples.length - 1];
  const endForward = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  const endSide = new Vector3(end.side.x, 0, end.side.z).normalize();
  const side = new Vector3();
  const forward = new Vector3();

  // Each marble is either on the track (progress + metres across) or parked
  // past the finish (metres along + across the run-out).
  const acrossOf = (i) => Math.max(-1, Math.min(1, frame.l[i] ?? 0)) * room;
  // With a catch area the frames say how far past the line a marble is, and in its
  // last few metres how far short of it (negative). Within the last 2.5 m that
  // decides it, so a replay blending frames runs smoothly over the line.
  const nearLine = (i) => pen && frame.a[i] && (frame.a[i] > 0 || (frame.p[i] ?? 0) >= 1 - 2.5 / channel.arc);
  const finished = (i) => {
    const fin = finish?.get(i);
    if (nearLine(i)) return frame.a[i] > 0; // known from the frame, even live before the results
    return fin && (frame.p[i] ?? 0) >= 0.999 && frame.t >= fin.t;
  };
  const finishers = [];
  for (let i = 0; i < n; i += 1) {
    if (!finished(i)) continue;
    if (!crossedAt.has(i)) crossedAt.set(i, acrossOf(i));
    // (In a catch area, live, there may be no official results yet: parking order doesn't matter there.)
    const fin = finish?.get(i);
    finishers.push({ index: i, rank: fin?.rank ?? n, t: fin?.t ?? frame.t, across: crossedAt.get(i) });
  }
  finishers.sort((a, b) => a.rank - b.rank);
  const spots = pen ? new Map() : assignParking(finishers, lanes, finish?.size || n, style);
  const state = [];
  for (let i = 0; i < n; i += 1) {
    const spot = spots.get(i);
    if (pen && finished(i)) {
      // Where the physics has it in the catch area, gliding down off the channel wall it crossed the line on.
      const along = Math.max(0, frame.a[i] ?? 0);
      const th = crossedAt.get(i) / channel.radius;
      const k = Math.min(1, along / 3);
      const lift = channel.radius * (1 - Math.cos(th)) * (1 - k * k * (3 - 2 * k));
      const runOutRoom = Math.max(0, half - radius);
      // Across is given as a channel angle, as on the ice: metres = radius · sin(angle).
      const across = channel.radius * Math.sin(Math.max(-1, Math.min(1, frame.l[i] ?? 0)) * channel.maxAngle);
      state.push({ parked: true, along, across: Math.max(-runOutRoom, Math.min(runOutRoom, across)), lift });
    } else if (spot) {
      const runOutRoom = Math.max(0, half - radius);
      const since = (frame.t - finish.get(i).t) / 1000;
      let crossed = crossedAt.get(i);
      let lift = 0;
      if (channel) {
        // Off an ice channel: from where it was up the wall, gliding down to the flat run-out.
        const th = crossed / channel.radius;
        crossed = channel.radius * Math.sin(th);
        const k = Math.min(1, since / 0.45);
        lift = channel.radius * (1 - Math.cos(th)) * (1 - k * k * (3 - 2 * k));
      }
      crossed = Math.max(-runOutRoom, Math.min(runOutRoom, crossed));
      const at = parkingPath(since, crossed, spot);
      state.push({ parked: true, along: at.along, across: at.across, lift });
    } else {
      // Just short of the line (catch-area frames): its distance to go, so it runs smoothly over the line.
      const progress = nearLine(i) && frame.a[i] < 0 ? 1 + frame.a[i] / channel.arc : frame.p[i] ?? 0;
      state.push({ parked: false, progress: Math.min(progress, 0.99999), across: acrossOf(i) });
    }
  }
  const place = (i) => {
    const s = state[i];
    const v = out[i] || (out[i] = new Vector3());
    const nrm = normals && (normals[i] || (normals[i] = new Vector3()));
    if (s.parked) {
      v.copy(end.pos).addScaledVector(endForward, s.along).addScaledVector(endSide, s.across);
      v.y = end.pos.y + radius + (s.lift || 0) - (pen ? s.along * PEN_DROP : 0);
      nrm?.set(0, 1, 0);
    } else if (channel) {
      placeOnChannel(centerline, channel, s.progress, room > 0 ? s.across / room : 0, frame.b?.[i] ?? 0, frame.h?.[i] ?? 0, radius, v, nrm || undefined);
    } else {
      nrm?.set(0, 1, 0);
      placeMarble(centerline, s.progress, room > 0 ? s.across / room : 0, lanes, radius, style, v);
      v.y += frame.h?.[i] ?? 0; // in the air (physics frames carry the height above the floor)
    }
    return v;
  };
  // Start from how marbles were nudged a moment ago (fading), so a crowd is
  // eased apart smoothly from draw to draw rather than reshuffled each time.
  const raw = state.map((st) => (st.parked ? { parked: true, along: st.along, across: st.across } : { progress: st.progress, across: st.across }));
  const recent = memory && memory.t !== undefined && Math.abs(frame.t - memory.t) < 250 && memory.raw?.length === n;
  if (separate && recent) {
    const runOutRoom = Math.max(0, half - radius);
    state.forEach((st, i) => {
      const was = memory.raw[i];
      if (!was || Boolean(was.parked) !== Boolean(st.parked)) return; // just finished: start afresh
      if (st.parked) {
        st.along = Math.max(0, Math.min(runLength - radius, st.along + 0.9 * memory.dp[i]));
        st.across = Math.max(-runOutRoom, Math.min(runOutRoom, st.across + 0.9 * memory.da[i]));
      } else {
        st.across = Math.max(-room, Math.min(room, st.across + 0.9 * memory.da[i]));
        st.progress = Math.max(0, Math.min(0.99999, st.progress + 0.9 * memory.dp[i]));
      }
    });
  }
  // Obstacles (ice channel features): the frames come 20 times a second and a
  // fast marble covers more than an obstacle's width between two of them, so
  // a straight line between frames could cut through it. Drawn, a marble goes
  // round it instead, exactly as the physics has it (the same footprints).
  if (solids?.length) {
    state.forEach((st, i) => {
      if (st.parked) return;
      for (const o of solids) {
        const ds = st.progress * length - o.s;
        if (ds < -4 || ds > 4) continue;
        const dx = st.across - Math.max(o.xa, Math.min(o.xb, st.across));
        const d = Math.hypot(ds, dx);
        if (d >= o.reach + 0.15) continue;
        contacts?.push({ index: i, solid: o });
        if (d >= o.reach) continue;
        const ns = d > 1e-6 ? ds / d : -1;
        const nx = d > 1e-6 ? dx / d : 0;
        st.progress = Math.max(0, Math.min(0.99999, st.progress + ((o.reach - d) * ns) / length));
        st.across = Math.max(-room, Math.min(room, st.across + (o.reach - d) * nx));
      }
    });
  }
  for (let i = 0; i < n; i += 1) place(i);
  if (!separate) return out;

  const minD = 2 * radius + TOUCH_GAP;
  const nudge = (i, mx, mz) => {
    const s = state[i];
    if (s.parked) {
      const runOutRoom = Math.max(0, half - radius);
      s.along = Math.max(0, Math.min(runLength - radius, s.along + mx * endForward.x + mz * endForward.z));
      s.across = Math.max(-runOutRoom, Math.min(runOutRoom, s.across + mx * endSide.x + mz * endSide.z));
    } else {
      directionsAt(centerline, s.progress, side, forward);
      // "across" is measured on the channel proper; in the wider funnel a metre is a smaller share.
      const scale = channel ? channel.radius / channelRadiusAt(channel, s.progress * channel.arc) : 1;
      s.across = Math.max(-room, Math.min(room, s.across + (mx * side.x + mz * side.z) * scale));
      s.progress = Math.max(0, Math.min(0.99999, s.progress + (mx * forward.x + mz * forward.z) / length));
    }
    place(i);
  };
  const progressOf = (k) => (state[k].parked ? 1 + state[k].along / 1000 : state[k].progress);
  for (let pass = 0; pass < 32; pass += 1) {
    let moved = false;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const a = out[i];
        const b = out[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= minD * minD) continue;
        moved = true;
        const d = Math.sqrt(d2);
        let hx = dx;
        let hz = dz;
        let h = Math.hypot(hx, hz);
        if (h < 1e-4) {
          // Exactly on top of each other: part them sideways across the track.
          directionsAt(centerline, state[i].parked ? 1 : state[i].progress, side, forward);
          hx = side.x; hz = side.z; h = 1;
        }
        const push = (minD - d) / 2 + 0.002;
        nudge(i, (-hx / h) * push, (-hz / h) * push);
        nudge(j, (hx / h) * push, (hz / h) * push);
        // Still touching? Both are against a wall (or a channel's lip), so
        // part them along the track instead: the one ahead a little further on.
        const left = minD - out[i].distanceTo(out[j]);
        if (left > 0.001) {
          const ahead = progressOf(j) >= progressOf(i) ? j : i;
          const behind = ahead === j ? i : j;
          directionsAt(centerline, state[ahead].parked ? 1 : state[ahead].progress, side, forward);
          const fx = state[ahead].parked ? endForward.x : forward.x;
          const fz = state[ahead].parked ? endForward.z : forward.z;
          // Small steps only, so a crowd is eased apart rather than reshuffled (no visible pops).
          const step = Math.min(left / 2 + 0.002, 0.03);
          nudge(ahead, fx * step, fz * step);
          nudge(behind, -fx * step, -fz * step);
        }
      }
    }
    if (!moved) break;
  }
  if (memory) {
    memory.t = frame.t;
    memory.raw = raw;
    memory.da = state.map((st, i) => st.across - raw[i].across);
    memory.dp = state.map((st, i) => (st.parked ? st.along - raw[i].along : st.progress - raw[i].progress));
  }
  return out;
}

/** A small texture in the marble's colours, matching the 2D badges' patterns. */
function marbleTexture(marble) {
  const primary = marble?.color_primary || '#888888';
  const secondary = marble?.color_secondary || primary;
  const pattern = marble?.pattern || 'solid';
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const g = canvas.getContext('2d');
  g.fillStyle = primary;
  g.fillRect(0, 0, 64, 32);
  g.fillStyle = secondary;
  if (pattern === 'striped') {
    for (let x = -32; x < 64; x += 16) {
      g.beginPath();
      g.moveTo(x, 32); g.lineTo(x + 6, 32); g.lineTo(x + 38, 0); g.lineTo(x + 32, 0);
      g.fill();
    }
  } else if (pattern === 'swirl' || pattern === 'galaxy') {
    for (let k = 0; k < 2; k += 1) {
      g.beginPath();
      for (let x = 0; x <= 64; x += 2) g.lineTo(x, 16 + Math.sin((x / 64) * Math.PI * 4 + k * Math.PI) * 9);
      g.lineWidth = 5;
      g.strokeStyle = secondary;
      g.stroke();
    }
    if (pattern === 'galaxy') {
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 14; i += 1) g.fillRect((i * 37) % 64, (i * 13) % 32, 1.5, 1.5);
    }
  } else if (pattern === 'cat-eye') {
    g.fillRect(0, 12, 64, 8);
  } else {
    // Solid marbles still get a faint band so you can see them roll.
    g.globalAlpha = secondary === primary ? 0.25 : 1;
    g.fillStyle = secondary === primary ? '#ffffff' : secondary;
    g.fillRect(0, 13, 64, 6);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** A soft round shadow texture (dark centre fading out). */
function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(canvas);
}

const UP = new Vector3(0, 1, 0);

export class RaceMarbles {
  /**
   * @param entries race entries ({ index, marble: { color_primary, ... } })
   * @param lanes   the track's lane count
   * @param highlight entry indexes to mark with a pointer (the viewer's marbles)
   */
  constructor(entries, lanes, highlight = [], results = []) {
    this.lanes = lanes;
    // Finish order and time per entry index, for parking finishers in the run-out.
    this.finish = new Map([...results].sort((a, b) => a.finishTimeMs - b.finishTimeMs)
      .map((r, rank) => [r.index, { rank, t: r.finishTimeMs }]));
    this.group = new Group();
    this.geometry = new SphereGeometry(MARBLE_RADIUS, 20, 14);
    this.scale = 1;
    this.balls = entries.map((e) => {
      const map = marbleTexture(e.marble);
      const mesh = new Mesh(this.geometry, new MeshPhongMaterial({ map, shininess: 90, specular: new Color('#ffffff') }));
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      this.group.add(mesh);
      return { mesh, last: null };
    });

    this.shadowTex = shadowTexture();
    const shadowGeo = new CircleGeometry(MARBLE_RADIUS * 1.25, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    this.shadows = new InstancedMesh(
      shadowGeo,
      new MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }),
      entries.length,
    );
    this.shadows.instanceMatrix.setUsage(DynamicDrawUsage);
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = 1;
    this.group.add(this.shadows);

    // A bright pointer floating over the viewer's own marbles.
    this.pointerGeo = new ConeGeometry(0.45, 1, 12);
    this.pointerGeo.rotateX(Math.PI); // tip down
    this.pointerMat = new MeshBasicMaterial({ color: '#facc15' });
    this.pointers = highlight.filter((i) => this.balls[i]).map((i) => {
      const m = new Mesh(this.pointerGeo, this.pointerMat);
      this.group.add(m);
      return { index: i, mesh: m };
    });

    this.positions = [];
    this.layoutMemory = {}; // how marbles were nudged apart last draw (smooths crowds)
    this.normals = [];
    this.channel = null; // set for ice-channel tracks (marbles ride the curved walls)
    this.solidsAt = null; // (t) → obstacle footprints at race time t (ice channel features), set by the scene
    this.contacts = []; // marbles touching an obstacle in the last update: [{ index, solid }]
    this.shadowTilt = new Quaternion();
    this.crossedAt = new Map(); // where each finisher crossed the line (fixes its parking spot)
    this.move = new Vector3();
    this.axis = new Vector3();
    this.q = new Quaternion();
    this.tmpScale = new Vector3();
    this.m = new Matrix4();
  }

  /** Makes the marbles bigger than life (the whole-track view, where real size is a speck). */
  setScale(scale) {
    if (scale === this.scale) return;
    this.scale = scale;
    for (const b of this.balls) {
      b.mesh.scale.setScalar(scale);
      b.last = null; // don't count the jump as rolling
    }
  }

  /** Places every marble for a race frame ({ t, p: progress[], l: lateral[] }). */
  update(centerline, frame) {
    if (!frame) return;
    const r = MARBLE_RADIUS * this.scale;
    // Real size: never let two marbles touch. Bigger than life (whole-track
    // view), they can't all fit side by side, so they are drawn as they come.
    this.contacts.length = 0;
    layoutMarbles(centerline, frame, this.lanes, this.finish, {
      radius: r, separate: this.scale === 1, out: this.positions, crossedAt: this.crossedAt, channel: this.channel, normals: this.normals,
      memory: this.layoutMemory, solids: this.scale === 1 ? this.solidsAt?.(frame.t) : null, contacts: this.contacts,
    });
    this.balls.forEach((b, i) => {
      const pos = this.positions[i];
      // Roll: turn about the axis square to the (level) movement, by distance / radius.
      if (b.last) {
        this.move.subVectors(pos, b.last);
        this.move.y = 0;
        const dist = this.move.length();
        if (dist > 1e-4 && dist < 20) {
          this.axis.crossVectors(UP, this.move).normalize();
          this.q.setFromAxisAngle(this.axis, dist / r);
          b.mesh.quaternion.premultiply(this.q);
        }
      } else {
        b.last = new Vector3();
      }
      b.last.copy(pos);
      b.mesh.position.copy(pos);

      // The shadow lies on the surface under the marble (tilted up a channel
      // wall when it rides one) and shrinks as the marble flies higher.
      const h = frame.p[i] >= 1 ? 0 : (frame.h?.[i] ?? 0);
      const spread = this.scale / (1 + 0.35 * h);
      const n = this.normals[i] || UP;
      this.shadowTilt.setFromUnitVectors(UP, n);
      this.tmpPos = this.tmpPos || new Vector3();
      this.tmpPos.copy(pos).addScaledVector(UP, -h).addScaledVector(n, -(r - 0.03));
      this.m.compose(this.tmpPos, this.shadowTilt, this.tmpScale.set(spread, 1, spread));
      this.shadows.setMatrixAt(i, this.m);
    });
    this.shadows.instanceMatrix.needsUpdate = true;
    for (const p of this.pointers) {
      const at = this.balls[p.index].mesh.position;
      p.mesh.scale.setScalar(this.scale);
      p.mesh.position.set(at.x, at.y + r + 1.2 * this.scale, at.z);
    }
  }

  /** Current position of one marble (for the follow camera). */
  positionOf(index) {
    return this.balls[index]?.mesh.position ?? null;
  }

  dispose() {
    for (const b of this.balls) {
      b.mesh.material.map?.dispose();
      b.mesh.material.dispose();
    }
    this.geometry.dispose();
    this.shadows.geometry.dispose();
    this.shadows.material.dispose();
    this.shadowTex.dispose();
    this.pointerGeo.dispose();
    this.pointerMat.dispose();
  }
}
