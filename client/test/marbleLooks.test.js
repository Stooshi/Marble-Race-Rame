import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { DESIGNS, FEATURED_DESIGNS, ITEMS, ITEM, catalog, dressEntries, lookName, nameLooks, originalSlug, priceLabel } from '../src/shared/marbles';
import { BUILT_MATERIALS, createMarbleLook, lookSpec } from '../src/shared/marbles/materials';

// The catalogue is going to be swapped for a new collection, so these tests find
// items by what they are (a material, a rarity) rather than by name.
const byMaterial = (m) => ITEMS.find((i) => i.design.material === m)?.slug;

describe('collection marble looks', () => {
  it('every item gets a look: its material when built, a placeholder swirl otherwise', () => {
    for (const item of ITEMS) {
      const spec = lookSpec(item.slug);
      expect(spec.map.image.width).toBe(256);
      expect(spec.built).toBe(BUILT_MATERIALS.includes(item.design.material));
    }
  });

  it('glass has a see-through shell and an inner piece; glowing looks have a glow map, a halo and (Sunfire) sparks', () => {
    const glass = byMaterial('core-glass') ?? byMaterial('vane-glass');
    if (glass) {
      const look = createMarbleLook(glass);
      expect(look.shell.material.transparent).toBe(true);
      expect(look.object.children.length).toBe(2);
      look.dispose();
    }
    const sun = byMaterial('sunfire');
    if (sun) {
      const look = createMarbleLook(sun);
      expect(look.shell.material.emissiveMap).toBeTruthy();
      expect(look.object.children.some((c) => c.isSprite)).toBe(true);
      expect(look.trail?.isPoints).toBe(true);
      look.dispose();
    }
    const plain = byMaterial('stripe') ?? byMaterial('bands');
    if (plain) {
      const look = createMarbleLook(plain);
      expect(look.object.children.length).toBe(1);
      look.dispose();
    }
  });

  it('the same item looks the same every time; textures are made once and shared', () => {
    const slug = ITEMS[0].slug;
    expect(lookSpec(slug)).toBe(lookSpec(slug));
    expect(createMarbleLook(slug).shell.material.map).toBe(createMarbleLook(slug).shell.material.map);
  });

  it('20 decorated marbles cost well under a millisecond a frame to update', () => {
    const looks = ITEMS.slice(0, 20).map((i) => createMarbleLook(i.slug));
    const p = new Vector3();
    for (let f = 0; f < 50; f += 1) for (const l of looks) l.update(f / 60, p.set(f, 0, 0));
    const t0 = performance.now();
    const frames = 600;
    for (let f = 0; f < frames; f += 1) for (const l of looks) l.update(f / 60, p.set(f * 0.2, 0, 0));
    expect((performance.now() - t0) / frames).toBeLessThan(0.5);
    looks.forEach((l) => l.setNight(true));
    looks.forEach((l) => l.dispose());
  });

  it('the shared marble code has no React or DOM in it (the phone apps use the same files)', () => {
    for (const f of ['index.js', 'materials.js', 'badge.js']) {
      const code = readFileSync(new URL(`../src/shared/marbles/${f}`, import.meta.url), 'utf8');
      expect(code).not.toMatch(/from 'react|document\.|window\./);
    }
  });

  it('prices: coins by rarity; a credits price not set yet stays a visible [X] placeholder', () => {
    const coins = ITEMS.find((i) => i.price.coins !== undefined);
    expect(priceLabel(coins.price)).toBe(`● ${coins.price.coins.toLocaleString('en-US')} coins`);
    expect(priceLabel({ credits: null, creditsLabel: '[X]' })).toBe('◆ [X] credits');
  });

  it('the shop, landing page and collection hero pick their marbles from the catalogue (one per rarity)', () => {
    const rarities = FEATURED_DESIGNS.map((d) => d.rarity);
    expect(new Set(rarities).size).toBe(rarities.length);
    expect(rarities).not.toContain('limited');
    for (const d of FEATURED_DESIGNS) expect(ITEM[originalSlug(d)]).toBeTruthy();
    expect(Object.keys(catalog.rarities)).toEqual(expect.arrayContaining(rarities));
  });

  it('dressing a preview field gives each marble a look, the same way every time; own looks are kept', () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({ index: i, marble: { name: `h${i}` } }));
    const slugs = ITEMS.slice(0, 3).map((i) => i.slug);
    const a = dressEntries(entries, 'race-1', slugs);
    expect(a.every((e) => slugs.includes(e.marble.look))).toBe(true);
    expect(dressEntries(entries, 'race-1', slugs)).toEqual(a);
    const own = dressEntries([{ marble: { look: ITEMS[5].slug } }], 'x', slugs);
    expect(own[0].marble.look).toBe(ITEMS[5].slug);
  });
});

describe('look names in the standings', () => {
  it('a marble wearing a look is called by it; plain marbles keep their names; nothing is dressed here', () => {
    const shaded = DESIGNS.find((d) => d.shades.length > 1);
    expect(lookName(originalSlug(shaded))).toBe(shaded.name);
    const second = `${shaded.key}-${shaded.shades[1].key}`;
    expect(lookName(second)).toContain(shaded.shades[1].name);
    const data = { entries: [
      { index: 0, isBot: false, marble: { name: 'Emerald', look: second } },
      { index: 1, isBot: true, marble: { name: 'Ruby' } },
    ] };
    const out = nameLooks(data);
    expect(out.entries[0].marble.name).toBe(lookName(second));
    expect(out.entries[1].marble).toEqual({ name: 'Ruby' });
    expect(nameLooks(out)).toEqual(out);
  });
});
