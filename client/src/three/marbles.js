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

/**
 * Parking spot past the finish for the marble that finished `rank`-th
 * (0 = winner): rows across the track, the winner in the front row on the left.
 * Returns metres past the line (along) and from the centre (across).
 */
export function runoutSlot(rank, lanes, style = TRACK_STYLE) {
  const width = lanes * style.laneWidth;
  const cols = Math.max(1, Math.floor(width / 1.3));
  const row = Math.floor(rank / cols);
  const col = rank % cols;
  return { along: 2.5 + row * 1.3, across: (col - (cols - 1) / 2) * (width / cols) };
}

const SETTLE_SECONDS = 1.2; // time to roll from the line to the parking spot

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

    this.tmp = new Vector3();
    this.slot = new Vector3();
    this.move = new Vector3();
    this.axis = new Vector3();
    this.q = new Quaternion();
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
    const end = centerline.samples[centerline.samples.length - 1];
    this.balls.forEach((b, i) => {
      const pos = placeMarble(centerline, frame.p[i] ?? 0, frame.l[i] ?? 0, this.lanes, r, TRACK_STYLE, this.tmp);
      // Finished: roll on past the line and park in finishing order.
      const fin = this.finish.get(i);
      if (fin && frame.t >= fin.t && (frame.p[i] ?? 0) >= 0.999) {
        const k = 1 - (1 - Math.min(1, (frame.t - fin.t) / 1000 / SETTLE_SECONDS)) ** 2; // ease out
        const { along, across } = runoutSlot(fin.rank, this.lanes);
        const fx = end.tangent.x;
        const fz = end.tangent.z;
        const fl = Math.hypot(fx, fz) || 1;
        this.slot.set(
          end.pos.x + (fx / fl) * along + end.side.x * across,
          end.pos.y + r,
          end.pos.z + (fz / fl) * along + end.side.z * across,
        );
        pos.lerp(this.slot, k);
      }
      // Roll: turn about the axis square to the movement, by distance / radius.
      if (b.last) {
        this.move.subVectors(pos, b.last);
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

      this.m.makeScale(this.scale, 1, this.scale).setPosition(pos.x, pos.y - r + 0.03, pos.z);
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
