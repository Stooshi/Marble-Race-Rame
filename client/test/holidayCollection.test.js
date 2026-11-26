// The Holiday Season 2026 marbles as built into the catalogue: the Winter 2026 seasonal collection and
// the pass's Winter Solstice look exactly as approved on /preview/marbles/holiday (the same layers, now
// coloured from the catalogue), and the shop and the Marble Bag say where each stands by its dates.
import { describe, expect, it } from 'vitest';

const PREVIEW = { 'winter-solstice-2026': 'solstice', 'snowball-winter': 'snowball', 'frost-clearie-winter': 'frost', 'candy-cane-winter': 'candy', 'evergreen-winter': 'evergreen', 'midwinter-star-winter': 'star' };

describe('the Holiday Season 2026 marbles', () => {
  it('look exactly as approved: the preview\'s layers, glow and spin', async () => {
    const { lookOf, badgeOf } = await import('../src/shared/marbles/badge');
    const { REVIEW_LOOKS } = await import('../src/site/marbles/holidayDesigns');
    // Three small changes from the preview, for the quality checks (test/marbleQuality.test.js): Frost Clearie's
    // glass opaque (it was 95%), Midwinter Star's amber glow 60% (45%), Candy Cane's white base under its ball.
    const asBuilt = JSON.parse(JSON.stringify(REVIEW_LOOKS));
    asBuilt.frost.layers[1].stops[1][0] = '#A9DDF5';
    asBuilt.frost.parts.body[0].stops[1][0] = '#A9DDF5';
    asBuilt.star.layers[0].stops[2][0] = { hex: '#FFB020', a: 0.6 };
    asBuilt.candy.layers.push({ type: 'solid', color: '#F7F4F0' });
    for (const [slug, key] of Object.entries(PREVIEW)) {
      const built = lookOf(slug);
      const approved = asBuilt[key];
      expect(JSON.parse(JSON.stringify(built.layers)), slug).toEqual(JSON.parse(JSON.stringify(approved.layers)));
      expect(JSON.parse(JSON.stringify(built.parts.pattern ?? null)), slug).toEqual(JSON.parse(JSON.stringify(approved.parts.pattern ?? null)));
      expect(built.glow ?? null, slug).toBe(approved.glow ?? null);
      expect(badgeOf(slug).spin ?? null, slug).toBe(approved.spin ?? null);
    }
  });

  it('are built in 3D and approved, and never dress the computer players', async () => {
    const { APPROVED_3D, BUILT_MATERIALS, HOUSE_LOOKS, ITEM, previewShowcase } = await import('../src/shared/marbles');
    for (const slug of Object.keys(PREVIEW)) {
      expect(BUILT_MATERIALS).toContain(ITEM[slug].design.material);
      expect(APPROVED_3D.has(ITEM[slug].design.key)).toBe(true);
      expect(HOUSE_LOOKS).not.toContain(slug);
    }
    expect(previewShowcase(10, 'race-1').filter(Boolean).every((s) => ITEM[s].kind === 'standard')).toBe(true);
  });

  it('Winter 2026: its own prices; "Coming 1 December", "Leaving in N days", then "Retired 7 Jan 2027"', async () => {
    const { ITEM } = await import('../src/shared/marbles');
    const { seasonalSale, seasonalLine, retiredLine } = await import('../src/site/marbles/useCollection');
    expect(['snowball-winter', 'frost-clearie-winter', 'candy-cane-winter', 'evergreen-winter', 'midwinter-star-winter'].map((s) => ITEM[s].price.coins)).toEqual([800, 800, 2000, 4500, 9000]);
    const snow = ITEM['snowball-winter'];
    const at = (iso) => seasonalLine(seasonalSale(snow, new Date(iso)));
    expect(at('2026-11-20T12:00:00Z')).toBe('Coming 1 December · on sale until 7 January');
    expect(at('2026-12-01T12:00:00Z')).toBe('Leaving in 37 days · until 7 January');
    expect(at('2027-01-06T12:00:00Z')).toBe('Leaving in 1 day · until 7 January');
    expect(at('2027-01-07T12:00:00Z')).toBe('Leaving today');
    expect(at('2027-01-07T23:30:00Z')).toBe('Retired 7 Jan 2027');
    expect(retiredLine(snow, new Date('2027-02-01'))).toBe('Retired 7 Jan 2027');
    expect(retiredLine(snow, new Date('2026-12-10'))).toBeNull();
    expect(seasonalSale(ITEM['clearie-classic'])).toBeNull();
  });

  it('Winter Solstice: never sold, numbered "Holiday 2026 #0001", its edition closing with the season', async () => {
    const { ITEM, passNumber, windowOf, collectionOf } = await import('../src/shared/marbles');
    const ws = ITEM['winter-solstice-2026'];
    expect(ws.id).toBe('HS011');
    expect(ws.kind).toBe('pass');
    expect(passNumber(ws, 1)).toBe('Holiday 2026 #0001');
    expect(collectionOf(ws.design).edition).toBe('Holiday Season 2026 pass edition');
    expect(windowOf(ws, new Date('2026-12-10'))).toBe('pass-only');
    expect(windowOf(ws, new Date('2027-01-08'))).toBe('closed');
  });
});
