// Canyons (the Canyon Series): the canyon shaped into the land round the track never rises over
// any stretch of track, its walls stand where they should, its river runs below the floor, and
// what spans the gorge stays high above the track.
import { createRequire } from 'node:module';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { coasterFlight } from '../src/three/scenery/coaster';
import { CANYON_PALETTES, canyonDressing, makeCanyon } from '../src/three/scenery/canyon';
import { buildKitGround } from '../src/three/scenery/kitGround';
import { buildCanyonSpans } from '../src/three/scenery/canyonSpans';
import { trackCorridor } from '../src/three/scenery/clearCheck';

const require = createRequire(import.meta.url);
const { PHYSICS_TRACKS } = require('../../src/game/physicsTracks');
const { CANYONS } = require('../../src/trackKit/parts');

const canyons = PHYSICS_TRACKS.filter((t) => t.physics.kit?.canyon && !t.slug.startsWith('variety-'));

it('every canyon palette the track kit names has its colours and dressing here', () => {
  expect(Object.keys(CANYON_PALETTES).sort()).toEqual([...CANYONS].sort());
  for (const key of CANYONS) {
    const p = CANYON_PALETTES[key];
    expect(p.strata.length).toBeGreaterThan(3);
    for (const k of ['ledge', 'floor', 'bar', 'top', 'top2', 'water', 'foam', 'bank']) expect(p[k], `${key}.${k}`).toMatch(/^#[0-9a-f]{6}$/);
    expect(canyonDressing(key).reduce((a, [, share]) => a + share, 0)).toBeCloseTo(1, 5);
  }
});

describe.each(canyons.map((t) => [t.slug, t]))('%s', (slug, track) => {
  const centerline = buildCenterline(track);
  const channel = channelOf(track, centerline);
  const kit = track.physics.kit;
  const flight = coasterFlight(centerline, channel, kit);
  const xs = centerline.samples.map((s) => s.pos.x);
  const zs = centerline.samples.map((s) => s.pos.z);
  const bounds = { minX: Math.min(...xs) - 480, maxX: Math.max(...xs) + 480, minZ: Math.min(...zs) - 480, maxZ: Math.max(...zs) + 480 };
  const canyon = makeCanyon(centerline, channel, kit, { flight, liftAt: () => 1.6, bounds, landRadius: 480, seaLevel: -60 });
  const { samples, segments } = centerline;
  const step = channel.arc / segments;

  it('has walls along most of the way, none at the gate or the finish', () => {
    expect(canyon.walls[0]).toBe(0);
    expect(canyon.walls[segments]).toBe(0);
    const standing = canyon.walls.filter((w) => w > 0.9).length / canyon.walls.length;
    expect(standing).toBeGreaterThan(0.35);
  });

  it('never rises over the track: beside every stretch the land is no higher than its floor', { timeout: 120_000 }, () => {
    for (let i = 0; i <= segments; i += Math.max(1, Math.round(6 / step))) {
      const s = samples[i];
      const side = new Vector3(s.side.x, 0, s.side.z).normalize();
      for (const d of [-12, -8, 8, 12]) {
        const p = s.pos.clone().addScaledVector(side, d);
        const h = canyon.heightAt(p.x, p.z, canyon.floorAt(i));
        expect(h, `${Math.round(i * step)} m, ${d} m across`).toBeLessThanOrEqual(canyon.floorAt(i) + 0.05);
      }
    }
  });

  it('rises to the rim beyond the walls where they stand', () => {
    let checked = 0;
    for (let i = 0; i <= segments; i += Math.max(1, Math.round(25 / step))) {
      if (canyon.walls[i] < 0.99) continue;
      const s = samples[i];
      const side = new Vector3(s.side.x, 0, s.side.z).normalize();
      const sign = -(canyon.riverSign || 1);
      const p = s.pos.clone().addScaledVector(side, sign * (canyon.rimOut(i, sign) + 2));
      const h = canyon.heightAt(p.x, p.z, canyon.floorAt(i));
      // (A tight bend's inside or another stretch nearby can hold it lower; most of the way it reaches the rim.)
      if (h > canyon.floorAt(i) + canyon.depth * 0.4) checked += 1;
      else checked -= 0.25;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('keeps its river below the floor', () => {
    if (!canyon.riverSign) return;
    for (let i = 0; i <= segments; i += 10) expect(canyon.waterAt(i)).toBeLessThan(canyon.floorAt(i));
  });

  it('builds its ground on phones and computers, the river too (drawn with the banks)', { timeout: 180_000 }, () => {
    for (const lite of [false, true]) {
      const ground = buildKitGround(centerline, track, { lite });
      expect(ground.canyon).toBeTruthy();
      expect(ground.group.getObjectByName('terrain')).toBeTruthy();
      if (canyon.riverSign) expect(ground.canyon.riverTriangles({ lite }).pos.length).toBeGreaterThan(300);
    }
  });

  it('spans the gorge high over the track', { timeout: 180_000 }, () => {
    if (!kit.sections.some((s) => (s.overhead ?? []).some((k) => ['prayer-flags', 'arch-bridge', 'railway-trestle', 'suspension-bridge'].includes(k)))) return;
    const ground = buildKitGround(centerline, track, { lite: false });
    const corridor = trackCorridor(centerline, channel);
    const { group } = buildCanyonSpans(centerline, kit, { canyon: ground.canyon, groundAt: ground.groundAt, corridor });
    const mesh = group.getObjectByName('canyon spans');
    expect(mesh).toBeTruthy();
    expect(corridor.hits(mesh.geometry, { margin: 0.5 })).toBe(false);
  });
});
