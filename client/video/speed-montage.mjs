// A speed montage (Moses, 8 Nov 2026; DAILY-ORDER.md "Speed montage"): 15–20 s of fast cuts, one shot each from at
// least six tracks (waterfall free falls, plunges, speed pads, loops, steep drops, the fastest straights), each a
// low, close chase (plans.mjs speedShot), cut together under one stretch of the game's race music with the game's
// speed-pad whoosh on the speed pads and loops. The same vertical file for TikTok, the Instagram Reel and the YouTube Short.
//
//   node video/speed-montage.mjs <shots.json> --tune 11 --out ~/videos/speed-montage.mp4
//
// shots.json: [{ "slug", "race" (a race file in dev/.tracks, from scripts/video-pick.js --feature <section>),
//   "dur" (s), "line"? (a big line on this shot), "padP"? (the speed pad's place on the track, 0–1: the whoosh as the group's first marble rolls onto it), "end"? ("l1|l2|l3":
//   the last shot, held frozen under the end card) }, …]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { record, mix } from './record.mjs';
import { TEMPLATE } from './assets.mjs';
import { reaches } from './director.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const T = TEMPLATE.speedMontage;

/** Checks the montage's list before anything is recorded: tracks, shot lengths, the total, the end card. */
export function checkMontage(shots) {
  const tracks = new Set(shots.map((s) => s.slug));
  if (tracks.size < T.minTracks) throw new Error(`A speed montage needs at least ${T.minTracks} different tracks, not ${tracks.size}`);
  if (![...tracks].some((s) => s.includes('grand-prix'))) throw new Error('A speed montage includes a Grand Prix track');
  if (shots.some((s) => /champion-shooter/.test(s.slug))) throw new Error('Never Champion Shooter');
  for (const s of shots) if (!(s.dur >= T.minShot && s.dur <= T.maxShot)) throw new Error(`${s.slug}: a shot lasts ${T.minShot}–${T.maxShot} s, not ${s.dur}`);
  if (!shots[shots.length - 1].end || shots.slice(0, -1).some((s) => s.end)) throw new Error('Only the last shot carries the end card');
  const length = shots.reduce((a, s) => a + s.dur, 0) + TEMPLATE.endCard.hold.seconds;
  if (length < T.minSeconds - 1e-9 || length > T.maxSeconds + 1e-9) throw new Error(`A speed montage lasts ${T.minSeconds}–${T.maxSeconds} s with its end card, not ${length.toFixed(1)}`);
  return length;
}

export async function speedMontage({ shots, tune = 11, out }) {
  const length = checkMontage(shots);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'montage-'));
  try {
    const clips = [];
    const whooshAt = [];
    let v = 0;
    for (const [k, s] of shots.entries()) {
      const file = path.join(tmp, `shot-${k}.mp4`);
      const { plan } = await record({ slug: s.slug, race: s.race, kind: 'speedShot', format: 'tall', tune, out: file, text: { line: s.line ?? null, end: s.end ?? null, dur: s.dur, lead: s.lead ?? null } });
      clips.push({ file, length: plan.length, ...s, section: plan.marks.section });
      if (s.padP !== undefined) {
        // (The whoosh as the group's first marble rolls onto the pad, in this shot's time.)
        const race = JSON.parse(fs.readFileSync(path.join(here, '..', 'dev', '.tracks', `${s.race}.json`), 'utf8'));
        const t = reaches(race, plan.marks.members[0], s.padP);
        const inShot = t === null ? Math.min(0.4, s.dur / 3) : (t - plan.marks.from) / 1000;
        if (inShot >= -0.2 && inShot < s.dur) whooshAt.push(v + Math.max(0, inShot - 0.1));
        else throw new Error(`${s.slug}: the speed pad at ${s.padP} is not in the shot (${inShot.toFixed(2)} s)`);
      }
      v += plan.length;
    }
    // The pictures cut together (each clip's own sound dropped), then one stretch of music under all of it.
    const list = path.join(tmp, 'list.txt');
    fs.writeFileSync(list, clips.map((c) => `file '${c.file}'`).join('\n'));
    const silent = path.join(tmp, 'silent.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', silent]);
    const audio = path.join(tmp, 'audio.wav');
    const total = clips.reduce((a, c) => a + c.length, 0);
    const endAt = total - TEMPLATE.endCard.hold.seconds;
    mix({ shots: [], sound: { goAt: null, beeps: false, music: [[0, total]], lifts: [[0, endAt]], ceremony: null, loop: false,
      extra: whooshAt.map((at) => ({ key: 'speedPad', at, gain: T.whooshGain, dur: 1.6 })) } }, total, { tune }, audio);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
    const report = { out, length: total, planned: length, tune, shots: clips.map(({ file, ...c }) => c), whooshAt };
    fs.writeFileSync(`${out}.plan.json`, JSON.stringify(report, null, 2));
    return report;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
  const shots = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const r = await speedMontage({ shots, tune: Number(opt('tune', 11)), out: opt('out', path.join(process.cwd(), 'speed-montage.mp4')) });
  console.log(`wrote ${r.out}: ${r.length.toFixed(1)} s, ${r.shots.length} shots from ${new Set(r.shots.map((s) => s.slug)).size} tracks`);
  process.exit(0);
}
