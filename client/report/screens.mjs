// The track report's screenshots and drawing load, from a headless browser
// (its frame rate means nothing: no real graphics chip). It plays a race in the
// kit view (dev/kit-view.html) through the game's own cameras.
//   node report/screens.mjs <plan.json>
// plan: { slug, race, out, shots: [{ name, t, camera?, phone?, scenery? }], loadEvery }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const SCREENS = { computer: { width: 1280, height: 720 }, phone: { width: 390, height: 844 } };

const server = await createServer({ root: path.resolve(here, '..'), logLevel: 'error', server: { port: 0, strictPort: false } });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];

async function open({ phone = false, scenery = true } = {}) {
  const page = await browser.newPage({ viewport: SCREENS[phone ? 'phone' : 'computer'], deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const q = new URLSearchParams({ track: plan.slug, race: plan.race, ...(phone && { lite: '1' }), ...(!scenery && { scenery: '0' }) });
  await page.goto(`http://localhost:${port}/dev/kit-view.html?${q}`);
  await page.waitForFunction(() => window.kitView, null, { timeout: 120_000 });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 600))); // (the scenery is built a moment after the track)
  return page;
}

const result = { shots: [], load: {}, errors };
try {
  // The fixed screenshots, grouped by screen so each page plays its race once, in time order.
  const groups = new Map();
  for (const s of plan.shots) {
    const key = `${s.phone ? 'phone' : 'computer'}|${s.scenery === false ? 'bare' : 'full'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  for (const [key, shots] of groups) {
    const [screen, look] = key.split('|');
    const page = await open({ phone: screen === 'phone', scenery: look === 'full' });
    for (const s of [...shots].sort((a, b) => a.t - b.t)) {
      const stats = await page.evaluate((x) => window.kitView.raceShot(x), { t: s.t, camera: s.camera ?? 'follow' });
      await page.screenshot({ path: path.join(plan.out, `${s.name}.png`) });
      result.shots.push({ ...s, screen, ...stats });
    }
    await page.close();
  }
  // Drawing load: the follow camera every few seconds through the whole race, phone and computer.
  for (const screen of ['computer', 'phone']) {
    const page = await open({ phone: screen === 'phone' });
    result.load[screen] = await page.evaluate((every) => window.kitView.raceLoad({ every }), plan.loadEvery ?? 2000);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
fs.writeFileSync(path.join(plan.out, 'screens.json'), JSON.stringify(result, null, 1));
