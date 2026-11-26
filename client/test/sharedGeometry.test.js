import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { realTracks } from './helpers/tracks';

const require = createRequire(import.meta.url);
const server = require('../../src/game/trackGeometry');

// The physics runs on the server's copy of the track shape; the 3D view draws
// its own. They must be the same shape, or marbles would be drawn off their
// true positions.
describe('server track shape matches the 3D view', () => {
  for (const track of realTracks()) {
    it(track.slug, () => {
      const drawn = buildCenterline(track);
      const physics = server.buildCenterline(track);
      expect(physics.samples.length).toBe(drawn.samples.length);
      let worst = 0;
      drawn.samples.forEach((d, i) => {
        const p = physics.samples[i];
        worst = Math.max(worst, Math.abs(d.pos.x - p.pos.x), Math.abs(d.pos.y - p.pos.y), Math.abs(d.pos.z - p.pos.z),
          Math.abs(d.side.x - p.side.x), Math.abs(d.side.z - p.side.z), Math.abs(d.tangent.y - p.tangent.y));
      });
      expect(worst).toBeLessThan(1e-9);
      let arc = 0;
      for (let i = 1; i < drawn.samples.length; i += 1) arc += drawn.samples[i].pos.distanceTo(drawn.samples[i - 1].pos);
      expect(Math.abs(arc - physics.arcLength) / arc).toBeLessThan(1e-3);
    });
  }
});
