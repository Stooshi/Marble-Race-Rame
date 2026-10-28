// The logo sting (logo.html) as an MP4 with its sound: 2 s at 60 fps.
//   node video/render-logo.mjs <A|B|C> <out.mp4> [--tall] [--seconds 2] [--end] [--hold 0]
// --end: the end card (the logo and template.json's end card lines); --hold: seconds held on the last frame.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { TEXTS, SOUNDS } from './assets.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const [v, out] = args;
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => (args.includes(`--${n}`) ? Number(args[args.indexOf(`--${n}`) + 1]) : d);
const tall = flag('tall');
const end = flag('end');
const seconds = opt('seconds', 2);
const hold = opt('hold', 0);
const FPS = 60;
const [W, H] = tall ? [1080, 1920] : [1920, 1080];

export async function renderLogo({ version, file, tall: isTall = false, endCard = false, secs = 2, holdS = 0 }) {
  const [w, h] = isTall ? [1080, 1920] : [1920, 1080];
  const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'logo-'));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const q = new URLSearchParams({ v: version, ...(endCard && { end: '1', l1: TEXTS.endCard[0], l2: TEXTS.endCard[1] }) });
    await page.goto(`file://${path.join(here, 'logo.html')}?${q}`);
    await page.evaluate(() => window.ready);
    const n = Math.round(secs * FPS);
    for (let i = 0; i < n; i += 1) {
      await page.evaluate((t) => window.logoAt(t), i / FPS);
      await page.screenshot({ path: path.join(frames, `f${String(i).padStart(5, '0')}.png`) });
    }
    const total = secs + holdS;
    // The sound: the whoosh (its peak 1.2 s in) peaking as the mark lands.
    const peak = { A: 0.85, B: 1.3, C: 0.45 }[version] ?? 1;
    const delay = Math.max(0, peak - SOUNDS.whoosh.peak);
    const skip = Math.max(0, SOUNDS.whoosh.peak - peak);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
      '-framerate', String(FPS), '-i', path.join(frames, 'f%05d.png'),
      '-ss', String(skip), '-i', SOUNDS.whoosh.file,
      '-filter_complex', `[0:v]tpad=stop_mode=clone:stop_duration=${holdS}[v];[1:a]atrim=0:${total},adelay=${Math.round(delay * 1000)}:all=1,volume=${SOUNDS.whoosh.gain},afade=t=out:st=${Math.max(0, total - 0.5)}:d=0.5,apad,atrim=0:${total}[a]`,
      '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', file]);
  } finally {
    await browser.close();
    fs.rmSync(frames, { recursive: true, force: true });
  }
  return file;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await renderLogo({ version: v.toUpperCase(), file: out, tall, endCard: end, secs: seconds, holdS: hold });
  console.log(`[logo] wrote ${out} (${W}×${H})`);
}
