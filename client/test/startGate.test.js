import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { Matrix4 } from 'three';
import { MARBLE_RADIUS } from '../src/three/marbles';
import { gatePlaces, paddleSink, StartGate } from '../src/three/startGate';

const require = createRequire(import.meta.url);
const { physicsTrack } = require('../../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../../src/game/physicsSimulator');

const track = physicsTrack('bobsleigh-run');
const centerline = buildCenterline(track);
const channel = channelOf(track, centerline);
const entries = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, lane: i }));
const sim = simulatePhysicsRace({ seed: 5, track, entries, level: 3 });

describe('starting gate (3D)', () => {
  it('holds each paddle up during the countdown and sinks it just as its marble is let go', () => {
    expect(paddleSink(-2000, 300)).toBe(0);
    expect(paddleSink(0, 300)).toBe(0);
    expect(paddleSink(300, 300)).toBe(1);
    const mid = paddleSink(220, 300);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it('stands a paddle right in front of every waiting marble, square to the ice', () => {
    const places = gatePlaces(centerline, sim.frames[0], track.lane_count, channel);
    expect(places).toHaveLength(20);
    for (const pl of places) {
      // Square to the ice of the steep starting ramp (leaning with it, never past it).
      expect(pl.up.y).toBeGreaterThan(0.5);
      expect(Math.abs(pl.forward.dot(pl.up))).toBeLessThan(1e-6);
    }
    // Neighbours a marble's width apart: one paddle each, side by side.
    for (let i = 1; i < 20; i += 1) {
      const d = places[i].base.distanceTo(places[i - 1].base);
      expect(d).toBeGreaterThan(2 * MARBLE_RADIUS - 0.05);
      expect(d).toBeLessThan(4);
    }
  });

  it('lifts the frame over the line away once the last paddle is down, out of the cameras\' way', () => {
    const gate = new StartGate(gatePlaces(centerline, sim.frames[0], track.lane_count, channel), sim.start.releaseMs);
    const last = Math.max(...sim.start.releaseMs);
    gate.update(-1000);
    expect(gate.frameGroup.position.y).toBe(0);
    gate.update(last);
    expect(gate.frameGroup.position.y).toBe(0); // still there while marbles are being let go
    gate.update(last + 300);
    expect(gate.frameGroup.position.y).toBeGreaterThan(0);
    gate.update(last + 2000);
    expect(gate.frameGroup.visible).toBe(false);
    gate.update(-500); // a replay scrubbed back: there again
    expect(gate.frameGroup.visible).toBe(true);
    expect(gate.frameGroup.position.y).toBe(0);
  });

  it('is gone completely once every paddle has sunk', () => {
    const gate = new StartGate(gatePlaces(centerline, sim.frames[0], track.lane_count, channel), sim.start.releaseMs);
    gate.update(Math.max(...sim.start.releaseMs) + 50);
    const m = new Matrix4();
    for (let i = 0; i < 20; i += 1) {
      gate.paddles.getMatrixAt(i, m);
      expect(Math.abs(m.elements[0]) + Math.abs(m.elements[5]) + Math.abs(m.elements[10])).toBe(0);
    }
    gate.dispose();
  });
});
