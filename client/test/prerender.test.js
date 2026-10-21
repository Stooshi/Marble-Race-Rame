// The pre-rendered pages (scripts/prerender.mjs) may hide only their own copy, never the app that
// replaces it: hiding "#root > *" left logged-in players with a blank page (16 Oct 2026).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const script = readFileSync(join(__dirname, '..', 'scripts', 'prerender.mjs'), 'utf8');
const main = readFileSync(join(__dirname, '..', 'src', 'main.jsx'), 'utf8');

it('hides only the pre-rendered copy, and the app removes any copy left', () => {
  expect(script).toMatch(/\[data-ms-prerender\]\{display:none!important\}/);
  expect(script).not.toMatch(/#root\s*>\s*\*/);
  expect(script).toMatch(/<div data-ms-prerender style="display:contents">\$\{html\}<\/div>/);
  expect(main).toMatch(/\[data-ms-prerender\]/);
  expect(main).toMatch(/removeAttribute\('data-ms-shell'\)/);
});

it('page text is inserted with a function, so a "$" in a page is never a replacement pattern', () => {
  expect(script).toMatch(/\.replace\('<div id="root"><\/div>', \(\) =>/);
  expect(script).toMatch(/\.replace\('<\/head>', \(\) =>/);
});

it("the site's own addresses get the app (vercel.json), any other a real 404: with clean URLs the target has no \".html\"", () => {
  // cleanUrls serves app-shell.html at /app-shell; a rewrite to "/app-shell.html" found no file and
  // every in-game address (/race, /play, /preview, /admin…) answered 404 NOT_FOUND (16 Oct 2026).
  const vercel = JSON.parse(readFileSync(join(__dirname, '..', 'vercel.json'), 'utf8'));
  expect(vercel.rewrites.length).toBeGreaterThan(0);
  for (const r of vercel.rewrites) {
    if (vercel.cleanUrls) expect(r.destination).not.toMatch(/\.html$/);
    expect(r.destination.replace(/^\//, '').replace(/(\.html)?$/, '.html')).toBe('app-shell.html');
  }
  expect(script).toMatch(/app-shell\.html/);
  // Every route's first part (App.jsx) is rewritten to the app, or that page would answer 404 (item 15).
  const app = readFileSync(join(__dirname, '..', 'src', 'App.jsx'), 'utf8');
  const firsts = new Set([...app.matchAll(/path="\/([^/":*]+)/g)].map((m) => m[1]));
  firsts.add('admin');
  // (The marbles hub is the exception: every one of its pages is a pre-rendered file, served as it is,
  // and any other /marbles address must be a real 404. While it is off there is no file at all.)
  firsts.delete('marbles');
  expect(vercel.rewrites.some((r) => r.source.includes('marbles'))).toBe(false);
  const covered = (seg) => vercel.rewrites.some((r) => new RegExp(`^${r.source.replace(/:rest\*$/, '.*').replace(/\/\(/g, '/(?:')}$`).test(`/${seg}`) || new RegExp(`^${r.source.replace(/:rest\*$/, '.*').replace(/\/\(/g, '/(?:')}$`).test(`/${seg}/x`));
  for (const seg of firsts) expect(covered(seg), `/${seg}`).toBe(true);
  // Anything else: Vercel serves dist/404.html with HTTP 404 (a real 404, not a "soft" one), noindex.
  expect(script).toMatch(/join\(dist, '404\.html'\)/);
  expect(script).toMatch(/noindex: true/);
});

it('every page links the tab and home-screen icons (they come from index.html)', async () => {
  const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
  for (const href of ['/favicon.ico', '/favicon.svg', '/apple-touch-icon.png', '/site.webmanifest']) expect(html).toContain(`href="${href}"`);
  expect(html).toMatch(/<meta name="theme-color" content="#0E1320" \/>/);
  const manifest = JSON.parse(readFileSync(join(__dirname, '..', 'public', 'site.webmanifest'), 'utf8'));
  expect(manifest.theme_color).toBe('#0E1320');
  expect(manifest.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  for (const f of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
    expect(readFileSync(join(__dirname, '..', 'public', f)).length, f).toBeGreaterThan(300);
  }
  // PNG sizes from their headers
  const size = (f) => { const b = readFileSync(join(__dirname, '..', 'public', f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  expect(size('apple-touch-icon.png')).toEqual([180, 180]);
  expect(size('icon-192.png')).toEqual([192, 192]);
  expect(size('icon-512.png')).toEqual([512, 512]);
  // favicon.ico holds 16, 32 and 48 px
  const ico = readFileSync(join(__dirname, '..', 'public', 'favicon.ico'));
  const n = ico.readUInt16LE(4);
  const sizes = Array.from({ length: n }, (_, k) => ico[6 + k * 16] || 256).sort((a, b) => a - b);
  expect(sizes).toEqual([16, 32, 48]);
});
