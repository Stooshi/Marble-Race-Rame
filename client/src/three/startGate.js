/**
 * The starting gate (physics preview, tracks with physics.gate): a row of
 * paddles, one in front of each waiting marble on the starting ramp, under a
 * frame. White like the ice, with a blue-grey edge so they stand out on it. At "GO" the paddles sink into the ice one after another in a
 * quick ripple: each one is clear just as the physics lets its marble go.
 *
 * Phone budget: three instanced meshes (paddles, their edges, blocks behind) plus a frame.
 */
import {
  BoxGeometry, Color, Float32BufferAttribute, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Quaternion, Vector3, DynamicDrawUsage,
} from 'three';
import { layoutMarbles, MARBLE_RADIUS } from './marbles';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const GATE_COLORS = { paddle: '#ffffff', edge: '#5f86a8', block: '#f4fbff', frame: '#ffffff' };

/** The gate styles of the varied starts: each one's colours and the shape of what holds each marble. */
export const GATE_STYLES = {
  paddle: { paddle: '#ffffff', edge: '#5f86a8', frame: '#ffffff', size: [1.05, 0.95] },
  trapdoor: { paddle: '#f2c230', edge: '#1e1f22', frame: '#2a2c31', size: [1.05, 0.5] },
  stalls: { paddle: '#3f8f4a', edge: '#f4f1e6', frame: '#f4f1e6', size: [1.05, 0.95] },
  barrier: { paddle: '#e8e4dc', edge: '#d8342a', frame: '#d8342a', size: [1.05, 0.95] },
};

const PADDLE = { width: 1.05, height: 0.95, thick: 0.14 };
const EDGE = 0.06; // width of the blue-grey border round each white paddle
const SINK_MS = 160; // how long a paddle takes to sink
const LIFT_MS = 900; // once the last paddle is down, the frame over the line lifts away this quickly…
const LIFT_HEIGHT = 40; // …this far up, out of the cameras' way as they follow the field down the slope
const ZERO = new Vector3(0, 0, 0);

// Grand Prix start lights: five lights over the line, coming on one by one over the
// last three seconds of the countdown and all going out at GO (instead of 3-2-1).
export const START_LIGHTS = 5;
export const LIGHT_STEP_MS = 600;
export const GANTRY_COLORS = { gantry: '#2b2e35', pod: '#121317', lightOff: '#3a1210', lightOn: '#ff2a18' };

/** How many of the five start lights are on at time `t` (ms after GO; negative during the countdown). */
export function startLightsOn(t) {
  if (!(t < 0) || t < -START_LIGHTS * LIGHT_STEP_MS) return 0;
  return Math.min(START_LIGHTS, Math.floor((t + START_LIGHTS * LIGHT_STEP_MS) / LIGHT_STEP_MS) + 1);
}

/** How far down (0 up, 1 gone) a paddle released at `releaseMs` is at time `t` (ms after GO). */
export function paddleSink(t, releaseMs) {
  const k = Math.min(1, Math.max(0, (t - (releaseMs - SINK_MS)) / SINK_MS));
  return k * k * (3 - 2 * k);
}

/**
 * Where each paddle stands: in front of its marble as drawn at the start,
 * upright on the ice (along the surface normal), facing down the track.
 * Returns [{ base, up, forward, side }] per marble.
 */
export function gatePlaces(centerline, frame0, lanes, channel) {
  const normals = [];
  const pos = layoutMarbles(centerline, frame0, lanes, null, { channel, normals });
  const { samples, segments } = centerline;
  return pos.map((p, i) => {
    const f = Math.min(1, Math.max(0, frame0.p[i])) * segments;
    const a = samples[Math.min(segments - 1, Math.floor(f))];
    const up = (normals[i] || new Vector3(0, 1, 0)).clone().normalize();
    // Down the track, square to the surface.
    const forward = new Vector3(a.tangent.x, a.tangent.y, a.tangent.z);
    forward.addScaledVector(up, -forward.dot(up)).normalize();
    const side = new Vector3().crossVectors(up, forward).normalize();
    const base = p.clone().addScaledVector(up, -MARBLE_RADIUS); // where the marble touches the ice
    return { base, up, forward, side };
  });
}

