// The first seconds of every track, four frames each (computer screen), for comparing starts side by side.
//   node report/starts.mjs <plan.json> [slug,slug]
// plan: [{ slug, race, shots: [{ name, t }] }] (race files in dev/.tracks); frames go next to the plan as <slug>-<name>.jpg.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const planFile = process.argv[2];
const out = path.dirname(planFile);
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const only = process.argv[3] ? process.argv[3].split(',') : null;
const server = await createServer({ root: path.resolve(here, '..'), logLevel: 'error', server: { port: 0, strictPort: false } });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const t of plan) {
    if (only && !only.includes(t.slug)) continue;
    if (t.shots.every((s) => fs.existsSync(path.join(out, `${t.slug}-${s.name}.jpg`)))) continue;
    const page = await browser.newPage({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
    try {
      await page.goto(`http://localhost:${port}/dev/kit-view.html?${new URLSearchParams({ track: t.slug, race: t.race })}`);
      await page.waitForFunction(() => window.kitView, null, { timeout: 120_000 });
      await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));
      for (const s of t.shots) {
        await page.evaluate((x) => window.kitView.raceShot(x), { t: s.t, camera: 'follow' });
        await page.screenshot({ path: path.join(out, `${t.slug}-${s.name}.jpg`), type: 'jpeg', quality: 72 });
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
