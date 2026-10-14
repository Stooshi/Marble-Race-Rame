/**
 * Pinball tables (kit tracks of the pinball family): the track sunk into a giant
 * playfield. Looks only: the race is exactly the ice channel's.
 *
 *   buildPinball: the backglass behind the gate (original art and the table's name,
 *     lit), the orange dot-matrix display above it with the table's call-out, glowing
 *     playfield inserts along the track, the apron past the finish (flippers on a
 *     fixed rhythm, slingshots, the drain at the end of the catch area, a second
 *     display flashing the winner's call-out) and the wooden cabinet rails round the
 *     edges of the world. Flippers never touch a marble: they stand outside the
 *     catch area's walls, so every race replays exactly. Four draws in all: the picture
 *     (backglass, display and the winner's display), the cabinet, the inserts and the flippers.
 */
import {
  BoxGeometry, CanvasTexture, CylinderGeometry, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial,
  PlaneGeometry, Quaternion, SRGBColorSpace, Vector3,
} from 'three';
import { channelLipAt, channelRadiusAt } from '../iceChannel';
import { merge, piece } from './parts';

const UP = new Vector3(0, 1, 0);
export const BACKGLASS = { back: 46, width: 64, height: 36, lift: 3 }; // metres: behind the gate, its size, above the ground
const DISPLAY = { width: 44, height: 7 };
const FLIP_MS = 1600; // the flippers' fixed rhythm

/** Each art style's colours and the picture's few big shapes (all original art). */
const ART = {
  manor: { sky: ['#140a2a', '#3d1f5c'], ink: '#0b0612', glow: '#c6ff4f', accent: '#ff7a1a' },
  castle: { sky: ['#1a2a5c', '#e08a3a'], ink: '#24182a', glow: '#ffd23f', accent: '#d8342a' },
  saucers: { sky: ['#06142e', '#2a6a8a'], ink: '#10202a', glow: '#7dff6a', accent: '#ff4fd8' },
  theatre: { sky: ['#2a0610', '#7a0f22'], ink: '#1a0408', glow: '#ffd27a', accent: '#f2efe6' },
  diner: { sky: ['#0f3a4a', '#ff6fa8'], ink: '#1a2a30', glow: '#7af2ff', accent: '#ffd23f' },
  clocks: { sky: ['#05051a', '#3a2a7a'], ink: '#0a0a20', glow: '#c8b8ff', accent: '#ffcf5a' },
  concert: { sky: ['#0a0a12', '#5a0a6a'], ink: '#06060a', glow: '#ff3fa8', accent: '#3fd8ff' },
};

