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
| `plunge(length, { grade, from })` | Steep straight drop (the first section must be one); `from`: the grade before it, eased up 0.06 every 10 m so a steep plunge can follow a gentle stretch |
| `straight(length, { grade })` | Gentler straight |
| `climb(length, { grade, after })` | Short climb, rounded off over the top |
| `sBends({ first, radius, degrees })` | Two flowing bends, one each way |
| `sweep({ side, radius, degrees })` | Long banked sweep (radius 45 m or more) |
| `spiral({ side, radius, turns })` | Flowing spiral (radius 40 m or more) |
| `hairpin({ side })` | The one sharp bend; the section before it must be a straight of 35 m or more |
| `splitter({ side, degrees, balance })` | Field divides and rejoins (`degrees: 0` on a straight) |
| `waterfall(length, { grade, curtain })` | A waterfall plunge; its lip eases in by itself (0.03 every 8 m); needs a 30 m straight before it; can open the track; `curtain: true` adds a see-through sheet of water to race through |
| `runIn()` | The run-in to the finish (added automatically) |

## Obstacles

| Obstacle | Races as | Costumes in the library |
| --- | --- | --- |
| `block({ costume, at, line, size })` | Bobsleigh Run's ice block (`size: 'large'`: the snowman) | panda, camel, cafe-table, reindeer, baboon, giraffe, cow, marmot, elk, chamois, sled-dog, arctic-fox, pigeon, log, caiman, jaguar, football, monkey |
| `pileUp({ costume, at })` | Three blocks: the first pile-up of the race | any block costume |
| `curtain({ costume, at, side })` | The icicles: knocked out round them | zebras |
| `swipe({ costume, at, side })` | The polar bear's swipe, knocking marbles aside | elephant, musk-ox, falcon, fortune-cat (its raised paw waves into the high line) |
| `parked({ costume, at, side, length })` | Knocked aside round its open side, one hit per marble; gentle straights only (grade 0.2 or less; on a bend it traps marbles) | ore-cart, kick-sled, vespa, sports-car |
| `slalom({ from, to, count })` | Thin poles alternating either side: about a tenth of a marble's speed per hit, never a stop | slalom-gate, route-flag, street-lamp, rally-flag, river-stake, corner-flag, lantern-pole |
| `peg({ costume, at, line, radius })` | A slalom pole's physics, bigger | go-stone, xiangqi-piece (a pair across the channel: one of each colour) |

A costume is one builder in `client/src/three/costumes/kit.js` and one entry
in `client/src/three/costumes/index.js`. A test fails if a track wears a
costume the library doesn't have, or one made for another kind of obstacle.
To look at them: `node scripts/dump-kit-track.js costume-gallery`, then
`npm run dev` in `client` and open `/dev/kit-view.html?track=costume-gallery`.

## Features

| Feature | What it is |
| --- | --- |
| `boost({ at })` | A boost pad across the whole floor |
| `brake({ at, length, drag })` | A short braking zone (one is added before the sharp bend automatically) |
| `bump({ at })` | A low speed bump: the field hops, about 1 m at most |
| `moguls({ from, to, count })` | A row of low bumps: on a straight, 30 m after any bend, 5 m apart or more, 8 at most |
| `steps({ from, to, count, drag, tiles })` | Small regular bumps over a slowing surface (the Selarón Steps; `tiles: 'mosaic'` paints them red, yellow, blue and green); same rules as moguls |
| `paint({ from, to, look })` | Looks only (never raced): a board painted on the floor, `look: 'go-board'` (19 lines each way on pale wood) or `'xiangqi'` (9 lines across, its river a blue band) |

Nothing bumpy within 40 m after a block: marbles flung off it land on the bumps and bounce high.

## Tunnels, caves and bridges

A section can be a tunnel, `tunnel: 'mine' | 'rock' | 'ice-cave' | 'roots' | 'dragon'`
(the dragon: in at the tail, out of the mouth), or a bridge, `bridge: 'wood' |
'stone' | 'ice'` (the channel keeps its width; an ice bridge only looks narrow).
Not at the start or the finish, and not over a splitter. Drawing only: they
race exactly like the open channel. A tunnel's roof faces inward, so the
follow camera above or behind it is never blocked; a test checks it frame by
frame through whole races.

## Ground and scenery

Every kit track is **buried in the ground**, like a trench: the land rises to
the top of the walls on both sides, so the outside of the walls is never seen
and you look down into the track. The kit does this by itself: on a slope the
hillside is cut away above the channel and built up with earth or rock below
it. Only where the track drops faster than the land (steep plunges,
waterfalls), crosses over itself, or is a bridge may it run above ground, and
there it stands on something built: rock fill, a stone viaduct with piers, or
the bridge. A test checks every kit track, phone and computer, and names any
stretch where the outer wall shows on normal ground.

