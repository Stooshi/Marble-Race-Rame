// Dev only (never committed): the rooms' start show. node report/_roomshot.mjs <root> <dist> <out> <w> <h>
import { preview } from 'vite';
import { chromium } from 'playwright-core';
const [root, dist, out, w, h] = process.argv.slice(2);
const API = 'http://localhost:5055';
const server = await preview({ root, logLevel: 'error', preview: { port: 4317, strictPort: true }, build: { outDir: dist } });
const call = async (p, { method = 'GET', body, token } = {}) => (await fetch(API + '/api' + p, { method, headers: { 'content-type': 'application/json', ...(token && { authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) })).json();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const guest = await call('/auth/guest', { method: 'POST', body: {} });
  const mobile = Number(w) < 600;
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, isMobile: mobile, hasTouch: mobile });
  const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[pool]')) errs.push(m.text()); });
  await page.addInitScript((t) => { localStorage.setItem('marble-race-token', t); localStorage.setItem('ms-consent', JSON.stringify({ v: 1, analytics: false, ads: false })); }, guest.token);
  const q = await call('/rooms/quick', { method: 'POST', token: guest.token });
  await page.goto(`http://localhost:4317/r/${q.room.code}`, { waitUntil: 'domcontentloaded' });
  const btn = page.getByRole('button', { name: 'START NOW' });
  try { await btn.waitFor({ timeout: 15000 }); } catch (e) { await page.screenshot({ path: `${out}/room-fail.png` }); console.log((await page.innerText('body')).slice(0, 1500)); console.log(errs.join('\n')); throw e; }
  await page.screenshot({ path: `${out}/room-${w}-wait.png` });
  await page.waitForTimeout(4000); // (the scene builds meanwhile)
  const t0 = Date.now();
  console.log('click', Date.now() % 100000); await btn.click();
  for (let k = 0; k < 30; k += 1) {
    await page.waitForTimeout(250);
    const info = await page.evaluate(() => [location.pathname, ...[...document.querySelectorAll('.startshow__card,.startshow__fly,.startshow__gate,.replay3d__countdown,.replay3d__standings,.preview3d__canvas')].map((e) => e.className.split(' ')[0] + ':' + (e.tagName === 'CANVAS' ? (e.style.display || 'shown') : (e.textContent || '').slice(0, 20)))].join(' | '));
    console.log(((Date.now() - t0) / 1000).toFixed(1), info);
    await page.screenshot({ path: `${out}/room-${w}-${String(k).padStart(2, '0')}.png` });
  }
  console.log(errs.slice(0, 8).join('\n'));
} finally { await browser.close(); await server.close(); }
