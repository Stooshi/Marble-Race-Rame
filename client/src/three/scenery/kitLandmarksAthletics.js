/**
 * Landmarks for Track and Field: one builder each, origin on the ground, front facing +z (towards
 * the track; a gateway's opening runs along +z), merged into the still scenery. Generic stadium
 * architecture and athletics furniture only: no protected names, no rings, no torch designs of any
 * games, no sponsors' or federations' marks.
 *
 *   build()  the still parts
 *   glow()   parts that give their own light (lamps, a flame): drawn unlit
 */
import { BoxGeometry, ConeGeometry, CylinderGeometry, Matrix4, Quaternion, TorusGeometry, Vector3 } from 'three';
import { merge, piece } from './parts';

const Y = new Vector3(0, 1, 0);
const turned = (x, y, z, yaw = 0) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y, yaw), new Vector3(1, 1, 1));
const C = (w, h, d, x, y, z, colour, yaw = 0) => piece(new BoxGeometry(w, h, d), colour, turned(x, y, z, yaw));
const cyl = (r0, r1, h, x, y, z, colour, n = 8) => piece(new CylinderGeometry(r0, r1, h, n), colour, turned(x, y, z));
const cone = (r, h, x, y, z, colour, n = 6, yaw = 0) => piece(new ConeGeometry(r, h, n), colour, turned(x, y, z, yaw));

const MARBLE = '#f2efe8';
const MARBLE_DARK = '#dcd6ca';
const STONE = '#d6ccb8';
const BRICK = '#8f3f2d';
const BRICK_DARK = '#6e2f22';
const STEEL = '#8e949b';
const STEEL_DARK = '#4a4f57';
const TARTAN = '#b9493a';
const GRASS = '#7cab55';
const LINE = '#f4f1ea';
const LAMP = '#fff6d8';
const WOOD = '#a8794a';

/** A pair of marble herms and a low marble gateway (Athens): square pillars with carved heads, a lintel. */
function hermGateway() {
  const p = [C(26, 0.6, 10, 0, 0.3, 0, MARBLE_DARK)];
  for (const x of [-9, -3, 3, 9]) p.push(C(1.6, 7, 1.6, x, 4.1, 0, MARBLE), C(1.2, 1.2, 1.2, x, 8.2, 0, MARBLE_DARK));
  p.push(C(22, 1.4, 2.4, 0, 9.4, 0, MARBLE), C(23, 0.5, 2.8, 0, 10.4, 0, MARBLE_DARK));
  return merge(p);
}

/** A stone colonnade: a row of square limestone pillars under a plain lintel (Berlin). */
function stoneColonnade() {
  const p = [C(40, 1, 7, 0, 0.5, 0, STONE)];
  for (let k = 0; k < 9; k += 1) p.push(C(1.6, 11, 1.6, -16 + k * 4, 6.5, 0, '#ddd4c2'));
  p.push(C(38, 1.8, 3, 0, 12.9, 0, STONE), C(39, 0.6, 3.6, 0, 14.1, 0, '#c9bfa9'));
  return merge(p);
}

/** A tall square stone bell tower with a clock-less belfry and a flat top (Berlin; no names, no rings). */
function stadiumBellTower() {
  return merge([
    C(9, 1, 9, 0, 0.5, 0, STONE),
    C(7, 54, 7, 0, 28, 0, '#d9d0bf'),
    ...[-2.2, 0, 2.2].map((x) => C(1, 7, 0.4, x, 49, 3.55, '#6b6458')),
    ...[-2.2, 0, 2.2].map((x) => C(0.4, 7, 1, 3.55, 49, x, '#6b6458')),
    C(8, 1.2, 8, 0, 55.6, 0, '#c9bfa9'),
  ]);
}

/** A warm-up track: a small oval of tartan on the grass with its white lines (a practice field). */
function warmUpTrack() {
  const p = [C(30, 0.3, 54, 0, 0.15, 0, GRASS)];
  const ring = new TorusGeometry(15, 2.6, 2, 24);
  ring.rotateX(Math.PI / 2);
  ring.scale(1, 1, 1.6);
  p.push(piece(ring, TARTAN, turned(0, 0.35, 0)));
  const line = new TorusGeometry(15, 0.12, 2, 24);
  line.rotateX(Math.PI / 2);
  line.scale(1, 1, 1.6);
  p.push(piece(line, LINE, turned(0, 0.42, 0)));
  for (const x of [-20, 20]) p.push(C(0.4, 9, 0.4, x, 4.5, 0, STEEL_DARK));
  return merge(p);
}
const warmUpTrackGlow = () => merge([-20, 20].map((x) => C(1.6, 0.8, 0.4, x, 9.2, 0, LAMP)));

/** A small timber grandstand: stepped wooden benches under a pitched roof (Oregon). */
function timberStand() {
  const p = [];
  for (let r = 0; r < 6; r += 1) p.push(C(24, 0.6 + r * 0.8, 1.4, 0, (0.6 + r * 0.8) / 2, -r * 1.4, r % 2 ? WOOD : '#b88a58'));
  for (const x of [-11.5, 0, 11.5]) p.push(C(0.4, 9, 0.4, x, 4.5, -8, STEEL_DARK));
  p.push(C(26, 0.5, 11, 0, 9.4, -4, '#3a3d42'), C(26, 0.3, 11.2, 0, 9.1, -4, WOOD));
  return merge(p);
}

