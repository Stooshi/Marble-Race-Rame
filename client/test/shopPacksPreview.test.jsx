// The track-pack shop mockup (Moses, 12 Nov 2026): /preview/shop-packs, a design only. Noindex, linked from
// nowhere, nothing for sale (no server call, every price "[price]"); its figures match the packs as they are.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ShopPacksPreview, { GRAND_PRIX, PACKS } from '../src/site/pages/ShopPacksPreview';
import { metaFor } from '../src/site/pageMeta';

const require = createRequire(import.meta.url);
const SRC = new URL('../src/', import.meta.url).pathname;
const page = (url) => renderToString(<MemoryRouter initialEntries={[url]}><Routes><Route path="/preview/shop-packs" element={<ShopPacksPreview />} /></Routes></MemoryRouter>);
const files = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));

describe('the track-pack shop mockup', () => {
  it('is noindex and linked from nowhere', () => {
    expect(metaFor('/preview/shop-packs').noindex).toBe(true);
    const linking = files(SRC).filter((f) => /\.(jsx?|json)$/.test(f) && !f.endsWith('App.jsx') && !f.endsWith('ShopPacksPreview.jsx') && readFileSync(f, 'utf8').includes('shop-packs'));
    expect(linking).toEqual([]);
  });

  it('sells nothing: no server call, placeholder prices, buttons that do nothing', () => {
    const src = readFileSync(join(SRC, 'site/pages/ShopPacksPreview.jsx'), 'utf8');
    expect(src).not.toMatch(/\bapi\b|fetch\(|useCollection|checkout|buy\(/);
    expect(src).toContain("const PRICE = '[price]'");
    const shop = page('/preview/shop-packs');
    expect(shop).toContain('Design mockup');
    expect(shop.match(/Coming soon/g)).toHaveLength(10); // (Blocks 2 has 20 since Voxel Peaks joined it, 12 Nov 2026; the other ten are short)
    expect(page('/preview/shop-packs?as=complete').match(/>Unlock</g)).toHaveLength(11);
  });

  it('the tabs, Track packs first, and all 11 packs with their mix', () => {
    const shop = page('/preview/shop-packs');
    expect([...shop.matchAll(/role="tab"[^>]*>([^<]+)</g)].map((m) => m[1])).toEqual(['Track packs', 'Marbles', 'Season pass', 'Coins']);
    expect(PACKS).toHaveLength(11);
    for (const p of PACKS) expect(shop).toContain(`>${p.name}</h3>`);
  });

  it('the packs\' figures are the packs as they are (src/packs/list.js, wildness.json)', () => {
    const { tracks } = require('../../src/tracks/wildness.json');
    const { isFree, packFor } = require('../../src/packs/list.js');
    for (const p of PACKS) {
      const mine = tracks.filter((t) => packFor(t.slug, t.series) === p.key && !isFree(t.slug));
      expect(p.live, p.key).toBe(mine.length);
      for (const l of ['easy', 'wild', 'extreme']) expect(p.mix[l], `${p.key} ${l}`).toBe(mine.filter((t) => t.wildness === l).length);
      expect(mine.some((t) => t.slug === p.pic), `${p.key}: its picture is one of its tracks`).toBe(true);
    }
    const gp = tracks.filter((t) => packFor(t.slug, t.series) === 'grand-prix' && !isFree(t.slug));
    expect(GRAND_PRIX.filter((t) => t.slug).map((t) => t.slug).sort()).toEqual(gp.map((t) => t.slug).sort());
    for (const t of GRAND_PRIX.filter((x) => x.slug)) expect(t.wildness).toBe(gp.find((g) => g.slug === t.slug).wildness);
  });

  it('the Grand Prix pack page: 11 live and 9 coming soon (13 Nov 2026: Sydney and Sahara back in the pack), the buy button at the top and the bottom, the paid-league line', () => {
    const gp = page('/preview/shop-packs?pack=grand-prix').replace(/<!-- -->/g, '');
    expect(GRAND_PRIX).toHaveLength(20);
    expect(gp.match(/COMING SOON/g)).toHaveLength(9);
    expect(gp.match(/Unlock all 20 tracks – \[price\]/g)).toHaveLength(2);
    expect(gp).toContain('Paid leagues can race any track, locked ones included.');
    expect(gp).toContain('City circuits and motorsport');
  });
});
