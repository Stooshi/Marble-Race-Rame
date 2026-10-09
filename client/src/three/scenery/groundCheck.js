/**
 * The ground check (track recipe: "buried in the ground, never a halfpipe
 * sitting on it"). Just outside each wall of the channel, every sample along
 * the track, it looks straight down for the drawn ground and measures how far
 * that ground sits below the top of the rim: how much of the outer wall shows.
 *
 * On normal terrain nothing may show (more than SHOW_LIMIT metres is flagged).
 * The exceptions, where the track may run above ground but must stand on
 * something built and solid: bridges, where the track crosses over itself,
 * steep plunges (STEEP grade or more: the track drops faster than the land),
 * and waterfalls. There the check asks for a structure under the channel
 * instead (a mesh marked userData.built: rock fill, a viaduct, trestles).
 */
import { Raycaster, Vector3 } from 'three';
import { channelLipAt, channelRadiusAt, forkAt, forkOffset, forkRadius } from '../iceChannel';

export const SHOW_LIMIT = 0.4; // metres of outer wall allowed to show on normal terrain
export const STEEP = 0.45;     // a grade this steep or steeper drops away faster than the land
const RIM_WIDTH = 0.45;        // the channel's white rim beyond the lip (iceChannel.js)
const SKIRT = 1.6;             // the channel's outer wall reaches this far below the floor
const CROSS_GAP = 3;           // metres apart in height: another stretch passing above or below
const CROSS_SPREAD = 10;       // metres a crossing reaches either side of where the stretches pass

const UP = new Vector3(0, 1, 0);
const DOWN = new Vector3(0, -1, 0);

/** Which kind of stretch each sample is on: 'normal', or why it may run above ground. */
export function stretchKinds(centerline, channel, track) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const kit = track?.physics?.kit?.sections ?? [];
  const sections = track?.sections ?? [];
  const kinds = [];
  for (let i = 0; i <= segments; i += 1) {
    const p = i / segments;
    const s = samples[i];
    let kind = 'normal';
    const sec = kit.find((x) => p >= x.from && p <= x.to);
    if (sec?.bridge) kind = 'bridge';
    else if (sec?.waterfall) kind = 'waterfall';
    else {
      // Steep: the track's own grade here (from the samples either side).
      const a = samples[Math.max(0, i - 1)].pos;
      const b = samples[Math.min(segments, i + 1)].pos;
      const run = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      if ((a.y - b.y) / run >= STEEP) kind = 'steep';
    }
    if (kind === 'normal') {
      // Crossing: another stretch of track (much further along it) close by on the ground plan,
      // well above or below this one.
      for (let j = 0; j <= segments; j += 1) {
        if (Math.abs(j - i) * step < 60) continue;
        const o = samples[j].pos;
        if (Math.hypot(o.x - s.pos.x, o.z - s.pos.z) < 14 && Math.abs(o.y - s.pos.y) > CROSS_GAP) { kind = 'crossing'; break; }
      }
    }
    kinds.push({ p, kind, section: sec?.name ?? sections.find((x) => p >= x.from && p <= x.to)?.name ?? null });
  }
  // A crossing reaches CROSS_SPREAD metres either side of where the stretches pass, so a
  // viaduct (or the stretch below's banks) runs in one piece, never flickering sample by sample.
  const spread = Math.round(CROSS_SPREAD / step);
  const raw = kinds.map((k) => k.kind === 'crossing');
  raw.forEach((c, i) => {
    if (!c) return;
    for (let j = Math.max(0, i - spread); j <= Math.min(segments, i + spread); j += 1) if (kinds[j].kind === 'normal') kinds[j].kind = 'crossing';
  });
  return kinds;
}

/**
 * How much outer wall shows at each sample, each side: { p, kind, section, left, right, built }.
 * `ground`: the meshes that count as ground (terrain, banks, fill); `built`: structures that
 * may carry the channel above ground where that is allowed.
 */
export function wallExposure(centerline, channel, track, ground, built = []) {
  const { samples, segments } = centerline;
  const step = channel.arc / segments;
  const kinds = stretchKinds(centerline, channel, track);
  const ray = new Raycaster();
  const out = [];
  for (const m of [...ground, ...built]) m.updateMatrixWorld(true);
  for (let i = 0; i <= segments; i += 1) {
    const s = samples[i];
    const sArc = i * step;
    const R = channelRadiusAt(channel, sArc);
    const lip = channelLipAt(channel, sArc);
    const top = s.pos.y + R * (1 - Math.cos(lip));
    const side = new Vector3(s.side.x, 0, s.side.z).normalize();
    // The outer face of each wall (a splitter's two channels: the outer faces of the pair).
    const fork = forkAt(channel, sArc);
    const edge = fork
      ? Math.abs(forkOffset(fork, sArc)) + forkRadius(fork, channel.radius, sArc) * Math.sin(channel.maxAngle)
      : R * Math.sin(lip);
    const shows = {};
    for (const [name, sign] of [['left', 1], ['right', -1]]) {
      const at = s.pos.clone().addScaledVector(side, sign * (edge + RIM_WIDTH + 0.25));
      at.y = top + 60;
      ray.set(at, DOWN);
      ray.far = 200;
      const hit = ray.intersectObjects(ground, false)[0];
      const groundY = hit ? hit.point.y : -Infinity;
      // How much of the wall shows: from the rim top down to the ground (at most the whole wall).
      shows[name] = Math.min(top - (s.pos.y - SKIRT), Math.max(0, top - groundY));
    }
    // Something built under the channel here (for the exceptions)?
    let carried = false;
    if (built.length) {
      // From just inside the bottom of the wall: a structure's top face sits at the wall's foot.
      ray.set(s.pos.clone().addScaledVector(UP, -SKIRT + 0.5), DOWN);
      ray.far = 4.5;
      carried = ray.intersectObjects(built, false).length > 0;
    }
    out.push({ ...kinds[i], left: shows.left, right: shows.right, built: carried });
  }
  return out;
}

/**
 * The flagged stretches, in metres along the track: on normal terrain where the
 * wall shows, and on the exceptions where the channel shows with nothing built under it.
 */
export function flaggedStretches(exposure, arc) {
  const flagged = [];
  let run = null;
  const close = () => {
    if (run) flagged.push(run);
    run = null;
  };
  exposure.forEach((e, i) => {
    const worst = Math.max(e.left, e.right);
    const bad = e.kind === 'normal' ? worst > SHOW_LIMIT : worst > SHOW_LIMIT && !e.built;
    if (!bad) return close();
    const why = e.kind === 'normal' ? 'wall shows on normal terrain' : `${e.kind}: above ground with nothing built under it`;
    if (run && run.why === why && i === run.lastIndex + 1) {
      run.to = e.p;
      run.lastIndex = i;
      run.worst = Math.max(run.worst, worst);
      if (e.section && !run.sections.includes(e.section)) run.sections.push(e.section);
      return undefined;
    }
    close();
    run = { from: e.p, to: e.p, lastIndex: i, worst, why, sections: e.section ? [e.section] : [] };
    return undefined;
  });
  close();
  return flagged.map(({ lastIndex, ...r }) => ({ ...r, metres: Math.round((r.to - r.from) * arc) }));
}
