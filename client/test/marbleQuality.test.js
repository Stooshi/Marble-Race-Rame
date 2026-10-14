// The quality checks every marble passes, measured on a reference drawing of the
// marble shader (test/helpers/marbleRender.js): every collection item in every
// shade, and every plain marble (the free starters, the other Originals, the
// computer players' marbles: the seed rows in docs/database_schema.sql).
//   1. Its colours are the shop picture's: by day the same picture (ΔE), at night
//      only darker, the same hue.
//   2. Its pattern is fixed in the ball and rolls with it: forwards, in step.
//   3. No wagon-wheel: never turned more than 40% of its repeat in a frame.
//   4. Finished like the Cat's Eye: the shine on top and the depth under it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { ITEMS } from '../src/shared/marbles';
import { GLOSS_LAYERS, lookOf, plainBadge, plainLookOf } from '../src/shared/marbles/badge';
import { toCss } from '../src/shared/marbles/paint';
import { MAX_TURN, NIGHT_LEVEL, WAGON_SHARE, createMarbleLook, createPlainLook, lookSpec, plainSpec } from '../src/shared/marbles/materials';
import { deltaE, drawMarble, drawPicture, hueOf, lab, meanColour, paletteGap } from './helpers/marbleRender';

/** The plain marbles, as the database seeds them. */
const sql = readFileSync(new URL('../../docs/database_schema.sql', import.meta.url), 'utf8');
const PLAIN = [...sql.matchAll(/\('([a-z-]+)',\s*'(?:[^']|'')*',\s*'(?:[^']|'')*',\s*'(#[0-9A-Fa-f]{6})',\s*(NULL|'#[0-9A-Fa-f]{6}'),\s*'([a-z-]+)'/g)]
  .map(([, slug, a, b, pattern]) => ({ slug, color_primary: a, color_secondary: b === 'NULL' ? null : b.slice(1, -1), pattern }));

const ALL = [
  ...ITEMS.map((i) => ({ name: i.slug, spec: () => lookSpec(i.slug), layers: () => lookOf(i.slug).layers, make: () => createMarbleLook(i.slug) })),
  ...PLAIN.map((m) => ({ name: `plain ${m.slug}`, spec: () => plainSpec(m), layers: () => plainLookOf(m).layers, make: () => createPlainLook(m) })),
];

// The ball turned as the picture faces you: a 'front' pattern from the front, slices down their axis.
const pictureTurn = (spec) => (spec.pictureView === 'axis' ? new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2) : new Quaternion());
const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const TURNS = Array.from({ length: 8 }, () => new Quaternion().setFromAxisAngle(new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), rand() * 6.28));

