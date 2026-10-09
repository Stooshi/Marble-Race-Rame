// Lighting and weather presets (kit tracks): each changes the sky, sun and haze over
// the track's own landscape, night stays watchable, phones get far fewer particles,
// a ?lighting= override only works for presets the track allows, and today's tracks
// keep their own looks.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { channelOf } from '../src/three/iceChannel';
import { themeFor, THEMES } from '../src/three/themes';
import { allowedLightings, buildEffects, LIGHTINGS, PRESETS, withPreset } from '../src/three/lighting';

const require = createRequire(import.meta.url);
const { PHYSICS_TRACKS } = require('../../src/game/physicsTracks');
const server = require('../../src/trackKit/lighting');

const anything = new Proxy(function stub() {}, { get: () => anything, apply: () => anything, set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => anything, width: 0, height: 0 }) };

const track = PHYSICS_TRACKS.find((t) => t.slug === 'kit-proving-ground');
const as = (lighting) => ({ ...track, physics: { ...track.physics, kit: { ...track.physics.kit, lighting } } });

describe('lighting presets', () => {
  it('the view knows exactly the presets the server picks from', () => {
    expect(LIGHTINGS).toEqual(server.LIGHTINGS);
    expect(Object.keys(PRESETS).sort()).toEqual([...LIGHTINGS].sort());
    expect(allowedLightings(track.physics.kit)).toEqual(server.allowedLightings(track.physics.kit));
  });

  it('each preset gives the kit track its own sky and light over the same landscape', () => {
    const day = themeFor(track.slug, as('day'));
    const skies = new Set();
    for (const name of LIGHTINGS) {
      const theme = themeFor(track.slug, as(name));
      expect(theme.lighting).toBe(name);
      expect(theme.scenery).toBe('kit');
      skies.add(`${theme.sky.top}|${theme.sun.intensity}`);
    }
    expect(skies.size).toBe(LIGHTINGS.length);
    expect(themeFor(track.slug, as('fog')).fogRange[1]).toBeLessThan(400);
    // Night: darker light, and the marbles and rims light up.
    const night = themeFor(track.slug, as('night-northern-lights'));
    expect(night.sun.intensity).toBeLessThan(day.sun.intensity / 2);
    expect(night.effects).toMatchObject({ stars: true, aurora: true, night: true });
  });

  it('today\'s tracks keep their own looks (no preset touches them)', () => {
    for (const [slug, own] of Object.entries(THEMES)) {
      const t = PHYSICS_TRACKS.find((x) => x.slug === slug);
      const theme = themeFor(slug, t ?? null);
      expect(theme.sky).toEqual(own.sky);
      expect(theme.effects).toBeUndefined();
    }
  });

  it('night, snow and rain build their effects; phones get far fewer flakes and drops', () => {
    const centerline = buildCenterline(track);
    const channel = channelOf(track, centerline);
    const count = (theme, lite) => {
      const fx = buildEffects(theme, { centerline, channel, lite });
      let n = 0;
      fx.world.traverse((o) => { if (o.name === 'snow' || o.name === 'rain') n = o.geometry.getAttribute('position').count; });
      fx.update(12.5, { x: 10, y: 20, z: 30 });
      return { fx, n };
    };
    for (const name of ['snow', 'rain']) {
      const theme = withPreset(themeFor(track.slug, as('day')), name);
      const computer = count(theme, false).n;
      const phone = count(theme, true).n;
      expect(phone).toBeGreaterThan(0);
      expect(phone).toBeLessThan(computer / 4);
    }
    const night = buildEffects(themeFor(track.slug, as('night-northern-lights')), { centerline, channel });
    const names = [];
    night.sky.traverse((o) => names.push(o.name));
    night.world.traverse((o) => names.push(o.name));
    expect(names).toEqual(expect.arrayContaining(['stars', 'aurora', 'edge lights']));
    expect(buildEffects(themeFor(track.slug, as('day')), { centerline, channel })).toBeNull();
    expect(buildEffects(themeFor(track.slug, as('sunset')), { centerline, channel })).toBeNull();
  });

  it('snow falls and stays round the camera', () => {
    const theme = withPreset(themeFor(track.slug, as('day')), 'snow');
    const fx = buildEffects(theme, {});
    const snow = fx.world.children.find((o) => o.name === 'snow');
    const at = { x: 500, y: 120, z: -300 };
    fx.update(3, at);
    const a = Array.from(snow.geometry.getAttribute('position').array);
    fx.update(4, at);
    const b = Array.from(snow.geometry.getAttribute('position').array);
    for (let k = 0; k < a.length; k += 3) {
      expect(Math.abs(a[k] - at.x)).toBeLessThanOrEqual(35.01);
      expect(Math.abs(a[k + 1] - at.y)).toBeLessThanOrEqual(20.01);
    }
    expect(a.some((v, k) => v !== b[k])).toBe(true);
  });
});
