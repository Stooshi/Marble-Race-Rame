'use strict';

/**
 * How a race on the new physics is stored (race_replays.data), smaller from 27 Oct 2026 (Moses: "make
 * new replays smaller without changing how races look"). Lossless: a replay unpacks to exactly the
 * numbers the race was decided with, so it plays back exactly as it ran.
 *
 *   Version 1 (until 27 Oct 2026): gzipped JSON of { durationMs, tickMs, tickRateHz, results, events,
 *     frames, start, stats }. About 160–180 KB a race. Still read: old replays stay as they are.
 *   Version 2: the 4 bytes "MSR2", then Brotli-compressed JSON where the frames are stored by column:
 *     each per-marble list (p progress, l lane, h height, v speed, …) as whole numbers at its own
 *     number of decimals, each frame the difference from the one before. About 50–60 KB a race.
 *
 * A frame's values are the race engine's own, already rounded (p to 5 decimals, l to 3, v to 1, …):
 * n / 10^d gives back exactly the same number as reading it from JSON did, so nothing changes.
 */
const zlib = require('zlib');

const MAGIC = Buffer.from('MSR2');

/** Decimals a number is written with (JSON's own shortest form). */
function decimals(x) {
  const s = String(x);
  if (/e/i.test(s)) return null; // (an exponent: not stored by column)
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

/** A list of numbers only (every frame's), with at most 9 decimals: stored by column. */
function columnOf(frames, key) {
  let dec = 0;
  let len = null;
  for (const f of frames) {
    const a = f[key];
    if (a === undefined) continue;
    if (!Array.isArray(a)) return null;
    if (len === null) len = a.length;
    for (const x of a) {
      if (typeof x !== 'number' || !Number.isFinite(x)) return null;
      const d = decimals(x);
      if (d === null || d > 9) return null;
      if (d > dec) dec = d;
    }
  }
  const m = 10 ** dec;
  const rows = [];
  let prev = null;
  for (const f of frames) {
    const a = f[key];
    if (a === undefined) { rows.push(null); prev = null; continue; }
    const ints = a.map((x) => Math.round(x * m));
    // (Only if it gives the same numbers back: otherwise this list is kept as it is.)
    if (ints.some((n, i) => n / m !== a[i])) return null;
    rows.push(prev && prev.length === ints.length ? [0, ...ints.map((n, i) => n - prev[i])] : [1, ...ints]);
    prev = ints;
  }
  return { dec, rows };
}

/** The packed replay (version 2) of a race the engine worked out. */
function packReplay(sim) {
  const { durationMs, tickMs, tickRateHz, results, events, frames = [], start, stats } = sim;
  const keys = [...new Set(frames.flatMap((f) => Object.keys(f)))];
  const columns = {};
  const plain = {};
  for (const key of keys) {
    const col = columnOf(frames, key);
    if (col) columns[key] = col;
    else plain[key] = frames.map((f) => (key in f ? f[key] : undefined)); // (undefined → null in JSON; `has` says which)
  }
  // Which keys each frame has, when not every frame has all of them.
  const has = frames.some((f) => keys.some((k) => !(k in f))) ? frames.map((f) => keys.filter((k) => k in f).map((k) => keys.indexOf(k))) : null;
  const body = JSON.stringify({ v: 2, durationMs, tickMs, tickRateHz, results, events, start, stats, n: frames.length, keys, columns, plain, has });
  const packed = zlib.brotliCompressSync(Buffer.from(body), {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: body.length },
  });
  return Buffer.concat([MAGIC, packed]);
}

/** A stored replay (either version) → { durationMs, tickMs, tickRateHz, results, events, frames, start, stats }. */
function unpackReplay(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (!buf.subarray(0, 4).equals(MAGIC)) return JSON.parse(zlib.gunzipSync(buf).toString('utf8'));
  const r = JSON.parse(zlib.brotliDecompressSync(buf.subarray(4)).toString('utf8'));
  const frames = Array.from({ length: r.n }, () => ({}));
  for (const [key, { dec, rows }] of Object.entries(r.columns)) {
    const m = 10 ** dec;
    let prev = null;
    rows.forEach((row, i) => {
      if (row === null) { prev = null; return; }
      const ints = row[0] === 1 ? row.slice(1) : row.slice(1).map((d, k) => prev[k] + d);
      frames[i][key] = ints.map((n) => n / m);
      prev = ints;
    });
  }
  for (const [key, values] of Object.entries(r.plain)) values.forEach((v, i) => { if (v !== null || !r.has) frames[i][key] = v; });
  // Keys in the engine's own order, and only those each frame had.
  const out = frames.map((f, i) => {
    const o = {};
    const ks = r.has ? r.has[i].map((k) => r.keys[k]) : r.keys;
    for (const k of ks) o[k] = f[k] === undefined ? null : f[k];
    return o;
  });
  const { durationMs, tickMs, tickRateHz, results, events, start, stats } = r;
  return { durationMs, tickMs, tickRateHz, results, events, frames: out, start, stats };
}

module.exports = { packReplay, unpackReplay, MAGIC };
