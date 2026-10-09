/**
 * The ground every kit track sits in (track recipe: "buried in the ground,
 * never a halfpipe sitting on it"). The channel is cut into the landscape like
 * a trench: on both sides a bank starts exactly at the top of the rim and runs
 * out to meet the land. Up, where the land is higher (a natural bank, the
 * hillside cut away); down, where it is lower (earth or rock fill, built up).
 * So the outside of the walls is never seen and you look down into the track.
 *
 * Where the track may run above ground, it stands on something built:
 *   - where it crosses over itself, the upper stretch runs on a stone viaduct
 *     (its banks would bury the stretch below);
 *   - bridges (from the track file) span a ravine, the ground falling away under them;
 *   - steep plunges and waterfalls get their banks as steep rock fill.
 * groundCheck.js checks the result on every kit track.
 */
import { BoxGeometry, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshLambertMaterial, Vector3 } from 'three';
import { channelLipAt, channelRadiusAt, forkAt, forkOffset, forkRadius } from '../iceChannel';
import { channelGround } from './channelGround';
import { buildTerrain, makeHeightField } from './terrain';
import { merge, piece, smoothstep } from './parts';
import { stretchKinds } from './groundCheck';

const RIM_WIDTH = 0.45;  // the channel's white rim beyond the lip (iceChannel.js)
const SKIRT = 1.6;       // the channel's outer wall reaches this far below the floor
const BANK_SLOPE = 1;    // a bank runs out to the land at no steeper than 1 in 1…
const BANK_MIN = 4;      // …and at least this many metres wide…
const BANK_MAX = 26;     // …and at most this many
const CROSS_GAP = 3;     // metres: another stretch this far below is passed over on a viaduct
const SHOULDER = 1.5;    // metres of level ground at the rim before a bank slopes
// How steeply the land may rise beside another stretch of track (1.4: a steep mountainside).
// Today's sceneries use 0.6; on a track that folds back over itself 100 m lower, that leaves
// the upper stretch on a towering embankment.
const MOUNTAIN_CAP = 1.4;
const LAND_RADIUS = 480;       // metres from the track to where the land reaches the valley floor (computer)…
const LAND_RADIUS_PHONE = 400; // …and on phones (a smaller patch of land)
const LAKE_RADIUS = 95;        // metres: a frozen lake beyond the finish
const LAKE_SHORE = 45;         // metres over which the land rises from the ice

/**
 * Where a frozen lake lies (a kit track with 'frozen-lake' in its finish's or last section's
 * scenery): straight on past the run-out, a few metres below the finish. Its outline wobbles.
 */
export function lakeOf(centerline, kit) {
  const wants = (kit?.finish?.scenery ?? []).includes('frozen-lake')
    || (kit?.sections ?? []).some((s) => (s.scenery ?? []).includes('frozen-lake'));
  if (!wants) return null;
  const { samples } = centerline;
  const end = samples[samples.length - 1];
  const along = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  const centre = end.pos.clone().addScaledVector(along, 30 + 40 + LAKE_RADIUS);
  const shape = (a) => 1 + 0.12 * Math.sin(3 * a + 1) + 0.07 * Math.sin(5 * a + 2.3);
  return { x: centre.x, z: centre.z, y: end.pos.y - 6, radius: LAKE_RADIUS, shape, along };
}

