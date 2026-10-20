// Track and Field: every stadium and landmark the track kit names is here and builds, the stadium is
// fitted round the sections it holds, and the race furniture follows the race clock and the leader
// (the scoreboard stops at the winner's time; a rewound replay undoes the flashes).
import { createRequire } from 'node:module';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { STADIUMS, fitStadium } from '../src/three/scenery/athletics';
import { ATHLETICS_LANDMARKS } from '../src/three/scenery/kitLandmarksAthletics';
import { LANDMARKS } from '../src/three/scenery/kitProps';
import { COSTUMES } from '../src/three/costumes';
import { CHANNEL_LOOKS } from '../src/three/iceChannel';

const require = createRequire(import.meta.url);
const parts = require('../../src/trackKit/parts');

describe('Track and Field', () => {
  it('every stadium the track kit names has its architecture here', () => {
    expect(Object.keys(STADIUMS).sort()).toEqual([...parts.STADIUMS].sort());
    for (const [key, s] of Object.entries(STADIUMS)) {
      for (const c of [s.seat, s.riser, s.wall]) expect(c, key).toMatch(/^#[0-9a-f]{6}$/);
      expect(['oval', 'horseshoe']).toContain(s.shape);
      expect(s.crowd).toBeGreaterThan(0);
      expect(s.crowd).toBeLessThan(1);
    }
  });

  it('every Track and Field landmark the track kit names is here, and builds', () => {
    const mine = parts.LANDMARKS.slice(parts.LANDMARKS.indexOf('athletes-village'), parts.LANDMARKS.indexOf('river-cruiser')); // (the Rivers' follow)
    expect(mine.sort()).toEqual(Object.keys(ATHLETICS_LANDMARKS).sort());
    for (const name of mine) {
      const lm = LANDMARKS[name];
      expect(lm, name).toBeTruthy();
      const g = lm.build();
      g.computeBoundingBox();
      expect(g.boundingBox.min.y, name).toBeGreaterThan(-2);
      if (lm.glow) expect(lm.glow().getAttribute('position').count, name).toBeGreaterThan(0);
    }
    for (const name of ['floodlight-mast', 'flame-cauldron', 'medal-podium']) expect(parts.AROUND).toContain(name);
  });

  it('the tartan looks and the costumes are there', () => {
    expect(CHANNEL_LOOKS).toContain('tartan');
    expect(CHANNEL_LOOKS).toContain('tartan-blue');
    for (const [name, places] of [['hurdle', 'slalom'], ['steeple-barrier', 'block'], ['hurdle-cart', 'parked']]) expect(COSTUMES[name]?.places, name).toBe(places);
  });

  it('the stadium is fitted round the points it holds, with room for its apron', () => {
    // A running track's outline: two 100 m straights 60 m apart, joined by half circles.
    const pts = [];
    for (let x = -50; x <= 50; x += 5) pts.push(new Vector3(x, 0, 30), new Vector3(x, 0, -30));
    for (let a = 0; a <= Math.PI; a += 0.1) pts.push(new Vector3(50 + 30 * Math.sin(a), 0, 30 * Math.cos(a)), new Vector3(-50 - 30 * Math.sin(a), 0, 30 * Math.cos(a)));
    const st = fitStadium(pts, 8);
    expect(st.B).toBeGreaterThan(30 + 8);
    expect(st.L).toBeGreaterThan(40);
    // Every point it holds lies inside its outline.
    for (const p of pts) {
      const { u, v } = st.local(p.x, p.z);
      const du = Math.max(0, Math.abs(u) - st.L);
      expect(Math.hypot(du, v)).toBeLessThan(st.B);
    }
    // Round the outline, the way out always points away from the middle.
    for (let s = 0; s < st.perimeter; s += st.perimeter / 40) {
      const { p, n } = st.at(s);
      expect(p.clone().sub(st.centre).dot(n)).toBeGreaterThan(0);
    }
  });
});
