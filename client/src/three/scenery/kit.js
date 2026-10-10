/**
 * The shared scenery for every kit track, built from its track file
 * (physics.kit): the ground the channel is buried in (./kitGround.js), set
 * dressing for its landscape, people and animals standing beside the track
 * with small idle movements, landmarks, and lifts passing high overhead.
 * A new track needs no scenery code of its own, only what its file names.
 *
 * Moving things (idle movements, lift cabins) follow the race clock, so every
 * viewer and every replay sees the same: update(t) in group.userData.
 */
import {
  BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshLambertMaterial,
  Quaternion, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildKitGround, biomeOf } from './kitGround';
import { FIGURE_COLORS, LANDMARKS, PEOPLE, aspen, cabin, dressingFor, liftTower, snowRock, vulture, winterBirch } from './kitProps';
import { buildCentrepieces, buildFunicular, buildHouses, buildLake, buildRaceNetting, tagsNear } from './kitPlaces';
import { hashString, mergeByArea, piece, seededRandom, smoothstep } from './parts';
import { COSTUMES, COSTUME_COLORS } from '../costumes';
import { FEATURE_COLORS } from '../trackFeatures';
import { bakeMovers } from '../movers';
import { boardPose } from '../billboards';

const UP = new Vector3(0, 1, 0);
const Z = new Vector3(0, 0, 1);
const LIFT_HEIGHT = 18;  // metres above the track where a lift crosses it: well above the follow camera
const CABIN_SPEED = 4;   // metres per second along the cable
const DRESSING_AREA = 500; // metres: trees and rocks are merged in squares this size (one draw call each)
// What may be merged into the still scenery (nothing that moves, nothing see-through).
const STILL = new Set(['landmarks', 'lift towers', 'centrepiece', 'netting poles', 'funicular rails', 'houses']);