/** A starting block (Track and Field): a low grey rail along the track, two pedals tilted back, in their own colours. */
function startingBlock() {
  const part = (w, h, d, x, y, z, tilt, colour) => {
    const g = new BoxGeometry(w, h, d);
    g.rotateX(tilt);
    g.translate(x, y, z);
    const c = new Color(colour);
    const n = g.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let k = 0; k < n; k += 1) { col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; }
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    g.deleteAttribute('uv');
    return g.index ? g.toNonIndexed() : g;
  };
  return mergeGeometries([
    part(0.14, 0.08, 0.95, 0, -0.2, -0.1, 0, '#4a4f57'),
    part(0.36, 0.26, 0.06, -0.14, -0.08, 0.12, -0.7, '#2f5d9a'),
    part(0.36, 0.3, 0.06, 0.14, -0.06, -0.28, -0.7, '#2f5d9a'),
    part(0.06, 0.12, 0.06, -0.14, -0.17, 0.12, 0, '#4a4f57'),
    part(0.06, 0.14, 0.06, 0.14, -0.16, -0.28, 0, '#4a4f57'),
  ]);
}

export class StartGate {
  /**
   * @param places from gatePlaces
   * @param releaseMs when each paddle lets its marble go (ms after GO)
   * @param options lights: a Grand Prix start gantry with five start lights instead of the white frame;
   *   style: how the gate holds the field (the varied starts): 'paddle' (the paddles that sink, every
   *   track before them), 'trapdoor' (low flaps that fall forward flat), 'stalls' (a stall for each
   *   marble, its door swinging open sideways) or 'barrier' (one striped bar across the row, tilting up).
   *   Drawing only: each lets its marbles go exactly when the paddles would.
   */
  constructor(places, releaseMs, { lights = false, style = 'paddle', athletics = false } = {}) {
    this.places = places;
    this.releaseMs = releaseMs;
    this.lit = lights;
    this.style = GATE_STYLES[style] ? style : 'paddle';
    this.group = new Group();
    // Each paddle: a white face set into a slightly larger blue-grey one, which shows as a crisp edge.
    const [pw, ph] = GATE_STYLES[this.style].size;
    this.ph = ph;
    this.paddleGeo = new BoxGeometry(pw - 2 * EDGE, ph - 2 * EDGE, PADDLE.thick + 0.02);
    this.edgeGeo = new BoxGeometry(pw, ph, PADDLE.thick);
    // (A trapdoor flap and a stall door turn about one edge: their boxes are moved so that edge is at the origin.)
    if (this.style === 'trapdoor') { this.paddleGeo.translate(0, ph / 2, 0); this.edgeGeo.translate(0, ph / 2, 0); }
    if (this.style === 'stalls') { this.paddleGeo.translate(pw / 2, ph / 2, 0); this.edgeGeo.translate(pw / 2, ph / 2, 0); }
    // (Track and Field: real starting blocks behind each marble, a grey rail with two angled pedals.)
    this.blockGeo = athletics ? startingBlock() : new BoxGeometry(PADDLE.width, 0.5, 0.5);
    // The white parts glow a touch, so they stay white even facing away from the sun.
    const glow = { paddle: '#8a96a2', frame: '#8a96a2' };
    const look = { ...GATE_COLORS, ...(this.style === 'paddle' ? {} : { paddle: GATE_STYLES[this.style].paddle, edge: GATE_STYLES[this.style].edge, frame: GATE_STYLES[this.style].frame }) };
    if (this.style !== 'paddle') glow.paddle = '#000000';
    if (this.style === 'trapdoor') glow.frame = '#000000';
    this.mats = Object.fromEntries(Object.entries(look).map(([k, c]) => [k, new MeshLambertMaterial({ color: c, emissive: glow[k] ?? '#000000' })]));
    if (lights) {
      // The Grand Prix gantry: dark steel, the pods black.
      this.mats.frame = new MeshLambertMaterial({ color: GANTRY_COLORS.gantry });
      this.mats.edge = new MeshLambertMaterial({ color: GANTRY_COLORS.pod });
    }
    this.paddles = new InstancedMesh(this.paddleGeo, this.mats.paddle, places.length);
    this.paddles.instanceMatrix.setUsage(DynamicDrawUsage);
    this.paddles.frustumCulled = false;
    this.edges = new InstancedMesh(this.edgeGeo, this.mats.edge, places.length);
    this.edges.instanceMatrix.setUsage(DynamicDrawUsage);
    this.edges.frustumCulled = false;
    const blocks = new InstancedMesh(this.blockGeo, athletics ? new MeshLambertMaterial({ vertexColors: true, flatShading: true }) : this.mats.block, places.length);
    this.m = new Matrix4();
    this.q = new Quaternion();
    this.v = new Vector3();
    const basis = new Matrix4();
    places.forEach((pl, i) => {
      basis.makeBasis(pl.side, pl.up, pl.forward);
      this.q.setFromRotationMatrix(basis);
      // A starting block behind each marble.
      this.v.copy(pl.base).addScaledVector(pl.up, 0.25).addScaledVector(pl.forward, -(MARBLE_RADIUS + 0.3));
      this.m.compose(this.v, this.q, new Vector3(1, 1, 1));
      blocks.setMatrixAt(i, this.m);
    });
    blocks.instanceMatrix.needsUpdate = true;
    this.group.add(this.paddles, this.edges, blocks);
    if (this.style === 'stalls') this.group.add(this.buildStalls());
    if (this.style === 'barrier') {
      // One bar across the whole row, striped, turning up about its first end; the paddles are not drawn.
      this.paddles.visible = false;
      this.edges.visible = false;
      this.group.add(this.buildBarrier());
    }
    this.frameGroup = this.buildFrame();
    this.group.add(this.frameGroup);
    this.liftAt = Math.max(0, ...releaseMs.map((r) => r ?? 0)); // when the last paddle has gone
    this.update(-Infinity);
  }

