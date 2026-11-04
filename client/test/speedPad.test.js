// The speed pad sound (Moses, 4 Nov 2026; src/sound/hits.js createPadDetector, engine.js speedPad): the old
// overtaking whoosh, only when the player's OWN marble rolls onto a speed pad, at most once per pad pass,
// never for other marbles; at the other effects' level, the music dipping under it.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAD, createPadDetector, padsOf } from '../src/sound/hits';
import { DUCK, PAD_LEVEL, SOUNDS, speedPad } from '../src/sound/engine';

const ARC = 1000;
const ROOM = 5;
const span = { arc: ARC, room: ROOM };
// A pad 300 m down the track, in the middle, 3.6 m either side; another at 600 m on the left (l -0.5).
const features = [{ type: 'boost', at: 0.3, l: 0, length: 8, halfWidth: 3.6 }, { type: 'boost', at: 0.6, l: -0.5, length: 8, halfWidth: 1 }, { type: 'bump', at: 0.4 }];
// A frame: marble 0 (the own one) at `own` metres, marble 1 at `other` metres, across at l0 / l1.
const frame = (t, own, other = 100, l0 = 0, l1 = 0) => ({ t, p: [own / ARC, other / ARC], l: [l0, l1] });
const detector = () => createPadDetector({ pads: padsOf(features, span), ...span });

describe('the speed pad sound', () => {
  it('reads the pads from the track, in metres (other features are not pads)', () => {
    expect(padsOf(features, span)).toEqual([{ s0: 300, x0: 0, half: 3.6 }, { s0: 600, x0: -2.5, half: 1 }]);
    expect(padsOf(undefined, span)).toEqual([]);
  });
  it('sounds once when the own marble rolls onto a pad, and not again on the same pass', () => {
    const d = detector();
    let n = 0;
    for (let k = 0; k <= 40; k += 1) if (d.step(frame(10000 + 50 * k, 290 + k), [0])) n += 1; // (290 m to 330 m)
    expect(n).toBe(1);
  });
  it('never for other marbles, even right next to the own one', () => {
    const d = detector();
    let n = 0;
    for (let k = 0; k <= 40; k += 1) if (d.step(frame(10000 + 50 * k, 200, 290 + k), [0])) n += 1;
    expect(n).toBe(0);
  });
  it('not when the own marble passes beside a pad (outside its width)', () => {
    const d = detector();
    let n = 0;
    for (let k = 0; k <= 40; k += 1) if (d.step(frame(10000 + 50 * k, 590 + k, 100, 0.2), [0])) n += 1; // (1 m right of the middle; the pad is at -2.5 m, 1 m wide)
    expect(n).toBe(0);
    const on = detector();
    for (let k = 0; k <= 40; k += 1) if (on.step(frame(10000 + 50 * k, 590 + k, 100, -0.5), [0])) n += 1;
    expect(n).toBe(1);
  });
  it('one per pad: two pads, two sounds; a jump in time or scrubbing back counts afresh', () => {
    const d = detector();
    let n = 0;
    for (let k = 0; k <= 400; k += 1) if (d.step(frame(10000 + 50 * k, 250 + k, 100, (250 + k) > 450 ? -0.5 : 0), [0])) n += 1;
    expect(n).toBe(2);
    expect(d.step(frame(5000, 295), [0])).toBe(false); // (scrubbed back: no crossing measured)
    expect(d.step(frame(5050, 302), [0])).toBe(true); // (over the pad again, in the replayed race)
    expect(d.step(frame(30000, 290), [0])).toBe(false);
    expect(d.step(frame(31000, 305), [0])).toBe(false); // (frames a second apart: a jump in time, not a crossing)
    expect(PAD.maxStepMs).toBeLessThan(1000);
  });
  it('a finished marble makes no sound; nothing before GO', () => {
    const d = detector();
    d.step({ t: -100, p: [0.299, 0], l: [0, 0] }, [0]);
    expect(d.step({ t: -50, p: [0.302, 0], l: [0, 0] }, [0])).toBe(false);
  });
  it('the whoosh file, at the other effects\' level, the music dipping; the live viewer plays it for the own marbles', () => {
    expect(SOUNDS.pad).toBe('speed-pad');
    for (const ext of ['webm', 'm4a']) expect(fs.existsSync(path.resolve(__dirname, `../public/audio/speed-pad.${ext}`))).toBe(true);
    expect(PAD_LEVEL).toBeGreaterThan(0.25);
    expect(PAD_LEVEL).toBeLessThan(0.6);
    expect(DUCK).toBeLessThan(1);
    expect(speedPad('x')).toBe(false); // (not unlocked in a test: nothing plays)
    const engine = fs.readFileSync(path.resolve(__dirname, '../src/sound/engine.js'), 'utf8');
    expect(engine).toContain("return play('pad', { gain: PAD_LEVEL, duck: true });");
    const view = fs.readFileSync(path.resolve(__dirname, '../src/components/LiveRaceViewer3D.jsx'), 'utf8');
    expect(view).toContain('if (pads.d?.step(f, ownRef.current)) speedPad(meta.raceId);');
    const script = fs.readFileSync(path.resolve(__dirname, '../../scripts/convert-audio.sh'), 'utf8');
    expect(script).toContain('"$OUT/speed-pad.m4a"');
    expect(script).toContain('MARBLES\\ OVERTAKING');
  });
});
