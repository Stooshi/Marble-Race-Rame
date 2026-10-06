/**
 * The camera during the countdown before GO (tracks with a starting gate):
 *
 *   1. it starts behind the field and glides forward over the marbles, looking
 *      down the track;
 *   2. it swings round in front and looks back at the field waiting behind the
 *      gate while the 3-2-1 runs;
 *   3. just before GO it swings back round and settles behind the field, on
 *      exactly the spot where the follow camera takes over at GO.
 *
 * A pure function of the time to GO, so someone joining partway through the
 * countdown, or scrubbing a replay, sees the camera exactly where it should be.
 * Position and viewing direction (yaw and pitch, not a moving look-at point,
 * which could swing through the camera and snap) follow smooth curves through
 * a few key poses, starting and ending at rest: no jumps, cuts or snaps.
 */
import { Vector3 } from 'three';

const DEG = Math.PI / 180;

/** The countdown before GO, live and in replays: long enough for the whole camera move to stay steady. */
export const COUNTDOWN_MS = 5000;

/**
 * Smooth curve through (times[i], values[i]): cubic pieces whose slopes are
 * the average of the neighbouring gradients (Catmull-Rom style), flat at both
 * ends so the move starts and ends at rest.
 */
export function smoothCurve(times, values, t) {
  const n = times.length;
  if (t <= times[0]) return values[0];
  if (t >= times[n - 1]) return values[n - 1];
  let i = 0;
  while (t > times[i + 1]) i += 1;
  const slope = (k) => {
    if (k === 0 || k === n - 1) return 0;
    return ((values[k + 1] - values[k]) / (times[k + 1] - times[k]) + (values[k] - values[k - 1]) / (times[k] - times[k - 1])) / 2;
  };
  const h = times[i + 1] - times[i];
  const s = (t - times[i]) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * values[i] + (s3 - 2 * s2 + s) * h * slope(i)
    + (-2 * s3 + 3 * s2) * values[i + 1] + (s3 - s2) * h * slope(i + 1);
}

const yawOf = (d) => Math.atan2(d.x, d.z);
const pitchOf = (d) => Math.atan2(d.y, Math.hypot(d.x, d.z));
const unwrapNear = (a, ref) => a + 2 * Math.PI * Math.round((ref - a) / (2 * Math.PI));

/** Shares of the countdown at which the camera passes each key pose. */
const KEY_TIMES = [0, 0.2, 0.38, 0.5, 0.63, 0.79, 1];

/**
 * The camera at time `t` (ms after GO, negative during the countdown) for a
 * countdown of `countdownMs`.
 *   start: { centre, forward, side } the middle of the waiting field, the
 *          level direction down the track and across it (from StartGate.startFrame);
 *   end:   { camera, target } where the follow camera starts at GO;
 *   aspect: width / height of the view (narrow phones get pulled back so the row fits).
 * Returns { camera, target } (Vector3s).
 */
export function countdownPose(t, countdownMs, start, end, aspect = 1.6) {
  const { centre, forward: F, side: S } = start;
  const U = new Vector3(0, 1, 0);
  const wide = Math.min(1.8, Math.max(1, 1.3 / Math.max(0.3, aspect))); // portrait: further out, so the whole row shows
  const at = (f, s, u) => centre.clone().addScaledVector(F, f).addScaledVector(S, s).addScaledVector(U, u);

  // Key poses: [position, yaw relative to down-the-track (degrees), pitch (degrees)].
  // The yaw keeps turning one way (a full turn round the field), so it never swings back.
  const keys = [
    [at(-12 * wide, 0, 9), 360, -30], //  behind the field, looking down over it
    [at(3, 0, 9), 360, -36], //           gliding over the marbles
    [at(14 * wide, 9 * wide, 6), 210, -14], // swinging round in front
    [at(15 * wide, 0, 3.8), 180, -9], //   looking back at the field behind the gate
    [at(14 * wide, -1.5, 3.6), 180, -9], // (a slow drift while the 3-2-1 runs)
    [at(3, -14 * wide, 6), 90, -16], //    swinging back round the side
    [end.camera.clone(), null, null], //   behind the field: the follow camera's spot at GO
  ];
  const lookEnd = end.target.clone().sub(end.camera);
  const base = yawOf(F);
  keys[6][1] = (unwrapNear(yawOf(lookEnd), base) - base) / DEG; // ends a full turn on, near 0
  keys[6][2] = pitchOf(lookEnd) / DEG;

  const u = Math.min(1, Math.max(0, 1 + t / countdownMs)); // 0 at the start of the countdown, 1 at GO
  const times = KEY_TIMES;
  const pos = new Vector3(
    smoothCurve(times, keys.map((k) => k[0].x), u),
    smoothCurve(times, keys.map((k) => k[0].y), u),
    smoothCurve(times, keys.map((k) => k[0].z), u),
  );
  const yaw = base + smoothCurve(times, keys.map((k) => k[1]), u) * DEG;
  const pitch = smoothCurve(times, keys.map((k) => k[2]), u) * DEG;
  const look = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  // Aim at the same distance as the follow camera does, so at GO the two are identical.
  const target = pos.clone().addScaledVector(look, lookEnd.length());
  if (u >= 1) return { camera: end.camera.clone(), target: end.target.clone() };
  return { camera: pos, target };
}
