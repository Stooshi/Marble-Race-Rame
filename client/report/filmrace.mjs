// Dev helper: the follow camera every `every` ms through a race in the kit view, one screenshot each.
//   node report/filmrace.mjs <slug> <race> <outDir> [every=1000] [from=0] [to=end] [phone]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const [slug, race, out, every = '1000', from = '0', to = '', phone = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const server = await createServer({ root: path.resolve(here, '..'), logLevel: 'error', server: { port: 0, strictPort: false } });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 960, height: 540 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(`http://localhost:${port}/dev/kit-view.html?${new URLSearchParams({ track: slug, race, ...(phone && { lite: '1' }) })}`);
  await page.waitForFunction(() => window.kitView, null, { timeout: 180_000 });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 800)));
  const end = to ? Number(to) : await page.evaluate(() => window.kitView.race.winnerMs);
  for (let t = Number(from); t <= end; t += Number(every)) {
    await page.evaluate((x) => window.kitView.raceShot({ t: x }), t);
    await page.screenshot({ path: path.join(out, `${String(t).padStart(6, '0')}.png`) });
  }
} finally {
  await browser.close();
  await server.close();
}
