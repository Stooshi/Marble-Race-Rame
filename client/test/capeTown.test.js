import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { channelLipAt, channelOf, channelRadiusAt, forkAt, forkOffset, forkRadius } from '../src/three/iceChannel';
import { buildCapeTown } from '../src/three/scenery/capeTown';
import { buildTrackFeatures } from '../src/three/trackFeatures';
import { themeFor } from '../src/three/themes';

const require = createRequire(import.meta.url);
const { physicsTrack } = require('../../src/game/physicsTracks');

// The 3D view draws onto canvases; tests run without a browser.
const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

const track = physicsTrack('table-mountain-run');
const centerline = buildCenterline(track);
const channel = channelOf(track, centerline);
const theme = themeFor('table-mountain-run');
const built = { full: buildCapeTown(centerline, track, theme), lite: buildCapeTown(centerline, track, theme, { lite: true }) };
const triangles = (group) => {
  let n = 0;
  group.traverse((o) => {
    if (!o.isMesh) return;
    n += (o.geometry.getAttribute('position').count / 3) * (o.isInstancedMesh ? o.count : 1);
  });
  return n;
};
const named = (group, name) => {
  const found = [];
  group.traverse((o) => { if (o.name === name) found.push(o); });
  return found;
};

describe('Table Mountain Run in Cape Town', () => {
  it('is dressed as Cape Town, on a sand-coloured channel, with both splitters drawn', () => {
    expect(theme.scenery).toBe('cape-town');
    expect(channel.look).toBe('sand');
    expect(channel.forks).toHaveLength(2);
    expect(forkAt(channel, (channel.forks[1].s0 + channel.forks[1].s1) / 2)).toBe(channel.forks[1]);
    expect(forkAt(channel, channel.forks[1].s1 + 5)).toBe(null);
  });

  it('keeps the ground under the channel everywhere, through both splitters (both versions): nothing floats', () => {
    for (const [name, scenery] of Object.entries(built)) {
      const { groundAt } = scenery.userData;
      let worst = -Infinity;
      for (let i = 0; i <= centerline.segments; i += 2) {
        const sample = centerline.samples[i];
        const s = (i / centerline.segments) * channel.arc;
        const side = new Vector3(sample.side.x, 0, sample.side.z).normalize();
        const fork = forkAt(channel, s);
        const tubes = fork
          ? [-1, 1].map((k) => ({ off: k * forkOffset(fork, s), R: forkRadius(fork, channel.radius, s), lip: channel.maxAngle }))
          : [{ off: 0, R: channelRadiusAt(channel, s), lip: channelLipAt(channel, s) }];
        for (const { off, R, lip } of tubes) {
          for (let k = -6; k <= 6; k += 1) {
            const th = (k / 6) * lip * 0.95;
            const at = sample.pos.clone().addScaledVector(side, off + R * Math.sin(th));
            worst = Math.max(worst, groundAt(at.x, at.z) - (sample.pos.y + R * (1 - Math.cos(th))));
          }
        }
      }
      expect(worst, name).toBeLessThan(-0.05);
    }
  });

  it('has its landmarks: Table Mountain, Lion\'s Head, the stadium, the clock tower, the Bo-Kaap, forest, fynbos and the city', () => {
    for (const scenery of Object.values(built)) {
      for (const name of ['Table Mountain', "Lion's Head", 'Cape Town Stadium', 'clock tower', 'start house', 'big rock', "Lion's Head (divider)"]) {
        expect(named(scenery, name).length, name).toBe(1);
      }
      const { trees, bushes, city, boKaap } = scenery.userData;
      expect(trees).toBeGreaterThan(100);
      expect(bushes).toBeGreaterThan(80);
      expect(city).toBeGreaterThan(100);
      expect(boKaap).toBeGreaterThan(20);
    }
  });

  it('the phone version is much lighter', () => {
    expect(triangles(built.lite)).toBeLessThan(triangles(built.full) * 0.6);
  });

  it('draws its animals over the obstacles they stand in for, moving only a little', () => {
    const features = buildTrackFeatures(centerline, channel, track.physics.features);
    const solids = features.solidsAt(0);
    const kinds = new Set(solids.map((o) => o.type));
    for (const type of ['ice_block', 'polar_bear', 'icicles', 'snowman']) expect(kinds.has(type), type).toBe(true);
    // Small movements only: nothing drifts from where it stands between two moments.
    const where = () => {
      const out = [];
      features.group.traverse((o) => { if (o.isGroup && o !== features.group) out.push(o.position.clone()); });
      return out;
    };
    features.update(1000);
    const a = where();
    features.update(4200);
    const b = where();
    expect(a.length).toBeGreaterThan(10); // the heads, tails and penguins
    a.forEach((p, i) => expect(p.distanceTo(b[i])).toBe(0));
    features.dispose();
  });
});
