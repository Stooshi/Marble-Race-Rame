import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf, placeOnChannel } from '../src/three/iceChannel';
import { bearPaw, buildTrackFeatures } from '../src/three/trackFeatures';

const require = createRequire(import.meta.url);
const { physicsTrack } = require('../../src/game/physicsTracks');
const server = require('../../src/game/trackFeatures');

const track = physicsTrack('bobsleigh-run');
const centerline = buildCenterline(track);
const channel = channelOf(track, centerline);

// The 3D view draws onto canvases; tests run without a browser.
globalThis.document ??= {
  createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {} }), width: 0, height: 0 }),
};

describe('track features (3D)', () => {
  const built = buildTrackFeatures(centerline, channel, track.physics.features);

  it('draws them all within the phone budget: one mesh per material, plus the bear\'s arm', () => {
    let meshes = 0;
    built.group.traverse((o) => { if (o.isMesh) meshes += 1; });
    expect(meshes).toBeLessThanOrEqual(14);
    const names = built.group.children.map((c) => c.name);
    for (const part of ['chevron', 'bump', 'ice', 'snow', 'bear']) expect(names).toContain(part);
  });

  it('lays the boost pads on the ice, on the line the physics boosts', () => {
    const chevrons = built.group.children.find((c) => c.name === 'chevron').geometry.getAttribute('position');
    const v = new Vector3();
    const pads = track.physics.features.filter((f) => f.type === 'boost');
    for (let k = 0; k < chevrons.count; k += 1) {
      v.fromBufferAttribute(chevrons, k);
      // Close to the ice under one of the pads.
      const near = pads.some((f) => {
        const middle = placeOnChannel(centerline, channel, f.at, f.l, 0, 0, 0);
        return middle.distanceTo(v) < (f.length ?? 8) + 2;
      });
      expect(near).toBe(true);
    }
  });

  it('swipes the polar bear\'s paw on exactly the physics\' timetable', () => {
    for (let t = -3; t < 10; t += 0.037) expect(bearPaw(t)).toBeCloseTo(server.bearPaw(t), 12);
    const arm = built.group.children.find((c) => c.isMesh && c.geometry.type === 'CylinderGeometry');
    built.update(0); // resting
    const rest = arm.position.clone();
    built.update(450); // full stretch
    expect(arm.position.distanceTo(rest)).toBeGreaterThan(1);
  });

  it('draws nothing on tracks without features', () => {
    expect(buildTrackFeatures(centerline, channel, [])).toBeNull();
    expect(buildTrackFeatures(centerline, null, track.physics.features)).toBeNull();
  });
});
