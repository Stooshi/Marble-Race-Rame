// The Block Series: every world the track kit names has its colours and dressing here, the
// voxel land only ever lowers the land (never over the track), every block landmark builds,
// and the quiet effects follow the race clock and the leader (undone when a replay rewinds).
import { createRequire } from 'node:module';
import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BLOCK_WORLDS, blockDressing, makeBlockLand } from '../src/three/scenery/blocks';
import { BLOCK_LANDMARKS, buildBlockEffects } from '../src/three/scenery/kitLandmarksBlock';
import { LANDMARKS } from '../src/three/scenery/kitProps';
import { COSTUMES } from '../src/three/costumes';

const require = createRequire(import.meta.url);
const parts = require('../../src/trackKit/parts');

describe('Block Series worlds', () => {
  it('every world the track kit names has its colours and dressing here', () => {
    expect(Object.keys(BLOCK_WORLDS).sort()).toEqual([...parts.BLOCK_WORLDS].sort());
    for (const [key, w] of Object.entries(BLOCK_WORLDS)) {
      for (const c of [...w.tops, w.riser, w.deep, w.floor, w.bank, w.fill]) expect(c, key).toMatch(/^#[0-9a-f]{6}$/);
      expect(blockDressing(key).reduce((a, [, share]) => a + share, 0), key).toBeCloseTo(1, 5);
      for (const [make] of blockDressing(key)) for (const lite of [false, true]) expect(make(lite).getAttribute('color'), key).toBeTruthy();
    }
  });

  it('the voxel land steps away from the track and never rises', () => {
    const field = { clearance: (x) => Math.abs(x) };
    const land = makeBlockLand('meadow', field);
    for (let x = 0; x <= 80; x += 0.5) {
      for (const h of [-37.3, -2.2, 0, 3.7, 11.1, 25.9]) {
        const y = land.heightAt(x, 0, h);
        expect(y).toBeLessThanOrEqual(h + 1e-9);
        if (x < 14) expect(y).toBe(h); // (beside the track: the land as it was)
        if (x >= 26) expect(y / BLOCK_WORLDS.meadow.step).toBeCloseTo(Math.round(y / BLOCK_WORLDS.meadow.step), 9); // (whole steps)
      }
    }
  });
});

describe('Block Series landmarks', () => {
  it('every block landmark the track kit names is here, and builds (with its glow and moving parts)', () => {
    const block = parts.LANDMARKS.slice(parts.LANDMARKS.indexOf('spawn-beacon'));
    expect(block.sort()).toEqual(Object.keys(BLOCK_LANDMARKS).sort());
    for (const name of block) {
      const lm = LANDMARKS[name];
      expect(lm, name).toBeTruthy();
      const g = lm.build();
      g.computeBoundingBox();
      expect(g.boundingBox.min.y, name).toBeGreaterThan(-2); // (stands on the ground)
      if (lm.glow) expect(lm.glow().getAttribute('position').count, name).toBeGreaterThan(0);
      if (lm.moving) expect(lm.moving.build().getAttribute('position').count, name).toBeGreaterThan(0);
    }
    for (const name of ['settling-stack', 'voxel-peak', 'basalt-spire', 'beam-tower', 'level-pillars']) expect(parts.AROUND).toContain(name);
  });

  it('the block costumes are there, in their places', () => {
    for (const [name, places] of [['cube-pillar', 'slalom'], ['gem-pillar', 'slalom'], ['magma-pillar', 'slalom'], ['voxel-cube', 'block'], ['block-pieces', 'parked'], ['block-crane', 'swipe']]) {
      expect(COSTUMES[name]?.places, name).toBe(places);
    }
  });

  it('the effects follow the leader and the race clock, and a rewind undoes them', () => {
    const at = (name, p) => ({ name, foot: new Vector3(0, 0, 0), q: new Quaternion(), scale: 1, p });
    const fx = buildBlockEffects([at('clear-rows', 0.5), at('block-gate', 0.6), at('gg-arch', 1), at('drawbridge', 0.3), at('settling-stack', 0.4), at('combo-rows', 0.2), at('split-board', 0.9), at('block-portal', 0.7)]);
    expect(fx).toBeTruthy();
    const matrixY = (name, k) => {
      const mesh = fx.group.getObjectByName(name);
      return mesh.instanceMatrix.array[k * 16 + 13];
    };
    const scaleY = (name, k) => fx.group.getObjectByName(name).instanceMatrix.array[k * 16 + 5];
    // Before the leader comes: the gate's blocks hang high, the rows are full.
    fx.update(1000, { frame: { p: [0.1, 0.05] } });
    const high = matrixY('gate blocks', 0);
    expect(scaleY('clear rows: clearing', 0)).toBeCloseTo(1, 5);
    // The leader passes: the rows clear, the gate's blocks drop into place.
    fx.update(30_000, { frame: { p: [0.62, 0.5] } });
    fx.update(33_000, { frame: { p: [0.64, 0.52] } });
    expect(scaleY('clear rows: clearing', 0)).toBeLessThan(0.01);
    expect(matrixY('gate blocks', 0)).toBeLessThan(high - 10);
    // Rewound: as before.
    fx.update(1000, { frame: { p: [0.1, 0.05] } });
    expect(scaleY('clear rows: clearing', 0)).toBeCloseTo(1, 5);
    expect(matrixY('gate blocks', 0)).toBeCloseTo(high, 5);
    // The same moment always looks the same (every viewer, every replay).
    fx.update(12_345, { frame: { p: [0.45] } });
    const a = Array.from(fx.group.getObjectByName('settling stack').instanceMatrix.array);
    fx.update(12_345, { frame: { p: [0.45] } });
    expect(Array.from(fx.group.getObjectByName('settling stack').instanceMatrix.array)).toEqual(a);
    expect(buildBlockEffects([at('cube-cottage', 0.5)])).toBe(null);
  });
});
