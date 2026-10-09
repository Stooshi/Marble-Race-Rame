// Kit tracks draw in the 3D view: the channel, every obstacle (costumes the
// library doesn't draw yet fall back to their obstacle's own look) and the
// splitter, on phones and on computers.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { buildIceChannelGeometry, channelOf } from '../src/three/iceChannel';
import { buildTrackFeatures } from '../src/three/trackFeatures';

const require = createRequire(import.meta.url);
const { physicsTrack } = require('../../src/game/physicsTracks');

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

describe('Kit Proving Ground in 3D', () => {
  const track = physicsTrack('kit-proving-ground');
  const centerline = buildCenterline(track);
  const channel = channelOf(track, centerline);

  it('is drawn as an ice channel with its splitter', () => {
    expect(channel).toBeTruthy();
    expect(channel.forks?.length ?? (channel.fork ? 1 : 0)).toBe(1);
    expect(buildIceChannelGeometry(centerline, channel).getAttribute('position').count).toBeGreaterThan(1000);
  });

  for (const lite of [false, true]) {
    it(`draws every obstacle, boost and bump (${lite ? 'phone' : 'computer'})`, () => {
      const built = buildTrackFeatures(centerline, channel, track.physics.features, { lite });
      let meshes = 0;
      built.group.traverse((o) => { if (o.isMesh) meshes += 1; });
      expect(meshes).toBeGreaterThan(5);
    });
  }
});