describe('every marble: the quality checks', () => {
  it('the plain marbles are all here (22 seeded: the free starters and the computer players\' marbles)', () => {
    expect(PLAIN.length).toBe(22);
    expect(PLAIN.filter((m) => ['ruby', 'sapphire', 'emerald', 'topaz'].includes(m.slug)).length).toBe(4);
  });

  it('1. by day: the same colours as the shop picture (ΔE under 2 seen as the picture; its own colours from any side)', () => {
    for (const m of ALL) {
      const spec = m.spec();
      const layers = m.layers();
      const day = meanColour(drawMarble(spec, { n: 64, turn: pictureTurn(spec) }));
      const pic = meanColour(drawPicture(layers, { n: 64 }));
      expect(deltaE(day, pic), `${m.name}: ΔE ${deltaE(day, pic).toFixed(2)}`).toBeLessThan(2);
      // From any side: every colour on the ball is one of the picture's (under the same shine).
      for (const t of TURNS.slice(0, 4)) {
        const gap = paletteGap(drawMarble(spec, { n: 40, turn: t }), layers);
        expect(gap.median, `${m.name}: median ΔE ${gap.median.toFixed(2)}`).toBeLessThan(1.5);
        expect(gap.p95, `${m.name}: 95% within ΔE ${gap.p95.toFixed(2)}`).toBeLessThan(10); // (the rest: the soft edges between stripes)
      }
    }
  }, 120_000);

  it('1. at night: only darker, the same hue', () => {
    for (const m of ALL) {
      const spec = m.spec();
      const day = meanColour(drawMarble(spec, { n: 48, turn: pictureTurn(spec) }));
      const night = meanColour(drawMarble(spec, { n: 48, turn: pictureTurn(spec), level: NIGHT_LEVEL }));
      expect(lab(night)[0]).toBeLessThan(lab(day)[0]);
      const h1 = hueOf(day); const h2 = hueOf(night);
      if (h1.chroma >= 5) expect(Math.min(Math.abs(h1.hue - h2.hue), 360 - Math.abs(h1.hue - h2.hue)), m.name).toBeLessThan(2);
    }
  });

  it('the plain marbles\' pictures are the same as before (the master): solid, striped, swirled', () => {
    expect(plainBadge({ color_primary: '#E0115F' }).background).toBe(toCss(plainLookOf({ color_primary: '#E0115F' }).layers));
    const solid = plainLookOf({ color_primary: '#E0115F' }).layers[0];
    expect(solid.stops.map((s) => s[0])).toEqual(['#E9588F', '#E0115F', '#7B0934']);
  });

  it('2 and 3. the pattern rolls with the ball: forwards, in step, never past 40% of its repeat a frame (no wagon-wheel)', () => {
    for (const m of ALL) {
      const look = m.make();
      const { spec } = look;
      if (!spec.detail) { look.dispose(); continue; }
      // The cap: under half the pattern's repeat (a pattern that turns more than half its repeat in a frame looks to turn back).
      const cap = spec.repeat ? Math.min(MAX_TURN, (WAGON_SHARE * spec.repeat * Math.PI) / 180) : MAX_TURN;
      expect(spec.maxTurn).toBeCloseTo(cap, 9);
      if (spec.repeat) expect(spec.maxTurn).toBeLessThan(0.45 * (spec.repeat * Math.PI) / 180);
      const pattern = () => new Quaternion().setFromRotationMatrix(new Matrix4().setFromMatrix3(look.shell.material.uniforms.uDetailTurn.value)).invert();
      look.update(0);
      for (const [axis, deg] of [[new Vector3(0, 0, -1), 4], [new Vector3(0, 0, -1), 12], [new Vector3(1, 0, 0), 25], [new Vector3(0.6, 0, 0.8), 70]]) {
        const before = pattern();
        look.object.quaternion.premultiply(new Quaternion().setFromAxisAngle(axis, (deg * Math.PI) / 180));
        look.update(0);
        const turn = pattern().multiply(before.invert());
        const angle = 2 * Math.acos(Math.min(1, Math.abs(turn.w)));
        const dir = new Vector3(turn.x, turn.y, turn.z).multiplyScalar(Math.sign(turn.w) || 1).normalize();
        expect(dir.dot(axis), m.name).toBeGreaterThan(0.999); // forwards, about the ball's own axis
        expect(angle, m.name).toBeCloseTo(Math.min((deg * Math.PI) / 180, spec.maxTurn), 5); // in step, up to the cap
      }
      look.dispose();
    }
  });

  it('2. the pattern is fixed in the ball: turned back, the ball shows exactly what it showed', () => {
    for (const m of ALL.filter((x) => x.spec().detail)) {
      const look = m.make();
      look.update(0);
      const at = () => look.shell.material.uniforms.uDetailTurn.value.elements.slice();
      const start = at();
      const step = new Quaternion().setFromAxisAngle(new Vector3(0, 0, -1), (5 * Math.PI) / 180);
      for (let k = 0; k < 20; k += 1) { look.object.quaternion.premultiply(step); look.update(k / 60); }
      for (let k = 0; k < 20; k += 1) { look.object.quaternion.premultiply(step.clone().invert()); look.update(k / 60); }
      at().forEach((v, k) => expect(v).toBeCloseTo(start[k], 6));
      look.dispose();
    }
  });

  it('4. finished like the Cat\'s Eye: the picture\'s shine on top, and depth (highlight to darker rim)', () => {
    for (const m of ALL) {
      const spec = m.spec();
      if (spec.over) for (const l of GLOSS_LAYERS) expect(spec.over).toContain(l);
      else expect(spec.overTexture).toBe(plainSpec({ color_primary: '#E0115F' }).overTexture); // (the shared shine)
      // Depth: from the highlight to the rim the ball falls off clearly, from every side.
      for (const t of [pictureTurn(spec), ...TURNS.slice(0, 3)]) {
        const px = drawMarble(spec, { n: 48, turn: t });
        const L = (sel) => lab(meanColour(px.filter(sel)))[0];
        const depth = L((p) => Math.hypot(p.x + 0.34, p.y - 0.46) < 0.1) - L((p) => Math.hypot(p.x, p.y) > 0.94);
        expect(depth, m.name).toBeGreaterThan(6); // (the palest glass, Cat's Eye Ocean: about 7)
      }
    }
  });
});
