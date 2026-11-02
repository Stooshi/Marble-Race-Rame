// The loop (Moses, 2 Nov 2026): drawn where the physics has it. The 3D view's copy of the loop's
// shape agrees with the physics' to the bit, a marble in the loop is drawn on its path (upside down at the
// top), the track under it isn't drawn, and the follow camera watches it from beside the loop.
import { describe, expect, it } from 'vitest';
import { buildCenterline } from '../src/three/trackModel';
import { buildIceChannelGeometry, channelOf, loopView, LOOP_VIEW, placeOnChannel } from '../src/three/iceChannel';
import { loopShape } from '../src/three/loopShape';
import fs from 'node:fs';
import path from 'node:path';
import { createLoopDetector } from '../src/sound/hits';
import { LOOP_STRENGTH, SOUNDS, marbleLoop } from '../src/sound/engine';
import { apronStyle, loopSteel } from '../src/three/finishApron';
import { underLoop } from '../src/three/scenery/coaster';

const { mirror } = require('../../src/trackKit');

const server = require('../../src/game/loopShape');
const { physicsTrack } = require('../../src/game/physicsTracks');

const track = physicsTrack('variety-layout-loop-run');
const centerline = buildCenterline(track);
const channel = channelOf(track, centerline);

describe('the loop', () => {
  it('has the physics\' shape exactly', () => {
    for (const opts of [{ topRadius: 6, shift: 11, runout: 40 }, { topRadius: 4.5, shift: 12, runout: 30 }]) {
      const a = loopShape(opts);
      const b = server.loopShape(opts);
      for (const k of ['u', 'f', 'z', 'q', 'phi', 'kappa']) expect(Array.from(a[k])).toEqual(Array.from(b[k]));
      for (const u of [0, 10, a.rise, 50, 2 * a.rise, a.length]) {
        expect(a.lipAt(u, 1.4)).toBe(b.lipAt(u, 1.4));
        expect(a.netLanding(u)).toBe(b.netLanding(u));
      }
    }
  });

  it('stands where the physics has it, and carries a marble round its path, upside down at the top', () => {
    const [L] = channel.loops;
    const f = track.physics.features.find((x) => x.type === 'loop');
    expect(L.s0).toBeCloseTo(f.at * channel.arc, 6);
    const ground = placeOnChannel(centerline, channel, L.s0 / channel.arc, 0, 0, 0, 0.55);
    const atTop = (L.s0 + L.shape.rise / L.stretch) / channel.arc;
    const top = placeOnChannel(centerline, channel, atTop, 0, 0, 0, 0.55);
    // Up at the top, on the underside of the floor: about the loop's height less the marble's radius above the ground there.
    expect(top.y - ground.y).toBeGreaterThan(L.shape.height - 4);
    expect(top.y - ground.y).toBeLessThan(L.shape.height + 1);
    // Back down at the end of its run-out, in line with the track again.
    const end = placeOnChannel(centerline, channel, (L.s1 - 0.01) / channel.arc, 0, 0, 0, 0.55);
    const after = placeOnChannel(centerline, channel, (L.s1 + 0.01) / channel.arc, 0, 0, 0, 0.55);
    expect(end.distanceTo(after)).toBeLessThan(0.1);
    // Falling into the net (h above 0 in the loop): lower than it was, towards the way down.
    const falling = placeOnChannel(centerline, channel, atTop, 0, 0, 5, 0.55);
    expect(falling.y).toBeCloseTo(top.y - 5, 1);
  });

  it('is drawn in the channel\'s one geometry (no extra draw call), the track under it left out', () => {
    const g = buildIceChannelGeometry(centerline, channel);
    const pos = g.getAttribute('position');
    const [L] = channel.loops;
    // Something is drawn up at the loop's top.
    const top = placeOnChannel(centerline, channel, (L.s0 + L.shape.rise / L.stretch) / channel.arc, 0, 0, 0, 0);
    let near = 0;
    for (let i = 0; i < pos.count; i += 1) if (Math.hypot(pos.getX(i) - top.x, pos.getY(i) - top.y, pos.getZ(i) - top.z) < 2) near += 1;
    expect(near).toBeGreaterThan(20);
  });

  it('the follow camera eases out beside the loop, holds there all the way round, and eases back', () => {
    const [L] = channel.loops;
    expect(loopView(centerline, channel, L.s0 - LOOP_VIEW.before - 1)).toBeNull();
    expect(loopView(centerline, channel, L.s0 - LOOP_VIEW.before / 2).w).toBeCloseTo(0.5, 5);
    for (const u of [0, L.shape.rise, 2 * L.shape.rise]) expect(loopView(centerline, channel, L.s0 + u / L.stretch).w).toBe(1);
    const v = loopView(centerline, channel, L.s0 + L.shape.rise / L.stretch);
    // Out to the side the loop doesn't lean to, about as high as its top (to see over the track's banks).
    expect(v.cam.distanceTo(v.centre)).toBeGreaterThan(29);
    expect(v.cam.y - v.centre.y).toBeGreaterThan(L.shape.height * 0.4);
    // Held on into the run-out, then easing back, gone before the next stretch.
    expect(loopView(centerline, channel, L.s0 + (2 * L.shape.rise + LOOP_VIEW.hold - 1) / L.stretch).w).toBe(1);
    expect(loopView(centerline, channel, L.s1 + LOOP_VIEW.hold + LOOP_VIEW.after + 1)).toBeNull();
  });

  it('leans to its side, and the other way on a mirrored track (its banks, its camera and its net with it)', () => {
    const left = loopShape({ side: 'left' });
    const right = loopShape({ side: 'right' });
    expect(left.lean).toBe(1);
    expect(right.lean).toBe(-1);
    const top = left.at(left.rise).i;
    expect(right.q[top]).toBeCloseTo(-left.q[top], 9);
    const m = mirror(track, { slug: 'loop-mirror', name: 'Loop mirror' });
    expect(m.physics.features.find((f) => f.type === 'loop').side).toBe('right');
    const mc = buildCenterline(m);
    const mch = channelOf(m, mc);
    const [L] = mch.loops;
    const v = loopView(mc, mch, L.s0 + L.shape.rise / L.stretch);
    // (The camera on the side it doesn't lean to: the track's left on the mirrored track.)
    const side = mc.samples[Math.round(((L.s0 + L.shape.f[L.shape.at(L.shape.rise).i]) / mch.arc) * mc.segments)].side;
    expect((v.cam.x - v.centre.x) * side.x + (v.cam.z - v.centre.z) * side.z).toBeGreaterThan(20);
    expect(buildIceChannelGeometry(mc, mch).getAttribute('position').count).toBeGreaterThan(0);
  });

  it('on a coaster: no rails, spine or ties drawn under it, where its own path is drawn', () => {
    const [L] = channel.loops;
    const step = channel.arc / centerline.segments;
    expect(underLoop(channel, Math.round((L.s0 + 10) / step), step)).toBe(true);
    expect(underLoop(channel, Math.round((L.s0 - 10) / step), step)).toBe(false);
    expect(underLoop(channel, Math.round((L.s1 + 10) / step), step)).toBe(false);
  });

  it('its steel in the series\' colours, as the finish apron', () => {
    expect(loopSteel({ kind: 'kerb', a: '#d8322b', b: '#f4f4f2' }).leg).toBe('#d8322b');
    expect(loopSteel({ kind: 'neon', a: '#ff00ff', b: '#00ffff' }).leg).toBe('#ff00ff');
    expect(loopSteel({ kind: 'chequer', a: '#1d1f24', b: '#f4f4f2' }).leg).toBe('#1d1f24');
    expect(loopSteel(apronStyle('nowhere'), { coaster: { colours: { support: '#2f5d9a' } } }).leg).toBe('#2f5d9a');
    expect(loopSteel(apronStyle('nowhere', '#88aa66')).leg).toBe(apronStyle('nowhere', '#88aa66').a);
  });

  it('the player\'s own marble going round it: its swoosh once, as it goes in, at the hits\' level', () => {
    const d = createLoopDetector();
    const at = (t, p) => ({ t, p });
    expect(d.step(at(0, [0.27, 0.27]), [0], [0.28])).toBe(false);
    expect(d.step(at(50, [0.279, 0.29]), [0], [0.28])).toBe(false); // (another marble in: not the player's)
    expect(d.step(at(100, [0.2805, 0.3]), [0], [0.28])).toBe(true);
    expect(d.step(at(150, [0.29, 0.31]), [0], [0.28])).toBe(false); // (once)
    expect(d.step(at(50, [0.279, 0.29]), [0], [0.28])).toBe(false); // (scrubbed back: afresh)
    expect(d.step(at(100, [0.281, 0.3]), [0], [0.28])).toBe(true);
    expect(SOUNDS.loop).toBe('marble-loop');
    expect(LOOP_STRENGTH).toBeGreaterThan(0);
    expect(marbleLoop('x')).toBe(false); // (not unlocked in a test: nothing plays)
    for (const ext of ['webm', 'm4a']) expect(fs.existsSync(path.resolve(__dirname, `../public/audio/marble-loop.${ext}`))).toBe(true);
    const view = fs.readFileSync(path.resolve(__dirname, '../src/components/LiveRaceViewer3D.jsx'), 'utf8');
    expect(view).toContain('if (loops.d.step(f, ownRef.current, loops.starts)) marbleLoop(meta.raceId);');
  });
});
