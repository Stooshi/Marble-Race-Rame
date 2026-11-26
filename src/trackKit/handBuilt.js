'use strict';

/**
 * A hand-built track laid out with the track kit (Moses, 16 Nov 2026: Bobsleigh Run and Table Mountain Run get
 * their own layouts like the other World Tour tracks). The kit builds the layout, the obstacles and the start; the
 * track then keeps its hand-built looks: no `physics.kit`, so the 3D view draws it with its own theme by slug
 * (client/src/three/themes.js: the alpine run, Cape Town), with the start and TV cameras written out as the
 * hand-built tracks have them (`physics.startLook`, `physics.tv`). The race engine reads none of these.
 *
 *   handBuilt(track({ …a kit spec… }), { landmarks })
 *
 * (Its billboards, which the recipe asks for, are not drawn: the hand-built themes have none.)
 * The sameness check sees it as a hand-built track (family 'classic'), from what the kit built.
 */
function handBuilt(built, { landmarks } = {}) {
  const { kit, ...physics } = built.physics;
  const out = {
    ...built,
    physics: {
      ...physics,
      // (`opening`: the kit's opening, so the 3D view eases its starting-line shot down the slope as on a kit track.)
      startLook: { gate: kit.start.gate, shots: { ...kit.start.shots }, opening: kit.opening },
      tv: kit.tv.map(({ p, side, distance, height }) => ({ p, side, distance, height })),
      ...(landmarks && { landmarks }),
    },
  };
  Object.defineProperty(out, 'variety', { enumerable: false, value: { ...built.variety, family: 'classic' } });
  return out;
}

/** Where a named section's share `share` falls along the track (0 to 1), rounded as the kit rounds. */
const onSection = (built, name, share) => {
  const s = built.sections.find((x) => x.name === name);
  if (!s) throw new Error(`no section ${JSON.stringify(name)} on ${built.slug}`);
  return Math.round((s.from + share * (s.to - s.from)) * 10000) / 10000;
};

module.exports = { handBuilt, onSection };