function shapes(g, art, w, h, c) {
  g.fillStyle = c.ink;
  if (art === 'manor') {
    g.fillStyle = '#f2e6b8'; g.beginPath(); g.arc(w * 0.78, h * 0.25, h * 0.12, 0, Math.PI * 2); g.fill(); // the moon
    g.fillStyle = c.ink;
    g.fillRect(w * 0.2, h * 0.42, w * 0.6, h * 0.58);
    for (const [x, tw, th] of [[0.22, 0.1, 0.32], [0.45, 0.1, 0.4], [0.68, 0.1, 0.3]]) {
      g.fillRect(w * x, h * (0.42 - th), w * tw, h * th);
      g.beginPath(); g.moveTo(w * (x - 0.01), h * (0.42 - th)); g.lineTo(w * (x + tw / 2), h * (0.3 - th)); g.lineTo(w * (x + tw + 0.01), h * (0.42 - th)); g.fill();
    }
    g.fillStyle = c.glow;
    for (let k = 0; k < 9; k += 1) g.fillRect(w * (0.25 + (k % 5) * 0.11), h * (0.55 + Math.floor(k / 5) * 0.16), w * 0.035, h * 0.07);
  } else if (art === 'castle') {
    g.fillRect(w * 0.15, h * 0.5, w * 0.7, h * 0.5);
    for (let k = 0; k < 4; k += 1) g.fillRect(w * (0.15 + k * 0.21), h * 0.32, w * 0.07, h * 0.2);
    for (let k = 0; k < 14; k += 1) g.fillRect(w * (0.15 + k * 0.05), h * 0.46, w * 0.03, h * 0.05);
    g.fillStyle = c.accent;
    for (let k = 0; k < 4; k += 1) { g.beginPath(); g.moveTo(w * (0.18 + k * 0.21), h * 0.32); g.lineTo(w * (0.18 + k * 0.21), h * 0.2); g.lineTo(w * (0.24 + k * 0.21), h * 0.24); g.fill(); }
  } else if (art === 'saucers') {
    for (const [x, y, r] of [[0.25, 0.3, 0.12], [0.62, 0.22, 0.09], [0.8, 0.45, 0.07]]) {
      g.fillStyle = '#b8c4cc'; g.beginPath(); g.ellipse(w * x, h * y, w * r, h * r * 0.35, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = c.glow; g.beginPath(); g.ellipse(w * x, h * (y - r * 0.3), w * r * 0.4, h * r * 0.3, 0, Math.PI, 0); g.fill();
    }
    g.fillStyle = c.ink; for (let k = 0; k < 7; k += 1) g.fillRect(w * (0.08 + k * 0.13), h * (0.72 - (k % 3) * 0.05), w * 0.09, h);
  } else if (art === 'theatre') {
    g.fillStyle = '#a8122a';
    for (let k = 0; k < 6; k += 1) { g.fillRect(w * (k * 0.035), 0, w * 0.03, h); g.fillRect(w * (1 - (k + 1) * 0.035), 0, w * 0.03, h); }
    g.fillStyle = c.ink; g.fillRect(w * 0.42, h * 0.3, w * 0.16, h * 0.22); g.fillRect(w * 0.36, h * 0.5, w * 0.28, h * 0.04); // the top hat
  } else if (art === 'diner') {
    g.fillStyle = c.accent; g.fillRect(w * 0.1, h * 0.6, w * 0.8, h * 0.08);
    g.fillStyle = c.ink; g.fillRect(w * 0.12, h * 0.68, w * 0.76, h * 0.32);
    g.fillStyle = c.glow; g.font = `bold ${Math.round(h * 0.14)}px sans-serif`; g.textAlign = 'center'; g.fillText('TILT', w * 0.8, h * 0.3);
  } else if (art === 'clocks') {
    g.strokeStyle = c.accent; g.lineWidth = h * 0.02;
    for (const [x, y, r] of [[0.3, 0.38, 0.16], [0.72, 0.3, 0.1]]) {
      g.beginPath(); g.arc(w * x, h * y, h * r, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(w * x, h * y); g.lineTo(w * x, h * (y - r * 0.7)); g.moveTo(w * x, h * y); g.lineTo(w * x + h * r * 0.5, h * y); g.stroke();
    }
    g.fillStyle = c.ink; for (let k = 0; k < 5; k += 1) g.fillRect(w * (0.5 + k * 0.06), h * (0.85 - k * 0.08), w * 0.06, h * 0.03); // stairs to nowhere
  } else {
    g.fillStyle = c.ink; g.fillRect(0, h * 0.62, w, h * 0.38);
    for (let k = 0; k < 8; k += 1) { g.fillStyle = k % 2 ? c.glow : c.accent; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(w * (0.1 + k * 0.11), 0); g.lineTo(w * (0.05 + k * 0.11), h * 0.62); g.lineTo(w * (0.15 + k * 0.11), h * 0.62); g.fill(); }
    g.globalAlpha = 1;
  }
}

/** The backglass picture into (x0, y0, w, h) of a canvas: the art style's sky, its shapes and the table's name in big lit letters. */
function paintBackglass(g, x0, y0, w, h, art, title) {
  const c = ART[art] ?? ART.manor;
  g.save();
  g.translate(x0, y0);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, c.sky[0]);
  sky.addColorStop(1, c.sky[1]);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  shapes(g, art, w, h, c);
  g.textAlign = 'center';
  g.font = `900 ${Math.round(h * 0.16)}px sans-serif`;
  g.lineWidth = h * 0.025;
  g.strokeStyle = c.ink;
  g.strokeText(title, w / 2, h * 0.9);
  g.fillStyle = c.glow;
  g.fillText(title, w / 2, h * 0.9);
  g.strokeStyle = c.accent;
  g.lineWidth = h * 0.02;
  g.strokeRect(h * 0.02, h * 0.02, w - h * 0.04, h - h * 0.04);
  g.restore();
}

/** An orange dot-matrix display reading `text`, into (x0, y0, w, h) of a canvas. */
function paintDotMatrix(g, x0, y0, w, h, text, pitch) {
  g.save();
  g.translate(x0, y0);
  g.fillStyle = '#120600';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#ff8a1a';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `bold ${Math.round(Math.min(h * 0.62, (w * 0.92) / (Math.max(4, text.length) * 0.62)))}px monospace`;
  g.fillText(text, w / 2, h * 0.54);
  // The dots: a fine dark grid over the letters.
  g.fillStyle = '#120600';
  for (let x = 0; x < w; x += pitch) g.fillRect(x, 0, 1, h);
  for (let y = 0; y < h; y += pitch) g.fillRect(0, y, w, 1);
  g.restore();
}

function canvasTexture(canvas) {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** A quad of `w` by `h` (centred at x, y) showing the part (u0..u1, v0..v1) of a picture. */
function quad(w, h, x, y, z, [u0, u1, v0, v1]) {
  const g = new PlaneGeometry(w, h);
  const uv = g.getAttribute('uv');
  for (let k = 0; k < uv.count; k += 1) uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), v0 + uv.getY(k) * (v1 - v0));
  g.translate(x, y, z);
  return g;
}

