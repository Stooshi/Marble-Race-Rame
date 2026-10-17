/**
 * TV moments (drawing only, never the race): fixed trackside cameras at a track's dramatic spots
 * (track file `tvCameras`, physics.kit.tv), facing back up the track at the oncoming marbles. The big
 * view cuts to one as the followed marble (the leader, or the player's own) comes up to it, follows
 * it past, then eases back to the follow camera once it has gone by.
 *
 * Everything is worked out from where the followed marble is (its progress), never from the wall
 * clock, so a replay shows the same moments at the same places. No cut in the first seconds (the
 * start keeps its own shots) or near the line (the finish shot stays), and the track recipe keeps a
 * track's cameras well apart, so two cuts never come close together.
 */
import { Vector3 } from 'three';
import { channelLipAt, channelRadiusAt } from './iceChannel';

export const TV = {
  before: 50,      // metres before the camera's spot where the cut comes (with the ease back, about 3–5 s at racing speed)
  after: 12,       // metres past it where the camera lets go…
  blend: 30,       // …easing back to the follow camera over these metres
  startGuard: 8000, // ms after GO before any cut
  frame: 7,        // metres of the scene across the shot round the followed marble: the TV camera zooms to keep it so…
  lens: [14, 42],  // …within these fields of view (degrees)
};
const RIM = 0.45;

/** The track's TV cameras: [{ s (metres along), pos (where the camera stands) }]. */
export function tvCameras(centerline, channel, kit) {
  if (!channel || !kit?.tv?.length) return [];
  const { samples, segments } = centerline;
  return kit.tv.map((c) => {
    const i = Math.min(segments, Math.max(0, Math.round(c.p * segments)));
    const s = samples[i];
    const sArc = c.p * channel.arc;
    const half = channelRadiusAt(channel, sArc) * Math.sin(channelLipAt(channel, sArc)) + RIM;
    const side = new Vector3(s.side.x, 0, s.side.z).normalize();
    const sign = (c.side ?? 1) * (kit.mirrored ? -1 : 1);
    const pos = s.pos.clone().addScaledVector(side, sign * (half + c.distance)).setY(s.pos.y + c.height);
    return { s: sArc, pos, p: c.p };
  });
}

/**
 * The TV moment for a marble `metres` along the track at race time `t` (ms after GO):
 * { cam, w } (w: 1 on the TV camera, falling to 0 as it eases back), or null.
 */
export function tvMoment(cams, metres, t, finishAt) {
  if (!cams.length || !(t >= TV.startGuard) || metres >= finishAt) return null;
  for (const cam of cams) {
    const d = metres - cam.s;
    if (d < -TV.before || d > TV.after + TV.blend) continue;
    if (d <= TV.after) return { cam, w: 1 };
    const k = (d - TV.after) / TV.blend;
    return { cam, w: 1 - k * k * (3 - 2 * k) };
  }
  return null;
}
