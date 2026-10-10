'use strict';

// Writes a physics track (from its definition in code) as JSON for the kit
// view (client/dev/kit-view.html), which draws it without a server:
//   node scripts/dump-kit-track.js kit-proving-ground
//   node scripts/dump-kit-track.js costume-gallery    (every costume in the library, for looking at; never raced)
//   node scripts/dump-kit-track.js grand-prix-gallery (every Grand Prix piece, for looking at; never raced)
const fs = require('node:fs');
const path = require('node:path');
const { physicsTrack } = require('../src/game/physicsTracks');
const kit = require('../src/trackKit');

/** Every costume in the library on one run, by the kind of obstacle it dresses (keep in step with client/src/three/costumes). */
function costumeGallery() {
  const blocks = ['panda', 'camel', 'cafe-table', 'reindeer', 'baboon', 'cow', 'marmot', 'elk', 'chamois', 'sled-dog', 'arctic-fox', 'pigeon', 'log', 'caiman', 'jaguar', 'football', 'monkey', 'tyre-stack'];
  return kit.track({
    slug: 'costume-gallery',
    name: 'Costume Gallery',
    sections: [
      { name: 'Blocks', shape: kit.plunge(160, { grade: 0.5 }), obstacles: blocks.map((costume, k) => kit.block({ costume, at: 0.25 + k * 0.065, line: k % 2 ? 'left' : 'right' })) },
      { name: 'Tall', shape: kit.straight(40, { grade: 0.15 }), obstacles: [kit.block({ costume: 'giraffe', size: 'large' })] },
      { name: 'Parked', shape: kit.straight(80, { grade: 0.15 }), obstacles: [kit.parked({ costume: 'ore-cart', at: 0.2, side: 'left' }), kit.parked({ costume: 'kick-sled', at: 0.6, side: 'right', length: 6 })], billboards: 2 },
      { name: 'Parked 2', shape: kit.straight(80, { grade: 0.15 }), obstacles: [kit.parked({ costume: 'piste-groomer', at: 0.2, side: 'left', length: 8 }), kit.parked({ costume: 'snowmobile', at: 0.6, side: 'right', length: 8 })] },
      { name: 'Poles', shape: kit.straight(60, { grade: 0.2 }), obstacles: [kit.slalom({ from: 0.15, to: 0.6 }), kit.peg({ costume: 'go-stone', at: 0.75 }), kit.peg({ costume: 'xiangqi-piece', at: 0.88, line: 'left' })] },
      { name: 'Poles 2', shape: kit.straight(60, { grade: 0.2 }), billboards: 1, obstacles: [kit.slalom({ costume: 'lantern-pole', from: 0.15, to: 0.6 })], features: [kit.paint({ from: 0.05, to: 0.45, look: 'go-board' }), kit.paint({ from: 0.55, to: 0.95, look: 'xiangqi' })] },
      { name: 'Curtain', shape: kit.straight(40, { grade: 0.2 }), obstacles: [kit.curtain({ costume: 'zebras', side: 'right' })] },
      { name: 'Swipe', shape: kit.sweep({ side: 'left', degrees: 60 }), obstacles: [kit.swipe({ costume: 'elephant' })] },
      { name: 'Swipe 2', shape: kit.sweep({ side: 'right', degrees: 60 }), obstacles: [kit.swipe({ costume: 'musk-ox' })] },
      { name: 'Swipe 3', shape: kit.sweep({ side: 'left', degrees: 60 }), obstacles: [kit.swipe({ costume: 'fortune-cat' })] },
      { name: 'Swipe 4', shape: kit.sweep({ side: 'right', degrees: 60 }), obstacles: [kit.swipe({ costume: 'camera-crane' })] },
      { name: 'Grand Prix', shape: kit.straight(80, { grade: 0.15 }), obstacles: [kit.slalom({ costume: 'traffic-cone', from: 0.1, to: 0.3 }), kit.parked({ costume: 'safety-car', at: 0.45, side: 'left', length: 5 }), kit.curtain({ costume: 'banner-gantry', at: 0.8, side: 'right' })] },
      { name: 'Out', shape: kit.plunge(60, { from: 0.1 }), billboards: 1 },
    ],
  });
}

/**
 * Every Grand Prix piece on one run (never raced for real; for looking at): start lights,
 * grandstands and crowds, asphalt with kerbs and tyre barriers, the Grand Prix costumes,
 * rumble strips, eight billboards, the chequered finish, its building and fireworks.
 */
function grandPrixGallery() {
  return kit.track({
    slug: 'grand-prix-gallery',
    name: 'Grand Prix Gallery',
    surface: 'asphalt',
    biome: 'city',
    variants: ['night'],
    grandPrix: true,
    billboardFrame: 'led',
    sections: [
      { name: 'Start plunge', shape: kit.plunge(80, { grade: 0.6 }), billboards: 1, obstacles: [kit.pileUp({ costume: 'tyre-stack', at: 0.42 }), kit.slalom({ costume: 'traffic-cone', from: 0.55, to: 0.97, count: 6, loss: 0.3 })] },
      { name: 'S-bends', shape: kit.sBends({ first: 'left', radius: 75, degrees: 80, grade: 0.13 }), billboards: 2 },
      { name: 'Splitter', shape: kit.splitter({ side: 'left', balance: { tipOffset: -0.8, left: { drag: 1.32, scrub: 1.32 }, right: { drag: 0.42, scrub: 0.72 } } }) },
      { name: 'Sweep', shape: kit.sweep({ side: 'right', radius: 80, degrees: 160, grade: 0.07 }), billboards: 2, features: [kit.boost({ at: 0.08 })], obstacles: [kit.swipe({ costume: 'camera-crane', at: 0.6 })] },
      { name: 'Pit straight', shape: kit.straight(90, { grade: 0.15 }), billboards: 2, scenery: ['crowd'], obstacles: [kit.parked({ costume: 'safety-car', at: 0.2, side: 'right', length: 8 })], features: [kit.rumble({ from: 0.6, to: 0.95, count: 4 })] },
      { name: 'Run to the hairpin', shape: kit.straight(50, { grade: 0.12 }), billboards: 1, obstacles: [kit.curtain({ costume: 'banner-gantry', at: 0.3, side: 'left' })] },
      { name: 'Hairpin', shape: kit.hairpin({ side: 'left' }) },
      { name: 'Spiral', shape: kit.spiral({ side: 'right', radius: 45, grade: 0.17 }) },
      { name: 'Out', shape: kit.plunge(60, { grade: 0.28, from: 0.17 }) },
    ],
  });
}

const GALLERIES = { 'costume-gallery': costumeGallery, 'grand-prix-gallery': grandPrixGallery };

if (require.main === module) {
  const slug = process.argv[2];
  const track = GALLERIES[slug] ? GALLERIES[slug]() : physicsTrack(slug);
  if (!track) {
    console.error(`No physics track "${slug}"`);
    process.exit(1);
  }
  const dir = path.resolve(__dirname, '../client/dev/.tracks');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${slug}.json`), JSON.stringify(track));
  console.log(`Wrote client/dev/.tracks/${slug}.json`);
}

module.exports = { GALLERIES };
