// The video recorder (client/video/README.md): draws a race frame by frame in a headless browser
// through the recorder page (recorder.html: the game's own drawing and cameras), adds the texts,
// the podium, the logo and the end card, mixes the game's music and race sounds under it and writes
// an MP4 at 60 fps.
//   node video/record.mjs <slug> <race> --kind production|cutdown [--format wide|tall] [--tune 7]
//                         [--logo A] [--out <file.mp4>] [--from <s> --to <s>] (a part only, for checks)
// <race>: a race file written by scripts/video-race.js (client/dev/.tracks/<race>.json).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { TEMPLATE, TEXTS, SOUNDS, LANDS } from './assets.mjs';
import * as PLANS from './plans.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const FPS = 60;
const SIZES = { wide: [1920, 1080], tall: [1080, 1920] };
const TUNE_SECONDS = { 1: 71.316542, 3: 43.139458, 4: 37.716083, 5: 30.733125, 6: 50.521917, 7: 48.228708, 8: 27.382583, 9: 27.513625, 10: 54.095521, 11: 53.579333, 12: 32.22, 13: 28.548729, 14: 28.138437 };
const BEEPS_GO_S = 3.023;
const log = (...m) => console.log('[record]', ...m);

/** The line of text at video second v and its opacity (the template's fades). */
function textAt(texts, v) {
  const { fadeInSeconds: fin, fadeOutSeconds: fout } = TEMPLATE.text;
  for (const x of texts) {
    const u = v - x.at;
    if (u < 0 || u > x.dur) continue;
    const k = Math.min(1, u / fin, (x.dur - u) / fout);
    return { top: x.top, opacity: k * k * (3 - 2 * k) };
  }
  return null;
}

