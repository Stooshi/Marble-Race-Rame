# Track files

One file per track, built with the track kit (`src/trackKit`). A track file
reads like a design in "New Track Designs": theme, start, finish, then one
entry per section with its shape, obstacles, features and scenery.

```js
const { track, plunge, sBends, sweep, hairpin, straight, splitter, spiral,
  pileUp, block, curtain, swipe, parked, boost, bump, brake } = require('../trackKit');

module.exports = track({
  slug: 'are-run', name: 'Åre Run', difficulty: 'extreme',
  surface: 'snow', lighting: 'night-northern-lights',
  sections: [
    { name: 'Summit plunge', shape: plunge(80, { grade: 0.8 }), obstacles: [pileUp({ costume: 'sled-dog' })] },
    { name: 'Fell S-bends', shape: sBends({ first: 'left' }) },
    { name: 'Splitter', shape: splitter({ side: 'left' }), around: 'mountain-hut' },
    { name: 'Lake sweep', shape: sweep({ side: 'right' }), features: [boost()], billboards: 2 },
    { name: 'Drop to the hairpin', shape: straight(45, { grade: 0.2 }), billboards: 2 },
    { name: 'Hairpin', shape: hairpin({ side: 'left' }), obstacles: [block({ costume: 'reindeer', line: 'high' })] },
    // …
  ],
});
```

Then add it to `index.js` in this folder.

## What the kit does for you

- Opens every track with the 16 m starting ramp and the paddle gate, and ends
  it with a 30 m run-in if the file doesn't.
- Works out every position: `at: 0.37` on a section is 37% of the way along it.
- Builds every obstacle from a proven one (`block` = Bobsleigh Run's ice block,
  `swipe` = the polar bear, `curtain` = the icicles, `parked` = San Francisco's
  bus) whatever its `costume`; costumes are looks only.
- Puts a braking zone on the straight before the one sharp bend (`hairpin`).
- Gives each splitter Table Mountain Run's proven channel settings, to tune with
  `balance` once the fairness batches say so.
- Checks the track recipe and refuses the file, naming the rule and the
  section, if it breaks one.

## Shapes

| Shape | Use |
| --- | --- |
| `plunge(length, { grade })` | Steep straight drop (the first section must be one) |
| `straight(length, { grade })` | Gentler straight |
| `climb(length, { grade, after })` | Short climb, rounded off over the top |
| `sBends({ first, radius, degrees })` | Two flowing bends, one each way |
| `sweep({ side, radius, degrees })` | Long banked sweep (radius 45 m or more) |
| `spiral({ side, radius, turns })` | Flowing spiral (radius 40 m or more) |
| `hairpin({ side })` | The one sharp bend; the section before it must be a straight of 35 m or more |
| `splitter({ side, degrees, balance })` | Field divides and rejoins (`degrees: 0` on a straight) |
| `runIn()` | The run-in to the finish (added automatically) |

## Obstacles

| Obstacle | Races as | Costumes in the library |
| --- | --- | --- |
| `block({ costume, at, line, size })` | Bobsleigh Run's ice block (`size: 'large'`: the snowman) | panda, camel, cafe-table, reindeer, baboon, giraffe |
| `pileUp({ costume, at })` | Three blocks: the first pile-up of the race | any block costume |
| `curtain({ costume, at, side })` | The icicles: knocked out round them | zebras |
| `swipe({ costume, at, side })` | The polar bear's swipe, knocking marbles aside | elephant |
| `parked({ costume, at, side, length })` | Knocked aside round its open side, one hit per marble; gentle sections only (grade 0.2 or less) | ore-cart, kick-sled |
| `slalom({ from, to, count })` | Thin poles alternating either side: about a tenth of a marble's speed per hit, never a stop | slalom-gate |
| `peg({ costume, at, line, radius })` | A slalom pole's physics, bigger | go-stone |

A costume is one builder in `client/src/three/costumes/kit.js` and one entry
in `client/src/three/costumes/index.js`. A test fails if a track wears a
costume the library doesn't have, or one made for another kind of obstacle.
To look at them: `node scripts/dump-kit-track.js costume-gallery`, then
`npm run dev` in `client` and open `/dev/kit-view.html?track=costume-gallery`.

## Lines and sides

`line`: `'center'`, `'left'`, `'right'`, `'high'` or a number (share of the
way up the wall, positive = left). `side`: `'left'`, `'right'` or `'high'`.
"High" is the outside of the section's bend, so it needs a section with one bend.

## Before a track goes live

It is added switched off (`node scripts/physics-track-sql.js <slug> --add-hidden "…"`),
watched at `/preview/physics?track=<slug>`, and switched on once approved.
