// Dev helper: one camera shot of a track spot in the kit view (no race).
//   node report/spot.mjs <slug> <out.png> <p> [back=10] [up=4] [side=0] [phone]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const [slug, out, p, back = '10', up = '4', side = '0', screen = ''] = process.argv.slice(2);
const phone = screen === 'phone';
const server = await createServer({ root: path.resolve(here, '..'), logLevel: 'error', server: { port: 0, strictPort: false } });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: phone ? { width: 390, height: 700 } : { width: 960, height: 540 }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${port}/dev/kit-view.html?track=${slug}${phone ? '&lite=1' : ''}`);
  await page.waitForFunction(() => window.kitView, null, { timeout: 180_000 });
  await page.evaluate(() => window.kitView.ready);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 800)));
  await page.evaluate((o) => window.kitView.shot(o), { at: Number(p), back: Number(back), up: Number(up), side: Number(side) });
  await page.screenshot({ path: out });
} finally {
  await browser.close();
  await server.close();
}
