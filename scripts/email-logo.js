'use strict';

/**
 * Draws the email header's logo (Moses, 16 Nov 2026): the Marble Spins wordmark (client/src/site/Logo.jsx, Lilita One,
 * the dot of the i the logo marble) in white on the header's navy, as a PNG at twice its shown size, to
 * client/public/email/logo-header.png (served at https://www.marblespins.com/email/logo-header.png; src/email/templates.js).
 * The navy is in the picture itself (a rounded badge, transparent around it): on the header's navy it can't be seen, and
 * when a mail app's dark mode turns the header light, the logo stays a navy badge with white letters, never dark on dark.
 *
 *   node scripts/email-logo.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const FONT = path.join(ROOT, 'client/node_modules/@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2');
const OUT = path.join(ROOT, 'client/public/email/logo-header.png');
const NAVY = '#0e1320'; // (the header's colour in src/email/templates.js)
const WIDTH = 240; // (shown size in the email, px; the PNG is twice this)
const HEIGHT = 48;

const marble = `<svg viewBox="-120 -120 240 240" aria-hidden="true">
  <defs><radialGradient id="g" cx="35%" cy="30%" r="75%"><stop offset="0%" stop-color="#FFFFFF"/><stop offset="28%" stop-color="#FFD21F"/><stop offset="100%" stop-color="#E8580C"/></radialGradient></defs>
  <path d="M 104 0 A 104 104 0 0 1 52 90" fill="none" stroke="#FF7A1A" stroke-width="14" stroke-linecap="round"/>
  <path d="M -104 0 A 104 104 0 0 1 -52 -90" fill="none" stroke="#FFD21F" stroke-width="14" stroke-linecap="round"/>
  <circle cx="0" cy="0" r="80" fill="url(#g)"/>
  <path d="M -64 16 C -34 -46 34 -50 62 -16" fill="none" stroke="#FFFFFF" stroke-opacity="0.9" stroke-width="15" stroke-linecap="round"/>
</svg>`;

const html = `<!doctype html><html><head><style>
@font-face { font-family: 'Lilita One'; src: url(data:font/woff2;base64,${fs.readFileSync(FONT).toString('base64')}) format('woff2'); }
html, body { margin: 0; background: transparent; }
.box { display: inline-flex; align-items: center; height: ${HEIGHT}px; padding: 0 12px; background: ${NAVY}; border-radius: 10px; }
.logo { font-family: 'Lilita One'; font-size: 34px; line-height: 1; color: #f2f4f8; white-space: nowrap; letter-spacing: 0.005em; }
.i { position: relative; display: inline-block; }
.i svg { position: absolute; left: 50%; top: -0.07em; width: 0.5em; height: 0.5em; transform: translateX(-50%); overflow: visible; }
</style></head><body><div class="box"><span class="logo">marblesp<span class="i">ı${marble}</span>ns</span></div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 2 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  // (Cut to the navy badge's own width, so the email can show it at its natural size.)
  const w = Math.ceil(await page.evaluate(() => document.querySelector('.box').getBoundingClientRect().right));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: w, height: HEIGHT }, omitBackground: true });
  await browser.close();
  console.log(`${path.relative(ROOT, OUT)}: ${w * 2}×${HEIGHT * 2} px (show it at ${w}×${HEIGHT})`);
})();