/**
 * The pinball table round a kit track: { group, update(t), feet (spots kept clear of trees) }.
 * groundAt(x, z): the land's height; bounds: the land's extent { minX, maxX, minZ, maxZ, floorY };
 * pen: the catch area past the finish ({ length, halfWidth }, physics.runout).
 */
export function buildPinball(centerline, channel, kit, { lite = false, groundAt, bounds, pen, corridor = null }) {
  const pb = kit.pinball ?? {};
  const { samples, segments } = centerline;
  const group = new Group();
  group.name = 'pinball';
  const feet = [];
  const owned = [];
  const lambert = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
  owned.push(lambert);
  const solid = [];
  const glow = [];
  const c = ART[pb.art] ?? ART.manor;

  // ── The backglass and its display, behind the gate, facing down the table ──
  const s0 = samples[0];
  const back = new Vector3(-s0.tangent.x, 0, -s0.tangent.z).normalize();
  const foot = s0.pos.clone().addScaledVector(back, BACKGLASS.back);
  foot.y = Math.min(groundAt(foot.x, foot.z), s0.pos.y - 6) + BACKGLASS.lift;
  const yaw = Math.atan2(-back.x, -back.z); // faces down the table
  const place = new Matrix4().compose(foot, new Quaternion().setFromAxisAngle(UP, yaw), new Vector3(1, 1, 1));
  const W = BACKGLASS.width;
  const H = BACKGLASS.height;
  // The cabinet head round it: dark wood, a chrome trim, legs down to the playfield.
  solid.push(piece(new BoxGeometry(W + 4, H + 4, 2.4), '#2a1a12', new Matrix4().makeTranslation(0, H / 2, -1.4).premultiply(place)));
  solid.push(piece(new BoxGeometry(W + 4.4, 0.8, 2.8), '#c8ccd2', new Matrix4().makeTranslation(0, H + 2.2, -1.4).premultiply(place)));
  for (const x of [-W / 2, W / 2]) solid.push(piece(new BoxGeometry(2, 40, 2), '#2a1a12', new Matrix4().makeTranslation(x, -18, -1.4).premultiply(place)));
  // The backglass and the display above it: one picture (the display along its top), one draw.
  solid.push(piece(new BoxGeometry(DISPLAY.width + 2, DISPLAY.height + 2, 2), '#111114', new Matrix4().makeTranslation(0, H + 3 + DISPLAY.height / 2, -0.8).premultiply(place)));
  const cw = lite ? 512 : 1024;
  const artH = Math.round((cw * H) / W);
  const dmdW = Math.round((cw * DISPLAY.width) / W);
  const dmdH = Math.round((dmdW * DISPLAY.height) / DISPLAY.width);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = artH + dmdH;
  const g = canvas.getContext('2d');
  paintDotMatrix(g, 0, 0, dmdW, dmdH, pb.display ?? 'MULTIBALL!', lite ? 3 : 4);
  // (the winner's call-out beside it, for the display past the drain)
  const winW = cw - dmdW;
  paintDotMatrix(g, dmdW, 0, winW, dmdH, pb.finish ?? 'JACKPOT!', lite ? 3 : 4);
  paintBackglass(g, 0, dmdH, cw, artH, pb.art ?? 'manor', pb.title ?? '');
  const picture = canvasTexture(canvas);
  const pictureMat = new MeshBasicMaterial({ map: picture, side: DoubleSide, fog: false });
  owned.push(picture, pictureMat);
  const total = artH + dmdH;
  const panels = merge([
    quad(W, H, 0, H / 2, 0, [0, 1, 0, artH / total]),
    quad(DISPLAY.width, DISPLAY.height, 0, H + 3 + DISPLAY.height / 2, 0.25, [0, dmdW / cw, artH / total, 1]),
  ].map((q) => q.toNonIndexed()));
  panels.applyMatrix4(place);
  const glass = new Mesh(panels, pictureMat);
  glass.name = 'pinball: backglass';
  const winUV = [dmdW / cw, 1, artH / total, 1];
  const winAspect = (cw - dmdW) / dmdH;
  group.add(glass);
  feet.push({ x: foot.x, z: foot.z, r: W / 2 + 6 });

  // ── Playfield inserts: glowing arrows and lamps on the ground beside the track ──
  const step = channel.arc / segments;
  const insertEvery = lite ? 30 : 16;
  const colours = [c.glow, c.accent, '#3fd8ff', '#ff3f6a', '#ffd23f'];
  let n = 0;
  for (let i = Math.round(30 / step); i < segments - Math.round(30 / step); i += Math.max(1, Math.round(insertEvery / step))) {
    const s = samples[i];
    const side = new Vector3(s.side.x, 0, s.side.z).normalize();
    const along = new Vector3(s.tangent.x, 0, s.tangent.z).normalize();
    const edge = channelRadiusAt(channel, i * step) * Math.sin(channelLipAt(channel, i * step));
    for (const sign of [1, -1]) {
      n += 1;
      const at = s.pos.clone().addScaledVector(side, sign * (edge + 4 + (n % 3) * 2));
      at.y = groundAt(at.x, at.z) + 0.03; // (flush with the playfield: a decal, never a wall in the camera's way)
      if (at.y > s.pos.y + 1) continue; // (not where the land rises over the rim)
      if (corridor?.inside(at.x, at.y, at.z, { margin: 2.8 })) continue; // (never on another stretch of the track)
      const m = new Matrix4().makeRotationX(-Math.PI / 2).premultiply(new Matrix4().makeRotationY(Math.atan2(along.x, along.z))).premultiply(new Matrix4().makeTranslation(at.x, at.y, at.z));
      const colour = colours[n % colours.length];
      if (n % 3 === 0) {
        // An arrow pointing down the table.
        const g = new CylinderGeometry(0, 2.8, 0.1, 3);
        glow.push(piece(g, colour, new Matrix4().makeRotationX(Math.PI / 2).premultiply(m)));
      } else {
        glow.push(piece(new CylinderGeometry(1.9, 1.9, 0.1, 12), colour, new Matrix4().makeRotationX(Math.PI / 2).premultiply(m)));
      }
    }
  }

  // ── The apron past the finish: slingshots, flippers, the drain ──
  const end = samples[segments];
  const along = new Vector3(end.tangent.x, 0, end.tangent.z).normalize();
  const side = new Vector3(end.side.x, 0, end.side.z).normalize();
  const len = pen?.length ?? 30;
  const half = (pen?.halfWidth ?? 3.5) + 1.2; // outside the catch area's walls
  const floorAt = (d) => end.pos.y - d * 0.08;
  const flippers = [];
  for (const sign of [1, -1]) {
    // A slingshot: a white triangle with a red rubber face, angled at the run-out.
    const slingAt = end.pos.clone().addScaledVector(along, len * 0.25).addScaledVector(side, sign * (half + 2.2));
    slingAt.y = floorAt(len * 0.25) - 0.4;
    const slingQ = new Quaternion().setFromAxisAngle(UP, Math.atan2(along.x, along.z) + sign * 0.35);
    solid.push(piece(new CylinderGeometry(2.4, 2.4, 1.4, 3), '#f2efe6', new Matrix4().compose(slingAt, slingQ, new Vector3(1, 1, 1.6))));
    solid.push(piece(new BoxGeometry(0.35, 1.2, 3.6), '#d8342a', new Matrix4().compose(slingAt.clone().addScaledVector(side, -sign * 1.3), slingQ, new Vector3(1, 1, 1))));
    // A flipper: a tapered white bat with a red rubber edge on a pivot post, flapping on a fixed rhythm.
    const pivot = end.pos.clone().addScaledVector(along, len * 0.55).addScaledVector(side, sign * (half + 5.5));
    pivot.y = floorAt(len * 0.55) - 0.2;
    const bat = merge([
      piece(new CylinderGeometry(0.9, 0.5, 6, 10), '#f4f4f0', new Matrix4().makeRotationZ(Math.PI / 2).premultiply(new Matrix4().makeTranslation(-sign * 3, 0, 0))),
      piece(new CylinderGeometry(0.35, 0.35, 1.4, 8), '#d8342a', new Matrix4().makeTranslation(0, 0, 0)),
    ]);
    const base = new Quaternion().setFromAxisAngle(UP, Math.atan2(side.x, side.z) - Math.PI / 2 + sign * 0.5);
    flippers.push({ bat, pivot, base, sign });
    feet.push({ x: pivot.x, z: pivot.z, r: 6 });
  }
  // Both flippers in one mesh (one draw), their shapes turned about their pivots on every update.
  const batGeo = merge(flippers.map((f) => f.bat.clone()));
  const batPos = batGeo.getAttribute('position');
  const batNormal = batGeo.getAttribute('normal');
  let offset = 0;
  for (const f of flippers) {
    f.from = offset;
    f.count = f.bat.getAttribute('position').count;
    f.local = f.bat.getAttribute('position').array.slice();
    f.localNormal = f.bat.getAttribute('normal').array.slice();
    offset += f.count;
    f.bat.dispose();
  }
  const flipMesh = new Mesh(batGeo, lambert);
  flipMesh.name = 'pinball: flippers';
  flipMesh.frustumCulled = false;
  group.add(flipMesh);
  // The drain: a dark trough across the end of the catch area, a chrome lip, the apron round it.
  const drainAt = end.pos.clone().addScaledVector(along, len + 2.5);
  drainAt.y = floorAt(len) - 1.6;
  const drainQ = new Quaternion().setFromAxisAngle(UP, Math.atan2(along.x, along.z));
  solid.push(piece(new BoxGeometry(half * 2 + 12, 1, 4), '#08080a', new Matrix4().compose(drainAt, drainQ, new Vector3(1, 1, 1))));
  solid.push(piece(new BoxGeometry(half * 2 + 13, 0.4, 0.6), '#c8ccd2', new Matrix4().compose(drainAt.clone().addScaledVector(along, -2.2).add(new Vector3(0, 0.5, 0)), drainQ, new Vector3(1, 1, 1))));
  // A second display beyond the drain with the winner's call-out (part of the backglass's picture: no draw of its own).
  const winAt = end.pos.clone().addScaledVector(along, len + 22);
  winAt.y = Math.max(groundAt(winAt.x, winAt.z), floorAt(len)) + 10;
  const winSign = { quaternion: new Quaternion().setFromAxisAngle(UP, Math.atan2(-along.x, -along.z)) };
  const winH = DISPLAY.height * 1.2;
  const winQuad = quad(winH * winAspect, winH, 0, 0, 0, winUV).toNonIndexed();
  winQuad.applyMatrix4(new Matrix4().compose(winAt, winSign.quaternion, new Vector3(1, 1, 1)));
  glass.geometry = merge([glass.geometry, winQuad]);
  solid.push(piece(new BoxGeometry(winH * winAspect + 1.4, winH + 1.4, 1), '#111114', new Matrix4().compose(winAt.clone().addScaledVector(along, 0.6), winSign.quaternion, new Vector3(1, 1, 1))));
  for (const x of [-1, 1]) solid.push(piece(new BoxGeometry(0.6, 12, 0.6), '#2a2a30', new Matrix4().compose(winAt.clone().addScaledVector(side, x * winH * winAspect * 0.4).addScaledVector(along, 0.6).add(new Vector3(0, -7, 0)), winSign.quaternion, new Vector3(1, 1, 1))));
  feet.push({ x: winAt.x, z: winAt.z, r: DISPLAY.width * 0.4 });

  // ── The cabinet's side rails round the edges of the world ──
  if (bounds) {
    const { minX, maxX, minZ, maxZ, floorY } = bounds;
    const top = floorY + 16;
    const h = top - (floorY - 4);
    const midY = (top + floorY - 4) / 2;
    const rails = [
      [(minX + maxX) / 2, minZ, maxX - minX, 3], [(minX + maxX) / 2, maxZ, maxX - minX, 3],
      [minX, (minZ + maxZ) / 2, 3, maxZ - minZ], [maxX, (minZ + maxZ) / 2, 3, maxZ - minZ],
    ];
    for (const [x, z, w, d] of rails) {
      solid.push(piece(new BoxGeometry(w, h, d), '#5a3a22', new Matrix4().makeTranslation(x, midY, z)));
      solid.push(piece(new BoxGeometry(w + 1, 1.2, d + 1), '#c8ccd2', new Matrix4().makeTranslation(x, top + 0.6, z))); // the lockdown bar
    }
  }

  const still = new Mesh(merge(solid), lambert);
  still.name = 'pinball: cabinet';
  group.add(still);
  if (glow.length) {
    const insertMat = new MeshBasicMaterial({ vertexColors: true });
    owned.push(insertMat);
    const inserts = new Mesh(merge(glow), insertMat);
    inserts.name = 'pinball: inserts';
    group.add(inserts);
  }

  const flipQ = new Quaternion();
  const v = new Vector3();
  const m = new Matrix4();
  const update = (t) => {
    // Flippers: up for a moment, then down, each on the same fixed rhythm (the left a beat after the right).
    for (const f of flippers) {
      const u = ((((t + (f.sign > 0 ? 0 : FLIP_MS / 2)) % FLIP_MS) + FLIP_MS) % FLIP_MS) / FLIP_MS;
      const up = u < 0.12 ? u / 0.12 : u < 0.3 ? 1 - (u - 0.12) / 0.18 : 0;
      flipQ.copy(f.base).multiply(new Quaternion().setFromAxisAngle(UP, -f.sign * up * 0.9));
      m.compose(f.pivot, flipQ, new Vector3(1, 1, 1));
      for (let k = 0; k < f.count; k += 1) {
        v.fromArray(f.local, k * 3).applyMatrix4(m);
        batPos.setXYZ(f.from + k, v.x, v.y, v.z);
        v.fromArray(f.localNormal, k * 3).applyQuaternion(flipQ);
        batNormal.setXYZ(f.from + k, v.x, v.y, v.z);
      }
    }
    batPos.needsUpdate = true;
    batNormal.needsUpdate = true;
  };
  update(0);
  const dispose = () => owned.forEach((o) => o.dispose?.());
  return { group, update, feet, dispose, backglass: { foot, back } };
}