export function buildKitScenery(centerline, track, theme, { lite = false } = {}) {
  const kit = track.physics.kit;
  const biome = biomeOf(kit);
  const rand = seededRandom(hashString(`kit:${track.slug}`));
  const ground = buildKitGround(centerline, track, { lite });
  const { field, groundAt, rows } = ground;
  const { samples, segments } = centerline;
  const channel = ground.hug.channel;
  const group = new Group();
  group.name = 'scenery:kit';
  group.add(ground.group);
  const solids = []; // { x, z, r } kept clear of trees
  // The billboards' spots (billboards.js stands them there): no tree or figure in front of one.
  const boardFeet = (kit.billboards ?? []).map((b) => boardPose(centerline, channel, b).foot);
  for (const f of boardFeet) solids.push({ x: f.x, z: f.z, r: 6 });

  const frame = (p) => {
    const i = Math.min(segments, Math.max(0, Math.round(p * segments)));
    const s = samples[i];
    return { i, s, side: new Vector3(s.side.x, 0, s.side.z).normalize(), along: new Vector3(s.tangent.x, 0, s.tangent.z).normalize() };
  };
  const faceTrack = (sideDir) => new Quaternion().setFromUnitVectors(Z, sideDir.clone().negate());

  // ── Landmarks ──────────────────────────────────────────────────────────
  const landmarkParts = [];
  const placeLandmark = (name, at, yaw) => {
    const lm = LANDMARKS[name];
    if (!lm) return;
    const g = lm.build();
    g.applyMatrix4(new Matrix4().compose(new Vector3(at.x, groundAt(at.x, at.z) - 0.3, at.z), new Quaternion().setFromAxisAngle(UP, yaw), new Vector3(1, 1, 1)));
    landmarkParts.push(g);
    solids.push({ x: at.x, z: at.z, r: lm.radius + 4 });
  };
  const yawTo = (dir) => Math.atan2(dir.x, dir.z);
  if (kit.start?.landmark) {
    const { s, along } = frame(0);
    const at = s.pos.clone().addScaledVector(along, -30);
    placeLandmark(kit.start.landmark, at, yawTo(along));
  }
  if (kit.finish?.landmark) {
    const { s, along, side } = frame(1);
    const at = s.pos.clone().addScaledVector(along, 70).addScaledVector(side, 6);
    placeLandmark(kit.finish.landmark, at, yawTo(along.clone().negate()));
  }
  for (const sec of kit.sections) {
    for (const lm of sec.landmarks ?? []) {
      const p = sec.from + (lm.at ?? 0.5) * (sec.to - sec.from);
      const { s, side, i } = frame(p);
      const sign = lm.side === 'right' ? -1 : 1;
      const edge = rows[i]?.[sign]?.out ?? s.pos;
      const at = edge.clone().addScaledVector(side, sign * (lm.distance ?? 22));
      placeLandmark(lm.name, at, yawTo(side.clone().multiplyScalar(-sign)));
    }
  }
  if (landmarkParts.length) {
    const m = new Mesh(mergeGeometries(landmarkParts), new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    m.name = 'landmarks';
    group.add(m);
  }

  // ── People and animals beside the track (small idle movements) ─────────
  const figureParts = {};
  const idlers = [];
  const mats = {};
  const colourOf = (key) => FIGURE_COLORS[key] ?? COSTUME_COLORS[key] ?? FEATURE_COLORS[key] ?? '#ff00ff';
  const mat = (key) => (mats[key] ??= new MeshLambertMaterial({ color: colourOf(key), flatShading: true }));
  const add = (key, geometry, matrix) => {
    geometry.applyMatrix4(matrix);
    (figureParts[key] ??= []).push(geometry.index ? geometry.toNonIndexed() : geometry);
  };
  const figureGroup = new Group();
  figureGroup.name = 'figures';
  for (const sec of kit.sections) {
    const names = sec.figures ?? [];
    names.forEach((name, k) => {
      const build = PEOPLE[name] ?? (COSTUMES[name]?.places === 'block' ? COSTUMES[name].build : null);
      if (!build) return;
      const p = sec.from + ((k + 1) / (names.length + 1)) * (sec.to - sec.from);
      const { i, side } = frame(p);
      const sign = (k % 2 ? -1 : 1) * (kit.mirrored ? -1 : 1); // (a mirrored track: on the other side)
      const row = ground.over[i] || ground.onBridge[i] ? null : rows[i]?.[sign];
      if (!row) return; // (on a bridge or a viaduct: nowhere to stand)
      if (boardFeet.some((f) => Math.hypot(f.x - row.inner.x, f.z - row.inner.z) < 7)) return; // (a billboard stands there)
      // On the bank, a couple of metres back from the rim, facing the track.
      const reach = Math.min(1, 2.5 / Math.max(0.1, row.inner.distanceTo(row.mid)));
      const at = row.inner.clone().lerp(row.mid, reach);
      for (const idle of build(add, mat, figureGroup, at, faceTrack(side.clone().multiplyScalar(sign)), { radius: 0.75, height: 1.2 })) {
        idlers.push({ ...idle, phase: idlers.length * 1.3 });
      }
      solids.push({ x: at.x, z: at.z, r: 2 });
    });
  }
  // Two draw calls for all of them: the still parts merged in their colours, and the moving
  // parts (heads turning, arms waving) merged too, their corners moved on the race clock.
  const movers = bakeMovers(idlers, figureGroup, 'figures:moving');
  if (movers) movers.mesh.removeFromParent();
  const still = [];
  for (const [key, list] of Object.entries(figureParts)) {
    for (const g of list) still.push(piece(g, colourOf(key)));
  }
  // Anything a builder added straight to the group (not through add()) joins the still parts.
  figureGroup.traverse((o) => {
    if (o.isMesh) still.push(piece(o.geometry.clone(), o.material.color ?? '#ff00ff', o.matrixWorld));
  });
  figureGroup.clear();
  if (movers) figureGroup.add(movers.mesh);
  const figureMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  if (still.length) {
    const m = new Mesh(mergeGeometries(still.map((g) => { if (!g.getAttribute('normal')) g.computeVertexNormals(); return g; })), figureMat);
    m.name = 'figures:still';
    figureGroup.add(m);
  }
  group.add(figureGroup);

  // ── Lifts passing high overhead: gondolas, cable cars, chairlifts ──────
  const lifts = [];
  const liftParts = [];
  const cablePos = [];
  const birds = [];
  for (const sec of kit.sections) {
    for (const kind of sec.overhead ?? []) {
      if (kind === 'vulture') {
        // A bearded vulture circling high over the section's middle, wings spread, gliding.
        const { s } = frame((sec.from + sec.to) / 2);
        const mesh = new Mesh(vulture(), new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
        mesh.name = 'vulture';
        group.add(mesh);
        birds.push({ mesh, centre: s.pos.clone().add(new Vector3(0, LIFT_HEIGHT + 22, 0)), radius: 38 });
        continue;
      }
      const { s, along, side } = frame((sec.from + sec.to) / 2);
      // Crossing the track at an angle, high above it, from a tower well out on each side.
      const dir = along.clone().multiplyScalar(0.5).addScaledVector(side, 0.87).normalize();
      const crossY = s.pos.y + 3 + LIFT_HEIGHT;
      const ends = [-1, 1].map((k) => {
        const foot = s.pos.clone().addScaledVector(dir, k * 170);
        foot.y = groundAt(foot.x, foot.z);
        return foot;
      });
      // Towers tall enough that the cable stays at least LIFT_HEIGHT above the track where it crosses.
      const towerTop = ends.map((e) => Math.max(e.y + 18, crossY));
      for (const [k, e] of ends.entries()) {
        const g = liftTower();
        g.applyMatrix4(new Matrix4().compose(e, new Quaternion().setFromAxisAngle(UP, yawTo(dir) + Math.PI / 2), new Vector3(1, (towerTop[k] - e.y) / 18, 1)));
        liftParts.push(g);
      }
      const a = ends[0].clone().setY(towerTop[0]);
      const b = ends[1].clone().setY(towerTop[1]);
      const offsets = [-1.6, 1.6].map((o) => new Vector3(-dir.z, 0, dir.x).multiplyScalar(o));
      // The cables, sagging between the towers as the cabins do.
      for (const o of offsets) {
        const STEPS = 16;
        const at = (k) => a.clone().lerp(b, k).add(o).add(new Vector3(0, -Math.sin(Math.PI * k) * 6, 0));
        for (let n = 0; n < STEPS; n += 1) {
          const p0 = at(n / STEPS);
          const p1 = at((n + 1) / STEPS);
          cablePos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
        }
      }
      const count = lite ? 4 : 8;
      const mesh = new InstancedMesh(cabin(kind), new MeshLambertMaterial({ vertexColors: true, flatShading: true }), count);
      mesh.name = `lift:${kind}`;
      mesh.frustumCulled = false;
      group.add(mesh);
      lifts.push({ mesh, a, b, offsets, count, length: a.distanceTo(b), yaw: yawTo(dir) });
    }
  }
  if (liftParts.length) {
    const m = new Mesh(mergeGeometries(liftParts), new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    m.name = 'lift towers';
    group.add(m);
  }
  if (cablePos.length) {
    const cg = new BufferGeometry();
    cg.setAttribute('position', new Float32BufferAttribute(cablePos, 3));
    const cables = new LineSegments(cg, new LineBasicMaterial({ color: '#30333a' }));
    cables.name = 'cables';
    group.add(cables);
  }

  // ── Places a section's scenery names: netting, houses, a funicular, a lake, a splitter's hut ──
  const centrepieces = buildCentrepieces(centerline, channel, kit, { lite, groundAt });
  group.add(centrepieces.group);
  solids.push(...centrepieces.spots);
  group.add(buildRaceNetting(centerline, channel, kit, rows));
  const lake = buildLake(ground.lake, { lite });
  if (lake) {
    group.add(lake.mesh);
    if (lake.tail) group.add(lake.tail);
    solids.push({ x: ground.lake.x, z: ground.lake.z, r: ground.lake.radius * 1.25 });
  }
  const funicular = buildFunicular(centerline, kit, { groundAt, clearance: field.clearance, lite });
  if (funicular) {
    group.add(funicular.group);
    for (const p of funicular.line) solids.push({ x: p.x, z: p.z, r: 4 }); // (no trees on the rails)
  }
  group.add(buildHouses(centerline, kit, { lite, arc: channel.arc, groundAt, clearance: field.clearance, solids, rand }));

  // ── Set dressing for the landscape (instanced, drawn in tiles) ─────────
  // The landscape's own, plus what a section's scenery asks for (snow-rimed rocks, birches);
  // a bare stretch (a wind-swept summit) keeps only a few rocks.
  const baseKinds = dressingFor(biome);
  const kinds = [...baseKinds, [(l) => snowRock(l), 0], [(l) => winterBirch(l), 0], [(l) => aspen(l), 0]];
  const ROCK = baseKinds.length;
  const BIRCH = baseKinds.length + 1;
  const ASPEN = baseKinds.length + 2;
  const tagsAt = tagsNear(centerline, kit);
  const xs = samples.map((s) => s.pos.x);
  const zs = samples.map((s) => s.pos.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const spacing = lite ? 12 : 7;
  const maxItems = lite ? 300 : 900;
  const spots = [];
  for (let x = minX - 260; x <= maxX + 260; x += spacing) {
    for (let z = minZ - 260; z <= maxZ + 260; z += spacing) spots.push([x + (rand() - 0.5) * spacing * 0.9, z + (rand() - 0.5) * spacing * 0.9, rand(), rand()]);
  }
  spots.sort((p, q) => p[2] - q[2]);
  const items = kinds.map(() => []);
  let total = 0;
  for (const [x, z, roll, pick] of spots) {
    if (total >= maxItems) break;
    const c = field.clearance(x, z);
    if (c < 9 || c > 250) continue; // (beyond the banks, not out where the land falls away)
    if (roll > 0.8 - 0.55 * smoothstep(30, 240, c)) continue; // denser near the track
    if (solids.some((o) => (o.x - x) ** 2 + (o.z - z) ** 2 < o.r * o.r)) continue;
    const tags = tagsAt(x, z);
    let acc = 0;
    let k = baseKinds.findIndex(([, share]) => (acc += share) >= pick);
    if (tags.includes('bare')) {
      if (pick > 0.12) continue;
      k = ROCK;
    } else if (tags.includes('pasture')) {
      if (pick > 0.2) continue; // (open alpine pasture: a few trees here and there)
    } else if (tags.includes('rocks')) k = pick < 0.7 ? ROCK : k;
    else if (tags.includes('birches')) k = pick < 0.7 ? BIRCH : k;
    else if (tags.includes('aspens')) k = pick < 0.75 ? ASPEN : k;
    items[Math.max(0, k)].push({ x, y: groundAt(x, z), z, yaw: rand() * Math.PI * 2, scale: 0.75 + rand() * 0.6, tint: 0.85 + rand() * 0.25 });
    total += 1;
  }
  // Every kind merged together by neighbourhood (each tree tinted a little): a few draw calls in all.
  const m4 = new Matrix4();
  const q = new Quaternion();
  const dressing = [];
  kinds.forEach(([make], k) => {
    if (!items[k].length) return;
    const model = make(lite);
    const colours = model.getAttribute('color').array;
    for (const h of items[k]) {
      const g = model.clone();
      g.applyMatrix4(m4.compose(new Vector3(h.x, h.y - 0.25, h.z), q.setFromAxisAngle(UP, h.yaw), new Vector3(h.scale, h.scale, h.scale)));
      const c = g.getAttribute('color');
      for (let n = 0; n < c.count * 3; n += 1) c.array[n] = colours[n] * h.tint;
      dressing.push(g);
    }
    model.dispose();
  });
  const dressMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const dressGroup = new Group();
  dressGroup.name = 'dressing';
  for (const geometry of mergeByArea(dressing, lite ? DRESSING_AREA * 4 : DRESSING_AREA)) dressGroup.add(new Mesh(geometry, dressMat));
  group.add(dressGroup);

  // ── Moving things, on the race clock ───────────────────────────────────
  const cabinQ = new Quaternion();
  const update = (t) => {
    const sec = t / 1000;
    movers?.update(t);
    centrepieces.update(t);
    funicular?.update(t);
    lake?.update(t);
    for (const b of birds) {
      const a = sec * 0.16; // once round every 40 s
      b.mesh.position.set(b.centre.x + Math.cos(a) * b.radius, b.centre.y + Math.sin(a * 2) * 2, b.centre.z + Math.sin(a) * b.radius);
      b.mesh.rotation.set(0, -a, 0.25); // banking into the circle
    }
    for (const lift of lifts) {
      // Half the cabins out on one cable, half back on the other, evenly spaced, looping round.
      cabinQ.setFromAxisAngle(UP, lift.yaw);
      for (let n = 0; n < lift.count; n += 1) {
        const back = n % 2;
        const u = (((sec * CABIN_SPEED) / lift.length + n / lift.count) % 1 + 1) % 1;
        const k = back ? 1 - u : u;
        const at = lift.a.clone().lerp(lift.b, k).add(lift.offsets[back]);
        at.y -= Math.sin(Math.PI * k) * 6; // the cable sags between the towers
        lift.mesh.setMatrixAt(n, m4.compose(at, cabinQ, new Vector3(1, 1, 1)));
      }
      lift.mesh.instanceMatrix.needsUpdate = true;
    }
  };
  update(0);
  // The still things in plain colours (landmarks, lift towers, a splitter's hut, net poles, funicular
  // rails, houses) merged together by neighbourhood: a few draw calls instead of one each.
  const stillScenery = [];
  group.traverse((o) => {
    if (o.isMesh && !o.isInstancedMesh && STILL.has(o.name) && o.material.isMeshLambertMaterial && o.material.vertexColors) stillScenery.push(o);
  });
  if (stillScenery.length > 1) {
    const pieces = stillScenery.map((o) => {
      o.updateWorldMatrix(true, false);
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
      if (!g.getAttribute('normal')) g.computeVertexNormals();
      return g.index ? g.toNonIndexed() : g;
    });
    for (const o of stillScenery) o.removeFromParent();
    const mat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
    for (const geometry of mergeByArea(pieces, 400)) group.add(Object.assign(new Mesh(geometry, mat), { name: 'scenery: still' }));
  }

  group.userData = { update, field, groundAt, biome, ground, floorY: ground.floorY };
  return group;
}
