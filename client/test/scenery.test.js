import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { buildTerrain, makeHeightField } from '../src/three/scenery/terrain';
import { placeHouses, sanFranciscoLayout } from '../src/three/scenery/sanFrancisco';
import { themeFor } from '../src/three/themes';

// The real San Francisco track, straight from its data update.
const sql = fs.readFileSync(path.resolve(__dirname, '../../docs/data_updates/2026-10-05-add-san-francisco.sql'), 'utf8');
const sf = { slug: 'san-francisco', length_m: 800, lane_count: 5, waypoints: JSON.parse(sql.match(/'(\[\{"x".*?\])'/)[1]) };
const centerline = buildCenterline(sf);
const layout = sanFranciscoLayout(centerline);
const field = makeHeightField(centerline, sf.lane_count, { hillHeight: 34, landRadius: 340, seaLevel: -1.2, water: layout.water });
// The ground as drawn (same settings as buildSanFrancisco).
const { minX, maxX, minZ, maxZ } = layout.bounds;
const { groundAt } = buildTerrain(field, { minX: minX - 380, maxX: maxX + 380, minZ: minZ - 380, maxZ: maxZ + 380 }, { cells: 80 });
const houses = () => placeHouses(centerline, field, layout, { groundAt });

describe('San Francisco scenery', () => {
  it('keeps the drawn ground under the road across its whole width', () => {
    let worst = -Infinity;
    for (const s of centerline.samples) {
      for (const off of [-field.roadHalf, -2, 0, 2, field.roadHalf]) {
        const x = s.pos.x + s.side.x * off;
        const z = s.pos.z + s.side.z * off;
        worst = Math.max(worst, field.heightAt(x, z) - s.pos.y, groundAt(x, z) - s.pos.y);
      }
    }
    expect(worst).toBeLessThanOrEqual(-0.5); // always at least half a metre below the road
  });

  it('never puts a house on the track, in the water or inside another house', { timeout: 30_000 }, () => {
    const { near, far } = houses();
    const all = [...near, ...far];
    expect(near.length).toBeGreaterThan(200);
    expect(far.length).toBeGreaterThan(400);
    expect(Math.min(...all.map((h) => field.nearest(h.x, h.z)))).toBeGreaterThanOrEqual(field.roadHalf + 6.5);
    expect(Math.min(...all.map((h) => h.y))).toBeGreaterThan(0.5);
    let closest = Infinity;
    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        closest = Math.min(closest, Math.hypot(all[i].x - all[j].x, all[i].z - all[j].z));
      }
    }
    expect(closest).toBeGreaterThanOrEqual(7 - 1e-6);
  });

  it('builds the same city on every visit', () => {
    expect(houses()).toEqual(houses());
  });

  it('ends at the waterfront: open water just past the finish line', () => {
    const end = centerline.samples[centerline.samples.length - 1];
    const ahead = (m) => field.heightAt(end.pos.x + end.tangent.x * m, end.pos.z + end.tangent.z * m);
    expect(ahead(50)).toBeLessThan(-1.2); // below the bay's surface
  });

  it('stays within a phone budget', () => {
    const { near, far } = houses();
    // About 54 triangles per detailed house, 18 per hill house, 12,800 for the terrain.
    expect(near.length * 54 + far.length * 18 + 12_800).toBeLessThan(80_000);
  });
});

describe('themes', () => {
  it('only San Francisco has scenery so far; other tracks keep the default look', () => {
    expect(themeFor('san-francisco').scenery).toBe('san-francisco');
    for (const slug of ['meadow-loop', 'canyon-drop', 'volcano-run', undefined]) expect(themeFor(slug).scenery).toBeNull();
  });
});
