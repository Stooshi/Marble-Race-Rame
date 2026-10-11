'use strict';

/**
 * The "first 3 seconds" check on screen: does a track's start LOOK like another's?
 *
 * The report draws four frames of the start with the scenery off (the camera, the
 * gate, the track and the field: what makes two starts look alike, whatever the
 * landscape behind): the countdown's opening, 1.5 s before GO, 1 s and 3 s after.
 * Each frame becomes a small picture of its shapes (lookVector: in a grid of cells,
 * how strongly the edges run in each direction), and two starts are compared by how
 * alike those are (lookSimilarity, cosine: 1 the same picture, 0 nothing in common).
 *
 * Calibrated on the live tracks (October 2026): the kit tracks, whose starts all
 * look the same to the eye, score 0.74 to 1.00 against each other (median 0.88);
 * the coasters before their varied starts 0.58 to 0.89; after them 0.04 to 0.67.
 * A new track fails when it scores LOOK_FAIL or more against any other track of its
 * family. Every track's look is kept in startLooks.json (the report adds its own).
 */
const fs = require('node:fs');
const path = require('node:path');
const { profile } = require('./variety');

const LOOK_FAIL = 0.72;
const LOOK_SIZE = { width: 160, height: 90 }; // the grey picture each frame is shrunk to
const GRID = { x: 8, y: 6 };
const BINS = 6;
const LOOKS_FILE = path.join(__dirname, 'startLooks.json');

/** One frame's shapes: grey values (0..255, LOOK_SIZE, row by row) to a unit vector. */
function frameVector(grey) {
  const { width: W, height: H } = LOOK_SIZE;
  const at = (x, y) => grey[y * W + x] / 255;
  const out = new Float64Array(GRID.x * GRID.y * BINS);
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const dx = at(x + 1, y) - at(x - 1, y);
      const dy = at(x, y + 1) - at(x, y - 1);
      const mag = Math.hypot(dx, dy);
      if (!mag) continue;
      const ang = ((Math.atan2(dy, dx) % Math.PI) + Math.PI) % Math.PI;
      const bin = Math.min(BINS - 1, Math.floor((ang / Math.PI) * BINS));
      const cell = Math.floor((y * GRID.y) / H) * GRID.x + Math.floor((x * GRID.x) / W);
      out[cell * BINS + bin] += mag;
    }
  }
  const mean = out.reduce((a, b) => a + b, 0) / out.length;
  let norm = 0;
  for (let i = 0; i < out.length; i += 1) { out[i] -= mean; norm += out[i] * out[i]; }
  norm = Math.sqrt(norm) || 1;
  return Array.from(out, (v) => v / norm);
}

/** A start's look: its four frames' vectors, one after another (a unit vector, rounded to keep the file small). */
function lookVector(frames) {
  const k = 1 / Math.sqrt(frames.length);
  return frames.flatMap((g) => frameVector(g).map((v) => Math.round(v * k * 1000) / 1000));
}

function lookSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return null;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / Math.sqrt(na * nb || 1);
}

const familyOf = (track) => profile(track)?.family ?? 'classic';
const mirrorOf = (track) => profile(track)?.mirrorOf ?? null;
const readLooks = (file = LOOKS_FILE) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});

/** Keeps a track's look in the file (its family with it), tracks in name order. */
function saveLook(track, vector, file = LOOKS_FILE) {
  const looks = readLooks(file);
  looks[track.slug] = { family: familyOf(track), v: vector };
  const sorted = Object.fromEntries(Object.keys(looks).sort().map((k) => [k, looks[k]]));
  fs.writeFileSync(file, `{\n${Object.entries(sorted).map(([k, x]) => `${JSON.stringify(k)}: ${JSON.stringify(x)}`).join(',\n')}\n}\n`);
}

/**
 * The report's line: the track's start against every other track of its family (not test
 * tracks, not the track it mirrors). `all`: the physics tracks (for names, families, mirrors).
 */
function startLookCheck(track, vector, all, looks = readLooks()) {
  const family = familyOf(track);
  const what = `Start on screen: the first seconds look unlike every other ${{ classic: 'hand-built', 'world-tour': 'World Tour', 'grand-prix': 'Grand Prix' }[family] ?? family} track (scenery off: camera, gate, field)`;
  const target = `under ${LOOK_FAIL} with each`;
  if (family === 'test') return { part: 'Variety', what, value: 'a test track: not compared', target, pass: null };
  const others = all.filter((t) => t.slug !== track.slug && looks[t.slug] && looks[t.slug].family === family
    && t.slug !== mirrorOf(track) && mirrorOf(t) !== track.slug);
  if (!others.length) return { part: 'Variety', what, value: 'no other track of its family recorded yet', target, pass: null };
  const scores = others.map((t) => ({ name: t.name, s: lookSimilarity(vector, looks[t.slug].v) })).sort((a, b) => b.s - a.s);
  const close = scores.filter((x) => x.s >= LOOK_FAIL);
  const value = close.length
    ? `looks like ${close.slice(0, 3).map((x) => `${x.name} (${x.s.toFixed(2)})`).join(', ')}${close.length > 3 ? ` and ${close.length - 3} more` : ''}`
    : `most alike: ${scores[0].name} (${scores[0].s.toFixed(2)}), of ${scores.length}`;
  return { part: 'Variety', what, value, target, pass: !close.length, scores: scores.map((x) => [x.name, Math.round(x.s * 100) / 100]) };
}

module.exports = { LOOK_FAIL, LOOK_SIZE, LOOKS_FILE, frameVector, lookVector, lookSimilarity, readLooks, saveLook, startLookCheck };
