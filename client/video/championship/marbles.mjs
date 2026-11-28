// The championship's marble pictures (Moses, 28 Nov 2026): each racer's look as the shop paints it
// (badge.js lookOf, paint.js rasterize, the game's shine GLOSS_LAYERS on top), a PNG with transparency.
//   node video/championship/marbles.mjs <out dir>  → <out dir>/<look>.png for every look in racers.json
// Looks only: nothing here touches a race.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const N = 360;
const out = path.resolve(process.argv[2]);
fs.mkdirSync(out, { recursive: true });
const { looks } = JSON.parse(fs.readFileSync(path.join(here, 'racers.json'), 'utf8'));
const server = await createServer({ root: path.resolve(here, '..', '..'), logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
const paint = await server.ssrLoadModule('/src/shared/marbles/paint.js');
const badge = await server.ssrLoadModule('/src/shared/marbles/badge.js');
const over = (under, top) => {
  for (let k = 0; k < under.length; k += 4) {
    const a = top[k + 3] / 255;
    if (a <= 0) continue;
    const b = under[k + 3] / 255;
    const oa = a + b * (1 - a);
    for (let i = 0; i < 3; i += 1) under[k + i] = Math.round((top[k + i] * a + under[k + i] * b * (1 - a)) / oa);
    under[k + 3] = Math.round(oa * 255);
  }
};
const gloss = paint.toBytes(paint.rasterize(badge.GLOSS_LAYERS, N, { ss: 2 }));
for (const slug of looks) {
  const look = badge.lookOf(slug);
  if (!look) throw new Error(`no look ${slug}`);
  const px = paint.toBytes(paint.rasterize(look.layers, N, { ss: 2 }));
  over(px, gloss);
  // (Round: the picture's layers fill a square; the ball is the circle inside it, its edge smoothed.)
  for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) {
    const d = Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2) - (N / 2 - 1.5);
    const k = Math.max(0, Math.min(1, 0.5 - d));
    px[(y * N + x) * 4 + 3] = Math.round(px[(y * N + x) * 4 + 3] * k);
  }
  await sharp(Buffer.from(px), { raw: { width: N, height: N, channels: 4 } }).png().toFile(path.join(out, `${slug}.png`));
}
await server.close();
console.log(`${looks.length} marbles in ${out}`);
