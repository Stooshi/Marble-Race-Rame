import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { ITEMS, ITEM, dressEntries, priceLabel } from '../src/shared/marbles';
import { BUILT_MATERIALS, createMarbleLook, lookSpec } from '../src/shared/marbles/materials';

describe('collection marble looks', () => {
  it('all 16 looks are built', () => {
    expect([...BUILT_MATERIALS].sort()).toEqual(['aurora-glass', 'bands', 'black-hole', 'checks', 'core-glass', 'gem-bands', 'lava', 'melon', 'nebula-glass', 'neon-grid', 'rings', 'stone', 'stripe', 'sunfire', 'swirl-glass', 'vane-glass']);
  });

  it('every one of the 76 items gets a look (unbuilt designs a placeholder for now)', () => {
    for (const item of ITEMS) {
      const spec = lookSpec(item.slug);
      expect(spec.map.image.width).toBe(256);
      expect(spec.built).toBe(BUILT_MATERIALS.includes(item.design.material));
    }
  });

  it('glass has a see-through shell and an inner marble; Sunfire glows with a halo and a spark trail', () => {
    const glass = createMarbleLook('glass-glacier');
    expect(glass.shell.material.transparent).toBe(true);
    expect(glass.object.children.length).toBe(2);
    expect(glass.trail).toBeNull();
    const sun = createMarbleLook('sun-solar');
    expect(sun.shell.material.emissiveMap).toBeTruthy();
    expect(sun.object.children.some((c) => c.isSprite)).toBe(true);
    expect(sun.trail?.isPoints).toBe(true);
    const candy = createMarbleLook('candy-pink');
    expect(candy.object.children.length).toBe(1);
    for (const l of [glass, sun, candy]) l.dispose();
  });

  it('the same item looks the same every time; textures are made once and shared', () => {
    expect(lookSpec('pebble-granite')).toBe(lookSpec('pebble-granite'));
    const a = createMarbleLook('pebble-granite');
    const b = createMarbleLook('pebble-granite');
    expect(a.shell.material.map).toBe(b.shell.material.map);
  });

  it('20 decorated marbles cost well under a millisecond a frame to update', () => {
    const looks = ITEMS.filter((i) => BUILT_MATERIALS.includes(i.design.material)).slice(0, 20).map((i) => createMarbleLook(i.slug));
    expect(looks.length).toBe(20);
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
    for (const f of ['index.js', 'materials.js']) {
      const code = readFileSync(new URL(`../src/shared/marbles/${f}`, import.meta.url), 'utf8');
      expect(code).not.toMatch(/from 'react|document\.|window\./);
    }
  });

  it('prices: coins, and the limited edition keeps its [X] placeholder', () => {
    expect(priceLabel(ITEM['sun-solar'].price)).toBe('● 2,500 coins');
    expect(priceLabel(ITEM['aurora-aurora'].price)).toBe('◆ [X] credits');
  });

  it('dressing a field gives each house marble a look, the same way every time', () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({ index: i, marble: { name: `h${i}` } }));
    const slugs = ['candy-pink', 'sun-solar', 'glass-glacier'];
    const a = dressEntries(entries, 'race-1', slugs);
    expect(a.every((e) => slugs.includes(e.marble.look))).toBe(true);
    expect(dressEntries(entries, 'race-1', slugs)).toEqual(a);
    const own = dressEntries([{ marble: { look: 'bee-classic' } }], 'x', slugs);
    expect(own[0].marble.look).toBe('bee-classic');
  });
});

describe('house marbles and look names', () => {
  it('house marbles get finished looks named after them; players keep theirs', async () => {
    const { dressHouseMarbles, lookName, HOUSE_LOOKS } = await import('../src/shared/marbles');
    expect(lookName('candy-pink')).toBe('Candy Stripe');
    expect(lookName('glass-ruby')).toBe('Ruby Ice');
    expect(lookName('candy-ocean')).toBe('Ocean Candy Stripe');
    const data = { entries: [
      { index: 0, entryId: 'a', isBot: false, marble: { name: 'Emerald', look: 'sun-solar' } },
      { index: 1, entryId: 'b', isBot: false, marble: { name: 'Ruby' } },
      { index: 2, entryId: 'c', isBot: true, marble: { name: 'Coral' } },
    ] };
    const out = dressHouseMarbles(data);
    expect(out.entries[0].marble.name).toBe('Sunfire');
    expect(out.entries[1].marble).toEqual({ name: 'Ruby' });
    expect(HOUSE_LOOKS).toContain(out.entries[2].marble.look);
    expect(out.entries[2].marble.name).toBe(lookName(out.entries[2].marble.look));
    expect(dressHouseMarbles(out)).toEqual(out);
  });
});
