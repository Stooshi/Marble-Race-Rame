/**
 * Track structures for kit tracks (physics.kit.sections): tunnels and caves,
 * bridges and waterfalls. Drawing only: the race engine never sees them.
 *
 * The camera rule: the follow camera is never blocked. A tunnel's roof is an
 * arch whose every face points inward, drawn one-sided: from inside you see
 * the cave all round you; from outside (the camera above or behind it) its
 * faces point away and are not drawn at all, so nothing ever hides a marble.
 * Anything else beside the channel stays outside its rims, and anything
 * crossing it is see-through (water, spray). Bridges stand below the channel.
 *
 * Returns { group, update(t), dispose } (t: ms after the start), or null.
 */
import {
  AdditiveBlending, BufferGeometry, CanvasTexture, Color, ConeGeometry, DoubleSide, Float32BufferAttribute, FrontSide,
  Group, IcosahedronGeometry, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, Points, PointsMaterial, Quaternion,
  RepeatWrapping, SRGBColorSpace, BoxGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { placeOnChannel } from './iceChannel';

const UP = new Vector3(0, 1, 0);

export const STRUCTURE_COLORS = {
  // tunnels
  rock: '#6d6a66', rockDark: '#4f4c49', timber: '#7a5534', lantern: '#ffd36b',
  ice: '#9fd8f2', iceDeep: '#4fa3d6', iceRib: '#e3f6ff',
  scale: '#c42d24', scaleDark: '#8e1c18', gold: '#e8b33c', tooth: '#f6f1e2', eye: '#ffd21f', pupil: '#1b1b1e', horn: '#e9dcc0',
  root: '#6b4a2e', rootDark: '#4a321f',
  // bridges
  plank: '#8a6340', plankDark: '#6a4a2f', stone: '#a49c8f', stoneDark: '#837b70', iceSlab: '#cdeefc',
  // waterfalls
  water: '#3f9ad6', foam: '#ffffff', cliff: '#7c7a74', cliffDark: '#5d5b56',
};

const TUNNEL_STYLES = {
  // Shape of the arch: how far out past the rims its walls stand, and how high its crown is above them.
  mine: { out: 0.7, rise: 3.6, ribEvery: 3 },
  rock: { out: 0.9, rise: 4.2, ribEvery: 0 },
  'ice-cave': { out: 1.2, rise: 4.6, ribEvery: 5, see: 0.5 },
  dragon: { out: 1.0, rise: 4.2, ribEvery: 1.5 },
  roots: { out: 1.0, rise: 4.0, ribEvery: 2.5 },
};

/** The track's frame at progress p: floor point, level sideways direction (left), along it. */
function frameAt(centerline, p) {
  const { samples, segments } = centerline;
  const f = Math.min(1, Math.max(0, p)) * segments;
  const i = Math.min(segments - 1, Math.floor(f));
  const a = samples[i];
  const b = samples[i + 1];
  return {
    pos: new Vector3().lerpVectors(a.pos, b.pos, f - i),
    side: new Vector3(a.side.x, 0, a.side.z).normalize(),
    along: new Vector3().subVectors(b.pos, a.pos).normalize(),
  };
}

/** Small fixed pseudo-random numbers (the same every visit). */
const noise = (k) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** A soft stripy water texture (our own), scrolled down the chute each frame. */
function waterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = STRUCTURE_COLORS.water;
  g.fillRect(0, 0, 64, 256);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  for (let k = 0; k < 26; k += 1) {
    const x = (k * 37) % 64;
    const y = (k * 71) % 256;
    g.fillRect(x, y, 2 + (k % 3), 18 + ((k * 13) % 30));
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}

export function buildStructures(centerline, channel, kit, { lite = false } = {}) {
  const sections = kit?.sections?.filter((s) => s.tunnel || s.bridge || s.waterfall);
  if (!channel || !sections?.length) return null;
  const group = new Group();
  group.name = 'structures';
  const surface = (p, l, lift = 0) => placeOnChannel(centerline, channel, p, l, 0, lift, 0);
  const metres = (s) => (s.to - s.from) * channel.arc;
  const parts = {}; // colour key → geometries, merged per material
  const add = (key, geometry, matrix) => {
    if (matrix) geometry.applyMatrix4(matrix);
    (parts[key] ??= []).push(geometry.index ? geometry.toNonIndexed() : geometry);
  };
  const water = []; // scrolling water textures
  const owned = []; // materials and textures to dispose

  /**
   * An inward-facing arch along the track from p0 to p1: rings every `step`
   * metres from the left rim over to the right one, each triangle wound so it
   * faces the middle of the arch. colour(k, j, ring) gives a vertex colour.
   */
  const arch = (p0, p1, style, colour, { scale = 1, step = lite ? 3 : 1.5 } = {}) => {
    const count = Math.max(2, Math.round(((p1 - p0) * channel.arc) / step) + 1);
    const ACROSS = lite ? 8 : 14;
    const rings = [];
    for (let k = 0; k < count; k += 1) {
      const p = p0 + ((p1 - p0) * k) / (count - 1);
      const { pos, side } = frameAt(centerline, p);
      const left = surface(p, 1);
      const right = surface(p, -1);
      const centre = left.clone().lerp(right, 0.5);
      const a = (left.distanceTo(right) / 2 + style.out) * scale;
      const b = style.rise * scale + (centre.y - pos.y);
      const base = new Vector3(centre.x, pos.y - 0.6, centre.z); // the walls run down past the rims
      const ring = [];
      for (let j = 0; j <= ACROSS; j += 1) {
        const phi = (Math.PI * j) / ACROSS; // 0: the left wall, π/2: the crown, π: the right wall
        ring.push(base.clone().addScaledVector(side, a * Math.cos(phi)).addScaledVector(UP, b * Math.sin(phi)));
      }
      rings.push({ ring, centre: base.clone().addScaledVector(UP, b * 0.4), p });
    }
    const pos = [];
    const col = [];
    const c = new Color();
    const tri = (A, B, C, inside, colours) => {
      // Facing the middle of the arch (inward): flip the winding if it doesn't.
      const n = new Vector3().subVectors(B, A).cross(new Vector3().subVectors(C, A));
      const mid = new Vector3().add(A).add(B).add(C).multiplyScalar(1 / 3);
      const facesIn = n.dot(new Vector3().subVectors(inside, mid)) >= 0;
      const pts = facesIn ? [A, B, C] : [A, C, B];
      const cols = facesIn ? colours : [colours[0], colours[2], colours[1]];
      pts.forEach((v, q) => { pos.push(v.x, v.y, v.z); col.push(cols[q].r, cols[q].g, cols[q].b); });
    };
    for (let k = 0; k < rings.length - 1; k += 1) {
      const r0 = rings[k];
      const r1 = rings[k + 1];
      const inside = r0.centre.clone().lerp(r1.centre, 0.5);
      for (let j = 0; j < ACROSS; j += 1) {
        const tone = c.set(colour(k, j, rings.length, ACROSS)).clone();
        tri(r0.ring[j], r1.ring[j], r1.ring[j + 1], inside, [tone, tone, tone]);
        tri(r0.ring[j], r1.ring[j + 1], r0.ring[j + 1], inside, [tone, tone, tone]);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return { geometry: g, rings };
  };

  const archMaterial = (see) => {
    const m = see
      ? new MeshLambertMaterial({ vertexColors: true, side: FrontSide, transparent: true, opacity: see, depthWrite: false, flatShading: true })
      : new MeshLambertMaterial({ vertexColors: true, side: FrontSide, flatShading: true });
    owned.push(m);
    return m;
  };

  for (const s of sections) {
    const len = metres(s);
    // ── Tunnels and caves ──────────────────────────────────────────────
    if (s.tunnel) {
      const style = TUNNEL_STYLES[s.tunnel] ?? TUNNEL_STYLES.rock;
      const C = STRUCTURE_COLORS;
      const ribRings = style.ribEvery ? Math.max(1, Math.round(style.ribEvery / (lite ? 3 : 1.5))) : 0;
      const colour = {
        mine: (k, j) => (ribRings && k % ribRings === 0 ? C.timber : noise(k * 31 + j) > 0.5 ? C.rock : C.rockDark),
        // (j counts across the arch from the left wall, 0 to `across`: the crown is at across / 2.)
        rock: (k, j) => (noise(k * 17 + j * 7) > 0.45 ? C.rock : C.rockDark),
        'ice-cave': (k, j, n, across) => (ribRings && k % ribRings === 0 ? C.iceRib : j / across > 0.3 && j / across < 0.7 ? C.ice : C.iceDeep),
        dragon: (k, j, n, across) => {
          if (Math.abs(j + 0.5 - across / 2) < 1) return C.gold; // the golden spine along the crown
          if (k >= n - 3) return C.scaleDark; // inside the mouth
          return k % 2 ? C.scale : C.scaleDark;
        },
        roots: (k, j) => ((k + j) % 4 === 0 ? C.rootDark : noise(k * 13 + j) > 0.6 ? C.root : C.rock),
      }[s.tunnel] ?? ((k, j) => (noise(k + j) > 0.5 ? C.rock : C.rockDark));
      const { geometry, rings } = arch(s.from, s.to, style, colour);
      const mesh = new Mesh(geometry, archMaterial(style.see));
      mesh.name = `tunnel:${s.tunnel}`;
      group.add(mesh);

      // From outside: banks beside the channel (rock, ice or the dragon's coils), never across
      // it, so the follow camera above sees the run dive in under them.
      const bank = { mine: ['rock', 'rockDark'], rock: ['rock', 'rockDark'], roots: ['root', 'rock'], 'ice-cave': ['iceRib', 'ice'], dragon: ['scale', 'scaleDark'] }[s.tunnel] ?? ['rock', 'rockDark'];
      const bankStep = lite ? 6 : 3.5;
      const nb = Math.max(2, Math.round(len / bankStep));
      for (let k = 0; k <= nb; k += 1) {
        const p = s.from + ((s.to - s.from) * k) / nb;
        const { side } = frameAt(centerline, p);
        for (const sign of [-1, 1]) {
          const rim = surface(p, sign);
          const out = side.clone().multiplyScalar(sign);
          const r = 2.2 + noise(k * 5 + sign) * 1.4;
          const at = rim.clone().addScaledVector(out, style.out + r + 0.8).addScaledVector(UP, r * 0.45);
          const geo = s.tunnel === 'dragon' ? new IcosahedronGeometry(r * 0.9, 1) : new IcosahedronGeometry(r, 0);
          add(bank[(k + (sign > 0 ? 0 : 1)) % 2], geo, new Matrix4().compose(at, new Quaternion().setFromAxisAngle(UP, k * 1.3), new Vector3(1, s.tunnel === 'dragon' ? 0.8 : 1.3, 1.2)));
          if (s.tunnel === 'dragon' && k % 2 === 0) {
            // A golden spine plate on each coil.
            const plate = new ConeGeometry(0.5, 1.4, 4);
            plate.translate(0, 0.7, 0);
            add('gold', plate, new Matrix4().makeTranslation(at.x, at.y + r * 0.7, at.z));
          }
        }
        // Timber posts standing at the rims on the mine's frames.
        if (s.tunnel === 'mine' && k % 2 === 0) {
          for (const sign of [-1, 1]) {
            const rim = surface(p, sign);
            const out = side.clone().multiplyScalar(sign);
            add('timber', new BoxGeometry(0.35, 3.2, 0.35), new Matrix4().makeTranslation(...rim.clone().addScaledVector(out, 0.5).addScaledVector(UP, 1.2).toArray()));
          }
        }
      }

      if (s.tunnel === 'mine') {
        // Lanterns on the timber frames, low on the walls (inward-facing glowing tiles).
        const lamps = [];
        for (let k = ribRings * 2; k < rings.length - 1; k += ribRings * 3) {
          const last = rings[k].ring.length - 1;
          for (const j of [Math.round(last * 0.15), Math.round(last * 0.85)]) {
            const a = rings[k].ring[j];
            const b = rings[k + 1].ring[j];
            const centre = rings[k].centre;
            const inward = new Vector3().subVectors(centre, a).normalize();
            const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), inward);
            const tile = new BoxGeometry(0.35, 0.45, 0.02);
            lamps.push(tile.applyMatrix4(new Matrix4().compose(a.clone().lerp(b, 0.5).addScaledVector(inward, 0.08), q, new Vector3(1, 1, 1))));
          }
        }
        if (lamps.length) {
          const m = new MeshBasicMaterial({ color: STRUCTURE_COLORS.lantern });
          owned.push(m);
          group.add(new Mesh(mergeGeometries(lamps.map((g) => g.toNonIndexed())), m));
        }
      }

      if (s.tunnel === 'dragon') {
        // In at the tail, out of the mouth. The tail curls away beside the way in; the
        // head's eyes and horns stand at the mouth's sides, outside the rims (never in the
        // camera's way), and teeth line the mouth's upper walls.
        const last = rings[rings.length - 1];
        const first = rings[0];
        const exit = frameAt(centerline, s.to);
        const enter = frameAt(centerline, s.from);
        for (const sign of [-1, 1]) {
          const cheek = last.ring[sign > 0 ? 3 : last.ring.length - 4];
          const outward = exit.side.clone().multiplyScalar(sign);
          add('eye', new IcosahedronGeometry(0.55, 1), new Matrix4().compose(cheek.clone().addScaledVector(outward, 0.5).addScaledVector(exit.along, 0.4), new Quaternion(), new Vector3(1, 1.2, 1)));
          add('pupil', new IcosahedronGeometry(0.22, 0), new Matrix4().makeTranslation(...cheek.clone().addScaledVector(outward, 0.95).addScaledVector(exit.along, 0.55).toArray()));
          const horn = new ConeGeometry(0.3, 2.2, 7);
          horn.translate(0, 1.1, 0);
          add('horn', horn, new Matrix4().compose(cheek.clone().addScaledVector(outward, 0.6).addScaledVector(UP, 0.8), new Quaternion().setFromUnitVectors(UP, outward.clone().multiplyScalar(0.6).add(UP).addScaledVector(exit.along, -0.5).normalize()), new Vector3(1, 1, 1)));
          // Whiskers: long thin barbels sweeping out from the snout, beside the channel.
          const whisker = new ConeGeometry(0.06, 3.5, 5);
          whisker.translate(0, 1.75, 0);
          add('gold', whisker, new Matrix4().compose(cheek.clone().addScaledVector(exit.along, 1.2).addScaledVector(UP, -0.4), new Quaternion().setFromUnitVectors(UP, outward.clone().addScaledVector(exit.along, 0.5).addScaledVector(UP, -0.2).normalize()), new Vector3(1, 1, 1)));
        }
        // The head over the mouth, drawn with its forward-facing surfaces only: seen from the
        // front it is a whole head; the follow camera, always behind, never sees it, so it can
        // never come between the camera and a marble.
        const crown = last.ring[Math.floor(last.ring.length / 2)];
        const forward = exit.along.clone().setY(0).normalize();
        const frontOnly = (geometry, matrix, key) => {
          const g = geometry.toNonIndexed();
          g.applyMatrix4(matrix);
          const pos = g.getAttribute('position');
          const keep = [];
          const a = new Vector3();
          const b = new Vector3();
          const c = new Vector3();
          for (let t3 = 0; t3 < pos.count; t3 += 3) {
            a.fromBufferAttribute(pos, t3);
            b.fromBufferAttribute(pos, t3 + 1);
            c.fromBufferAttribute(pos, t3 + 2);
            const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).normalize();
            if (n.dot(forward) > 0.2) keep.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
          }
          const out = new BufferGeometry();
          out.setAttribute('position', new Float32BufferAttribute(keep, 3));
          add(key, out);
        };
        const head = crown.clone().addScaledVector(UP, 1.2).addScaledVector(forward, 0.8);
        const turn = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), forward);
        frontOnly(new IcosahedronGeometry(1, 1), new Matrix4().compose(head, turn, new Vector3(4.2, 2.2, 2.6)), 'scale');           // the head
        frontOnly(new IcosahedronGeometry(1, 1), new Matrix4().compose(head.clone().addScaledVector(forward, 1.8).addScaledVector(UP, -0.6), turn, new Vector3(2.6, 1.3, 2)), 'scaleDark'); // the snout
        for (const sign of [-1, 1]) {
          const brow = head.clone().addScaledVector(exit.side, sign * 1.6).addScaledVector(UP, 1.1).addScaledVector(forward, 1.2);
          frontOnly(new IcosahedronGeometry(0.7, 0), new Matrix4().compose(brow, turn, new Vector3(1.4, 0.6, 1)), 'gold');            // golden brows
          frontOnly(new IcosahedronGeometry(0.35, 0), new Matrix4().compose(head.clone().addScaledVector(exit.side, sign * 0.7).addScaledVector(forward, 3.6).addScaledVector(UP, -0.4), turn, new Vector3(1, 1, 1)), 'pupil'); // nostrils
        }
        // Teeth along the upper side walls of the mouth, pointing in.
        for (let k = Math.max(0, rings.length - 3); k < rings.length; k += 1) {
          const across = rings[k].ring.length - 1;
          for (const j of [...new Set([0.22, 0.29, 0.71, 0.78].map((u) => Math.round(u * across)))]) {
            const at = rings[k].ring[j];
            const inward = new Vector3().subVectors(rings[k].centre, at).normalize();
            const tooth = new ConeGeometry(0.16, 0.7, 5);
            tooth.translate(0, 0.35, 0);
            add('tooth', tooth, new Matrix4().compose(at, new Quaternion().setFromUnitVectors(UP, inward), new Vector3(1, 1, 1)));
          }
        }
        // The tail: tapering coils curling away beside the way in, on the outside.
        const sign = 1;
        const outward = enter.side.clone().multiplyScalar(sign);
        let at = first.ring[2].clone().addScaledVector(outward, 0.6);
        for (let k = 0; k < (lite ? 5 : 9); k += 1) {
          const r = 1.0 * (1 - k / 11);
          at = at.clone().addScaledVector(enter.along, -1.6).addScaledVector(outward, 0.9).addScaledVector(UP, Math.sin(k * 0.9) * 0.6);
          add(k % 2 ? 'scale' : 'scaleDark', new IcosahedronGeometry(r, 1), new Matrix4().makeTranslation(at.x, at.y, at.z));
          if (k % 2 === 0) {
            const spike = new ConeGeometry(r * 0.35, r * 1.1, 5);
            spike.translate(0, r * 0.9, 0);
            add('gold', spike, new Matrix4().makeTranslation(at.x, at.y, at.z));
          }
        }
      }
    }

    // ── Bridges: below the channel, so they never come between camera and marble ─
    if (s.bridge) {
      const step = lite ? 4 : 2;
      const n = Math.max(2, Math.round(len / step));
      for (let k = 0; k <= n; k += 1) {
        const p = s.from + ((s.to - s.from) * k) / n;
        const { pos, side, along } = frameAt(centerline, p);
        const flat = along.clone().setY(0).normalize();
        const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(side, UP, flat));
        const under = pos.clone().addScaledVector(UP, -0.9);
        if (s.bridge === 'wood') {
          add(k % 2 ? 'plank' : 'plankDark', new BoxGeometry(9.5, 0.25, step * 0.9), new Matrix4().compose(under, q, new Vector3(1, 1, 1)));
          if (k % 3 === 0) {
            for (const x of [-4.2, 4.2]) add('plankDark', new BoxGeometry(0.35, 12, 0.35), new Matrix4().compose(under.clone().addScaledVector(side, x).addScaledVector(UP, -6.1), q, new Vector3(1, 1, 1)));
          }
        } else if (s.bridge === 'stone') {
          add(k % 2 ? 'stone' : 'stoneDark', new BoxGeometry(9.5, 1.2, step * 0.95), new Matrix4().compose(under.clone().addScaledVector(UP, -0.4), q, new Vector3(1, 1, 1)));
          if (k % 4 === 0) add('stoneDark', new BoxGeometry(2.2, 14, 2.2), new Matrix4().compose(under.clone().addScaledVector(UP, -7.6), q, new Vector3(1, 1, 1)));
        } else {
          // A narrow-looking bridge of blue ice over the crevasse (the channel keeps its width).
          add('iceSlab', new BoxGeometry(8.2, 1.6, step * 0.98), new Matrix4().compose(under.clone().addScaledVector(UP, -0.5), q, new Vector3(1, 1, 1)));
          add('iceDeep', new BoxGeometry(6.5, 2.5, step * 0.98), new Matrix4().compose(under.clone().addScaledVector(UP, -2.4), q, new Vector3(1, 1, 1)));
        }
      }
    }

    // ── Waterfalls: water down the chute, cascades beside it, spray, a curtain ─
    if (s.waterfall) {
      const tex = waterTexture();
      owned.push(tex);
      const sheetMat = new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, depthWrite: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
      owned.push(sheetMat);
      // Water running down the floor of the chute (see-through: the marbles race on it).
      const rows = Math.max(4, Math.round(len / (lite ? 4 : 2)));
      const cols = lite ? 6 : 10;
      const pos = [];
      const uv = [];
      for (let r = 0; r <= rows; r += 1) {
        const p = s.from + ((s.to - s.from) * r) / rows;
        for (let c = 0; c <= cols; c += 1) {
          const pt = surface(p, -0.92 + (1.84 * c) / cols, 0.02);
          pos.push(pt.x, pt.y, pt.z);
          uv.push(c / cols, (r * len) / rows / 6);
        }
      }
      const index = [];
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const a = r * (cols + 1) + c;
          index.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2);
        }
      }
      const floor = new BufferGeometry();
      floor.setAttribute('position', new Float32BufferAttribute(pos, 3));
      floor.setAttribute('uv', new Float32BufferAttribute(uv, 2));
      floor.setIndex(index);
      const floorMesh = new Mesh(floor, sheetMat);
      floorMesh.name = 'waterfall-water';
      floorMesh.renderOrder = 1;
      group.add(floorMesh);
      water.push({ tex, speed: 1.6 });

      // Rock cliffs either side of the chute, outside the rims, with water pouring down their faces.
      const cascadeMat = new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.7, depthWrite: false, side: DoubleSide });
      owned.push(cascadeMat);
      const cascades = [];
      const steps = Math.max(3, Math.round(len / 6));
      for (let k = 0; k <= steps; k += 1) {
        const p = s.from + ((s.to - s.from) * k) / steps;
        const { side } = frameAt(centerline, p);
        for (const sign of [-1, 1]) {
          const rim = surface(p, sign);
          const out = side.clone().multiplyScalar(sign);
          const rock = rim.clone().addScaledVector(out, 3.4 + noise(k * 3 + sign) * 1.2).addScaledVector(UP, 0.6);
          add(noise(k + sign * 5) > 0.5 ? 'cliff' : 'cliffDark', new IcosahedronGeometry(2.4 + noise(k * 7 + sign) * 1.2, 0), new Matrix4().compose(rock, new Quaternion().setFromAxisAngle(UP, k), new Vector3(1, 1.5, 1.2)));
          if (k < steps) cascades.push({ rim, out, p });
        }
      }
      // The cascades: sheets of water falling from the cliff tops to the rims, beside the channel.
      const cpos = [];
      const cuv = [];
      const cidx = [];
      cascades.forEach(({ rim, out }, k) => {
        const top = rim.clone().addScaledVector(out, 1.9).addScaledVector(UP, 3.2);
        const bottom = rim.clone().addScaledVector(out, 0.9);
        const { along } = frameAt(centerline, cascades[k].p);
        const w = 2.2;
        const v0 = cpos.length / 3;
        for (const [pt, v] of [[top, 1], [bottom, 0]]) {
          for (const d of [-w, w]) {
            const q = pt.clone().addScaledVector(along, d);
            cpos.push(q.x, q.y, q.z);
            cuv.push(d < 0 ? 0 : 1, v * 1.5);
          }
        }
        cidx.push(v0, v0 + 2, v0 + 1, v0 + 1, v0 + 2, v0 + 3);
      });
      if (cpos.length) {
        const cg = new BufferGeometry();
        cg.setAttribute('position', new Float32BufferAttribute(cpos, 3));
        cg.setAttribute('uv', new Float32BufferAttribute(cuv, 2));
        cg.setIndex(cidx);
        const cm = new Mesh(cg, cascadeMat);
        cm.name = 'waterfall-cascades';
        group.add(cm);
      }

      // Spray at the foot of the falls: white drops, drifting (see-through).
      const foot = frameAt(centerline, s.to);
      const sprayCount = lite ? 40 : 120;
      const spray = new Float32Array(sprayCount * 3);
      for (let k = 0; k < sprayCount; k += 1) {
        const q = foot.pos.clone().addScaledVector(foot.side, (noise(k) - 0.5) * 9).addScaledVector(UP, noise(k * 3) * 3).addScaledVector(foot.along, (noise(k * 7) - 0.5) * 6);
        spray.set([q.x, q.y, q.z], k * 3);
      }
      const sg = new BufferGeometry();
      sg.setAttribute('position', new Float32BufferAttribute(spray, 3));
      const sprayMat = new PointsMaterial({ color: STRUCTURE_COLORS.foam, size: 0.45, transparent: true, opacity: 0.7, depthWrite: false });
      owned.push(sprayMat);
      const sprayPoints = new Points(sg, sprayMat);
      sprayPoints.name = 'waterfall-spray';
      group.add(sprayPoints);
      water.push({ spray: sprayPoints, base: spray.slice() });

      // A rainbow in the spray, off to one side (see-through).
      if (!lite) {
        const rpos = [];
        const rcol = [];
        const bands = ['#ff4d4d', '#ffa64d', '#fff04d', '#5ed65e', '#4da6ff', '#a24dff'].map((h) => new Color(h));
        const centre = foot.pos.clone().addScaledVector(foot.side, 6).addScaledVector(foot.along, 4);
        bands.forEach((bc, bi) => {
          const r0 = 6 + bi * 0.35;
          for (let k = 0; k < 16; k += 1) {
            const a0 = (Math.PI * k) / 16;
            const a1 = (Math.PI * (k + 1)) / 16;
            const ring = (r, a) => centre.clone().addScaledVector(foot.along, Math.cos(a) * r).addScaledVector(UP, Math.sin(a) * r);
            const quad = [ring(r0, a0), ring(r0 + 0.35, a0), ring(r0 + 0.35, a1), ring(r0, a1)];
            for (const v of [quad[0], quad[1], quad[2], quad[0], quad[2], quad[3]]) {
              rpos.push(v.x, v.y, v.z);
              rcol.push(bc.r, bc.g, bc.b);
            }
          }
        });
        const rg = new BufferGeometry();
        rg.setAttribute('position', new Float32BufferAttribute(rpos, 3));
        rg.setAttribute('color', new Float32BufferAttribute(rcol, 3));
        const rm = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false, side: DoubleSide, blending: AdditiveBlending });
        owned.push(rm);
        const rainbow = new Mesh(rg, rm);
        rainbow.name = 'rainbow';
        group.add(rainbow);
      }

      // The curtain: a see-through sheet of water across the channel, the marbles racing through it.
      if (s.waterfall.curtain) {
        const p = s.from + 0.55 * (s.to - s.from);
        const left = surface(p, 1.15, 0);
        const right = surface(p, -1.15, 0);
        const topY = Math.max(left.y, right.y) + 4.5;
        const lowY = Math.min(left.y, right.y) - 3.2;
        const cg = new BufferGeometry();
        const cp = [left.x, topY, left.z, right.x, topY, right.z, left.x, lowY, left.z, right.x, lowY, right.z];
        cg.setAttribute('position', new Float32BufferAttribute(cp, 3));
        cg.setAttribute('uv', new Float32BufferAttribute([0, 1.4, 1, 1.4, 0, 0, 1, 0], 2));
        cg.setIndex([0, 2, 1, 1, 2, 3]);
        const curtainMat = new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.35, depthWrite: false, side: DoubleSide });
        owned.push(curtainMat);
        const curtain = new Mesh(cg, curtainMat);
        curtain.name = 'waterfall-curtain';
        group.add(curtain);
      }
    }
  }

  // One mesh per colour for the solid pieces.
  const solidMats = {};
  for (const [key, list] of Object.entries(parts)) {
    const ready = list.map((g) => {
      if (!g.getAttribute('normal')) g.computeVertexNormals();
      for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
      return g;
    });
    solidMats[key] = key === 'eye'
      ? new MeshBasicMaterial({ color: STRUCTURE_COLORS.eye })
      : new MeshLambertMaterial({ color: STRUCTURE_COLORS[key] ?? '#ff00ff', flatShading: true });
    const mesh = new Mesh(mergeGeometries(ready), solidMats[key]);
    mesh.name = key;
    group.add(mesh);
  }

  const update = (t) => {
    const sec = t / 1000;
    for (const w of water) {
      if (w.tex) w.tex.offset.y = sec * w.speed;
      if (w.spray) {
        // The drops rise and drift a little, on the race clock (every viewer sees the same).
        const attr = w.spray.geometry.getAttribute('position');
        for (let k = 0; k < attr.count; k += 1) {
          const lift = ((sec * 0.8 + noise(k)) % 1) * 2.5;
          attr.setY(k, w.base[k * 3 + 1] + lift);
        }
        attr.needsUpdate = true;
      }
    }
  };
  update(0);
  const dispose = () => {
    group.traverse((o) => { if (o.isMesh || o.isPoints) o.geometry.dispose(); });
    for (const m of [...owned, ...Object.values(solidMats)]) m.dispose();
  };
  return { group, update, dispose };
}