/** The sound under the video: the game's own files, placed in video time, mixed and levelled. */
export function mix(plan, length, { tune }, file) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mix-'));
  try {
    // The tune, cut to its exact loop length (as the game loops it), so it repeats with no gap.
    const loop = path.join(tmp, 'tune.wav');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', SOUNDS.tune(tune).file, '-t', String(TUNE_SECONDS[tune]), '-ar', '48000', '-ac', '2', loop]);
    const inputs = [];
    const parts = [];
    const add = (src, { at, dur = null, offset = 0, gain = 1, fadeIn = 0, fadeOut = 0, loop: looped = false, lift = null }) => {
      const k = parts.length;
      inputs.push(...(looped ? ['-stream_loop', '-1'] : []), '-i', src);
      const span = dur ?? 3600;
      let f = `[${k}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=${offset}:${offset + span},asetpts=PTS-STARTPTS`;
      if (fadeIn) f += `,afade=t=in:st=0:d=${fadeIn}`;
      if (fadeOut && dur) f += `,afade=t=out:st=${Math.max(0, dur - fadeOut)}:d=${fadeOut}`;
      f += `,volume=${gain},adelay=${Math.round(at * 1000)}:all=1`;
      // (Lifted at the big moments: t here is video time, after the delay.)
      if (lift) f += `,volume='if(${lift.expr},${lift.k.toFixed(4)},1)':eval=frame`;
      f += `[s${k}]`;
      parts.push(f);
    };
    const s = plan.sound;
    const T = TEMPLATE.sound;
    // The music, lifted a little (the template's liftDb) at the big moments.
    const lift = 10 ** (T.liftDb / 20);
    const lifted = (s.lifts ?? []).map(([a, b]) => `between(t,${a.toFixed(2)},${b.toFixed(2)})`).join('+');
    for (const [a, b] of s.music ?? []) add(loop, { at: a, dur: b - a, gain: T.musicGain, fadeIn: 0.8, fadeOut: 1.2, loop: true, lift: lifted ? { expr: lifted, k: lift } : null });
    if (s.teaserMusic) add(loop, { at: s.teaserMusic[0], dur: s.teaserMusic[1] - s.teaserMusic[0], offset: 8, gain: T.musicGain * lift, fadeOut: 0.35, loop: true });
    if (s.beeps && s.goAt !== null) add(SOUNDS.beeps.file, { at: s.goAt - BEEPS_GO_S, dur: BEEPS_GO_S + 0.9, gain: 0.9, fadeOut: 0.15 });
    if (s.goAt !== null && s.goAt !== undefined) add(SOUNDS.launch.file, { at: s.goAt, dur: 5, gain: 1.6 });
    if (s.ceremony) add(SOUNDS.ceremony.file, { at: s.ceremony[0], dur: s.ceremony[1] - s.ceremony[0], gain: 0.55, fadeIn: 0.4, fadeOut: 1.5 });
    // The signature sound: intro A's whoosh as the mark lands, on the intro and on every end card.
    for (const sh of plan.shots.filter((x) => x.type === 'logo' || x.type === 'end')) {
      const peak = LANDS[sh.type === 'logo' ? sh.version : TEMPLATE.intro.logo] ?? 1;
      add(SOUNDS.whoosh.file, { at: sh.at + Math.max(0, peak - SOUNDS.whoosh.peak), offset: Math.max(0, SOUNDS.whoosh.peak - peak), dur: 2.2, gain: SOUNDS.whoosh.gain, fadeOut: 0.5 });
    }
    const n = parts.length;
    const graph = `${parts.join(';')};${Array.from({ length: n }, (_, k) => `[s${k}]`).join('')}amix=inputs=${n}:normalize=0:duration=longest,atrim=0:${length},apad=whole_dur=${length},loudnorm=I=${TEMPLATE.sound.loudnessLufs}:TP=-1.5:LRA=11[out]`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', file]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export async function record({ slug, race: raceName, kind = 'production', format = 'wide', tune = 7, logo = TEMPLATE.intro.logo, out, from = null, to = null, fly = null, stills = null, clip = null, at = null }) {
  fly ??= kind === 'clip' ? 12 : 15; // (seconds: the flyover's length)
  const [W, H] = SIZES[format];
  const race = JSON.parse(fs.readFileSync(path.join(here, '..', 'dev', '.tracks', `${raceName}.json`), 'utf8'));
  const server = await createServer({ root: path.resolve(here, '..'), logLevel: 'error', server: { port: 0, strictPort: false } });
  await server.listen();
  const { port } = server.httpServer.address();
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const silent = path.join(os.tmpdir(), `rec-${process.pid}-video.mp4`);
  const audio = path.join(os.tmpdir(), `rec-${process.pid}-audio.wav`);
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => log('page error:', e.message));
    page.on('crash', () => { log('the page crashed'); process.exit(2); });
    await page.goto(`http://localhost:${port}/video/recorder.html?${new URLSearchParams({ track: slug, race: raceName, fly: String(fly * 1000) })}`);
    await page.waitForFunction(() => window.rec, null, { timeout: 300_000 });
    await page.evaluate(() => window.rec.ready);
    const info = await page.evaluate(() => window.rec.info());
    const plan = PLANS[kind](info, race, { logo, fly, clip, at });
    // (The plan beside the video: swap-logo.mjs uses it to put another logo version in.)
    fs.writeFileSync(`${out}.plan.json`, JSON.stringify({ slug, race: raceName, kind, format, tune, logo, length: plan.length, shots: plan.shots, sound: plan.sound }));
    log(`${info.name}: ${kind} ${format}, ${plan.length.toFixed(1)} s, ${plan.shots.length} shots; winner ${info.podium[0].name} by ${info.margin} ms`);
    for (const sh of plan.shots) log(`  ${sh.at.toFixed(1).padStart(6)} s  ${sh.type.padEnd(4)} ${sh.from !== undefined ? `race ${Math.round(sh.from)} ms` : ''} ${sh.speed && sh.speed !== 1 ? `×${sh.speed}` : ''} ${sh.dur.toFixed(1)} s`);
    // The rows on the podium card.
    await page.evaluate(([title]) => { document.getElementById('podiumTitle').textContent = title; }, [TEXTS.podiumTitle]);
    const rows = info.podium.map((r) => ({ name: r.name, look: r.look, ms: r.ms }));
    // The logo and end card from their own page, the same size.
    const card = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const cardFor = async (q) => { await card.goto(`file://${path.join(here, 'logo.html')}?${new URLSearchParams(q)}`); await card.evaluate(() => window.ready); };

    const enc = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), silent], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((resolve, reject) => enc.on('close', (c) => (c ? reject(new Error(`ffmpeg ${c}`)) : resolve())));
    const write = (buf) => new Promise((resolve) => { if (enc.stdin.write(buf)) resolve(); else enc.stdin.once('drain', resolve); });
    const v0 = from ?? 0;
    const v1 = Math.min(to ?? plan.length, plan.length);
    let frames = 0;
    const started = Date.now();
    let cardKey = null;
    // --stills: only these video seconds, each as a JPEG (for checking the picture), no MP4.
    const list = stills ? stills.map((x) => Math.round(x * FPS)) : null;
    const first = Math.round(v0 * FPS);
    for (let i = list ? list[0] : first; list ? i !== undefined : i < Math.round(v1 * FPS); i = list ? list[list.indexOf(i) + 1] : i + 1) {
      const v = i / FPS;
      const sh = plan.shots.find((x) => v >= x.at && v < x.at + x.dur) ?? plan.shots[plan.shots.length - 1];
      const u = v - sh.at;
      let shot;
      if (sh.type === 'logo' || sh.type === 'end') {
        const key = sh.type === 'logo' ? `logo-${sh.version}` : 'end';
        if (cardKey !== key) {
          await cardFor(sh.type === 'logo' ? { v: sh.version } : { v: TEMPLATE.intro.logo, end: '1', l1: TEXTS.endCard[0], l2: TEXTS.endCard[1] });
          cardKey = key;
        }
        await card.evaluate((t) => window.logoAt(t), Math.min(u, 1.99));
        shot = await card.screenshot({ type: 'jpeg', quality: 92 });
      } else {
        const t = sh.type === 'fly' ? (u / sh.dur) * fly * 1000 : sh.from + u * 1000 * (sh.speed ?? 1);
        const step = (1000 / FPS) * (sh.speed ?? 1);
        const pod = plan.podium && v >= plan.podium.at ? Math.min(1, (v - plan.podium.at) / 0.5) * Math.min(1, Math.max(0, (plan.podium.at + plan.podium.dur - v) / 0.4)) : 0;
        await page.evaluate(([s, t, step, text, pod, rows]) => {
          const r = window.rec;
          r.text(text ?? { opacity: 0 });
          r.podium(pod, rows);
          if (s.type === 'fly') r.flyover(t);
          else if (s.type === 'race') r.race(t, { step });
          else {
            const eye = s.eye.from ? s.eye : r.eye(s.eye);
            if (s.type === 'look') r.look(t, eye);
            else r.pan(t, { from: eye.from, follow: s.follow, fov: s.fov ?? eye.fov ?? 32 });
          }
        }, [{ type: sh.type, eye: sh.eye, follow: sh.follow, fov: sh.fov }, t, step, textAt(plan.texts, v), pod, rows]);
        shot = await page.screenshot({ type: 'jpeg', quality: 92 });
      }
      if (list) { fs.writeFileSync(`${out.replace(/\.mp4$/, '')}-${v.toFixed(2)}.jpg`, shot); frames += 1; continue; }
      await write(shot);
      frames += 1;
      if (frames % 600 === 0) log(`  ${(v).toFixed(1)} s of ${v1.toFixed(1)} (${((Date.now() - started) / frames).toFixed(0)} ms a frame)`);
    }
    if (list) { enc.kill(); done.catch(() => {}); return { plan, info }; }
    enc.stdin.end();
    await done;
    // The sound, then both together.
    mix(plan, plan.length, { tune }, audio);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-ss', String(v0), '-t', String(v1 - v0), '-i', audio,
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out]);
    log(`wrote ${out}: ${(v1 - v0).toFixed(1)} s, ${frames} frames in ${((Date.now() - started) / 60000).toFixed(1)} min`);
    return { out, plan, info };
  } finally {
    for (const f of [silent, audio]) fs.rmSync(f, { force: true });
    await Promise.race([Promise.all([browser.close(), server.close()]), new Promise((r) => setTimeout(r, 10_000))]);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const [slug, race] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
  const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
  const num = (n) => (opt(n, null) === null ? null : Number(opt(n)));
  await record({
    slug, race, kind: opt('kind', 'production'), format: opt('format', 'wide'), tune: Number(opt('tune', 7)), logo: opt('logo', TEMPLATE.intro.logo),
    clip: opt('clip', null), at: num('at'), fly: num('fly'),
    out: opt('out', path.join(process.cwd(), `${slug}-${opt('kind', 'production')}-${opt('format', 'wide')}.mp4`)), from: num('from'), to: num('to'), stills: opt('stills', null)?.split(',').map(Number) ?? null,
  });
  process.exit(0); // (the browser and the dev server can keep the process waiting after closing)
}
