// The finish apron (Moses, 2 Nov 2026; looks only): the channel's U opening out into the catch area
// like the end of a ramp, and padded cheeks bringing its walls down to the catch area's, dressed by series.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Box3 } from 'three';
import { FLARE, apronStyle, buildFinishApron } from '../src/three/finishApron';
import { KERB_COLORS } from '../src/three/iceChannel';

const opts = (style) => ({ radius: 3.6, lip: (80 * Math.PI) / 180, pen: { halfWidth: 3.5 }, wall: { height: 1.6, thickness: 0.5 }, floor: '#3f4249', style });

describe('the finish apron', () => {
  it('is dressed by series: chequered, kerbs, or the scenery', () => {
    expect(apronStyle('dubai-marble-grand-prix').kind).toBe('chequer');
    for (const slug of ['venice-cube-canals', 'sognefjord', 'bobsleigh-run']) {
      expect(apronStyle(slug)).toMatchObject({ kind: 'kerb', a: KERB_COLORS.kerbA, b: KERB_COLORS.kerbB });
    }
    for (const slug of ['grand-canyon-burst', 'everest-icefall-run', 'marble-stadium-sprint']) expect(apronStyle(slug, '#e2a764').kind).toBe('scenery');
    expect(apronStyle('no-such-track').kind).toBe('scenery');
  });
  it('stays inside the catch area and the channel\'s lip, its flare the shape the finishers glide down', () => {
    const g = buildFinishApron(opts(apronStyle('venice-cube-canals')));
    const box = new Box3().setFromObject(g);
    expect(box.max.x).toBeLessThanOrEqual(3.5 + 0.5 + 1e-6);
    expect(box.max.y).toBeLessThanOrEqual(3.6 * (1 - Math.cos((80 * Math.PI) / 180)) + 0.02);
    expect(box.max.z).toBeLessThanOrEqual(FLARE.cheek + 1e-6);
    expect(FLARE.length).toBe(3); // (marbles.js: a finisher glides off the wall over its first 3 metres)
    const marbles = readFileSync(new URL('../src/three/marbles.js', import.meta.url), 'utf8');
    expect(marbles).toContain('const k = Math.min(1, along / 3);');
  });
  it('plain colours only, so the finish stays one merged mesh (no draw call of its own)', () => {
    const g = buildFinishApron(opts(apronStyle('dubai-marble-grand-prix')));
    let tris = 0;
    g.traverse((o) => {
      if (!o.isMesh) return;
      expect(o.material.isMeshLambertMaterial && !o.material.vertexColors && !o.material.map && !o.material.transparent).toBe(true);
      tris += o.geometry.getAttribute('position').count / 3;
    });
    expect(tris).toBeLessThan(1200);
    const scene = readFileSync(new URL('../src/three/TrackScene.js', import.meta.url), 'utf8');
    expect(scene).toContain('area.add(buildFinishApron({');
  });
});
