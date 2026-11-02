'use strict';

/**
 * The loop's sound (2 Nov 2026), made here, not downloaded: so it needs no licence. A swoosh up and over
 * as the player's own marble goes round a loop: filtered noise whose pitch rises as the marble climbs and
 * falls as it comes down, swelling and fading, 1.5 seconds. The same every time (a fixed seed).
 *
 *   node scripts/make-loop-sound.js    writes music-inbox/LOOP SWOOSH - made by Marble Spins.wav
 *
 * Then `bash scripts/convert-audio.sh` levels it to the collision click's loudness and writes
 * client/public/audio/marble-loop.{webm,m4a}.
 */
const fs = require('node:fs');
const path = require('node:path');

const RATE = 48000;
const SECONDS = 1.5;
const n = Math.round(RATE * SECONDS);

// A fixed-seed noise source (the same file every time).
let seed = 20261102;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 31 - 1;
};
const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

// The pitch: up from 320 Hz to 1500 Hz over the top (at 0.6 s), back down to 450 Hz.
const pitch = (t) => (t < 0.6 ? 320 * (1500 / 320) ** smooth(t / 0.6) : 1500 * (450 / 1500) ** smooth((t - 0.6) / 0.9));
// The swell: in over 0.35 s, fullest at the top, gone by the end.
const swell = (t) => (t < 0.6 ? smooth(t / 0.6) : 0.5 * (1 + Math.cos((Math.PI * (t - 0.6)) / (SECONDS - 0.6))));

// A band-pass filter (RBJ biquad), its centre moving with the pitch; and a soft low rumble of rolling under it.
const out = new Float64Array(n);
let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
let r1 = 0;
for (let i = 0; i < n; i += 1) {
  const t = i / RATE;
  const w = (2 * Math.PI * pitch(t)) / RATE;
  const q = 1.3;
  const alpha = Math.sin(w) / (2 * q);
  const b0 = alpha; const b2 = -alpha; const a0 = 1 + alpha; const a1 = -2 * Math.cos(w); const a2 = 1 - alpha;
  const x = noise();
  const y = (b0 * x + b2 * x2 - a1 * y1 - a2 * y2) / a0;
  x2 = x1; x1 = x; y2 = y1; y1 = y;
  r1 += 0.02 * (noise() - r1); // (a one-pole low-pass: the rumble)
  out[i] = swell(t) * (y + 0.6 * r1);
}
// To a peak of -3 dBFS (the conversion levels it), with 5 ms fades at the ends.
let peak = 0;
for (const v of out) peak = Math.max(peak, Math.abs(v));
const gain = 10 ** (-3 / 20) / (peak || 1);
const fade = Math.round(0.005 * RATE);
const pcm = Buffer.alloc(44 + n * 2);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + n * 2, 4); pcm.write('WAVE', 8);
pcm.write('fmt ', 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(RATE, 24); pcm.writeUInt32LE(RATE * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
pcm.write('data', 36); pcm.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i += 1) {
  const edge = Math.min(1, i / fade, (n - 1 - i) / fade);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * gain * edge)) * 32767), 44 + i * 2);
}
const file = path.resolve(__dirname, '../music-inbox/LOOP SWOOSH - made by Marble Spins.wav');
fs.writeFileSync(file, pcm);
console.log(`wrote ${path.relative(process.cwd(), file)} (${SECONDS} s)`);