/** Field events beside the track: a javelin runway, a throwing cage and a sand pit. */
function fieldEvents() {
  const p = [C(34, 0.2, 24, 0, 0.1, 0, GRASS), C(3, 0.25, 26, -11, 0.2, 0, TARTAN), C(6, 0.25, 4, 8, 0.2, 7, '#e2cf9c')];
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 1.6 - Math.PI * 0.3;
    p.push(C(0.15, 7, 0.15, 8 + Math.cos(a) * 3.5, 3.5, -5 + Math.sin(a) * 3.5, STEEL_DARK));
  }
  p.push(cyl(1.25, 1.25, 0.12, 8, 0.25, -5, '#9a9da3', 16));
  return merge(p);
}

/** A small woven-steel pavilion: a ring of criss-crossing beams round a red core (Beijing). */
function wovenLattice() {
  const p = [cyl(6.5, 7, 6, 0, 3, 0, '#b8392f', 10)];
  for (let k = 0; k < 14; k += 1) {
    const a = (k / 14) * Math.PI * 2;
    for (const lean of [-0.5, 0.5]) {
      const g = new BoxGeometry(0.5, 13, 0.5);
      g.rotateZ(lean);
      g.rotateY(-a);
      g.translate(Math.cos(a) * 8.2, 6.2, Math.sin(a) * 8.2);
      p.push(piece(g, '#9a9da3'));
    }
  }
  return merge(p);
}

/** A timber gateway with deep eaves (Tokyo): two wooden posts, layered timber roofs, a green planted edge. */
function woodenEaves() {
  const p = [C(18, 0.5, 8, 0, 0.25, 0, '#9a8a72')];
  for (const x of [-6, 6]) p.push(C(1, 9, 1, x, 4.8, 0, WOOD));
  for (let k = 0; k < 3; k += 1) p.push(C(18 - k * 3, 0.5, 7 - k * 1.5, 0, 9.5 + k * 0.6, 0, k % 2 ? '#8a6338' : WOOD));
  p.push(C(18.4, 0.4, 0.6, 0, 9.9, 3.6, '#4f8a3f'));
  return merge(p);
}

/** A brick tower with a pointed copper-green roof (Stockholm 1912). */
function brickTower() {
  return merge([
    C(9, 1, 9, 0, 0.5, 0, BRICK_DARK),
    C(7.5, 30, 7.5, 0, 15.5, 0, BRICK),
    C(8.4, 1.2, 8.4, 0, 26, 0, BRICK_DARK),
    ...[-2, 2].map((x) => C(1.2, 3.4, 0.3, x, 23, 3.8, '#3a2c26')),
    cone(6.2, 9, 0, 35.5, 0, '#4a7a66', 4, Math.PI / 4),
    C(0.3, 3, 0.3, 0, 41.5, 0, '#c9a24a'),
  ]);
}

/** A sculpture of three relay batons, tall and leaning together, on a plinth (Stockholm). */
function relayBatons() {
  const p = [C(7, 1.2, 7, 0, 0.6, 0, '#a5a8ad')];
  [['#d8322b', -0.25, 0], ['#f2c230', 0.25, 2.1], ['#2f5d9a', 0, 4.2]].forEach(([c, lean, yaw]) => {
    const g = new CylinderGeometry(0.7, 0.7, 13, 10);
    g.rotateZ(lean);
    g.rotateY(yaw);
    g.translate(Math.sin(yaw) * 1.2, 7.6, Math.cos(yaw) * 1.2);
    p.push(piece(g, c));
  });
  return merge(p);
}

/** A steeplechase water pit on display: a sloping pool of water behind a heavy striped barrier (London). */
function steeplePit() {
  const p = [C(12, 0.3, 10, 0, 0.15, 0, GRASS), C(4, 0.4, 7, 0, 0.2, 1, '#3f7fa8')];
  for (let k = 0; k < 5; k += 1) p.push(C(0.8, 0.5, 0.5, -1.6 + k * 0.8, 1.6, -3.2, k % 2 ? '#1f2226' : LINE));
  for (const x of [-1.6, 1.6]) p.push(C(0.3, 1.4, 0.8, x, 0.7, -3.2, LINE));
  return merge(p);
}

/** A row of tall arches on piers (Los Angeles' peristyle, drawn generically). */
function peristyleArches() {
  const p = [C(46, 1.2, 8, 0, 0.6, 0, '#cdbb9a')];
  for (let k = 0; k <= 6; k += 1) p.push(C(2.4, 20, 3, -21 + k * 7, 11, 0, '#d7c6a6'));
  for (let k = 0; k < 6; k += 1) p.push(C(7, 2.6, 3.2, -17.5 + k * 7, 19.7, 0, '#cdbb9a'), C(3.6, 1.4, 3.0, -17.5 + k * 7, 17.8, 0, '#d7c6a6'));
  p.push(C(47, 2.2, 4, 0, 22.1, 0, '#cdbb9a'));
  return merge(p);
}

