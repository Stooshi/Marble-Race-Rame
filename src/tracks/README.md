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

## Every new track has a big feature (Moses, 27 Oct 2026)

No "safe only" tracks. Every new track has **at least one big, exciting feature**:
- a jump or hop over a gap (the boost-pad jump, a hop);
- a splitter with two paths;
- a loop;
- a funnel;
- a big drop;
- a dramatic banked turn.

Rules that come with it:
- **Vary the features across a series**, so no two tracks of a series lean on the same one.
- **Place them where the flyover and the TV cameras show them.** Make the feature the track's `signature` (the flyover's highlight) or give it a TV moment.
- **The checks still apply:** fairness, the phone budget and the scenery checks. If a feature fails one, **tune it rather than remove it**.
- **A new series' plan lists each track's feature** for Moses's approval before anything is built.

This applies from Peaks 6–15 on (after Leagues part 1). Tracks built before 27 Oct 2026, the first five Peaks among them, stay as they are.

## Every track has a backward-facing TV camera (Moses, 27 Oct 2026)

Every track, current and future, has **at least one backward-facing TV camera**: a `tvCameras` entry
(see [TV moments](#tv-moments)), facing back up the track at the oncoming marbles. Put it at a good
moment: at the track's big feature (its end, so the marbles come through the feature at the camera) or
just before it; a second one where the track is long enough (at least 300 m from the first). The same
camera and scenery checks apply (nothing at the lens, a clear view of the track: `client/test/tvMoments.test.js`).
`test/tvCameras.test.js` fails if any track in the database has none. The three hand-built tracks
(Bobsleigh Run, San Francisco, Table Mountain Run) carry theirs as `physics.tv` in `src/game/physicsTracks.js`.
On 27 Oct 2026 the 110 tracks without one got two each (at their signature or biggest features), in
looks-only data updates (`docs/data_updates/2027-04-25-…-tv-cameras.sql`); races unchanged.

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

## Openings and layouts: no two tracks alike

New tracks start from the variety libraries rather than copying the last track
that passed, so that players racing back to back never meet the same race twice:

```js
const { track, opening, layout } = require('../trackKit');

module.exports = track({
  slug: 'sognefjord', name: 'Sognefjord', family: 'coaster',
  opening: opening('crest-start', { costumes: { block: 'troll', slalom: 'buoy' }, names: { climb: 'Over the ridge' } }),
  sections: layout('twin-spirals', { mirror: true, costumes: { swipe: 'eagle' }, dress: { spiral1: { name: 'Stave church spiral' } } }),
});
```

- **Openings** (`opening(kind, { costumes, names, dress, side, tunnel })`): the first
  section or two, and anything the opening changes at the gate. Each was proven on its own
  test track (`variety-opening-<kind>`, on the classic layout) with the full report.

  | Opening | What happens |
  | --- | --- |
  | `classic` | The steep 80 m plunge, a pile-up, then a slalom (every track before the library) |
  | `split-start` | The steep plunge and its pile-up, then two equal parallel chutes, an island between them, merging again about 2 s later |
  | `staggered-drop` | The gate lets the field go in five waves of four starting places, 0.15 s apart, in a new order every race; a short rough stretch lets the waves catch up before the pile-up |
  | `tunnel-launch` | Where the gate's funnel ends, the plunge dives into a tunnel (`tunnel`: its look) and bursts out into daylight |
  | `banked-turn` | The steep plunge straight into a steep banked first turn (`side`); the field fans up the wall |
  | `boost-launch` | A gentler drop, then a strip of boost pads wall to wall: the same kick for everyone. It tends to keep the front starting group ahead; follow it with deep, tight S-bends (as Wadi Mujib Burst) and check the groups early |
  | `funnel-drop` | A longer bowl at the gate; the order mixes as the field squeezes into the channel |
  | `crest-start` | The steep plunge into a short climb and over a rounded crest: the field bunches and spills over in a new order |
  | `clean-drop` | The field let go in waves, a plunge with nothing in it, at full speed into deep, tight S-bends (`side`) that shuffle the field |
  | `peg-drop` | The field let go in waves, a slightly gentler plunge through seven single pegs, left and right, the field threading through |
  | `pipe-drop` | The field let go in waves, a short plunge straight into a half-pipe (`side`: its first swing), the field rocking wall to wall |

  **The varied starts** (`clean-drop`, `peg-drop`, `pipe-drop`, October 2026) leave out the pile-up
  and slalom. Those give a race most of its luck: without them the strongest marbles win far too often
  (57–62% of races, the target is 35–50%). So these openings let the field go in **waves** (five waves of four
  starting places, 0.3 s apart, a new order every race, as the staggered drop does), which brings the luck back
  at the gate. The recipe refuses a track that opens with one of them and has neither the waves nor a pile-up
  or a hard slalom (5 gates or more at a loss of 0.3) in its first half. On the pipe-drop tracks (Bislett Mile,
  Tokyo Photo Finish) a slalom drop after the first bends adds the rest of the luck. They are proven on the
  mid lottery layout (L71; the pipe drop's test track with its stronger lottery, `lotteryGates: 6, lotteryLoss: 0.25`,
  as its half-pipe gives no luck of its own; the peg drop on the half-pipe run, L70).
  No start part may follow the gate on two tracks in a row (a test checks it from Berlin Blue Lanes on), and
  the report's **first 20 seconds** check (below) compares what the field races through at the start.

  The recipe's first rule: a track opens with one of these, or with the classic steep plunge
  written out by hand (as every track before the library does).
- **Layouts** (`layout(kind, { mirror, costumes, dress })`): the rest of the track, as its
  `sections`. Each was proven on its own test track (`variety-layout-<kind>`, with the classic
  opening). `mirror` turns every bend the other way and swaps the splitters' channels;
  `dress` names and dresses each section by its key (looks, landmarks, billboards, tunnels,
  bridges, a centrepiece), never its shape or its obstacles' places. The one exception is a
  splitter retuned from a track's own batches: `balance` (its channels' `tipOffset`, `left`,
  `right`) and `addObstacles` (pegs on its run-in, to mix the lanes), both given for the
  unmirrored layout.

  Every layout's splitter follows S-bends that swing the fastest marbles to the left wall,
  the splitter's inside. With an opening that spreads the field (the crest start) the
  leaders then take the inside channel too often, and no balance fixes it without another
  check failing (Sognefjord on `climb-drop`). Pick a layout without a splitter, or test
  the splitter's batches early.

  | Layout | Sections (keys) |
  | --- | --- |
  | `classic` | sBends, splitter, sweep, brakingStraight, hairpin, spiral, lastStraight |
  | `early-hairpin` | sweep, brakingStraight, hairpin, outOfHairpin, sBends, splitter, spiral, lastStraight |
  | `twin-spirals` | sBends, spiral1, pegRun, brakingStraight, hairpin, spiral2, sweep, lastStraight (no splitter) |
  | `climb-drop` | sweep, approach, climb (a short crest), drop, sBends, splitter, brakingStraight, hairpin, spiral, lastStraight |
  | `late-splitter` | sweep, brakingStraight, hairpin, outOfHairpin, spiral, sBends, splitter (just before the finish), lastStraight |
  | `mid-drop` | sBends, splitter, aboveDrop, drop (a waterfall; `waterfall: false` for a plain drop), belowDrop, sweep, brakingStraight, hairpin, spiral, lastStraight |
  | `two-splitters` | sBends1, splitter1, sweep, brakingStraight, hairpin, outOfHairpin, sBends2, splitter2, lastStraight |
  | `long-sweeps` | sweep1, moguls, sweep2, brakingStraight, hairpin, spiral (one and a half turns), lastStraight (no splitter) |
  | `horseshoe-bend` (canyons) | riverRun, rapids (a short climb), climbOut, dropIn, horseshoe (225°), brakingStraight, hairpin, slalomDrop, sweep2, lastStraight |
  | `great-bend` (canyons) | gorge, flagRun, ledge, dropIn, brakingStraight, hairpin, greatBend (a spiral and a quarter), slalomDrop, lastStraight |
  | `terrace-steps` (canyons) | highSweep, drop, terraces (steps), brakingStraight, hairpin, slalomDrop, sBends, sweep2, lastStraight |
  | `rafting-run` (canyons) | gates, whirlpool (a spiral), bridgeRun, sweep, drop, sBends, brakingStraight, hairpin, lastStraight |
  | `six-canyons` (canyons) | hop1, canyon2, hop2, drop, canyon3, hop3, brakingStraight, hairpin, spin, lastStraight |
  | `spawn-meadow` (blocks) | meadowSweep, sBends, pegRun, brakingStraight, hairpin, sweep2, drop, spin, lastStraight |
  | `speedrun-straights` (blocks) | longStraight, wideSweep, slalomStraight, sBends, brakingStraight, hairpin, backStraight, drop, lastStraight |
  | `peak-beams` (blocks) | beamSweep, drop, crest (a short climb), ridgeSweep, sBends, brakingStraight, hairpin, slalomDrop, spin, lastStraight |
  | `mine-shaft` (blocks) | railRun, tightBends, cartRun, brakingStraight, hairpin, gallerySweep, shaft (a plunge), lowerGallery, sweep2, lastStraight |
  | `magma-loops` (blocks) | rimSweep, drop, lavaRun, sBends, spin1, crest, brakingStraight, hairpin, spin2, lastStraight |
  | `clear-rows` (blocks) | rowRun, sBends, rowSteps (steps), drop, spin, brakingStraight, hairpin, sweep, lastStraight |
  | `combo-steps` (blocks) | steps1, spin, drop, steps2, sweep, brakingStraight, hairpin, slalomDrop, lastStraight |
  | `stack-spiral` (blocks) | pegRun, sBends, spin, drop, sweep, brakingStraight, hairpin, stackSpiral (a little over a turn), lastStraight |
  | `fortress-gate` (blocks) | moatSweep, drawbridge (a short climb), courtyardDrop, gateRun, brakingStraight, hairpin, wallBends, sweep2, spin, lastStraight |
  | `final-level` (blocks) | introBends, portalSweep, drop, loop (a spiral), bonusRun, brakingStraight, hairpin, slalomDrop, sweep2, lastStraight |
  | `meanders` (canyons) | meander1, straight1, meander2, highSweep, drop, brakingStraight, hairpin, meander3, lastStraight |
  | `slot-canyon` (canyons) | beamHall, twist1, twist2, rimRun, corkscrew (a spiral), brakingStraight, hairpin, twist3, drop, lastStraight |
  | `cliff-road` (canyons) | rimRoad, lookout, spin, dive, paddleRun, brakingStraight, hairpin, riverSweep, lakeDrop, lastStraight |
  | `rapids-gorge` (canyons) | rapids, sBends, rockRun, cascade (a steep plunge in white water), pool, highTrail, brakingStraight, hairpin, whirlpool (a spiral), slalomDrop, lastStraight |
  | `long-falls` (canyons) | ridgeSweep, sBends, brakingStraight, hairpin, toTheLip, longFall (a waterfall), plungePool, spin, sweep2, lastStraight |
  | `siq-passage` (canyons) | narrows, siq1, boulder (a short climb), dropIn, siq2, brakingStraight, hairpin, pool (a spiral), openSweep, lastStraight |
  | `island-hops` (blocks) | bridge1, island1, hop, bridge2, island2 (a spiral), brakingStraight, hairpin, toTheEdge, islandFall (a waterfall), bridge3, sweep2, lastStraight |
  | `harbour-quays` (blocks) | sBends, quay, craneSpin (0.6 of a spiral), pier, basinSweep, dockDrop, brakingStraight, hairpin, lastStraight |
  | `temple-halls` (blocks) | entryHall, brakingStraight, hairpin, stairs1 (steps), courtyard (a spiral), stairs2 (steps), sanctum, sunSweep, lastStraight |
  | `cascade-rows` (blocks) | firstSweep (deep S-bends), cascadeRun, sBends, crest (a short climb), drop, brakingStraight, hairpin, spin, lastStraight |
  | `bonus-stages` (blocks) | stage1, bonusSweep, checkpointBends, stage2, spin, brakingStraight, hairpin, finalStage, lastStraight |
  | `horseshoe-sprint` (track and field) | approach (deep S-bends), homeStraight, hairpin, backStraight, finalSweep, spin, drop, sBends, lastStraight |
  | `blue-lanes` (track and field) | entryBends (deep S-bends), stadiumBend (a half circle), colonnade, crest (a short climb), drop, longSweep, spin, brakingStraight, hairpin, lastStraight |
  | `bell-lap` (track and field) | lapSpiral, backStraight, sweep, brakingStraight, hairpin, straight2, bellSpiral, sBends, lastStraight |
  | `hurdles-straight` (track and field) | sBends, sweep, hurdles (pegs in rows), brakingStraight, hairpin, sweep2, crest, drop, spin, lastStraight |
  | `nest-bend` (track and field) | longBend (200 degrees), homeStraight, crest, drop, sBends, brakingStraight, hairpin, sweep2, spin, lastStraight |
  | `photo-finish` (track and field) | sBends, pegStraight, roofSpiral, sweep, brakingStraight, hairpin, drop, longSweep, lastStraight (140 m) |
  | `relay-legs` (track and field) | leg1, sweep1, leg2, sweep2, leg3, hairpin, leg4, sweep3, spin, lastStraight (exchange zones painted on the legs) |
  | `steeple-water` (track and field) | barrier1, sweep, barrier2, waterJump (a light brake), sBends, drop, brakingStraight, hairpin, spin, sweep2, lastStraight |
  | `anchor-arches` (track and field) | sBends, crest, arches (a drop), sweep, spin, brakingStraight, hairpin, sweep2, lastStraight (150 m) |
  | `golden-lap` (track and field) | sweep, drop, pegStraight, brakingStraight, hairpin, spin, goldenSweep, sBends, lastStraight |
  | `bridge-slalom` (rivers) | quay (two pegs), rise (a short climb), pillars (a slalom under a chain bridge), flyOut, drop, brakingStraight, hairpin, island (a spiral), farBank (S-bends), lastStraight |
  | `market-maze` (rivers) | boats (a slalom among the market boats), bankBends (S-bends), pierRamp (a short climb), pierDrop, brakingStraight, hairpin, bankSweep, spin, underPier, pontoon (two pegs), lastStraight |
  | `steamer-pass` (rivers) | levee (two pegs), steamer (a tunnel through a paddle steamer; a boost), bayou, drop, brakingStraight, hairpin, town (S-bends), slalomDrop, landing, lastStraight |
  | `falls-edge` (rivers) | lipBend, lip (pegs), falls (a waterfall), gorge (a slalom), spin, brakingStraight, hairpin, upstream (S-bends), lastStraight |
  | `lock-staircase` (rivers) | locks (five steps), damCrest (a short climb), bridgeRun (a steep slalom drop), riverSweep (two pegs), sBends (a peg), spin, brakingStraight, hairpin, lastStraight |
  | `two-waters` (rivers) | seam (two pegs, two slalom poles, moguls), seamSweep, lagoonRunIn, lagoon (a half-pipe), village (S-bends), drop, brakingStraight, hairpin, island (a spiral), rise (a short climb), lastStraight |
  | `cataract` (rivers) | desertBank (a short slalom, moguls and a peg), cataract (a waterfall), boulders (a slalom), sails, palmBank (S-bends), brakingStraight, hairpin, palmIsland (a spiral), rise (a short climb), drop, lastStraight |
  | `rapids-ladder` (rivers) | aboveRapids (a peg), rapid1, pool1, rapid2, pool2, rapid3 (three short drops with pools between), whiteWater (a slalom), forestSweep, brakingStraight, hairpin, landingBends (S-bends), spin, lastStraight |
  | `island-castle` (rivers) | toTheRiver (a peg, two slalom poles and a peg), island (a spiral), bargeReach, vineyardClimb (a short climb), switchbacks (S-bends), railBridge (a drop), brakingStraight, hairpin, bargeSweep, lastStraight |
  | `river-steps` (rivers) | riverSteps (steps), lamps (a slalom), lampSweep, boatTurn (part of a spiral), alongSteps (S-bends), rise (a short climb), drop, brakingStraight, hairpin, sweep2, lastStraight |
  | `bridge-gate` (rivers) | embankment (two pegs), bascule (a slalom drop between a raised bascule bridge's towers), dock (a spiral), reach (a sweep, two pegs; it flies here), brakingStraight, hairpin, sBends (a peg), rise (a short climb), drop, longReach (a sweep), lastStraight |
  | `arch-run` (rivers) | arches (a slalom under five stone arch bridges), islandTip (a sweep, three pegs), drop, brakingStraight, hairpin, lowQuay (a sweep, two pegs), quayBend (a sweep, a peg), rise (a short climb), downQuay (a drop), spin, lastStraight |
  | `port-cranes` (rivers) | cranes (a slalom drop), plain (a sweep, three pegs), birches (a sweep, two pegs), brakingStraight, hairpin, rise (a short climb), drop, spin, bridgeRun (S-bends, a peg; it flies here), lastStraight |
  | `flooded-forest` (rivers) | trunks (a slalom; it flies here), offStilts (a drop), cliffs (a sweep), spin, brakingStraight, hairpin, lock (a short climb), weir (a drop), sBends (a peg), landing (a sweep), lastStraight |
  | `icefall-ladders` (peaks) | icefall1 (a slalom drop between seracs, four gates), ladder1 (a crevasse crossing, a peg), bends1 (S-bends, a peg), icefall2 (a drop), ladder2, bends2, icefall3, ladder3 (an ice-arch crossing), glacier (a long sweep, two pegs), brakingStraight, hairpin, lastStraight |
  | `needle-ridge` (peaks) | ridge (a long straight along a knife-edge ridge: two pegs and a slalom, five gates; it flies here), offRidge (a slalom drop, five gates), sBends (a peg), glacier1, glacier2 (sweeps, a peg), brakingStraight, hairpin, moraine (a short climb), drop, lastStraight |
  | `blue-ice-plain` (peaks) | sweep1, sweep2 (a peg), nunataks (a slalom straight, five gates), brakingStraight, hairpin, sastrugi (moguls), rise (a short climb), drop, campSpin (a spiral), lastStraight |
  | `zone-descent` (peaks) | iceTerrace (two pegs, two slalom poles), ice (S-bends), desert (a sweep, two pegs), moorland (a slalom straight, four gates), heath (a spiral), forest (a drop), brakingStraight, hairpin, sweep2 (a peg), lastStraight |
  | `ice-cave-run` (peaks) | caveDrop (a drop, two pegs), cave (S-bends; the blue-ice tunnel), streams (a slalom straight, five gates), gravelBar (a spiral), brakingStraight, hairpin, terrace (a drop), outwash (a sweep, a peg), lastStraight |
  | `balloon-plain` (rivers) | sandbank (a long gentle drop, three pegs), plainBends (S-bends, two pegs; they fly here), rise (a short climb), slalomDrop, spin, brakingStraight, hairpin, sweep1, sweep2 (a peg), sweep3, lastStraight |
  | `cinder-switchbacks` (peaks) | cinders (a peg), switch1, switch2, switch3 (three pairs of banked switchbacks, each wider than the last: radius 48, 60, 74 m; the big feature; pegs), cloudSea (a slalom straight over the sea of clouds; it flies here), plunge (a drop), brakingStraight, hairpin, forest (a sweep, a peg), lastStraight |
  | `penitente-maze` (peaks) | scree (a straight: steps and moguls), intoField (a short slalom), halfPipe (a half-pipe through the penitentes, width 8, three swings; the big feature), drop, tower (a spiral), brakingStraight, hairpin, rise (a short climb), washDrop (a drop), wash (S-bends, a peg), lastStraight |
  | `glacier-junction` (peaks) | moraine (a long straight: a peg and a brake zone), splitter (two straight channels round a rock island; the outside one has its own balance; the big feature), sweep (150°), icefall (a drop, a peg), brakingStraight, hairpin, sBends (a peg), rise (a short climb), drop, lastStraight |
  | `saddle-traverse` (peaks) | saddle (a sweep, a peg), saddleStraight (a slalom straight), rise (a short climb), ridgeDrop (a drop), spiral1, between (a peg), spiral2 (twin one-turn spirals, one each way; the big feature), brakingStraight, hairpin, lastStraight |
  | `iceberg-lake` (peaks) | wall1, shelf (a peg), wall2 (a two-step drop; the first big feature), lake (a slalom straight, five gates), splitter (two curving channels round an iceberg, 110°, turning left, its inside channel rougher; the second), sBends, brakingStraight, hairpin, spin (a spiral), lastStraight |
  | `moss-glacier` (peaks) | snout (two pegs), falls (a waterfall through a curtain of water; the big feature), forest (a slalom straight), boardwalk (a sweep, 150°), clearing (two pegs), bogSweep, spin (a spiral), brakingStraight, hairpin, sBends (a peg), lastStraight |
  | `lake-terraces` (peaks) | lake1 (a peg), outflow1 (a peg), fall1, lake2, outflow2 (a peg), fall2, lake3, outflow3 (a peg), fall3 (three sweeps, each followed by its outflow and a waterfall step: the big feature), puya (a slalom straight), brakingStraight, hairpin, lastStraight |
  | `tepui-wall` (peaks) | wall (a 140 m straight along the wall: two pegs and a hard slalom, six gates), hairpin, sBends, talus (the series' longest straight drop, 85 m; the big feature), shelf (a peg), forestDrop (a drop), savanna (a sweep, a peg), spin (a spiral), lastStraight |
  | `rhododendron-drop` (peaks) | traverse (a long straight: a peg and a brake zone), brakingStraight, hairpin, terrace (a table top; the first big feature), terraceDrop (a drop; the second), moraine (a short slalom), moraineDrop (a drop), rhodo1 (S-bends, a peg), rhodo2 (S-bends), gully (a sweep, a peg), lastStraight |
  | `tidewater` (peaks) | glacier (a sweep, a peg), jumpStraight (a 140 m straight with the boost-pad jump over a crevasse; the first big feature; a peg at its end), cliffTop (a sweep), fjordDrop (a drop, a peg; the second), brakingStraight, hairpin, seaIce (a one-turn spiral), fjordS (a sweep, a peg), lastStraight |
  | `island-channels` (rivers) | floodplain (a straight: two pegs and a slalom), splitter (two channels curving 40° round a river island, the inside one rougher; the big feature), elephants (S-bends), drop, brakingStraight, hairpin, sandbank (a spiral), lastStraight |

  A track may still write its own sections by hand; the sameness check makes sure they differ.
- **`family`**: `'world-tour'` (the default), `'grand-prix'` (any `grandPrix` track),
  `'coaster'`, `'pinball'`, `'arcade'`, `'canyon'`, `'block'`, `'athletics'`, `'winter-wonders'`, `'river'`, `'peak'` or `'test'` (test tracks, never compared).
  A Rivers track (`'river'`) gives `river: { palette, side, width, banks }`; each section may say where the river runs
  by it (`river: 'left' | 'right' | 'under' | 'none'`; `under` needs a `height` of at least 6 m). Boats are landmarks
  with `river: true` (`distance`: metres from the river's middle towards the track).
  `'winter-wonders'` (Winter Wonders, the Holiday Season's own fairy-tale winter series) is built exactly as a World
  Tour track on the ground; its kit carries `winterWonders: true`, which lists it as its own series.
  Openings are compared within a family.

## Shapes

| Shape | Use |
| --- | --- |
| `plunge(length, { grade, from })` | Steep straight drop (a hand-written track opens with one: see Openings); `from`: the grade before it, eased up 0.06 every 10 m so a steep plunge can follow a gentle stretch |
| `straight(length, { grade })` | Gentler straight |
| `climb(length, { grade, after })` | Short climb, rounded off over the top |
| `sBends({ first, radius, degrees })` | Two flowing bends, one each way |
| `sweep({ side, radius, degrees })` | Long banked sweep (radius 45 m or more) |
| `spiral({ side, radius, turns })` | Flowing spiral (radius 40 m or more) |
| `hairpin({ side })` | The one sharp bend; the section before it must be a straight of 35 m or more |
| `splitter({ side, degrees, balance })` | Field divides and rejoins (`degrees: 0` on a straight) |
| `halfPipe({ first, width, swings, radius, degrees, grade })` | The channel widens into a U (`width`: its radius, 6 to 10 m, the channel's is 3.6) over gentle alternating bends (`swings`), easing in and out over 25 m: the field rocks from wall to wall as it rolls down (about two swings a marble, hops under 1 m). Nothing in or over it; a straight of 20 m or more, or a drop, before it; never two in a row. Proven on the half-pipe run (L70) |
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

| `box({ at, length, width, height, line })` | A jib part (snowboard park): a low box with a flat top (default 10 m long, 1.2 m wide, 0.25 m high). Marbles that meet it square on roll up onto it, across and off the end; the rest are pushed round either side |
| `rail({ at, length, line })` | A narrow, very low box (0.3 m wide, 0.12 m high): a bar along the track that bumps the marbles about; a few ride along it |
| `tableTop({ at, length, height, down })` | A long raised flat over the channel's floor, a short ramp up and a gentle drop-off over `down` metres: the pack spreads out on the flat (nothing pulls it back to the middle) and drops off in a stream |
| `jibLine({ from })` | A rail, a box and a table top one after another, as on a park run: `features: jibLine({ from: 0.1 })` on a straight of 110 m or more |
| `boostJump({ at, look, pad, kick, min, kicker, height, gap, landing, deck })` | A boost-pad jump (`look`: `'ski-jump'` or `'river-jump'`, looks only): a launch pad wall to wall (`pad` m; it adds `kick` and brings every marble up to at least `min` m/s), a kicker ramp (`kicker` m, rising `height`), a gap (`gap` m) and a landing deck (`landing` m, from `deck` m at its lip easing down to the ice). A hidden catch channel under the gap brings back any marble that would fall short, past the deck. Defaults: pad 6, kick 4, min 22, kicker 20, height 0.9, gap 4, landing 40, deck 0.5 |

Nothing bumpy within 40 m after a block: marbles flung off it land on the bumps and bounce high.
Jib parts: on straights only, at most 0.35 m high (the drop off the end is a hop of 0.8 m at most), 4 to 40 m
long, 8 m clear of any other obstacle or feature, never in the first 25 m or near the line. Proven on the jib
run (L72). They race only on tracks that have them: every other race is unchanged.

Boost-pad jumps: one a track at most, and on **two or three tracks only** (a test counts them), on a straight
of grade 0.05 to 0.2, with 30 m of the straight before the pad and 15 m after the catch channel's exit, 15 m clear
of any other obstacle or feature. Within what's proven: kicker 0.8 to 1.5 m high, gap 2 to 6 m, the deck's lip lower
than the kicker's, a pad of at least 18 m/s. The recipe works out the flight: at the pad's minimum speed a marble
must pass 0.25 m over the deck's lip, and at 42 m/s (faster than any marble leaves a lip) it must still come down
on the deck. Proven on the jump run (L73, `variety-layout-jump-run`, full report 39 of 39): every marble clears it
(none of 60,000 jumps fell short in 3 x 1,000 races), leaving the lip at 25 to 39 m/s and flying 16 to 39 m, at
most 1.6 m over the ice. The report shows a jump's flights on their own lines (marbles that fell short, the highest
flight over the ice: at most 2 m); they never count as hops.

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
  The Holiday Season's landmarks (client/src/three/scenery/kitLandmarksHoliday.js; generic architecture and
  traditions, no religious figures, flags, emblems or brands): 'chateau-hotel', 'toboggan-slide',
  'flat-top-mountain', 'promenade-lights', 'braai-fires', 'outback-homestead', 'kangaroo-mob', 'light-figures',
  'light-arches', 'gothic-church-front', 'gingerbread-stands', 'papel-picado', 'posada-procession', 'pinata-line',
  'badnjak-fires', 'fortress-walls', 'hanging-lanterns', 'old-church-courtyard', 'wooden-residence', 'troika',
  'onion-dome-church', 'ice-rink-tree', 'drum-circle', 'snow-sculptures', 'tv-tower', 'snow-lanterns',
  'ice-castles', 'pohutukawa-trees', 'harbour-arch-bridge', 'castle-rock', 'rock-hewn-church', 'pilgrims',
  'parol-lanterns', 'parang-band', 'gallery-houses', 'white-crowd', 'flower-boats', 'star-lanterns' (pixel blocks, for
  the arcade), 'pixel-palms', 'pixel-white-church', 'stepping-stones', 'lantern-bridge', 'gingerbread-houses',
  'candy-trees', 'ice-palace', 'ice-chandeliers', 'steam-train', 'top-station', 'owl-perches', 'reindeer-herd'
  (lights, fires and lit ice glow, drawn unlit). The season's costumes: 'steel-pan-bumper', 'firework-bumper' and
  'gumdrop' (blocks), 'maraca-post' and 'candy-cane' (slalom poles and pegs). Its pinball art: 'parang',
  'beach-fireworks'; its arcade art: 'star-lanterns', 'light-stream'.
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
'night-northern-lights' | 'fog' | 'snow' | 'rain' | 'night' | 'fireworks-night'` (default `'day'`; `'night'`: a floodlit city night;
`'fireworks-night'`: the city night with fireworks bursting round the sky all race long, on the race clock, looks only).
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

## Coasters

`family: 'coaster'` makes a track a roller coaster (looks only: it races exactly as the ice channel):

- **Up on supports**: steel rails along both rims, a spine and cross-ties under the channel,
  and lattice A-frame towers down to the land (fewer, plainer ones on phones). The track
  flies `coaster.height` metres above the land (default 16), or a section's own `height`
  (0 to 45); it eases from one height to the next. `height: 0` touches down: the land meets
  it there, as on every other track. Every coaster touches down somewhere along the way,
  and its tunnels and station are on the ground. No tower stands on or through another
  stretch: that stretch spans the gap.
- **Colours**: `coaster: { colours: { rail, support, tie } }`.
- **Lift hill**: behind the gate the track climbs a lift hill (a deck, the chain, a catwalk)
  from the land up to the gate, the land carved down along it; the countdown opens at its
  foot, the start landmark behind it, and rides up beside the climb to the gate.
- **Start types** (`start.type`, at most two coasters of a family share one): `straight-lift`,
  `curving-lift`, `spiral-tower`, `elevator`, `cliff`, `rooftop`, `station-launch`, `stepped-platform`
  (the gate on broad stone steps, each tier lower, deeper and wider behind it: a temple's or a canyon's),
  `lighthouse` (a lighthouse in red and white bands, its gallery level with the gate), `ski-jump` (a ski
  jump's in-run rising on from the gate to a start hut on a concrete tower) and `castle-tower` (the gate on
  top of a great round tower with battlements, in the coaster's support colour).
- **Station**: a canopy over the finish and the run-out, platforms either side, riders queuing.
- **Water**: `water: true` on a section: the land sinks under a water surface round it (never
  above any stretch of track). Landmarks out over the water float on it (`cruise-ship`).
- **Water curtain**: `waterCurtain: true`: a see-through sheet of falling water over the rails
  (a waterfall the track runs behind); the marbles never feel it.
- **Billboards**: on towers wherever the track flies, on any section but the sharp bend, a
  tunnel or the finish; and `finish: { billboards: 1 or 2 }` on the station roof.
- Openings and layouts come from the libraries (above), and every coaster passes the sameness
  check. The design's landmark moments are dressed onto the layout's sections by key.
- Sognefjord is the proof track (the crest start on `long-sweeps`: no splitter). A coaster
  splitter (two sets of rails on a wider frame) is built but not yet on a switched-on track.

## Canyons

`family: 'canyon'` (the Canyon Series) runs the track through a canyon. It is built as a coaster
(everything above applies), with these differences (looks only, like everything else):

- **On the canyon floor**: a section without a `height` runs on the floor (the default height is
  0); a section's `height` (up to 45) lifts it onto supports, and there the walls stand lower,
  so the track climbs out over the rock and drops back in. Every canyon touches down somewhere.
- **The canyon**: `canyon: { palette, depth, river, narrow }`. `palette`: the rock, river and plateau
  colours and what grows there (`grand-canyon`, `himalaya`, `andes`, `limestone`, `copper`,
  `basalt`, `karakoram`, `namib`, `slot`, `verdon`, `jinsha`, `waimea`, `mujib`); `narrow: true`: a slot
  canyon, its walls about 15 m from the track instead of 20, climbing faster; `depth`: metres from the floor to the rim (20 to 60, default 40);
  `river`: `'left'`, `'right'` or `'none'`. The floor reaches 20 m from the track (34 m on the
  river's side, the river 16 to 26 m out), then the walls climb in bands to the rim over about
  22 m; beyond lies the plateau. Inside a tight bend the walls meet in a butte.
- **Where the walls stand**: from about 40 to 120 m after the gate, until about 60 m before the
  finish (the lift hill and the station stand in the open); a section's `walls` (0 to 1) lowers
  them; where another stretch passes close at another height (a spiral's turns) they give way
  to the ordinary hillside. The land beside any stretch never rises over it.
- **Supports**: `coaster: { style: 'timber' }` builds timber trestle bents instead of steel A-frames.
- **Landmarks** may stand up on the rim (`{ name, at, side, rim: true, distance }`, `distance`
  metres back from the edge) or float on the river (`{ name, at, river: true }`).
- **Spans** over the gorge, a section's `overhead`: `'prayer-flags'`, `'arch-bridge'`,
  `'railway-trestle'`, `'suspension-bridge'` (rim to rim, high over the track), and `'condor'`
  (two condors circling above the rim).
- The layouts made for the series: `horseshoe-bend`, `great-bend`, `terrace-steps`,
  `rafting-run`, `six-canyons`, `basalt-gorge`, `twin-peaks`, `cliff-ledge`, `free-fall`, `meanders`,
  `slot-canyon`, `cliff-road`, `rapids-gorge`, `long-falls`, `siq-passage`; each has a test track built
  as a canyon (`series: 'canyon'`).
- **See-through parts**: a landmark may give `haze` (shafts of light falling into a slot, a rainbow in
  a waterfall's spray, an island's waterfall), drawn faint and unlit, never written to depth.
- Grand Canyon Burst is the proof track.

## Block Series

`family: 'block'` (the Block Series) runs the track through a world built of cubes. It is built
as a coaster (everything above applies), like a canyon (looks only, like everything else):

- **On the voxel land**: a section without a `height` runs on the land (the default height is 0);
  a section's `height` lifts it onto block pillars (over the cube cliffs, round the stack).
- **The world**: `block: { world }`, one of `meadow`, `valley`, `snow`, `mine`, `magma`,
  `puzzle`, `fortress`, `portal`, `sky` (island tops over a sea of cloud), `harbour` (quays, containers),
  `temple` (sand-coloured desert), `bonus` (a night stage) (the land's colours, how it steps, what stands on it).
- **Supports**: `coaster: { style: 'blocks' }` builds stacked cube pillars.
- **Our own shapes**: the falling pieces in the scenery are our own block shapes and colours,
  never the classic seven in a classic well; no names, creatures, textures or terms from
  existing block games (see the plan in the project, `claude/block-series-plan.md`).
- **Landmarks** of the series (client `kitLandmarksBlock.js`) may have parts that give their own
  light (`glow`: lamps, gems, magma, drawn unlit) and a quiet effect (`fx`) on the race clock and
  the leader's progress: `clear-rows` (the full rows flash and clear as the leader passes, the
  rows above settle), `combo-rows` (five lamp rows light one after another), `settling-stack`
  (around a spiral: a new block settles on top every 6 s, a full layer clears), `split-board`
  (a lamp per quarter of the race, gold once the winner is home), `block-gate` (a gateway,
  `over: true`: its lintel's blocks drop into place as the pack comes), `drawbridge` (lowers as
  the pack comes), `block-portal` (a gateway glowing blue to violet), `gg-arch` (a finish
  landmark: the GG lights once the winner is home), `chain-rows` (eight short walls of rows clear one after
  another, 0.3 s apart, as the leader comes level, then refill), `score-wall` (a row of lit blocks for each
  tenth of the race the leader has run, gold once the winner is home), `checkpoint-flash` (a gateway,
  `over: true`: its lamps flash as the leader passes under), `final-stage` (a finish landmark lit, with a
  slow ripple, once the winner is home). A rewound replay undoes them.
- **Lighting**: `dawn` (a soft warm morning), `cave` (dark, lamplit, the marbles glowing) and
  `magma` (lit from below by the magma, embers drifting up on computers).
- **Costumes**: `cube-pillar`, `gem-pillar`, `magma-pillar` (slalom poles and pegs), `voxel-cube`
  (a block or pile-up), `block-pieces` (parked: our own five- and six-cube pieces), `block-crane`
  (a swipe).
- The layouts made for the series are the ten `(blocks)` rows above; each has a test track
  built as a Block Series world (`series: 'block'`).
- The ten tracks (switched off until reviewed): Spawn Point (the proof track), Speedrun Valley,
  Voxel Peaks, Deep Mine, Magma Core, Line Clear, Combo Drop, The Stack, Block Fortress,
  Final Level.

## Track and Field

`family: 'athletics'` (Track and Field) races through athletics stadiums. It is built as a coaster
(everything above applies), like the Block Series (looks only, like everything else):

- **On the ground**: a section without a `height` runs on the land; a section's `height` lifts it onto
  slim concrete columns (`coaster: { style: 'concrete' }`), a ramp that may fly over the stands.
- **The stadium**: `athletics: { stadium, lanes }`. `stadium` is one of `panathenaic`, `berlin-1936`,
  `bislett`, `hayward`, `nest`, `tokyo`, `stockholm-1912`, `london`, `coliseum`, `letzigrund` or `accra`
  (an open bowl in kente colours, for the Holiday Season): generic
  architecture only (stand colours and rise, a closed oval or a horseshoe, roof, floodlight masts, its own
  touch: a woven steel shell, a stone colonnade, brick towers, a row of arches with a plain flame cauldron).
  `lanes` is `red` (the default) or `blue`. Sections marked `stadium: true` (a dress key, looks only) run
  inside it: the stands are fitted round them (client `athletics.js`), open where the track runs out
  through them, stepped down under a ramp flying over them, and kept clear of a finish inside the stadium.
- **The track**: `surface: 'tartan'` or `'tartan-blue'` (looks; it races like ice), with white lane lines,
  a start line and lane numbers in front of the gate, and a finish line; the braking-zone strips are dark
  rubber; `paint({ look: 'exchange-zone' })` marks a relay's exchange zone on the lanes. The lane numbers are
  painted as on a real track (Moses, 30 Oct 2026): readable from behind the start looking down the track, their
  tops towards the finish, lane 1 the leftmost as the marbles run, on every track. So a Track and Field track's
  start shots look down the track from behind the field: no `front` countdown and no `look-back` first seconds.
- **Gates, every track**: gate 1 is the leftmost seen from behind the gate looking down the track, counting
  left to right ("Your gate: N" is the entry's lane + 1; checked on all tracks, 30 Oct 2026).
- **Furniture** (drawn for every Track and Field track): starting blocks at the gate; the starter on his
  stand beside it, his gun flashing and smoking at GO; the scoreboard, whose clock runs with the race clock
  and stops at the winner's time; the photo-finish camera at the line, flashing as the winner crosses; at
  `letzigrund` a golden finish (gold lamps and confetti once the winner is home). All on the race clock
  and the leader's progress, undone when a replay rewinds.
- **Costumes**: `hurdle` (a peg or a slalom gate, drawn the size of its peg), `steeple-barrier` (a block),
  `hurdle-cart` (parked).
- **Landmarks** (client `kitLandmarksAthletics.js`): `athletes-village`, `herm-gateway`, `stone-colonnade`,
  `stadium-bell-tower`, `warm-up-track`, `timber-stand`, `woven-lattice`, `wooden-eaves`, `brick-tower`,
  `relay-batons`, `steeple-pit`, `peristyle-arches`, `flame-cauldron`, `golden-arch`, `floodlight-mast`,
  `field-events`, `medal-podium` (the last three also stand in a spiral's or a hairpin's middle).
- **Names**: never "Olympic", the rings, a torch design, or any league, federation or sponsor (a test
  checks every Track and Field track's texts); real place names only.
- The layouts made for the series are the ten `(track and field)` rows above; each has a test track
  built as a stadium (`series: 'athletics'`).
- **The ten tracks** (all added switched off, data updates `2027-02-05-…` to `2027-02-15-…`), each on
  its own layout and opening: Marble Stadium Sprint (classic, horseshoe sprint), Berlin Blue Lanes
  (staggered drop, blue lanes), Bislett Mile (pipe drop, bell lap), Eugene Hurdles (peg drop, hurdles
  straight), Beijing Nest 200 (clean drop, nest bend), Tokyo Photo Finish (pipe drop, photo finish),
  Stockholm 1912 Relay (split start, relay legs), London Steeplechase (peg drop, steeple water), Coliseum
  Anchor Leg (clean drop, anchor arches), Zurich Golden Lap (tunnel launch, golden lap).

## Peaks

`family: 'peak'` (Peaks, 25 Oct 2026; plan: project doc `claude/rivers-and-peaks-plan.md`, section 2) is a run down
one of the world's great mountains. It is built as a coaster (everything above applies), like the Rivers (looks only):

- **On the mountain's snow**: a section without a `height` runs on the land; a section's `height` lifts it onto
  supports. `coaster: { style: 'alpine' }`: steel trusses held by cable stays out to the slope.
- **The mountain**: `peak: { palette }`, one of `everest`, `mont-blanc`, `vinson`, `kilimanjaro`, `vatnajokull`, `fuji`,
  `aconcagua`, `k2`, `elbrus`, `aoraki`, `rwenzori`, `huascaran`, `roraima`, `kangchenjunga`, `alaska`
  (client `PEAK_PALETTES`, `scenery/peak.js`): its snow, ice and rock, its zones, what stands on it, and its summit
  and neighbours in a far backdrop (one mesh; Everest's with a snow plume). **The summit is scenery, never track**,
  with nothing of ours on it.
  A palette may give `zones` its own colours for a zone (`{ zone: [flat, steep] }`, over the shared ones), and its
  `dressing` what stands on each zone; the kinds are `snow-rock`, `serac`, `boulder`, `scree-rock`, `moss-rock`,
  `tussock`, `forest-tree`, `pine`, `heather`, `groundsel`, and (Peaks 6–15) `penitente` (a blade of snow), `rime-rock`, `moss-heather`,
  `lobelia`, `puya` (a giant flower spike) and `rhododendron`.
- **Per section** `peak: { zone, ridge, crevasse }`: `zone` the land there (`snow`, `ice`, `rock`, `alpine-desert`,
  `moorland`, `heath`, `cloud-forest`, `black-sand`: its colours and what grows); `ridge: true` a knife-edge ridge
  (the land falls away steeply on both sides; the section flies, `height` 6 or more); `crevasse: 'ladder' | 'ice-arch'`
  a crevasse cut across under a straight, crossed on a ladder or an ice-arch bridge (the section flies).
- **Starts** (Peaks only): `ice-ledge` (an overhanging snow ledge), `gondola` (a cable-car station on a granite
  needle), `ski-plane` (a ski plane's cargo ramp on a glacier runway).
- **Tunnel** `blue-ice`: a long cave of glowing blue ice (opaque; holes of daylight in its roof).
- **Lighting** `high-altitude`: the thin air's deep blue sky, a small sharp sun, hardly any haze.
- **Scenery** `sea-of-clouds` (a section's or the finish's): cloud tops over the far valleys, one mesh.
- **Spindrift**: snow blown off the outside of fast bends and drops, on the race clock, one point cloud; only where
  the section's zone is snow or ice (none over moorland, forest, desert or rock; 30 Oct 2026).
- **Landmarks** (client `kitLandmarksPeak.js`): `peak-camp` (plain tents, no flag), `serac-field`, `granite-needles`,
  `nunataks`, `ski-plane`, `crater-ice-cliffs`, `giant-groundsels`, `meltwater-streams`, `pass-cairn` (only on mountains
  without a sacred-summit request), `glacier-tongue`; Peaks 6–15: `cinder-cones`, `penitentes`, `glacial-lake`, `barrel-hut`
  (a round mountain hut), `icebergs`, `giant-lobelias`, `tepui-falls` (ribbon falls off a table mountain), `rhododendrons`,
  `calving-ice` (a tidewater glacier's ice cliff) and `rock-island`.
- **Costumes**: `serac`, `nunatak`, `groundsel` (slalom poles and pegs).
- **Never**: religious objects (prayer flags, chortens, shrines, torii, offerings), flags of any kind, expedition,
  guide, gear, lift or airline names, anything on a summit.
- The layouts made for the series are the `(peaks)` rows above (L89 to L93 for the test five, L94 to L103 for Peaks 6–15); each has a test track built as a
  mountain (`series: 'peak'`).

## The racing look

Every kit track gets it by itself (Moses, 30 Oct 2026; `client/src/three/scenery/racingLook.js`), looks
only: chequered start and finish lines and short, muted red-and-white kerbs on the inside of the 1–2
sharpest bends (sharper than 0.016 rad a metre, at least 80 m apart; one at most on Canyons, Rivers and
Peaks; Track and Field: the finish's chequer only). Nothing to set in the track file.

## TV moments

A track can have one or two fixed trackside cameras at its dramatic spots (drawing only, never
raced), facing back up the track at the oncoming marbles:

```js
tvCameras: [
  { section: 'The marble end', at: 0.5, side: 'left', distance: 6, height: 9 },
  { section: 'More S-bends', at: 0.5, side: 'right', distance: 8, height: 9 },
],
```

The big view cuts to one as the followed marble (the leader, or the player's own) comes up to it
(72 m before) and cuts back just before it reaches it (6 m short): about 2.6 s. In about every other race a camera
between 35% and 70% of the way (else the one nearest the middle, 25–78%) is kept for the **pack shot**
instead: the first bunch of at least 5 marbles coming up to it, framed whole (no such bunch, no shot).
Cameras stand `TV.raise` (2 m) above their `height` wherever that stays clear of the scenery
(`client/src/three/tvMoments.js`; Moses, 30 Oct 2026). Put one camera between 35% and 70% of the way. The cut is worked out from
where the marble is, so replays show the same moments. Rules: at a section of the track, `at` 0 to 1,
`distance` 6–25 m out from the rim, `height` 2–15 m, at least 250 m from the gate and 150 m from the line,
two cameras at least 300 m apart. The viewer's **TV** button switches them off. A client test checks
that no scenery stands at a camera or between it and the track.

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
- **Variety** (the sameness check, no races needed): no other track of the family opens
  the same way (opening, first obstacle, first bend), at most two of a family share an
  opening, and the section order is not too alike any other track's (similarity 0.80, or
  0.70 with the splitters and sharp bend in the same places; shown from 0.65).
  `node scripts/variety-table.js` scores every track at once (`--matrix`: every pair).
- **First 20 seconds** (Variety): what the middle of the field races through in its first
  20 s (the opening, then each section's shape, obstacles and features, in order) against every
  other track's start, kept in `src/report/startSequences.json` (`node scripts/start-sequences.js`
  records them all). Too alike at 0.80; the same sequence is a reused start. Every track from
  Bislett Mile on is held to it (a test).
- **Safety**: the same seed gives the same race; the database holds what the file
  builds (where there is a database); today's tracks race as recorded.
- **Ground** and **Camera**: the ground check, and frame by frame through two races
  on phone and computer screens: the follow camera never blocked, on its marble's
  level, no jumps, its marble never inside the ice.
- **Drawing load** through a race and the **fixed screenshots**, from a headless
  browser (needs Chromium; its frame rate means nothing).
- **Picture**: the track picker's picture, rendered from the track's own scene
  (`scripts/track-banners.js <slug>`; `--skip-banner` leaves it out). It writes
  `client/public/tracks/<slug>.webp` (640×360, under 40 kB) and `@2x` (1280×720), and adds
  the track to `client/src/shared/trackBanners.json`; commit all three. The same camera on
  every track: raised, behind the leading group, looking on down the track, under the
  track's own sky (its own `lighting`: night, sunset, northern lights…), no billboards. If the picture
  isn't good, give the track a moment and a side in `scripts/track-banners.json`
  (`{ "<slug>": { "t": 24000, "side": -1 } }`), or a camera of its own set by a spot on the
  track (`{ "at": 0.25, "back": 20, "beside": 14, "side": -1, "up": 10, "ahead": 45, "rise": -12 }`;
  `at` 1 and a negative `back` frame what lies past the finish, e.g. a pinball table's
  flippers), and run it again. A client test fails while a track has no picture, or a
  picture isn't under its track's own sky (`"lighting": "<preset>"` there picks another of its presets).

## Before a track goes live

It is added switched off (`node scripts/physics-track-sql.js <slug> --add-hidden "…"`),
watched at `/preview/physics?track=<slug>`, and switched on once approved.