Scenery comes from names in the file (looks only; checked, so a typo is refused):

- `biome`: `'alpine' | 'arctic' | 'meadow' | 'desert' | 'jungle' | 'city'`:
  the land's colours and its trees, rocks or cacti (guessed from `surface` if left out).
- `surface`: `'ice' | 'snow' | 'sand' | 'stone' | 'water'`, for the whole track
  or one section (`surface: 'stone'` on the Steps). Every surface races exactly like ice.
- `start: { landmark }`, `finish: { landmark }`, and per section
  `landmarks: [{ name, side, at, distance }]`: `'church' | 'mountain-hut' | 'big-rock' | 'lighthouse' |
  'horse-sleigh' | 'border-post' | 'lift-station' | 'mine-buildings' | 'snow-park' | 'base-camp' |
  'sacre-coeur' | 'moulin-rouge' (its sails turn) | 'fountains' | 'louvre-pyramid' | 'notre-dame' |
  'eiffel-tower' | 'seine' | 'bookstalls' | 'bedouin-camp' | 'museum-of-the-future' | 'dubai-frame' |
  'burj-al-arab' | 'burj-khalifa' | 'palm-boardwalk' | 'dune-buggy' | 'toucan-tree' | 'river-pool' (a pink
  river dolphin surfaces in it) | 'teatro-amazonas' | 'river-dock' | 'corcovado' (far behind, its figure only a distant
  silhouette) | 'sugarloaf' | 'maracana' | 'parrot-tree' | 'copacabana' | 'wudian-hall' | 'watchtower' | 'pagoda' | 'rice-terraces' | 'lantern-row' | 'temple-of-heaven'` (the world landmarks: client/src/three/scenery/kitLandmarks.js).
- `figures: ['skier', 'snowboarder', 'spectator', 'reindeer', …]`: people, or any
  block costume, standing on the banks facing the track with small idle movements.
- `overhead: ['gondola' | 'cable-car' | 'chairlift' | 'vulture']`: a lift crossing high above
  the section (18 m over the track, clear of the follow camera), or a vulture circling higher still.
