// A short video clip of a race in the kit view (dev/kit-view.html), from a headless browser: for showing a
// new kit part before it goes on a real track. Each segment plays part of the race through the game's
// follow camera (following the leader or one marble) or a fixed camera set beside a spot on the track.
//   node report/clip.mjs <plan.json>
// plan: { slug, race, out: '<file>.mp4', fps, width, height,
//         segments: [{ from, to, camera: 'follow', follow, speed }, { from, to, camera: 'fixed', at, back, beside, up, lookAhead, lookUp, fov, speed }] }
// (ms after GO; `at`: share of the way down the track; the fixed camera `back` metres up the track from it,
// `beside` metres to its side, `up` metres above it, looking `lookAhead` metres on down the track.)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const fps = plan.fps ?? 25;
const server = await createServer({ root: path.resolve(here, '..'), logLevel: 'error', server: { port: 0, strictPort: false } });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'clip-'));
try {
  const page = await browser.newPage({ viewport: { width: plan.width ?? 1280, height: plan.height ?? 720 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[clip]', e.message));
  await page.goto(`http://localhost:${port}/dev/kit-view.html?${new URLSearchParams({ track: plan.slug, race: plan.race })}`);
  await page.waitForFunction(() => window.kitView, null, { timeout: 120_000 });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 800)));
  let n = 0;
  for (const seg of plan.segments) {
    let eye = null;
    if (seg.camera === 'fixed') {
      eye = await page.evaluate((g) => {
        const s = window.kitView.spot(g.at);
        const add = (a, b, k) => a.map((v, i) => v + b[i] * k);
        const base = add(s.pos, s.ahead, -(g.back ?? 0));
        return { from: add(add(base, s.side, g.beside ?? 0), [0, 1, 0], g.up ?? 2), to: add(add(s.pos, s.ahead, g.lookAhead ?? 0), [0, 1, 0], g.lookUp ?? 0) };
      }, seg);
    }
    // (`speed` below 1: slow motion, e.g. 0.5 plays the race at half speed.)
    for (let t = seg.from; t <= seg.to; t += (1000 / fps) * (seg.speed ?? 1)) {
      if (eye) await page.evaluate((x) => window.kitView.raceLook(x), { t, ...eye, fov: seg.fov ?? null });
      else await page.evaluate((x) => window.kitView.raceShot(x), { t, follow: seg.follow ?? 'leader' });
      await page.screenshot({ path: path.join(frames, `f${String(n).padStart(5, '0')}.png`) });
      n += 1;
    }
    console.log(`[clip] segment ${seg.camera} ${seg.from}–${seg.to} ms: ${n} frames so far`);
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(frames, 'f%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart', plan.out]);
  console.log(`[clip] wrote ${plan.out}`);
} finally {
  fs.rmSync(frames, { recursive: true, force: true });
  await browser.close();
  await server.close();
}
