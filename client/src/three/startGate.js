/**
 * The starting gate (physics preview, tracks with physics.gate): a row of
 * paddles, one in front of each waiting marble on the starting ramp, under a
 * red frame. At "GO" the paddles sink into the ice one after another in a
 * quick ripple: each one is clear just as the physics lets its marble go.
 *
 * Phone budget: two instanced meshes (paddles, blocks behind) plus a frame.
 */
import {
  BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshLambertMaterial, Quaternion, Vector3, DynamicDrawUsage,
} from 'three';
import { layoutMarbles, MARBLE_RADIUS } from './marbles';

export const GATE_COLORS = { paddle: '#e23b3b', block: '#f4fbff', frame: '#e23b3b', beam: '#ffffff' };

const PADDLE = { width: 1.05, height: 0.95, thick: 0.14 };
const SINK_MS = 160; // how long a paddle takes to sink
const ZERO = new Vector3(0, 0, 0);

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

export class StartGate {
  /**
   * @param places from gatePlaces
   * @param releaseMs when each paddle lets its marble go (ms after GO)
   */
  constructor(places, releaseMs) {
    this.places = places;
    this.releaseMs = releaseMs;
    this.group = new Group();
    this.paddleGeo = new BoxGeometry(PADDLE.width, PADDLE.height, PADDLE.thick);
    this.blockGeo = new BoxGeometry(PADDLE.width, 0.5, 0.5);
    this.mats = Object.fromEntries(Object.entries(GATE_COLORS).map(([k, c]) => [k, new MeshLambertMaterial({ color: c })]));
    this.paddles = new InstancedMesh(this.paddleGeo, this.mats.paddle, places.length);
    this.paddles.instanceMatrix.setUsage(DynamicDrawUsage);
    this.paddles.frustumCulled = false;
    const blocks = new InstancedMesh(this.blockGeo, this.mats.block, places.length);
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
    this.group.add(this.paddles, blocks);
    this.group.add(this.buildFrame());
    this.update(-Infinity);
  }

  /** A red frame over the start line: a post at each end and a beam across. */
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
      tops.push(foot.clone().add(new Vector3(0, height, 0)));
    }
    const span = tops[0].distanceTo(tops[1]);
    const beam = new Mesh(new BoxGeometry(span + 0.35, 0.5, 0.4), this.mats.beam);
    beam.position.copy(tops[0]).lerp(tops[1], 0.5);
    beam.lookAt(tops[1]);
    beam.rotateY(Math.PI / 2);
    frame.add(beam);
    return frame;
  }

  /**
   * A camera in front of the gate, a little above it, looking back up the ramp
   * at the waiting field; further back on narrow (portrait) screens so the whole row fits.
   */
  startView(aspect = 1.6) {
    const back = 13 * Math.max(1, 1.5 / Math.max(0.3, aspect));
    if (!this.view || this.view.back !== back) {
      const centre = new Vector3();
      const forward = new Vector3();
      for (const pl of this.places) {
        centre.add(pl.base);
        forward.add(pl.forward);
      }
      centre.divideScalar(this.places.length);
      forward.setY(0).normalize();
      const camera = centre.clone().addScaledVector(forward, back);
      camera.y = centre.y + 3.5 * (back / 13);
      this.view = { back, camera, target: centre.clone().add(new Vector3(0, 0.6, 0)) };
    }
    return this.view;
  }

  /** Sets the paddles for time `t` (ms after GO; negative during the countdown). */
  update(t) {
    const basis = new Matrix4();
    const one = new Vector3(1, 1, 1);
    this.places.forEach((pl, i) => {
      const sink = paddleSink(t, this.releaseMs[i] ?? 0);
      basis.makeBasis(pl.side, pl.up, pl.forward);
      this.q.setFromRotationMatrix(basis);
      this.v.copy(pl.base)
        .addScaledVector(pl.forward, MARBLE_RADIUS + PADDLE.thick / 2 + 0.03)
        .addScaledVector(pl.up, PADDLE.height / 2 - sink * (PADDLE.height + 0.05));
      this.m.compose(this.v, this.q, sink >= 1 ? ZERO : one); // gone once fully sunk
      this.paddles.setMatrixAt(i, this.m);
    });
    this.paddles.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.group.traverse((o) => { if (o.isMesh && o.geometry !== this.paddleGeo && o.geometry !== this.blockGeo) o.geometry.dispose(); });
    this.paddleGeo.dispose();
    this.blockGeo.dispose();
    for (const m of Object.values(this.mats)) m.dispose();
  }
}