  /** A white frame over the start line, trimmed in blue-grey: a post at each end and a beam across. */
  buildFrame() {
    const frame = new Group();
    const ends = [this.places[0], this.places[this.places.length - 1]];
    const height = 3.2;
    const tops = [];
    for (const [k, pl] of ends.entries()) {
      const out = k === 0 ? -1 : 1;
      const foot = pl.base.clone().addScaledVector(pl.side, -out * 0.9).addScaledVector(pl.forward, MARBLE_RADIUS + 0.2);
      const post = new Mesh(new BoxGeometry(0.35, height, 0.35), this.mats.frame);
      post.position.copy(foot).add(new Vector3(0, height / 2, 0));
      frame.add(post);
      // Blue-grey foot and cap, so the white post reads against the ice and the sky.
      for (const y of [0.15, height - 0.1]) {
        const band = new Mesh(new BoxGeometry(0.45, 0.3, 0.45), this.mats.edge);
        band.position.copy(foot).add(new Vector3(0, y, 0));
        frame.add(band);
      }
      tops.push(foot.clone().add(new Vector3(0, height, 0)));
    }
    const span = tops[0].distanceTo(tops[1]);
    const beam = new Mesh(new BoxGeometry(span + 0.35, 0.5, 0.4), this.mats.frame);
    beam.position.copy(tops[0]).lerp(tops[1], 0.5);
    beam.lookAt(tops[1]);
    beam.rotateY(Math.PI / 2);
    // Blue-grey trim along the beam's top and bottom edges.
    for (const y of [-0.25, 0.25]) {
      const trim = new Mesh(new BoxGeometry(span + 0.45, 0.08, 0.46), this.mats.edge);
      trim.position.y = y;
      beam.add(trim);
    }
    frame.add(beam);
    if (this.lit) {
      // Five pods standing on the beam's middle, two lights each (seen from either side).
      const mid = tops[0].clone().lerp(tops[1], 0.5);
      const across = tops[1].clone().sub(tops[0]).setY(0).normalize();
      const fwd = new Vector3(-across.z, 0, across.x);
      const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(across, new Vector3(0, 1, 0), fwd));
      const lamps = [];
      for (let n = 0; n < START_LIGHTS; n += 1) {
        const x = (n - (START_LIGHTS - 1) / 2) * 0.62;
        const pod = new Mesh(new BoxGeometry(0.48, 1.05, 0.22), this.mats.edge);
        pod.position.copy(mid).addScaledVector(across, x).add(new Vector3(0, 0.25 + 0.55, 0));
        pod.quaternion.copy(q);
        frame.add(pod);
        for (const y of [0.18, -0.2]) lamps.push(mid.clone().addScaledVector(across, x).add(new Vector3(0, 0.8 + y, 0)));
      }
      this.lampGeo = new IcosahedronGeometry(0.19, 1);
      this.lampMat = new MeshBasicMaterial({ color: '#ffffff' });
      this.lamps = new InstancedMesh(this.lampGeo, this.lampMat, lamps.length);
      this.lamps.name = 'start lights';
      lamps.forEach((p, k) => this.lamps.setMatrixAt(k, new Matrix4().makeTranslation(p.x, p.y, p.z)));
      this.lampColors = { off: new Color(GANTRY_COLORS.lightOff), on: new Color(GANTRY_COLORS.lightOn) };
      this.lightsShown = -1;
    }
    // Drawn as one mesh per colour (two draw calls, not ten).
    frame.updateMatrixWorld(true);
    const byMat = new Map();
    frame.traverse((o) => {
      if (!o.isMesh) return;
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      g.deleteAttribute('uv');
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(g.index ? g.toNonIndexed() : g);
    });
    const merged = new Group();
    for (const [mat, list] of byMat) merged.add(new Mesh(mergeGeometries(list), mat));
    if (this.lamps) merged.add(this.lamps); // (their own call: they light up on the countdown)
    return merged;
  }

  /** The stalls' dividers: a thin wall between each marble and the next, and at both ends. */
  buildStalls() {
    const walls = [];
    const n = this.places.length;
    const wall = (pl, offset) => {
      const g = new BoxGeometry(0.08, 0.95, 1.7);
      const m = new Matrix4().makeBasis(pl.side, pl.up, pl.forward);
      m.setPosition(pl.base.clone().addScaledVector(pl.side, offset).addScaledVector(pl.up, 0.47).addScaledVector(pl.forward, -0.15));
      walls.push(g.applyMatrix4(m).toNonIndexed());
    };
    this.places.forEach((pl, i) => {
      const next = this.places[i + 1];
      if (next) wall(pl, next.base.clone().sub(pl.base).dot(pl.side) / 2);
    });
    wall(this.places[0], -0.8);
    wall(this.places[n - 1], 0.8);
    walls.forEach((g) => g.deleteAttribute('uv'));
    return new Mesh(mergeGeometries(walls), this.mats.edge);
  }

  /** The barrier: a striped bar across the row at marble height, its pivot at the first end. */
  buildBarrier() {
    const a = this.places[0];
    const b = this.places[this.places.length - 1];
    const span = b.base.clone().sub(a.base).dot(a.side) + 1.6;
    const pivot = new Group();
    const basis = new Matrix4().makeBasis(a.side, a.up, a.forward);
    pivot.quaternion.setFromRotationMatrix(basis);
    pivot.position.copy(a.base).addScaledVector(a.side, -0.8).addScaledVector(a.up, 0.6).addScaledVector(a.forward, MARBLE_RADIUS + 0.2);
    const stripes = Math.max(4, Math.round(span / 1.2));
    for (let k = 0; k < stripes; k += 1) {
      const piece = new Mesh(new BoxGeometry(span / stripes, 0.22, 0.16), k % 2 ? this.mats.paddle : this.mats.edge);
      piece.position.x = (k + 0.5) * (span / stripes);
      pivot.add(piece);
    }
    const post = new Mesh(new BoxGeometry(0.3, 1.1, 0.3), this.mats.frame);
    post.position.set(-0.2, -0.05, 0);
    pivot.add(post);
    this.barrier = pivot;
    this.barrierAt = Math.min(...this.releaseMs.map((r) => r ?? 0)); // it goes up as the first marble is let go
    return pivot;
  }

  /**
   * The middle of the waiting field, the level directions down the track and
   * across it, how wide the row is, and the slope it waits on (the direction
   * down it and the ice's normal), for the countdown camera (startCamera.js).
   */
  startFrame() {
    if (!this.frame) {
      const centre = new Vector3();
      const forward = new Vector3();
      const normal = new Vector3();
      for (const pl of this.places) {
        centre.add(pl.base);
        forward.add(pl.forward);
        normal.add(pl.up);
      }
      centre.divideScalar(this.places.length);
      const down = forward.clone().normalize(); // down the slope the field waits on
      normal.normalize();
      forward.setY(0).normalize();
      const side = new Vector3().crossVectors(new Vector3(0, 1, 0), forward).normalize();
      // How far the row reaches either side of its middle (to the outer marbles' far edges).
      const halfWidth = Math.max(...this.places.map((pl) => Math.abs(pl.base.clone().sub(centre).dot(side)))) + MARBLE_RADIUS;
      this.frame = { centre, forward, side, halfWidth, down, normal };
    }
    return this.frame;
  }

  /** Sets the paddles (and the frame, lifting away after the start) for time `t` (ms after GO; negative during the countdown). */
  update(t) {
    const k = Math.min(1, Math.max(0, (t - this.liftAt) / LIFT_MS));
    this.frameGroup.position.y = k * k * LIFT_HEIGHT; // gathering speed as it goes
    this.frameGroup.visible = k < 1;
    if (this.lamps) {
      // The lights, one pod at a time (both its lights), all out at GO.
      const on = startLightsOn(t);
      if (on !== this.lightsShown) {
        for (let n = 0; n < START_LIGHTS * 2; n += 1) this.lamps.setColorAt(n, Math.floor(n / 2) < on ? this.lampColors.on : this.lampColors.off);
        this.lamps.instanceColor.needsUpdate = true;
        this.lightsShown = on;
      }
    }
    const basis = new Matrix4();
    const one = new Vector3(1, 1, 1);
    if (this.barrier) {
      const k2 = paddleSink(t, this.barrierAt + 120);
      this.barrier.rotation.z = k2 * 1.35; // up and out of the way
    }
    const turn = new Quaternion();
    this.places.forEach((pl, i) => {
      const sink = paddleSink(t, this.releaseMs[i] ?? 0);
      basis.makeBasis(pl.side, pl.up, pl.forward);
      this.q.setFromRotationMatrix(basis);
      const front = pl.base.clone().addScaledVector(pl.forward, MARBLE_RADIUS + PADDLE.thick / 2 + 0.03);
      if (this.style === 'trapdoor') {
        // Hinged at its foot: it falls forward, flat on the ice.
        turn.setFromAxisAngle(new Vector3(1, 0, 0), sink * (Math.PI / 2));
        this.m.compose(front, this.q.clone().multiply(turn), one);
      } else if (this.style === 'stalls') {
        // Hinged at its left edge: it swings open, round to the side.
        turn.setFromAxisAngle(new Vector3(0, 1, 0), -sink * (Math.PI * 0.55));
        this.m.compose(front.addScaledVector(pl.side, -0.52), this.q.clone().multiply(turn), one);
      } else {
        this.v.copy(front).addScaledVector(pl.up, this.ph / 2 - sink * (this.ph + 0.05));
        this.m.compose(this.v, this.q, sink >= 1 ? ZERO : one); // gone once fully sunk
      }
      this.paddles.setMatrixAt(i, this.m);
      this.edges.setMatrixAt(i, this.m);
    });
    this.paddles.instanceMatrix.needsUpdate = true;
    this.edges.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    const shared = [this.paddleGeo, this.edgeGeo, this.blockGeo];
    this.group.traverse((o) => { if (o.isMesh && !shared.includes(o.geometry)) o.geometry.dispose(); });
    this.paddleGeo.dispose();
    this.edgeGeo.dispose();
    this.blockGeo.dispose();
    this.lampGeo?.dispose();
    this.lampMat?.dispose();
    for (const m of Object.values(this.mats)) m.dispose();
  }
}
