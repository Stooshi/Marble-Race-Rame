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
