// The first seconds of every track, four frames each (computer screen), for comparing starts side by side.
//   node report/starts.mjs <plan.json> [slug,slug | -] [bare | looks]   (bare: ?scenery=0; looks: the on-screen check's
//   grey frames instead, into looks.json next to the plan, for scripts/start-looks.js)
// plan: [{ slug, race, shots: [{ name, t }] }] (race files in dev/.tracks); frames go next to the plan as <slug>-<name>.jpg.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { grabStartLook } from './startLook.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const planFile = process.argv[2];
const out = path.dirname(planFile);
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const only = process.argv[3] && process.argv[3] !== '-' ? process.argv[3].split(',') : null;
const bare = process.argv[4] === 'bare'; // ?scenery=0: the track, gate, structures and marbles only
const tag = bare ? '-bare' : '';
const server = await createServer({ root: path.resolve(here, '..'), logLevel: 'error', server: { port: 0, strictPort: false } });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const looks = process.argv[4] === 'looks';
const looksFile = path.join(out, 'looks.json');
const grabbed = looks && fs.existsSync(looksFile) ? JSON.parse(fs.readFileSync(looksFile, 'utf8')) : {};
try {
  for (const t of plan) {
    if (looks) {
      if ((only && !only.includes(t.slug)) || grabbed[t.slug]) continue;
      try {
        grabbed[t.slug] = await grabStartLook(browser, port, t, t.shots.map((s) => s.t));
        fs.writeFileSync(looksFile, JSON.stringify(grabbed));
        console.log('ok', t.slug);
      } catch (e) {
        console.log('fail', t.slug, e.message.slice(0, 200));
      }
      continue;
    }
    if (only && !only.includes(t.slug)) continue;
    if (t.shots.every((s) => fs.existsSync(path.join(out, `${t.slug}-${s.name}${tag}.jpg`)))) continue;
    const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
    try {
      await page.goto(`http://localhost:${port}/dev/kit-view.html?${new URLSearchParams({ track: t.slug, race: t.race, ...(bare && { scenery: '0' }) })}`);
      await page.waitForFunction(() => window.kitView, null, { timeout: 120_000 });
      await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));
      for (const s of t.shots) {
        await page.evaluate((x) => window.kitView.raceShot(x), { t: s.t, camera: 'follow' });
        await page.screenshot({ path: path.join(out, `${t.slug}-${s.name}${tag}.jpg`), type: 'jpeg', quality: 72 });
      }
      console.log('ok', t.slug);
    } catch (e) {
      console.log('fail', t.slug, e.message.slice(0, 200));
    }
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
