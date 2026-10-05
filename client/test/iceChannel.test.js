import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { buildIceChannelGeometry, channelOf, forkOffset, placeOnChannel } from '../src/three/iceChannel';
import { layoutMarbles, MARBLE_RADIUS } from '../src/three/marbles';
import { lerpFrame } from '../src/utils/splits';

const require = createRequire(import.meta.url);
const { previewTrack } = require('../../src/game/previewTracks');
const { simulatePhysicsRace } = require('../../src/game/physicsSimulator');

const track = previewTrack('bobsleigh-olympics');
const centerline = buildCenterline(track);
const channel = channelOf(track, centerline);

describe('bobsleigh ice channel (3D)', () => {
  it('is only an ice channel for tracks that ask for one', () => {
    expect(channel.radius).toBe(3.6);
    expect(channelOf({ waypoints: track.waypoints }, centerline)).toBeNull();
  });

  it('puts a marble at the bottom of the U in the middle, and up the wall at the edge', () => {
    const i = Math.round(0.05 * centerline.segments); // on the start plunge: main channel
    const p = i / centerline.segments;
    const bottom = placeOnChannel(centerline, channel, p, 0, 0, 0, MARBLE_RADIUS);
    const centre = new Vector3().copy(centerline.samples[i].pos);
    expect(bottom.distanceTo(centre)).toBeCloseTo(MARBLE_RADIUS, 5); // resting on the ice, centre one radius up
    const wall = placeOnChannel(centerline, channel, p, 1, 0, 0, MARBLE_RADIUS);
    expect(wall.y - bottom.y).toBeGreaterThan(2); // high on the wall
  });

  it('splits into an inside and an outside channel, one each side of the middle', () => {
    const mid = (track.physics.fork.from + track.physics.fork.to) / 2;
    const middle = placeOnChannel(centerline, channel, mid, 0, 0, 0, 0);
    const inside = placeOnChannel(centerline, channel, mid, 0, 1, 0, 0);
    const outside = placeOnChannel(centerline, channel, mid, 0, -1, 0, 0);
    expect(inside.distanceTo(middle)).toBeCloseTo(forkOffset(channel.fork, mid * channel.arc), 1);
    expect(outside.distanceTo(middle)).toBeCloseTo(inside.distanceTo(middle), 1);
    expect(inside.distanceTo(outside)).toBeGreaterThan(2 * track.physics.fork.radius);
  });

  it('builds the channel as one geometry within the phone budget', () => {
    const g = buildIceChannelGeometry(centerline, channel);
    expect(g.getAttribute('position').count / 3).toBeLessThan(60_000);
  });

  it('draws real bobsleigh races without marbles touching or jumping', { timeout: 120_000 }, () => {
    for (let seed = 0; seed < 2; seed += 1) {
      const entries = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, lane: (i * 7 + seed) % 20 }));
      const sim = simulatePhysicsRace({ seed: seed * 31 + 7, track, entries, level: 3 });
      const finish = new Map([...sim.results].sort((a, b) => a.finishTimeMs - b.finishTimeMs).map((r, rank) => [r.index, { rank, t: r.finishTimeMs }]));
      const crossedAt = new Map();
      const memory = {}; // as the 3D view: nudges carried from draw to draw
      let closest = Infinity;
      let biggestStep = 0;
      let prev = null;
      for (let k = 0; k < sim.frames.length - 1; k += 1) {
        for (let sub = 0; sub < 3; sub += 1) {
          const f = lerpFrame(sim.frames[k], sim.frames[k + 1], sub / 3);
          const pos = layoutMarbles(centerline, f, track.lane_count, finish, { crossedAt, channel, memory }).map((v) => v.clone());
          for (let i = 0; i < pos.length; i += 1) {
            for (let j = i + 1; j < pos.length; j += 1) closest = Math.min(closest, pos[i].distanceTo(pos[j]));
            if (prev) biggestStep = Math.max(biggestStep, pos[i].distanceTo(prev[i]));
          }
          prev = pos;
        }
      }
      // Until marbles collide (step 4) the whole pack can pile against the wall at the
      // lip together; the drawing keeps them apart to within an invisible 2 cm.
      expect(closest).toBeGreaterThanOrEqual(2 * MARBLE_RADIUS - 0.02);
      // 50/3 ms between draws at up to ~150 km/h is about 0.7 m; allow a small nudge on top, never a teleport.
      expect(biggestStep).toBeLessThan(1.4);
    }
  });
});
