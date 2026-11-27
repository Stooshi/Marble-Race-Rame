// The Grand Prix pieces: five start lights instead of 3-2-1, kerbs on the bends,
// grandstands whose crowds stand up as marbles pass, barriers, the finish building
// and fireworks once the winner is home. Thinner crowds on phones.
import { createRequire } from 'node:module';
import { Color, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { bendSegments, buildIceChannelGeometry, channelOf, KERB_COLORS } from '../src/three/iceChannel';
import { gatePlaces, START_LIGHTS, startLightsOn, StartGate } from '../src/three/startGate';
import { buildScenery } from '../src/three/scenery';
import { themeFor } from '../src/three/themes';

const require = createRequire(import.meta.url);
const { GALLERIES } = require('../../scripts/dump-kit-track');
const { physicsTrack } = require('../../src/game/physicsTracks');
const { simulatePhysicsRace } = require('../../src/game/physicsSimulator');

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => null, width: 0, height: 0 }) };

const gp = GALLERIES['grand-prix-gallery']();
const plain = physicsTrack('kit-proving-ground');

const named = (group, name) => {
  const out = [];
  group.traverse((o) => { if (o.name === name) out.push(o); });
  return out;
};

describe('Grand Prix start lights', () => {
  it('come on one by one over the last three seconds and all go out at GO', () => {
    expect(START_LIGHTS).toBe(5);
    expect(startLightsOn(-5000)).toBe(0);
    expect(startLightsOn(-3000)).toBe(1);
    expect(startLightsOn(-2400)).toBe(2);
    expect(startLightsOn(-1300)).toBe(3);
    expect(startLightsOn(-700)).toBe(4);
    expect(startLightsOn(-1)).toBe(5);
    expect(startLightsOn(0)).toBe(0);
    expect(startLightsOn(4000)).toBe(0);
  });

  it('light up on the gantry over the gate (a Grand Prix track only)', () => {
    const centerline = buildCenterline(gp);
    const channel = channelOf(gp, centerline);
    const entries = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, lane: i }));
    const sim = simulatePhysicsRace({ seed: 3, track: gp, entries, level: 3 });
    const places = gatePlaces(centerline, sim.frames[0], gp.lane_count, channel);
    const red = new Color('#ff2a18');
    const lit = (gate) => {
      const c = new Color();
      let n = 0;
      for (let k = 0; k < START_LIGHTS * 2; k += 1) { gate.lamps.getColorAt(k, c); if (Math.abs(c.r - red.r) < 1e-3 && Math.abs(c.g - red.g) < 1e-3) n += 1; }
      return n;
    };
    const gate = new StartGate(places, sim.start.releaseMs, { lights: true });
    expect(gate.lamps.count).toBe(START_LIGHTS * 2);
    gate.update(-1500);
    expect(lit(gate)).toBe(2 * startLightsOn(-1500));
    gate.update(-10);
    expect(lit(gate)).toBe(10);
    gate.update(20);
    expect(lit(gate)).toBe(0);
    expect(new StartGate(places, sim.start.releaseMs).lamps).toBeUndefined();
  });
});

describe('Grand Prix channel', () => {
  it('has red-and-white kerbs along the top of the walls on the bends, and none on straights or other tracks', () => {
    const kerbColours = (track) => {
      const centerline = buildCenterline(track);
      const g = buildIceChannelGeometry(centerline, channelOf(track, centerline));
      const col = g.getAttribute('color');
      const red = new Color(KERB_COLORS.kerbA);
      let n = 0;
      for (let k = 0; k < col.count; k += 1) if (Math.abs(col.getX(k) - red.r) < 1e-4 && Math.abs(col.getY(k) - red.g) < 1e-4 && Math.abs(col.getZ(k) - red.b) < 1e-4) n += 1;
      return { n, centerline };
    };
    const { n, centerline } = kerbColours(gp);
    expect(n).toBeGreaterThan(1000);
    expect(kerbColours(plain).n).toBe(0);
    const bends = bendSegments(centerline, 200);
    expect(bends.some(Boolean)).toBe(true);
    expect(bends.every(Boolean)).toBe(false);
  });
});

describe('Grand Prix scenery', () => {
  const build = (lite) => buildScenery(themeFor(gp.slug, gp), buildCenterline(gp), gp, { lite });

  it('has grandstands with crowds, barriers, a finish building and (hidden) fireworks; none on other tracks', () => {
    const s = build(false);
    expect(named(s, 'crowds').length).toBeGreaterThan(0);
    expect(named(s, 'fireworks')).toHaveLength(1);
    expect(named(s, 'fireworks')[0].visible).toBe(false);
    const other = buildScenery(themeFor(plain.slug, plain), buildCenterline(plain), plain, { lite: false });
    expect(named(other, 'crowds')).toHaveLength(0);
    expect(named(other, 'fireworks')).toHaveLength(0);
  });

  it('thinner crowds on phones', () => {
    const corners = (s) => named(s, 'crowds').reduce((n, m) => n + m.geometry.getAttribute('position').count, 0);
    const computer = corners(build(false));
    const phone = corners(build(true));
    expect(phone).toBeGreaterThan(0);
    expect(phone).toBeLessThan(computer / 2.5);
  });

  it('a stand gets to its feet as marbles pass it, and the fireworks go up once the winner is home', () => {
    const s = build(false);
    const crowd = named(s, 'crowds')[0];
    const stand = new Vector3();
    crowd.geometry.computeBoundingSphere();
    stand.copy(crowd.geometry.boundingSphere.center);
    const excite = () => {
      let u = null;
      // (the material's uniforms ride on its compile hook; read them through a fake compile)
      const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>' };
      crowd.material.onBeforeCompile(shader);
      u = shader.uniforms.uExcite.value;
      return Math.max(...u);
    };
    s.userData.update(1000, { positions: [new Vector3(1e5, 0, 1e5)], frame: { p: [0.5] } });
    expect(excite()).toBe(0);
    s.userData.update(1050, { positions: [stand.clone()], frame: { p: [0.5] } });
    s.userData.update(3000, { positions: [stand.clone()], frame: { p: [0.5] } });
    expect(excite()).toBeGreaterThan(0.5);
    const fw = named(s, 'fireworks')[0];
    s.userData.update(50000, { positions: [], frame: { p: [0.9, 0.8] } });
    expect(fw.visible).toBe(false);
    s.userData.update(50050, { positions: [], frame: { p: [1, 0.9] } });
    s.userData.update(51000, { positions: [], frame: { p: [1, 0.95] } });
    expect(fw.visible).toBe(true);
  });
});
