// One Marble Spins Championship episode (Moses, 28 Nov 2026), 1920×1080 at 30 fps, from its parts:
//   episode 1 only: the opening (the title, the 20 competitors, how points work; 20–30 s);
//   the interlude: the track intro over the flyover (fly.mp4, from record.mjs --kind champFly), then (from race 2)
//     the marbles to watch; the marbles lining up at the gates open the race video;
//   the race (race.mp4, from record.mjs --kind championship);
//   the ceremony (the podium, points awarded), the standings, "Next race: <track>".
// The cards come from cards.mjs. Each still becomes a scene with a slow push-in and its own sound (the race music
// under the opening and the standings, the ceremony song under the podium); the scenes are joined with short
// crossfades in one pass.
//   node video/championship/episode.mjs <episode dir> <n> --out <file.mp4> [--tune 11]
// Looks only: nothing here touches a race.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const AUDIO = path.join(here, '..', '..', 'public', 'audio');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args.splice(i, 2)[1]; };
const out = path.resolve(opt('--out'));
const tune = opt('--tune', '11');
const [dir, nArg] = args;
const n = Number(nArg);
const XF = 0.5; // crossfades, s
const FPS = 30;
const tmp = fs.mkdtempSync(path.join(path.dirname(out), '.ep-'));
const run = (a) => execFileSync('ffmpeg', ['-y', '-v', 'error', ...a], { stdio: 'inherit' });
const dur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }));
const V = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS)];
const A = ['-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2'];

/** A still as a scene: a slow push-in, its sound (a stretch of music, faded) levelled under the race's loudness. */
let musicAt = 0;
function still(png, secs, { song = null } = {}) {
  const f = path.join(tmp, `${path.basename(png, '.png')}.mp4`);
  const frames = Math.round(secs * FPS);
  const src = song ? path.join(AUDIO, `${song}.m4a`) : path.join(AUDIO, `tune-${tune}.m4a`);
  const off = song ? 0 : musicAt;
  if (!song) musicAt += secs;
  run(['-loop', '1', '-framerate', String(FPS), '-i', png, '-stream_loop', '-1', '-ss', String(off), '-i', src,
    '-filter_complex', `[0:v]scale=2112:-1,zoompan=z='1+0.0004*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1920x1080:fps=${FPS},format=yuv420p,setsar=1[v];` +
      `[1:a]atrim=0:${secs},asetpts=PTS-STARTPTS,afade=t=in:d=0.6,afade=t=out:st=${Math.max(0, secs - 0.8)}:d=0.8,loudnorm=I=-17:TP=-1.5:LRA=11,aresample=48000[a]`,
    '-map', '[v]', '-map', '[a]', '-t', String(secs), ...V, ...A, f]);
  return f;
}
/** A recorded part, brought to the episode's frame rate and sound. */
function clip(file) {
  const f = path.join(tmp, path.basename(file));
  run(['-i', file, '-vf', `scale=1920:1080,fps=${FPS},format=yuv420p,setsar=1`, '-af', 'aresample=48000', ...V, ...A, f]);
  return f;
}

const C = path.join(dir, 'cards');
const scenes = [];
if (n === 1) {
  scenes.push(still(path.join(C, 'title.png'), 5));
  scenes.push(still(path.join(C, 'competitors.png'), 11));
  scenes.push(still(path.join(C, 'points.png'), 8));
}
scenes.push(clip(path.join(dir, 'fly.mp4')));
if (fs.existsSync(path.join(C, 'watch.png'))) scenes.push(still(path.join(C, 'watch.png'), 6.5));
scenes.push(clip(path.join(dir, 'race.mp4')));
scenes.push(still(path.join(C, 'ceremony.png'), 7.5, { song: 'ceremony' }));
scenes.push(still(path.join(C, 'standings.png'), 9));
if (fs.existsSync(path.join(C, 'next.png'))) scenes.push(still(path.join(C, 'next.png'), 5));

// Joined in one pass: each crossfade overlaps the scenes by XF.
const lens = scenes.map(dur);
const inputs = scenes.flatMap((f) => ['-i', f]);
const vf = [];
const af = [];
let vPrev = '[0:v]';
let aPrev = '[0:a]';
let t = lens[0];
for (let k = 1; k < scenes.length; k += 1) {
  const off = t - XF;
  vf.push(`${vPrev}[${k}:v]xfade=transition=fade:duration=${XF}:offset=${off.toFixed(3)}[v${k}]`);
  af.push(`${aPrev}[${k}:a]acrossfade=d=${XF}[a${k}]`);
  vPrev = `[v${k}]`;
  aPrev = `[a${k}]`;
  t += lens[k] - XF;
}
const part = `${out}.part.mp4`;
run([...inputs, '-filter_complex', [...vf, ...af].join(';'), '-map', vPrev, '-map', aPrev, ...V, ...A, '-movflags', '+faststart', part]);
fs.renameSync(part, out);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${out}: ${dur(out).toFixed(1)} s (${scenes.length} scenes: ${lens.map((x) => x.toFixed(1)).join(' + ')})`);
