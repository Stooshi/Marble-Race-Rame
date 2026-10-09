'use strict';

/**
 * The mirror tool (track kit, step 6): a kit track turned left-for-right, as a
 * track of its own. Every bend turns the other way, everything placed across
 * the channel moves to the other side, and each splitter's two channels swap
 * their ice settings exactly, so the mirror races as the original would if the
 * world were reflected. It still gets its own slug, name, records and full
 * report before it goes live: it is a different shape to race (the gate's
 * starting places, for one, are not reflected).
 *
 *   module.exports = mirror(require('./are-run'), { slug: 'are-run-mirrored', name: 'Åre Run Mirrored' });
 */

const flip = (side) => (side === 'left' ? 'right' : side === 'right' ? 'left' : side);
const neg = (v) => (typeof v === 'number' ? (v === 0 ? 0 : -v) : v);

// Fields measured across the channel (positive = the left wall), on features.
const ACROSS = ['l', 'l2', 'reach'];

function mirrorFork(fork) {
  // Older splitters set the ice as insideScrub / outsideDrag (left channel / right channel):
  // written out per channel first, exactly as the engine reads them, then swapped.
  const left = fork.left ?? { drag: 1, scrub: fork.insideScrub ?? 1 };
  const right = fork.right ?? { drag: fork.outsideDrag ?? 1, scrub: 1 };
  const { insideScrub, outsideDrag, ...rest } = fork;
  return { ...rest, tipOffset: neg(fork.tipOffset ?? 0), left: { ...right }, right: { ...left } };
}

/** A mirrored copy of a built kit track (from track()), with its own slug and name. */
function mirror(built, { slug, name, description } = {}) {
  if (!built?.physics?.kit) throw new Error('mirror() takes a track built with the track kit');
  if (!slug || slug === built.slug) throw new Error('a mirrored track needs a slug of its own');
  if (!name || name === built.name) throw new Error('a mirrored track needs a name of its own');
  const copy = JSON.parse(JSON.stringify(built));
  const { physics } = copy;
  Object.assign(copy, {
    slug,
    name,
    description: description ?? `${built.name}, mirrored: every bend the other way.`,
    // Reflected across the line the track sets off along: it starts the same way and turns the other.
    waypoints: copy.waypoints.map((p) => ({ ...p, y: neg(p.y) })),
  });
  physics.features = (physics.features || []).map((f) => {
    const out = { ...f };
    for (const k of ACROSS) if (k in out) out[k] = neg(out[k]);
    if ('side' in out) out.side = flip(out.side);
    return out;
  });
  if (physics.forks) physics.forks = physics.forks.map(mirrorFork);
  if (physics.fork) physics.fork = mirrorFork(physics.fork);
  const kit = physics.kit;
  kit.mirrorOf = built.slug;
  kit.mirrored = !built.physics.kit.mirrored;
  kit.billboards = (kit.billboards || []).map((b) => ({ ...b, side: -b.side }));
  kit.sections = kit.sections.map((s) => ({
    ...s,
    ...(s.landmarks && { landmarks: s.landmarks.map((lm) => ({ ...lm, side: flip(lm.side ?? 'left') })) }),
  }));
  return copy;
}

module.exports = { mirror };
