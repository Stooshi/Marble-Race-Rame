// The track picker's pictures (scripts/track-banners.js runs this): each track in the kit view with
// its race, framed by kitView.banner, saved as WebP at 640×360 and 1280×720 (@2x), each kept small.
//   node report/banners.mjs <plan.json>    plan: { out, jobs: [{ slug, race, times, pick }] }
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const planFile = process.argv[2];
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const LIMIT_1X = 40_000;
const LIMIT_2X = 110_000;

/** The best quality that fits under `limit` bytes. */
async function webp(png, width, limit) {
  for (const quality of [88, 82, 76, 70, 64, 58, 52, 46, 40]) {
    const buf = await sharp(png).resize(width, Math.round((width * 9) / 16)).webp({ quality, effort: 6, smartSubsample: true }).toBuffer();
    if (buf.length <= limit || quality === 40) return buf;
  }
  return null;
}

const server = await createServer({ root: path.resolve(here, '..'), logLevel: 'error', server: { port: 0, strictPort: false } });
await server.listen();
const { port } = server.httpServer.address();
const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];
try {
  for (const job of plan.jobs) {
    const started = Date.now();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    try {
      await page.goto(`http://localhost:${port}/dev/kit-view.html?${new URLSearchParams({ track: job.slug, race: job.race, looks: 'all' })}`);
      await page.waitForFunction(() => window.kitView, null, { timeout: 240_000 });
      await page.evaluate(() => window.kitView.ready);
      await page.evaluate(() => new Promise((r) => setTimeout(r, 800))); // (the scenery is built a moment after the track)
      const shot = await page.evaluate((o) => window.kitView.banner(o), { times: job.times, pick: job.pick });
      if (shot.t === undefined) throw new Error(`no pose (${errors.join('; ') || 'no marbles'})`);
      const png = await page.screenshot({ type: 'png' });
      const one = await webp(png, 640, LIMIT_1X);
      const two = await webp(png, 1280, LIMIT_2X);
      fs.writeFileSync(path.join(plan.out, `${job.slug}.webp`), one);
      fs.writeFileSync(path.join(plan.out, `${job.slug}@2x.webp`), two);
      const v = crypto.createHash('sha256').update(one).digest('hex').slice(0, 8);
      results.push({ slug: job.slug, v, bytes: one.length, bytes2x: two.length, t: shot.t, side: shot.side, seen: shot.seen, blocked: shot.blocked, leaderBlocked: shot.leaderBlocked });
      console.log(`  ${job.slug}: ${Math.round(one.length / 1000)} kB + ${Math.round(two.length / 1000)} kB @2x · ${shot.seen} marbles in view${shot.leaderBlocked ? ' · LEADER HIDDEN' : ''} · ${((Date.now() - started) / 1000).toFixed(0)} s`);
    } catch (err) {
      results.push({ slug: job.slug, error: err.message });
      console.log(`  ${job.slug}: FAILED ${err.message}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
fs.writeFileSync(path.join(path.dirname(planFile), 'banners.result.json'), JSON.stringify(results, null, 1));
