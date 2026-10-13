import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Matrix4, NoColorSpace, Quaternion, Vector3 } from 'three';
import { bagPrice, DESIGNS, FEATURED_DESIGNS, ITEMS, ITEM, catalog, dressEntries, findById, lookName, nameLooks, normaliseId, originalSlug, priceLabel } from '../src/shared/marbles';
import { GLOSS_LAYERS, badgeOf, lookOf } from '../src/shared/marbles/badge';
import { hexRgb, mixHex, rasterize, toBytes, toCss } from '../src/shared/marbles/paint';
import { BUILT_MATERIALS, MAX_TURN, NIGHT_LEVEL, _test, createMarbleLook, lookSpec } from '../src/shared/marbles/materials';

// The catalogue is going to be swapped for a new collection, so these tests find
// items by what they are (a material, a rarity) rather than by name.
const byMaterial = (m) => ITEMS.find((i) => i.design.material === m)?.slug;

describe('collection marble looks', () => {
  it('every item gets a look: its material when built, a placeholder swirl otherwise', () => {
    for (const item of ITEMS) {
      const spec = lookSpec(item.slug);
      expect(spec.built).toBe(BUILT_MATERIALS.includes(item.design.material));
      expect(spec.bodyTexture.image.width).toBe(_test.VIEW_N);
    }
  });

  it('the shop picture is the master: the 3D marble is painted from the very same layers and colour values', () => {
    for (const item of ITEMS.filter((i) => BUILT_MATERIALS.includes(i.design.material))) {
      const spec = lookSpec(item.slug);
      const { layers } = lookOf(item.slug);
      expect(badgeOf(item.slug).background).toBe(toCss(layers));
      for (const l of spec.body ?? []) expect(layers.includes(l)).toBe(true); // the same objects, not copies
      for (const l of spec.turning ?? []) expect(layers.includes(l)).toBe(true);
      for (const l of spec.over ?? []) expect(layers.includes(l) || GLOSS_LAYERS.includes(l)).toBe(true);
    }
  });

  it('nothing in the scene changes the colours: no lights, fog, tone mapping or colour-space conversion', () => {
    for (const m of ['steel', 'champion', 'vane-glass']) {
      const look = createMarbleLook(byMaterial(m));
      look.object.traverse((o) => {
        if (!o.isMesh) return;
        expect(o.material.isShaderMaterial).toBe(true);
        expect(o.material.lights).toBe(false);
        expect(o.material.fog).toBe(false);
        expect(o.material.toneMapped).toBe(false);
        expect(o.material.fragmentShader).not.toMatch(/colorspace_fragment|tonemapping_fragment|lights_/);
        for (const u of Object.values(o.material.uniforms)) if (u.value?.isTexture) expect(u.value.colorSpace).toBe(NoColorSpace);
      });
      look.dispose();
    }
  });

  it('night: the same colours, a little darker; a halo shows more', () => {
    const champ = createMarbleLook(byMaterial('champion'));
    champ.setNight(true);
    expect(champ.shell.material.uniforms.uLevel.value).toBe(NIGHT_LEVEL);
    expect(champ.object.children.some((c) => c.isSprite)).toBe(true);
    champ.setNight(false);
    expect(champ.shell.material.uniforms.uLevel.value).toBe(1);
    champ.dispose();
  });

  it('Steelie: the steel gradient with machining lines; Champion: flakes in its flake colour; Cat\'s Eye: the picture\'s vane, turning with the ball', () => {
    const s = lookSpec(byMaterial('steel'));
    expect(s.detail).toBeTruthy();
    const c = lookSpec(byMaterial('champion'));
    const flake = hexRgb(c.look.parts.flake);
    const d = c.detail.image.data;
    let found = false;
    for (let k = 0; k < d.length; k += 4) if (d[k + 3] === 255) { expect([d[k], d[k + 1], d[k + 2]]).toEqual(flake); found = true; break; }
    expect(found).toBe(true);
    const cat = createMarbleLook(byMaterial('vane-glass'));
    expect(cat.object.children.length).toBe(1); // one sphere
    expect(cat.spec.detail).toBeTruthy(); // the vane, fixed in the ball
    cat.dispose();
  });

  it('a rolling pattern turns with the ball, in the same direction, and never more than MAX_TURN a frame (no wagon-wheel)', () => {
    const cat = createMarbleLook(byMaterial('vane-glass'));
    const axis = new Vector3(0, 0, -1); // rolling along +x
    const step = new Quaternion();
    const pattern = () => new Quaternion().setFromRotationMatrix(new Matrix4().setFromMatrix3(cat.shell.material.uniforms.uDetailTurn.value)).invert();
    cat.update(0);
    for (const deg of [5, 15, 19, 30, 60, 80]) {
      const before = pattern();
      step.setFromAxisAngle(axis, (deg * Math.PI) / 180);
      cat.object.quaternion.premultiply(step);
      cat.update(0);
      const turn = pattern().multiply(before.invert());
      const angle = 2 * Math.acos(Math.min(1, Math.abs(turn.w)));
      const dir = new Vector3(turn.x, turn.y, turn.z).multiplyScalar(Math.sign(turn.w) || 1).normalize();
      expect(dir.dot(axis)).toBeGreaterThan(0.999); // forwards, about the ball's own axis
      expect(angle).toBeCloseTo(Math.min(deg * Math.PI / 180, MAX_TURN), 5); // in step, up to the cap
    }
    expect(cat.shell.material.uniforms.uBlur.value).toBeGreaterThan(0);
    cat.dispose();
  });

  it('the painter follows the CSS rules (farthest-corner circles, stop fix-up, premultiplied blending)', () => {
    // A vertical gradient from red to blue: the middle row is half way (in sRGB, as CSS).
    const px = rasterize([{ type: 'linear', angle: 180, stops: [['#FF0000', 0], ['#0000FF', 100]] }], 4, { ss: 1 });
    expect(Math.round(px[(1 * 4 + 0) * 4])).toBe(Math.round(255 * (1 - 0.375)));
    // Fading to transparent keeps the colour (premultiplied), never greying it.
    const fade = toBytes(rasterize([{ type: 'radial', stops: [['#FF0000', 0], ['transparent', 100]] }], 8, { ss: 1 }));
    expect([fade[(3 * 8 + 3) * 4], fade[(3 * 8 + 3) * 4 + 1]]).toEqual([255, 0]);
    // A circle gradient reaches 100% at the farthest corner.
    const r = rasterize([{ type: 'radial', stops: [['#000000', 0], ['#FFFFFF', 100]] }], 2, { ss: 1 });
    expect(r[0]).toBeCloseTo(255 * (Math.hypot(0.25, 0.25) / Math.hypot(0.5, 0.5)), 3);
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('every catalogue marble has a flat badge of its own design (no plain fallback colour)', () => {
    for (const i of ITEMS) expect(badgeOf(i.slug).background).toMatch(/gradient/);
  });

  it('Marble IDs: found however they are typed', () => {
    expect(findById('sc 105')?.slug).toBe('champion-sunset');
    expect(findById('#SC011')?.slug).toBe('clearie-classic');
    expect(normaliseId('SC-10')).toBe(null);
    expect(ITEMS.every((i) => /^[A-Z]{2}\d{3}$/.test(i.id))).toBe(true);
  });

  it('the same item looks the same every time; textures are made once and shared', () => {
    const slug = ITEMS[0].slug;
    expect(lookSpec(slug)).toBe(lookSpec(slug));
    expect(createMarbleLook(slug).shell.material.uniforms.uView.value).toBe(createMarbleLook(slug).shell.material.uniforms.uView.value);
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

  it('prices: coins by rarity (coins only); a price not set yet stays a visible [X] placeholder', () => {
    const coins = ITEMS.find((i) => i.price.coins != null);
    expect(priceLabel(coins.price)).toBe(`● ${coins.price.coins.toLocaleString('en-US')} coins`);
    expect(priceLabel({ coins: 25000 })).toBe('● 25,000 coins');
    expect(priceLabel({ coins: null, coinsLabel: '[X]' })).toBe('● [X] coins');
    expect(ITEMS.every((i) => i.price.credits === undefined)).toBe(true);
  });

  it('bag prices match the server: 30% / 15% off, to the nearest 100', () => {
    expect(bagPrice('full', 59500)).toBe(41700);
    expect(bagPrice('starter', 3000)).toBe(2600);
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
