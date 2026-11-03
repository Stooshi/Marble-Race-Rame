// Dev: a set of looks at a track in the kit view (no race), for checking its scenery by eye.
//   node report/rivieraShots.mjs <slug> <outDir> [phone]
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const [slug, outDir, screen = ''] = process.argv.slice(2);
const phone = screen === 'phone';
fs.mkdirSync(outDir, { recursive: true });
const server = await createServer({ root: path.resolve(here, '..'), logLevel: 'error', server: { port: 0, strictPort: false } });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: phone ? { width: 390, height: 700 } : { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto(`http://localhost:${port}/dev/kit-view.html?track=${slug}${phone ? '&lite=1' : ''}`);
  await page.waitForFunction(() => window.kitView, null, { timeout: 240_000 });
  await page.evaluate(() => window.kitView.ready);
  await page.evaluate(() => new Promise((r) => setTimeout(r, 1000)));
  const looks = JSON.parse(process.env.LOOKS || '[]');
  for (const [name, o] of looks) {
    if (o.look) {
      // { look: { p, back, side, up, aheadP } }: from a spot `back` m behind and `side` m beside at `up`, looking at spot aheadP.
      const r = await page.evaluate(({ p, back = 0, side = 0, up = 30, aheadP = p }) => {
        const a = window.kitView.spot(p); const b = window.kitView.spot(aheadP);
        const from = [a.pos[0] - a.ahead[0] * back + a.side[0] * side, a.pos[1] + up, a.pos[2] - a.ahead[2] * back + a.side[2] * side];
        window.kitView.look({ from, to: b.pos });
        return { from, to: b.pos };
      }, o.look);
      console.log(name, JSON.stringify(r));
    } else {
      await page.evaluate((s) => window.kitView.shot(s), o);
    }
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
  }
} finally {
  await browser.close();
  await server.close();
}
