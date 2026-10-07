import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf, placeOnChannel } from '../src/three/iceChannel';
import { bearPaw, buildTrackFeatures } from '../src/three/trackFeatures';
import { layoutMarbles } from '../src/three/marbles';
import { frameAtTime } from '../src/utils/splits';

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

  it('draws them all within the phone budget: one mesh per material, plus the bear\'s arm (effects only while showing)', () => {
    let meshes = 0;
    built.group.traverse((o) => { if (o.isMesh && o.visible) meshes += 1; });
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

  it('never draws a marble inside an obstacle, and puffs snow where one hits', () => {
    const { simulatePhysicsRace } = require('../../src/game/physicsSimulator');
    const entries = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, lane: i, topSpeed: 50, acceleration: 50 }));
    const sim = simulatePhysicsRace({ seed: 21, track, entries, level: 3 });
    const out = [];
    const contacts = [];
    let touched = 0;
    let worst = Infinity;
    for (let t = 0; t < sim.durationMs; t += 25) { // 40 draws a second, between the 20 frames a second
      const f = frameAtTime(sim.frames, sim.tickMs, t);
      contacts.length = 0;
      layoutMarbles(centerline, f, track.lane_count, null, { channel, out, separate: false, solids: built.solidsAt(t), contacts });
      touched += contacts.length;
      // Drawn, every marble stays clear of every obstacle (measured in 3D against
      // points along the obstacle's footprint, where it stands on the ice).
      const room = channel.maxAngle * channel.radius;
      for (const o of built.solidsAt(t)) {
        const pts = [];
        for (let x = o.xa; x <= o.xb + 1e-9; x += 0.1) pts.push(placeOnChannel(centerline, channel, o.s / channel.arc, Math.max(-1, Math.min(1, x / room)), 0, 0, 0.55));
        for (let i = 0; i < 20; i += 1) {
          if (f.p[i] >= 1 || Math.abs(f.p[i] * channel.arc - o.s) > 4 || f.h[i] > 0.3) continue;
          const d = Math.min(...pts.map((q) => q.distanceTo(out[i])));
          if (Math.abs(o.xa) > room || Math.abs(o.xb) > room) continue; // the bear's paw beyond the rim
          // Along the wall the physics keeps them a reach apart; marble and footprint both sit
          // 0.55 m in from the curved wall, where straight-line distances are (R - 0.55) / R as long.
          worst = Math.min(worst, d - o.reach * ((channel.radius - 0.55) / channel.radius));
        }
      }
    }
    expect(worst).toBeGreaterThan(-0.1);
    expect(touched).toBeGreaterThan(50); // plenty of hits to puff at
    built.update(1000, { frame: frameAtTime(sim.frames, sim.tickMs, 1000), positions: out, contacts: [{ index: 0, solid: built.solidsAt(1000)[0] }] });
    const shown = built.group.children.filter((c) => c.isMesh && c.visible && c.material.color?.getHexString() === 'ffffff' && c.material.transparent);
    expect(shown.length).toBeGreaterThan(0); // a puff
  });

  it('flashes a boost pad and streaks a marble that rolls onto it', () => {
    const pad = track.physics.features.find((f) => f.type === 'boost');
    const room = channel.maxAngle * channel.radius;
    const frameAt = (p) => ({ t: 0, p: [p], l: [(pad.l * channel.maxAngle * channel.radius) / room], h: [0], v: [30], s: [0] });
    const at = (p) => [placeOnChannel(centerline, channel, p, pad.l, 0, 0, 0.55)];
    built.update(5000, { frame: { ...frameAt(pad.at - 2 / channel.arc), t: 5000 }, positions: at(pad.at - 2 / channel.arc), contacts: [] });
    built.update(5050, { frame: { ...frameAt(pad.at + 2 / channel.arc), t: 5050 }, positions: at(pad.at + 2 / channel.arc), contacts: [] });
    const glowing = built.group.children.filter((c) => c.isMesh && c.visible && c.material.blending === 2);
    expect(glowing.length).toBeGreaterThanOrEqual(2); // the pad's flash and the marble's streak
    built.update(7000, { frame: { ...frameAt(pad.at + 60 / channel.arc), t: 7000 }, positions: at(pad.at + 60 / channel.arc), contacts: [] });
    expect(built.group.children.filter((c) => c.isMesh && c.visible && c.material.blending === 2)).toHaveLength(0); // gone again
  });

  it('draws nothing on tracks without features', () => {
    expect(buildTrackFeatures(centerline, channel, [])).toBeNull();
    expect(buildTrackFeatures(centerline, null, track.physics.features)).toBeNull();
  });
});