- `scenery: [...]` on a section, or on `start` / `finish`: `'bare'` (a wind-swept
  summit: a few rocks only), `'rocks'` (snow-rimed rocks), `'birches'`, `'pines'`,
  `'race-netting'` (orange safety nets along both banks and a timing board),
  `'funicular'` (a little red funicular climbing the hill beside it),
  `'wooden-houses'` (houses with warm windows), `'frozen-lake'` (at the finish: a
  frozen lake just past the run-out), `'icefjord'` (the same, open water with icebergs
  and now and then a whale's tail), `'pasture'` (open pasture, a few trees), `'aspens'`;
  houses in a style: `'chalets'`, `'wood-clad'` (Avoriaz's tall buildings), `'shopfronts'`
  (Old West), `'stone-houses'` (slate roofs), `'colourful-houses'` (Ilulissat), `'haussmann'`
  (Paris), `'skyscrapers'` (Dubai), `'stilt-houses'` (the Amazon), `'forbidden-city'` (red halls, golden roofs); `'plane-trees'` (rows of city trees);
  `'battlements'` (the Great Wall's parapet and merlons along both banks).
- `around` on a splitter, what stands between its two channels: `'mountain-hut'` (smoke
  from its chimney), `'big-rock'`, `'mountain-restaurant'`, `'mine-headframe'`, `'nunatak'`,
  `'arc-de-triomphe'` (over one channel: the other runs round it), `'oasis'`, `'river-island'`, `'anaconda'` (lying along the divider, lifting its head), `'watchtower'`; on a spiral, what it winds
  down around: `'bell-tower'` (its bell swinging), `'notre-dame'`, `'twisted-tower'`, `'pagoda'`; in a hairpin: `'obelisk'`.
- `designChanges: ['…']`: where the recipe made the build differ from the design, and
  why; shown at the top of the track report (never raced).
- `signature: '<section>'`: the track's signature moment, for the report's screenshot.

## Billboards

`billboards: 2` on a section stands two billboards beside it; every track has
4 to 6 in all. Along a straight, a plunge, a climb, S-bends or a sweep only (not
the sharp bend, a spiral, a splitter, a waterfall, the finish, a tunnel or a
bridge). The kit spreads them along the section at least 12 m from any
obstacle, on the outside of a sweep and on alternate sides of a straight, and
numbers them 1, 2, 3… down the track: those are the slots the server fills.

`billboardFrame` (for the track, or one section): `'plain' | 'wood' | 'led' |
'column' | 'crates'`. Every panel is the same 6 m by 3 m and takes a 2:1 image,
1024 x 512, so one artwork fits every track.

Images: one row in the `billboards` table per image (see
`docs/database_schema.sql`): a track and slot, every slot of a track, one slot
of every track, or everywhere, with optional start and end dates. With no row,
or if an image fails to load, a board shows one of our own built-in
promotions, so it is never blank. Images must be `https://` and allow other
sites to show them (Vercel file storage does). Drawing only: never the race.

## Lighting, weather and variants

`lighting`: the track's own preset, one of `'day' | 'sunset' | 'midnight-sun' |
'night-northern-lights' | 'fog' | 'snow' | 'rain' | 'night'` (default `'day'`; `'night'`: a floodlit city night).
`variants: ['sunset', 'snow']`: the other presets this track may race in;
anything not listed is ruled out for it (Paris: no night). Each race picks one
from its seed when it is decided (the track's own preset twice as often as
each variant) and keeps it in its snapshot, so the replay looks the same.
Variants are the same track: same physics, same records. Drawing only: rain
and snow never slow a marble. At night the marbles glow softly and the rims
carry an edge light, so the marbles always stay in the picture.

Preview a variant with `&lighting=snow` on the preview link (only presets the
track allows).

## Grand Prix tracks

`grandPrix: true` (or `grandPrix: { crowd, barrier, fireworks }`) makes a track a Grand
Prix: looks only, it races exactly as it would without. It brings:

- **Start lights**: a dark gantry over the gate with five lights that come on one by one
  over the last three seconds of the countdown and all go out at GO; the countdown over
  the view shows the same five lights instead of 3, 2, 1 (other tracks keep 3-2-1).
- **Grandstands**: packed stands either side of the start and along the finish straight,
  one on the outside of the sharp bend, smaller groups every 230 m or so (`groupsEvery`, up
  to 1000, spaces them further apart where a track's drawing budget needs it), and more where a
  section's `scenery` says `'grandstand'` (packed) or `'crowd'` (small). Each stands at track
  level beside the rim (up on the land where the track runs in a cutting, on scaffolding where
  the ground falls away), clear of other stretches, landmarks and billboards. Spectators wave
  flags and stand up while marbles pass; on phones half as many, each one box, fewer flags.
  `crowd`: `'fans'` (default), `'elves'`, `'kingdom-folk'`, `'villagers'`.
- **Kerbs and barriers**: red-and-white kerbs along the top of both walls on every bend, and a
  barrier along the outside: `barrier`: `'tyres'` (default), `'logs'`, `'snow'`, `'stone'`.
  The `'asphalt'` surface (dark tarmac, a white edge line) races as fast as ice.
- **The finish**: a chequered gantry over the line, a finish building with a balcony of
  spectators beside it, and fireworks over the finish once the winner is home
  (`fireworks: 'sparkles'`: a shower of sparkling lights instead). A night race (`lighting:
  'night'`, a floodlit city night) gets floodlight masts along the track.
- **Billboards**: 4 to 8 (other tracks 4 to 6).
- **Costumes**: `tyre-stack` (block), `traffic-cone` (slalom), `safety-car` (parked, no maker's
  badge), `camera-crane` (swipe: its boom swings a TV camera over the high line),
  `banner-gantry` (curtain: banners hanging from a gantry over the high line), and
  `rumble({ from, to, count })`: rumble strips, red and white, racing as moguls (same rules).

The Grand Prix tracks' own pieces (looks only, like everything here):
- landmarks: `'dubai-fountain'` (its jets sweep), `'marina'`, `'harbour'` (ferries, sailing boats),
  `'opera-house'` (stylised), `'galata-tower'`, `'hagia-sophia'`, `'blue-mosque'`, `'bosphorus-bridge'`,
  `'tulip-garden'`, `'lagos-skyline'`, `'national-theatre'`, `'roundabout-monument'`, `'kicc-tower'`,
  `'acacia'`, `'safari-truck'`, `'park-fence'`, `'royal-palace'`, `'city-hall'`, `'vasa-museum'`,
  `'steamboats'`, `'red-fort'`, `'red-fort-gate'`, `'jama-masjid'`, `'india-gate'`, `'mughal-fountain'`,
  `'kasbah'`, `'mud-mosque'`, `'caravan'`, and our own worlds' `'giant-tree'`, `'tree-platform'`,
  `'glow-flowers'`, `'snow-castle'`, `'snow-island'`, `'ice-palace'`, `'ruined-castle'`,
  `'sleeping-dragon'` (one eye opening), `'fallen-statue'`, `'amphitheatre'`, `'dragon-mountain'`.
  A section landmark with `over: true` straddles the track (a gateway the field races through).
- on a splitter's divider (`around`): `'museum-of-the-future'` and `'opera-house'` (versions sized for
  it), `'tulip-garden'`, `'roundabout-monument'`, `'acacia'`, `'mughal-fountain'`, `'snow-island'`,
  `'fallen-statue'`; in a hairpin `'dubai-frame'`; in a spiral `'giant-tree'`.
- scenery: `'sandstone-terraces'`, `'market-stalls'`, `'merchant-houses'` (house styles), `'palms'`,
  `'jacarandas'`, `'savannah'` (a few acacias on open grass); on a floodlit night every house's
  windows light up.
- tunnels `'bazaar'` (the Grand Bazaar's striped arches and lanterns) and `'canyon'` (no roof: red rock
  walls with spectators on the cliff tops); bridge `'steel'` (laid along the slope, water beneath).
- costumes: `simit-cart`, `danfo-bus`, `matatu`, `auto-rickshaw`, `support-truck` (parked);
  `mushroom`, `giant-snowball`, `stone-block` (blocks); `crystal-post`, `ice-lantern`, `broken-pillar`
  (slalom); `stag`, `snow-troll`, `dragon-tail` (swipe); `vines`, `battle-banners` (curtain, hung from
  a gantry like the banner gantry); figures `zebra`, `buffalo`; billboard frame `'banner'`.
- crowds `'desert-folk'` (tent stands), barrier `'marigolds'` (garlands on the tyres).

No real series, circuit or car brand anywhere: generic racing pieces only.
To look at them all: `node scripts/dump-kit-track.js grand-prix-gallery`, then open
`/dev/kit-view.html?track=grand-prix-gallery` (never raced).

## Mirrored tracks

A mirror is a file of its own (it counts as a track, with its own records):

```js
const { mirror } = require('../trackKit');
module.exports = mirror(require('./are-run'), { slug: 'are-run-mirrored', name: 'Åre Run Mirrored' });
```

Every bend turns the other way, everything across the channel moves to the
other side, and each splitter's two channels swap their ice settings exactly.
It still needs its own report before it goes live (the gate's starting places
are not reflected). Kit tracks only.

## Slopes

No sudden steepening: a single step of more than 0.13 throws marbles into the
air at speed, and two bigger steps need 30 m between them. Ease a steeper drop
in, or make it a `waterfall`, whose lip eases in by itself.

## Lines and sides

`line`: `'center'`, `'left'`, `'right'`, `'high'` or a number (share of the
way up the wall, positive = left). `side`: `'left'`, `'right'` or `'high'`.
"High" is the outside of the section's bend, so it needs a section with one bend.

## The track report

    npm run report -- <slug>            (3 x 1,000 races: about 15 minutes)
    npm run report -- <slug> --quick    (3 x 200: for tuning rounds; the batches are noisier)

One page, the same layout for every track, at `reports/<slug>/index.html`,
with a pass or fail beside each line and what to fix at the top:

- **Fairness**: three batches, each judged on its own: wins and average place per
  group of 4 starting places, strongest five against weakest five.
- **Pace**: the winner's time, the last marble home, every marble home.
- **Close racing**: the winner-to-last gap, racing overtakes (two marbles within
  4.5 m/s of each other swapping places after the first 5 s, and staying swapped),
  lead changes.
- **Splitters**: each channel's share of marbles against its share of wins, and the
  places a marble gains or loses going through one channel rather than the other.
  Fix with the splitter's `balance` (each channel's `drag` and `scrub`, the wedge's `tipOffset`).
- **Obstacles, boosts, bumps**: hits by starting group and strength group; the
  highest hops.
- **Safety**: the same seed gives the same race; the database holds what the file
  builds (where there is a database); today's tracks race as recorded.
- **Ground** and **Camera**: the ground check, and frame by frame through two races
  on phone and computer screens: the follow camera never blocked, on its marble's
  level, no jumps, its marble never inside the ice.
- **Drawing load** through a race and the **fixed screenshots**, from a headless
  browser (needs Chromium; its frame rate means nothing).

## Before a track goes live

It is added switched off (`node scripts/physics-track-sql.js <slug> --add-hidden "…"`),
watched at `/preview/physics?track=<slug>`, and switched on once approved.
