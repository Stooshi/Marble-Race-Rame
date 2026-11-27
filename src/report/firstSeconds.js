'use strict';

/**
 * The "first 20 seconds" check: what the field races through in its first 20 seconds must differ
 * from every other track's, so starts stop repeating the same few obstacles after the gate.
 *
 * A track's start sequence: the opening's kind, then each section the middle of the field reaches
 * in the first FIRST_SECONDS after GO (from one race at a fixed seed), in order: its shape (straights
 * too, and which way a bend turns), its obstacles and its features (a run of the same obstacle is one
 * token: three pegs read "peg ×3"). Two sequences are compared like layouts (variety.js similarity:
 * edit distance, the same section turning the other way costs a quarter).
 *
 * A new track fails when its sequence is the same as another track's (a reused start) or scores
 * SEQ_FAIL or more against any other track; SEQ_WARN is shown. Every track's sequence is kept in
 * startSequences.json (scripts/start-sequences.js records them all; the report adds its own).
 * Tracks added before the check (the first 81) are compared with, but not held to it.
 */
const fs = require('node:fs');
const path = require('node:path');
const { profile, similarity } = require('./variety');

const FIRST_SECONDS = 20;
const SEQ_FAIL = 0.8;
const SEQ_WARN = 0.65;
const SEQ_FILE = path.join(__dirname, 'startSequences.json');

const SHAPE = { plunge: 'drop', waterfall: 'waterfall', climb: 'climb', sBends: 'S-bends', sweep: 'sweep', spiral: 'spiral', hairpin: 'hairpin', splitter: 'splitter', twinChutes: 'chutes', halfPipe: 'half-pipe', straight: 'straight' };

/** How far along the track (0..1) the middle of the field is FIRST_SECONDS after GO, in a race's frames. */
function reachOf(sim, seconds = FIRST_SECONDS) {
  const t = seconds * 1000;
  const frame = sim.frames.find((f) => f.t >= t) ?? sim.frames.at(-1);
  const ps = frame.p.filter(Number.isFinite).sort((a, b) => a - b);
  return ps[Math.floor(ps.length / 2)] ?? 0;
}

/** A track's start sequence up to `reach`: [{ t, side }] (null for a track not built with the kit). */
function startSequence(track, reach) {
  const v = track.variety;
  if (!v) return null;
  const seq = [{ t: `opening: ${v.opening}`, side: null }];
  for (const s of v.sections) {
    if (s.from >= reach) break;
    if (SHAPE[s.shape]) seq.push({ t: SHAPE[s.shape], side: s.side ?? null });
    let run = null;
    for (const o of [...s.obstacles, ...s.features]) {
      if (run && run.kind === o) { run.n += 1; run.token.t = `${o} ×${run.n}`; continue; }
      run = { kind: o, n: 1, token: { t: o, side: null } };
      seq.push(run.token);
    }
  }
  return seq;
}

const readSequences = (file = SEQ_FILE) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});

/** Keeps a track's sequence in the file, tracks in name order. */
function saveSequence(track, reach, seq, file = SEQ_FILE) {
  const all = readSequences(file);
  all[track.slug] = { family: profile(track)?.family ?? 'classic', reach: Math.round(reach * 1000) / 1000, seq: seq.map((x) => (x.side ? `${x.t} ${x.side}` : x.t)) };
  const sorted = Object.fromEntries(Object.keys(all).sort().map((k) => [k, all[k]]));
  fs.writeFileSync(file, `{\n${Object.entries(sorted).map(([k, x]) => `${JSON.stringify(k)}: ${JSON.stringify(x)}`).join(',\n')}\n}\n`);
}

/** A stored sequence back as tokens. */
const tokensOf = (stored) => stored.seq.map((s) => {
  const m = /^(.*) (left|right)$/.exec(s);
  return m ? { t: m[1], side: m[2] } : { t: s, side: null };
});
const show = (seq) => seq.map((x) => (x.side ? `${x.t} ${x.side}` : x.t)).join(' → ');

/**
 * The report's line for one track: its first-20-seconds sequence against every other track's
 * (stored in startSequences.json; test tracks and the track it mirrors left out).
 * → { line, scores }.
 */
function firstSecondsCheck(track, seq, tracks, stored = readSequences()) {
  const me = profile(track);
  if (!seq || !me) return { line: { part: 'Variety', what: `First ${FIRST_SECONDS} seconds`, value: 'not a kit track', target: '', pass: null }, scores: [] };
  if (me.family === 'test') return { line: { part: 'Variety', what: `First ${FIRST_SECONDS} seconds`, value: `a test track (${show(seq)}): not compared`, target: '', pass: null }, scores: [] };
  const known = new Map(tracks.map((t) => [t.slug, t]));
  const scores = Object.entries(stored)
    .filter(([slug, s]) => slug !== track.slug && s.family !== 'test' && known.has(slug) && slug !== me.mirrorOf && profile(known.get(slug))?.mirrorOf !== track.slug)
    .map(([slug, s]) => ({ slug, name: known.get(slug).name, score: similarity(seq, tokensOf(s)) }))
    .sort((a, b) => b.score - a.score);
  const same = scores.filter((s) => s.score >= 1 - 1e-9);
  const failing = scores.filter((s) => s.score >= SEQ_FAIL - 1e-9);
  const closest = scores[0];
  return {
    line: {
      part: 'Variety',
      what: `First ${FIRST_SECONDS} seconds: what the field races through differs from every other track's start (too alike at ${SEQ_FAIL.toFixed(2)}; the same sequence is a reused start)`,
      value: `${show(seq)}; ${closest ? `closest is ${closest.name} (${closest.score.toFixed(2)})` : 'no other track to compare'}${same.length ? `; the same start as ${same.map((s) => s.name).join(', ')}` : failing.length ? `; too alike: ${failing.map((f) => `${f.name} ${f.score.toFixed(2)}`).join(', ')}` : ''}`,
      target: `under ${SEQ_FAIL.toFixed(2)}`,
      pass: !failing.length,
    },
    scores,
  };
}

module.exports = { FIRST_SECONDS, SEQ_FAIL, SEQ_WARN, SEQ_FILE, reachOf, startSequence, readSequences, saveSequence, tokensOf, firstSecondsCheck };
