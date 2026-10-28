// The website's Ignored Build Step (Moses, 28 Oct 2026: Vercel's deployment storage filled up):
// docs, server code, tests and review reports don't make a website build; work branches make no
// previews; a Redeploy, a Deploy Hook and the 1 Dec season-start rebuild always build.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRANCHES, affectsWebsite, decide } from '../scripts/vercel-ignore.mjs';

const base = { ref: 'Main', sha: 'b', prev: 'a', now: new Date('2026-10-28T08:00:00Z') };

describe('the Ignored Build Step', () => {
  it('is the project\'s ignoreCommand', () => {
    expect(JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')).ignoreCommand).toBe('node scripts/vercel-ignore.mjs');
  });
  it('skips commits that only touch docs, server code, tests or reports', () => {
    for (const files of [['docs/05-runbook.md'], ['src/payments/google.js', 'test/googlePlay.test.js'], ['client/test/help.test.js', 'client/report/x.html'], ['docs/data_updates/2027-04-26-credit-packs.sql'], ['client/android/app/src/main/AndroidManifest.xml', 'client/README.md']]) {
      expect(decide({ ...base, changed: () => files })[0], files.join()).toBe(false);
    }
  });
  it('builds when anything the website is built from changes', () => {
    for (const f of ['client/src/App.jsx', 'client/public/.well-known/assetlinks.json', 'client/vercel.json', 'client/package-lock.json', 'client/scripts/prerender.mjs', 'client/src/shared/payments/packs.json', 'client/index.html']) {
      expect(affectsWebsite(f), f).toBe(true);
      expect(decide({ ...base, changed: () => ['docs/x.md', f] })[0], f).toBe(true);
    }
  });
  it('builds when in doubt: no previous build, the same commit again (Redeploy, Deploy Hook), no comparison', () => {
    expect(decide({ ...base, prev: '', changed: () => [] })[0]).toBe(true);
    expect(decide({ ...base, prev: 'b', changed: () => [] })[0]).toBe(true);
    expect(decide({ ...base, changed: () => null })[0]).toBe(true);
  });
  it('always builds for the season-start rebuild (1 Dec 2026, 00:05 Swedish time and the spare runs), even after docs only', () => {
    for (const t of ['2026-11-30T23:05:00Z', '2026-11-30T23:35:00Z', '2026-12-01T00:15:00Z']) {
      expect(decide({ ...base, now: new Date(t), changed: () => ['docs/x.md'] })[0], t).toBe(true);
    }
  });
  it('previews only for Main and leagues-pro; work branches never build', () => {
    expect(BRANCHES).toEqual(['Main', 'leagues-pro']);
    expect(decide({ ...base, ref: 'leagues-pro', changed: () => ['client/src/App.jsx'] })[0]).toBe(true);
    for (const ref of ['leagues-v1', 'flyover-lod', 'peaks-wip', 'main']) expect(decide({ ...base, ref, changed: () => ['client/src/App.jsx'] })[0], ref).toBe(false);
  });
});