/** A plain flame cauldron: a wide bowl on a stepped pedestal (no torch design of any games). */
function flameCauldron() {
  return merge([C(8, 1.2, 8, 0, 0.6, 0, '#bba88c'), C(5, 1.2, 5, 0, 1.8, 0, '#cdbb9a'), cyl(1, 1.4, 5, 0, 4.9, 0), cyl(4, 1.4, 2.6, 0, 8.7, 0, '#6f6352', 10)]);
}
const flameCauldronGlow = () => merge([cone(3, 6.5, 0, 13.2, 0, '#ff8a2a', 7), cone(1.7, 4.6, 0.3, 12.6, 0.2, '#ffd36a', 6)]);

/** A golden arch beyond the line: two gold piers and a beam lit warm gold (Zurich's golden finish). */
function goldenArch() {
  return merge([C(2, 16, 2, -11, 8, 0, '#c9a24a'), C(2, 16, 2, 11, 8, 0, '#c9a24a'), C(24, 2, 2.4, 0, 16.6, 0, '#b38b35')]);
}
const goldenArchGlow = () => merge(Array.from({ length: 9 }, (_, k) => C(1.4, 0.8, 0.5, -9.6 + k * 2.4, 15.2, 1.3, '#ffe39a')));

/** A floodlight mast: a tapering grey column, a head of lamps facing the track (+z). */
function floodlightMast() {
  return merge([cyl(0.7, 1.3, 40, 0, 20, 0, STEEL), C(8, 5, 0.8, 0, 42, 0, STEEL_DARK)]);
}
const floodlightMastGlow = () => merge(Array.from({ length: 12 }, (_, k) => C(1.4, 1.1, 0.3, -2.7 + (k % 4) * 1.8, 40.6 + Math.floor(k / 4) * 1.4, 0.5, LAMP)));

/** The winners' podium: three white blocks (the middle one tallest) with their places on the front. */
function medalPodium() {
  return merge([
    C(16, 0.4, 9, 0, 0.2, 0, '#2f5d9a'),
    C(4.4, 3.6, 4, 0, 2.2, 0, LINE), C(4.4, 2.6, 4, -4.5, 1.7, 0, LINE), C(4.4, 1.8, 4, 4.5, 1.3, 0, LINE),
    C(1, 1.4, 0.1, 0, 2.8, 2.05, '#c9a24a'), C(1, 1.2, 0.1, -4.5, 2.2, 2.05, '#a8adb4'), C(1, 1, 0.1, 4.5, 1.7, 2.05, '#b07a4a'),
  ]);
}

/** The athletes' village: low blocks of flats round a green, a few flags on poles (no marks of any games). */
function athletesVillage() {
  const p = [C(60, 0.3, 40, 0, 0.15, 0, GRASS)];
  [[-20, -8, 14], [0, -12, 18], [20, -8, 12], [-20, 12, 10], [20, 12, 16]].forEach(([x, z, h], k) => {
    p.push(C(14, h, 9, x, h / 2, z, k % 2 ? '#e3ddd2' : '#d4cdbf'));
    for (let f = 1; f < h / 3; f += 1) p.push(C(14.1, 0.3, 9.1, x, f * 3, z, '#b9b2a6'));
  });
  ['#d8322b', '#2f5d9a', '#f2c230', '#2f9a4a', '#f4f1ea'].forEach((c, k) => p.push(C(0.15, 9, 0.15, -8 + k * 4, 4.5, 2, STEEL_DARK), C(1.8, 1.1, 0.05, -7.1 + k * 4, 8.3, 2, c)));
  return merge(p);
}

export const ATHLETICS_LANDMARKS = {
  'athletes-village': { build: athletesVillage, radius: 32 },
  'herm-gateway': { build: hermGateway, radius: 14 },
  'stone-colonnade': { build: stoneColonnade, radius: 21 },
  'stadium-bell-tower': { build: stadiumBellTower, radius: 6 },
  'warm-up-track': { build: warmUpTrack, glow: warmUpTrackGlow, radius: 28 },
  'timber-stand': { build: timberStand, radius: 14 },
  'woven-lattice': { build: wovenLattice, radius: 10 },
  'wooden-eaves': { build: woodenEaves, radius: 10 },
  'brick-tower': { build: brickTower, radius: 6 },
  'relay-batons': { build: relayBatons, radius: 5 },
  'steeple-pit': { build: steeplePit, radius: 8 },
  'peristyle-arches': { build: peristyleArches, radius: 24 },
  'flame-cauldron': { build: flameCauldron, glow: flameCauldronGlow, radius: 5, fit: 4 },
  'golden-arch': { build: goldenArch, glow: goldenArchGlow, radius: 13 },
  'floodlight-mast': { build: floodlightMast, glow: floodlightMastGlow, radius: 5, fit: 4 },
  'field-events': { build: fieldEvents, radius: 20 },
  'medal-podium': { build: medalPodium, radius: 9, fit: 8 },
};
