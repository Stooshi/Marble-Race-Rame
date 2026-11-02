// Dev (loop prototype): stills of the loop test track's race. node report/loopShots.mjs <out dir> <json shots>
// shots: [{ name, t, camera: 'follow'|'overview'|'side', phone }]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
const shots = JSON.parse(process.argv[3]);
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root: path.resolve(here, '..'), logLevel: 'error', server: { port: 0, strictPort: false } });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
try {
  for (const phone of [false, true]) {
    const mine = shots.filter((s) => Boolean(s.phone) === phone);
    if (!mine.length) continue;
    const page = await browser.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const q = new URLSearchParams({ track: 'variety-layout-loop-run', race: 'variety-layout-loop-run.loop-race', ...(phone && { lite: '1' }) });
    await page.goto(`http://localhost:${port}/dev/kit-view.html?${q}`);
    await page.waitForFunction(() => window.kitView, null, { timeout: 120_000 });
    await page.evaluate(() => new Promise((r) => setTimeout(r, 800)));
    for (const s of mine) {
      let stats;
      if (s.camera === 'side' || s.camera === 'look') {
        stats = await page.evaluate((x) => window.kitView.raceLook({ t: x.t, from: x.from, to: x.to, fov: x.fov ?? null }), s);
      } else {
        stats = await page.evaluate((x) => window.kitView.raceShot({ t: x.t, camera: x.camera ?? 'follow' }), s);
      }
      await page.screenshot({ path: path.join(out, `${s.name}.png`) });
      console.log(s.name, JSON.stringify(stats));
    }
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