/** Ground colours by landscape (a track file's `biome`, or guessed from its surface). */
export const BIOMES = {
  alpine: { terrain: { sand: '#e9eef4', grass: '#f2f6fa', dry: '#ffffff', shade: '#9aabbe' }, bank: '#f4f7fb', fill: '#8f8a84', hills: 40, sea: -60 },
  arctic: { terrain: { sand: '#dfe9f2', grass: '#eef4fa', dry: '#ffffff', shade: '#a9bfd4' }, bank: '#f0f5fa', fill: '#7d8794', hills: 24, sea: -60 },
  meadow: { terrain: { sand: '#d9c58f', grass: '#8fbf5a', dry: '#b9c46a', shade: '#6f9a45' }, bank: '#86b653', fill: '#8b7d68', hills: 26, sea: -60 },
  desert: { terrain: { sand: '#e8b77a', grass: '#e2a764', dry: '#efc590', shade: '#c98d50' }, bank: '#e5ae6e', fill: '#a8754a', hills: 30, sea: -60 },
  jungle: { terrain: { sand: '#c9b27a', grass: '#3f8f3a', dry: '#5aa344', shade: '#2f6e2c' }, bank: '#3d8a37', fill: '#6b5a44', hills: 34, sea: -60 },
  city: { terrain: { sand: '#d7c9a6', grass: '#9cb768', dry: '#b7bf7a', shade: '#7f9a54' }, bank: '#a7b8a0', fill: '#a49c8f', hills: 18, sea: -60 },
};

export function biomeOf(kit) {
  if (kit?.biome && BIOMES[kit.biome]) return kit.biome;
  return { snow: 'alpine', ice: 'alpine', sand: 'desert', water: 'jungle', stone: 'city', street: 'city' }[kit?.surface] ?? 'meadow';
}

/** The channel's half-width to the outside of its walls, and its rim's height above the floor, at sample i. */
function wallsAt(channel, i, step) {
  const s = i * step;
  const R = channelRadiusAt(channel, s);
  const lip = channelLipAt(channel, s);
  const fork = forkAt(channel, s);
  const edge = fork ? Math.abs(forkOffset(fork, s)) + forkRadius(fork, channel.radius, s) * Math.sin(channel.maxAngle) : R * Math.sin(lip);
  return { outer: edge + RIM_WIDTH, top: R * (1 - Math.cos(lip)) };
}

