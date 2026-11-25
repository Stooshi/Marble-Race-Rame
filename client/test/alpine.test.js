import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { channelLipAt, channelOf, channelRadiusAt, forkOffset, forkRadius } from '../src/three/iceChannel';
import { buildAlpine } from '../src/three/scenery/alpine';
import { themeFor } from '../src/three/themes';

const require = createRequire(import.meta.url);
const { physicsTrack } = require('../../src/game/physicsTracks');

// The 3D view draws onto canvases; tests run without a browser.
const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

const track = physicsTrack('bobsleigh-run');
const centerline = buildCenterline(track);
const channel = channelOf(track, centerline);
const built = { full: buildAlpine(centerline, track, themeFor('bobsleigh-run')), lite: buildAlpine(centerline, track, themeFor('bobsleigh-run'), { lite: true }) };
const triangles = (group) => {
  let n = 0;
  group.traverse((o) => {
    if (!o.isMesh) return;
    const per = o.geometry.getAttribute('position').count / 3;
    n += per * (o.isInstancedMesh ? o.count : 1);
  });
  return n;
};

describe('Bobsleigh Run in the mountains', () => {
  it('is dressed as an alpine world: the theme builds it', () => {
    expect(themeFor('bobsleigh-run').scenery).toBe('alpine');
  });

  it('keeps the ground under the ice everywhere, even where the track passes over itself (both versions)', () => {
    for (const [name, scenery] of Object.entries(built)) {
      const { groundAt } = scenery.userData;
      let worst = -Infinity;
      for (let i = 0; i <= centerline.segments; i += 2) {
        const sample = centerline.samples[i];
        const s = (i / centerline.segments) * channel.arc;
        const side = new Vector3(sample.side.x, 0, sample.side.z).normalize();
        // Each channel at this point (two through the splitter), across its U to just short of its rims.
        const tubes = channel.fork && s > channel.fork.s0 && s < channel.fork.s1
          ? [-1, 1].map((k) => ({ off: k * forkOffset(channel.fork, s), R: forkRadius(channel.fork, channel.radius, s), lip: channel.maxAngle }))
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

  it('has its forest, a moose by the track, a start house, the finish stands and only a few cabins', () => {
    const { full, lite } = built;
    expect(full.userData.trees).toBeGreaterThan(1000);
    const names = [];
    full.traverse((o) => names.push(o.name));
    for (const n of ['terrain', 'forest', 'bushes', 'peaks', 'moose', 'start house', 'spectator stand', 'flags', 'trestles']) expect(names).toContain(n);
    expect(names.filter((n) => n === 'cabin').length).toBeLessThanOrEqual(4);
    // The moose stands right beside the track (a few metres from the ice), not in it.
    const moose = full.getObjectByName('moose');
    const gap = full.userData.field.clearance(moose.position.x, moose.position.z);
    expect(gap).toBeGreaterThan(0.5);
    expect(gap).toBeLessThan(6);
    // Phones get a far lighter version.
    expect(lite.userData.trees).toBeLessThan(full.userData.trees / 3);
    expect(triangles(lite)).toBeLessThan(triangles(full) / 2.5);
  });
});
