import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { COUNTDOWN_MS, countdownPose, smoothCurve } from '../src/three/startCamera';

const start = { centre: new Vector3(10, 50, 20), forward: new Vector3(0, 0, 1), side: new Vector3(1, 0, 0) };
// Where the follow camera starts at GO: behind and above the leader, looking down the track.
const end = { camera: new Vector3(11, 58, 6), target: new Vector3(11, 50.5, 26) };
const lookOf = (p) => p.target.clone().sub(p.camera).normalize();

describe('starting camera (countdown)', () => {
  it('starts behind the field, swings round to the front for the 3-2-1, and ends on the follow camera at GO', () => {
    for (const D of [3000, 5000]) {
      const first = countdownPose(-D, D, start, end);
      expect(first.camera.clone().sub(start.centre).dot(start.forward)).toBeLessThan(-10); // behind the field
      expect(lookOf(first).dot(start.forward)).toBeGreaterThan(0.8); // looking down the track…
      expect(lookOf(first).y).toBeLessThan(-0.3); // …and down over the field

      const threeTwoOne = countdownPose(-0.37 * D, D, start, end); // the field waiting behind the gate
      expect(threeTwoOne.camera.clone().sub(start.centre).dot(start.forward)).toBeGreaterThan(10); // in front
      expect(lookOf(threeTwoOne).dot(start.forward)).toBeLessThan(-0.9); // looking back at the field

      const go = countdownPose(0, D, start, end);
      expect(go.camera.distanceTo(end.camera)).toBeLessThan(1e-9);
      expect(go.target.distanceTo(end.target)).toBeLessThan(1e-9);
    }
  });

  it('moves steadily: no jumps, snaps or jitter, slowing to rest at GO (desktop and phone)', () => {
    for (const aspect of [1.8, 0.6]) {
      for (const D of [COUNTDOWN_MS]) {
        let prev = null;
        let prevStep = null;
        let worstStep = 0;
        let worstTurn = 0;
        let worstJerk = 0;
        const dt = 1000 / 60;
        for (let t = -D; t <= 0; t += dt) {
          const p = countdownPose(t, D, start, end, aspect);
          if (prev) {
            const step = p.camera.distanceTo(prev.camera);
            worstStep = Math.max(worstStep, step);
            worstTurn = Math.max(worstTurn, lookOf(p).angleTo(lookOf(prev)));
            if (prevStep !== null) worstJerk = Math.max(worstJerk, Math.abs(step - prevStep));
            prevStep = step;
          }
          prev = p;
        }
        // At 60 frames a second: under a metre and about 3 degrees per frame (swift but
        // smooth), and the speed never changes abruptly from one frame to the next.
        expect(worstStep).toBeLessThan(1);
        expect(worstTurn).toBeLessThan(3.5 * (Math.PI / 180));
        expect(worstJerk).toBeLessThan(0.05);
        // Coming to rest at GO, so the follow camera takes over without a lurch.
        const last = countdownPose(-dt, D, start, end, aspect);
        expect(last.camera.distanceTo(end.camera)).toBeLessThan(0.05);
      }
    }
  });

  it('draws smooth curves through key points, flat at both ends', () => {
    const times = [0, 1, 2];
    const values = [0, 10, 0];
    expect(smoothCurve(times, values, 0)).toBe(0);
    expect(smoothCurve(times, values, 1)).toBe(10);
    expect(smoothCurve(times, values, 2)).toBe(0);
    expect(smoothCurve(times, values, 0.001)).toBeLessThan(0.001); // starts at rest
  });
});