export function buildKitGround(centerline, track, { lite = false } = {}) {
  const kit = track.physics.kit;
  const biome = BIOMES[biomeOf(kit)];
  const lanes = Math.max(1, Number(track.lane_count) || 4);
  const hug = channelGround(centerline, track, { rim: RIM_WIDTH, dip: lite ? 6 : 3, under: lite ? 4 : 2 });
  const { channel } = hug;
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const kinds = stretchKinds(centerline, channel, track);

  // Which samples pass over another stretch well below (they go on a viaduct, without banks).
  const above = samples.map((s, i) => {
    if (kinds[i].kind !== 'crossing') return false;
    for (let j = 0; j <= segments; j += 1) {
      if (Math.abs(j - i) * step < 60) continue;
      const o = samples[j].pos;
      if (Math.hypot(o.x - s.pos.x, o.z - s.pos.z) < 14 && s.pos.y - o.y > CROSS_GAP) return true;
    }
    return false;
  });
  // The viaduct runs the whole crossing in one piece (as far as the check's crossing reaches).
  const spread = Math.round(10 / step);
  const over = above.map((_, i) => kinds[i].kind === 'crossing'
    && above.slice(Math.max(0, i - spread * 2), i + spread * 2 + 1).some(Boolean));
  const onBridge = kinds.map((k) => k.kind === 'bridge');

  // The land: the proven height field (ground at the rim beside the channel, under it beneath),
  // with a ravine falling away under each bridge.
  // Out at the edges the land falls away gently to the valley floor (the world's ground, biome.sea - 6),
  // starting well in, so the whole-track view shows mountainsides, never a plateau ending in cliffs.
  const landRadius = lite ? LAND_RADIUS_PHONE : LAND_RADIUS;
  const base = makeHeightField(hug.groundLine, lanes, { hillHeight: biome.hills, landRadius, sinkFrom: 0.3, seaLevel: biome.sea, street: { ...hug.street, cap: MOUNTAIN_CAP } });
  const bridgeSpots = samples.filter((_, i) => onBridge[i]).map((s) => s.pos);
  const ravineFloor = bridgeSpots.length ? Math.min(...bridgeSpots.map((p) => p.y)) - 24 : 0;
  // A frozen lake (scenery 'frozen-lake' at the finish): a flat basin just beyond the run-out.
  const lake = lakeOf(centerline, kit);
  const field = {
    ...base,
    lake,
    heightAt(x, z) {
      let h = base.heightAt(x, z);
      if (lake) {
        const d = Math.hypot(x - lake.x, z - lake.z) - lake.radius * lake.shape(Math.atan2(z - lake.z, x - lake.x));
        if (d < LAKE_SHORE) h += (Math.min(h, lake.y - 1.2) - h) * (1 - smoothstep(0, LAKE_SHORE, d));
      }
      if (!bridgeSpots.length) return h;
      let d = Infinity;
      for (const p of bridgeSpots) d = Math.min(d, Math.hypot(p.x - x, p.z - z));
      if (d > 34) return h;
      return h + (Math.min(h, ravineFloor) - h) * (1 - smoothstep(14, 34, d));
    },
  };
  const xs = samples.map((s) => s.pos.x);
  const zs = samples.map((s) => s.pos.z);
  const margin = landRadius;
  const terrain = buildTerrain(field, { minX: Math.min(...xs) - margin, maxX: Math.max(...xs) + margin, minZ: Math.min(...zs) - margin, maxZ: Math.max(...zs) + margin }, {
    cells: lite ? 60 : 140, colors: biome.terrain, tiles: lite ? 1 : 2, // few tiles: few draw calls
  });
  const group = new Group();
  group.name = 'kit-ground';
  const groundMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const land = new Group();
  land.name = 'terrain';
  for (const g of terrain.geometries) {
    const m = new Mesh(g, groundMat);
    m.userData.ground = true;
    land.add(m);
  }
  group.add(land);

  // The banks: from the top of each rim out to the land, every sample, both sides.
  const bankColour = new Color(biome.bank);
  const fillColour = new Color(biome.fill);
  const pos = [];
  const col = [];
  const rows = []; // per sample, per side: { inner, shoulder, mid, out } (no bank is drawn between two lifted samples)
  for (let i = 0; i <= segments; i += 1) {
    const s = samples[i];
    const side = new Vector3(s.side.x, 0, s.side.z).normalize();
    const { outer, top } = wallsAt(channel, i, step);
    const rimY = s.pos.y + top;
    const row = {};
    for (const sign of [1, -1]) {
      // Rows at every sample: a bank quad is drawn wherever either end is on the ground, so
      // banks reach right up to a bridge or viaduct (an abutment) and never leave a gap at its ends.
      const at = (d) => s.pos.clone().addScaledVector(side, sign * (outer + d));
      // Out to where a 1-in-1 slope from the rim meets the land (cut into it, or filled down to it).
      let w = BANK_MAX;
      for (let d = BANK_MIN; d <= BANK_MAX; d += 1) {
        const p = at(d);
        if (Math.abs(terrain.groundAt(p.x, p.z) - rimY) <= d * BANK_SLOPE) { w = d; break; }
      }
      const inner = at(0);
      inner.y = rimY;
      const shoulder = at(SHOULDER);
      shoulder.y = rimY; // a level shoulder at the rim first: no wall shows, however the bank then falls
      const out = at(SHOULDER + w);
      out.y = terrain.groundAt(out.x, out.z) - 0.05;
      const mid = at(SHOULDER + w * 0.35);
      mid.y = rimY + (out.y - rimY) * 0.22; // the bank rounds over from the shoulder
      row[sign] = { inner, shoulder, mid, out, steep: Math.abs(out.y - rimY) / w };
    }
    rows.push(row);
  }
  const quad = (a, b, c, d, colour) => {
    for (const p of [a, b, c, a, c, d]) { pos.push(p.x, p.y, p.z); col.push(colour.r, colour.g, colour.b); }
  };
  for (let i = 0; i < segments; i += 1) {
    for (const sign of [1, -1]) {
      const r0 = rows[i][sign];
      const r1 = rows[i + 1][sign];
      const lifted = (k) => over[k] || onBridge[k];
      if (lifted(i) && lifted(i + 1)) continue;
      const steep = Math.max(r0.steep, r1.steep);
      const near = steep > 0.55 ? fillColour : bankColour;
      const far = steep > 0.35 ? fillColour : bankColour;
      quad(r0.inner, r1.inner, r1.shoulder, r0.shoulder, bankColour);
      if (lite) {
        quad(r0.shoulder, r1.shoulder, r1.out, r0.out, near); // (phones: the bank in one slope)
        continue;
      }
      quad(r0.shoulder, r1.shoulder, r1.mid, r0.mid, near);
      quad(r0.mid, r1.mid, r1.out, r0.out, far);
    }
  }
  const banks = new BufferGeometry();
  banks.setAttribute('position', new Float32BufferAttribute(pos, 3));
  banks.setAttribute('color', new Float32BufferAttribute(col, 3));
  banks.computeVertexNormals();
  const bankMesh = new Mesh(banks, new MeshLambertMaterial({ vertexColors: true, flatShading: true, side: DoubleSide }));
  bankMesh.name = 'banks';
  bankMesh.userData.ground = true;
  group.add(bankMesh);

  // Is a pier's foot (a spot on the plan) on or beside another stretch of track, lower down?
  const inLowerStretch = (foot, i, below) => samples.some((o, j) => {
    if (Math.abs(j - i) * step < 60 || o.pos.y >= below) return false;
    const { outer } = wallsAt(channel, j, step);
    return Math.hypot(o.pos.x - foot.x, o.pos.z - foot.z) < outer + 2.6;
  });

  // The viaduct: where the track passes over itself, the upper stretch runs on a stone deck with piers.
  const stone = [];
  let lastPier = -Infinity;
  for (let i = 0; i <= segments; i += 1) {
    if (!over[i]) continue;
    const s = samples[i];
    const side = new Vector3(s.side.x, 0, s.side.z).normalize();
    const along = new Vector3(s.tangent.x, 0, s.tangent.z).normalize();
    const { outer } = wallsAt(channel, i, step);
    const deckTop = s.pos.y - SKIRT;
    const yaw = Math.atan2(along.x, along.z);
    const place = (geo, p) => {
      geo.rotateY(yaw);
      geo.translate(p.x, p.y, p.z);
      return geo;
    };
    stone.push(piece(place(new BoxGeometry(outer * 2 + 0.6, 1.2, step * 1.05), new Vector3(s.pos.x, deckTop - 0.6, s.pos.z)), i % 2 ? '#a49c8f' : '#978f83'));
    if (i * step - lastPier >= 12) {
      lastPier = i * step;
      for (const sign of [1, -1]) {
        const foot = s.pos.clone().addScaledVector(side, sign * (outer - 0.4));
        // Never a pier standing in the stretch passing underneath (the deck spans it).
        if (inLowerStretch(foot, i, deckTop)) continue;
        const groundY = terrain.groundAt(foot.x, foot.z);
        const h = Math.max(0.5, deckTop - 1.2 - groundY + 0.5);
        stone.push(piece(place(new BoxGeometry(2.2, h, 2.6), new Vector3(foot.x, groundY - 0.5 + h / 2, foot.z)), '#8a8276'));
      }
    }
  }
  if (stone.length) {
    const viaduct = new Mesh(merge(stone), new MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    viaduct.name = 'viaduct';
    viaduct.userData.built = true;
    group.add(viaduct);
  }

  return { group, field, groundAt: (x, z) => terrain.groundAt(x, z), hug, biome, rows, over, onBridge, lake, floorY: biome.sea - 6 };
}
