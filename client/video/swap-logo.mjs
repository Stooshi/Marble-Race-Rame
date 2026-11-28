// Puts another version of the logo sting (A, B or C) into a finished production, without drawing
// the race again: the new sting is drawn alone, laid over the old one's 2 seconds, and the sound
// mixed again with its whoosh at the new moment.
//   node video/swap-logo.mjs <production.mp4> <A|B|C> <out.mp4>
// (Needs <production.mp4>.plan.json, which record.mjs writes beside every video.)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderLogo } from './render-logo.mjs';
import { mix } from './record.mjs';

const [src, version, out] = process.argv.slice(2);
const plan = JSON.parse(fs.readFileSync(`${src}.plan.json`, 'utf8'));
const logo = plan.shots.find((s) => s.type === 'logo');
if (!logo) throw new Error('This video has no logo sting');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'swap-'));
try {
  const sting = path.join(tmp, 'sting.mp4');
  await renderLogo({ version, file: sting, tall: plan.format === 'tall' });
  const shots = plan.shots.map((s) => (s === logo ? { ...s, version } : s));
  const audio = path.join(tmp, 'audio.wav');
  mix({ ...plan, shots }, plan.length, { tune: plan.tune }, audio);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-itsoffset', String(logo.at), '-i', sting, '-i', audio,
    '-filter_complex', `[0:v][1:v]overlay=enable='between(t,${logo.at},${logo.at + logo.dur - 0.001})':eof_action=pass[v]`,
    '-map', '[v]', '-map', '2:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '60',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
  fs.writeFileSync(`${out}.plan.json`, JSON.stringify({ ...plan, shots, logo: version }));
  console.log(`[swap-logo] wrote ${out} with logo ${version}`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
process.exit(0);
