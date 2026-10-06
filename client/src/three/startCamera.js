/**
 * The camera during the countdown before GO (tracks with a starting gate):
 *
 *   1. it starts behind the field and glides forward over the marbles;
 *   2. it swings round in front and looks back at the field waiting behind the
 *      gate while the 3-2-1 runs;
 *   3. just before GO it swings back round and settles straight behind the
 *      field, level, on the whole row lined up across the picture (the
 *      starting-line shot, startLineShot); after GO it hands over smoothly to
 *      the follow camera (handover).
 *
 * Throughout, it looks at a point inside the waiting field, so the marbles
 * never leave the picture; the path never passes straight over that point,
 * so the view never flips.
 *
 * A pure function of the time to GO, so someone joining partway through the
 * countdown, or scrubbing a replay, sees the camera exactly where it should be.
 * Both the camera and the point it looks at follow smooth curves through a few
 * key poses, starting and ending at rest: no jumps, cuts or snaps.
 */
import { Vector3 } from 'three';

/** The countdown before GO, live and in replays: long enough for the whole camera move to stay steady. */
export const COUNTDOWN_MS = 5000;

/** After GO, the shot of the starting line hands over to the follow camera over this long (ms). */
export const HANDOVER_MS = 1400;

/** How far the hand-over from the starting-line shot to the follow camera has got at `t` ms after GO (0..1, eased at both ends). */
export function handover(t) {
  const k = Math.min(1, Math.max(0, t / HANDOVER_MS));
  return k * k * k * (k * (k * 6 - 15) + 10);
}

const LINE_PITCH = 20 * (Math.PI / 180); // the shot at GO looks down on the row this steeply (above the slope it waits on)

/**
 * The shot at GO: from straight behind the middle of the field, level (no
 * tilt to either side), looking down the track over the row, far enough back
 * that the whole row fits across the picture with a little room either side
 * (a narrow phone screen needs to be further back than a wide one). The
 * angle is measured from the slope the field waits on, not the horizon: on a
 * steep starting ramp a camera any lower would be below the ice behind the
 * row, looking at the backs of the starting blocks.
 *   start: { centre, forward, side, halfWidth, down?, normal? } from StartGate.startFrame;
 *   aspect, fov: the camera's (width / height, vertical degrees).
 * Returns { camera, target }.
 */
export function startLineShot(start, aspect = 1.6, fov = 50) {
  const { centre } = start;
  const down = start.down ?? start.forward; // down the slope (level ground: straight ahead)
  const normal = start.normal ?? new Vector3(0, 1, 0);
  const half = (start.halfWidth ?? 12) * 1.15 + 0.8;
  const across = Math.atan(Math.tan(((fov * Math.PI) / 180) / 2) * Math.max(0.2, aspect)); // half the horizontal view
  const distance = Math.max(10, half / Math.tan(across));
  const row = centre.clone().addScaledVector(normal, 0.55); // the marbles' middles
  const camera = row.clone().addScaledVector(down, -distance * Math.cos(LINE_PITCH)).addScaledVector(normal, distance * Math.sin(LINE_PITCH));
  // Aim a little way down the track, so the row sits in the lower part of the
  // picture with the run ahead above it (behind the start there is only sky).
  const target = row.addScaledVector(down, distance * 0.3);
  return { camera, target };
}

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

/** Shares of the countdown at which the camera passes each key pose. */
const KEY_TIMES = [0, 0.2, 0.38, 0.5, 0.63, 0.79, 1];

/**
 * The camera at time `t` (ms after GO, negative during the countdown) for a
 * countdown of `countdownMs`.
 *   start: { centre, forward, side } the middle of the waiting field, the
 *          level direction down the track and across it (from StartGate.startFrame);
 *   end:   { camera, target } the shot at GO (startLineShot);
 *   aspect: width / height of the view (narrow phones get pulled back so more of the row fits).
 * Returns { camera, target } (Vector3s).
 */
export function countdownPose(t, countdownMs, start, end, aspect = 1.6) {
  const { centre, forward: F, side: S } = start;
  const U = new Vector3(0, 1, 0);
  const wide = Math.min(1.8, Math.max(1, 1.3 / Math.max(0.3, aspect))); // portrait: further out
  const at = (f, s, u) => centre.clone().addScaledVector(F, f).addScaledVector(S, s).addScaledVector(U, u);

  // Key poses: [camera, the point in the field it looks at].
  const keys = [
    [at(-12 * wide, 0, 9), at(2, 0, 0)], //               behind the field, looking down over it
    [at(-1, 4 * wide, 10.5), at(1.5, 0, 0)], //           gliding forward over the marbles (a little to one side)
    [at(14 * wide, 9 * wide, 6), at(0, 0, 0.3)], //       swinging round in front
    [at(15 * wide, 0, 3.8), at(0, 0, 0.6)], //            looking back at the field behind the gate
    [at(14 * wide, -1.5, 3.6), at(0, -0.5, 0.6)], //      (a slow drift while the 3-2-1 runs)
    [at(3, -14 * wide, 6), at(1, 0, 0.3)], //             swinging back round the side
    [end.camera.clone(), end.target.clone()], //         straight behind the field: the shot at GO
  ];

  const u = Math.min(1, Math.max(0, 1 + t / countdownMs)); // 0 at the start of the countdown, 1 at GO
  if (u >= 1) return { camera: end.camera.clone(), target: end.target.clone() };
  const curve = (k) => new Vector3(
    smoothCurve(KEY_TIMES, keys.map((key) => key[k].x), u),
    smoothCurve(KEY_TIMES, keys.map((key) => key[k].y), u),
    smoothCurve(KEY_TIMES, keys.map((key) => key[k].z), u),
  );
  return { camera: curve(0), target: curve(1) };
}
