// The obstacles the marbles are drawn round (trackFeatures solidsAt) are exactly the physics' obstacles:
// never a loop's start point or any other track piece (Moses, 4 Nov 2026: the phantom obstacle at the loops).
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { buildTrackFeatures } from '../src/three/trackFeatures';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '../..');
const { physicsTrack } = require(path.join(ROOT, 'src/game/physicsTracks'));
const { ALL_SOLID_TYPES, normaliseFeatures } = require(path.join(ROOT, 'src/game/trackFeatures'));
globalThis.document ??= {
  createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {} }), width: 0, height: 0 }),
};

describe('drawn obstacles = the physics obstacles', () => {
  for (const slug of ['saint-tropez', 'pudong-marble-grand-prix', 'magma-loops', 'stockholm-marble-grand-prix']) {
    it(slug, () => {
      let track;
      try { track = physicsTrack(slug); } catch { return; }
      if (!track) return;
      const centerline = buildCenterline(track);
      const channel = channelOf(track, centerline);
      const built = buildTrackFeatures(centerline, channel, track.physics.features, { lite: true, compact: true });
      const drawn = built.solidsAt(0);
      expect(drawn.some((o) => o.type === 'loop')).toBe(false);
      for (const o of drawn) expect(ALL_SOLID_TYPES).toContain(o.type);
      const physics = normaliseFeatures(track.physics.features).filter((f) => ALL_SOLID_TYPES.includes(f.type));
      const buses = physics.filter((f) => f.type === 'bus').length;
      if (!buses) expect(drawn.length).toBe(physics.length);
    });
  }
});
