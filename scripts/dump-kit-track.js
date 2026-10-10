'use strict';

// Writes a physics track (from its definition in code) as JSON for the kit
// view (client/dev/kit-view.html), which draws it without a server:
//   node scripts/dump-kit-track.js kit-proving-ground
//   node scripts/dump-kit-track.js costume-gallery    (every costume in the library, for looking at; never raced)
const fs = require('node:fs');
const path = require('node:path');
const { physicsTrack } = require('../src/game/physicsTracks');
const kit = require('../src/trackKit');

/** Every costume in the library on one run, by the kind of obstacle it dresses (keep in step with client/src/three/costumes). */
function costumeGallery() {
  const blocks = ['panda', 'camel', 'cafe-table', 'reindeer', 'baboon', 'cow', 'marmot', 'elk', 'chamois', 'sled-dog', 'arctic-fox', 'pigeon', 'log', 'caiman', 'jaguar', 'football', 'monkey'];
  return kit.track({
    slug: 'costume-gallery',
    name: 'Costume Gallery',
    sections: [
      { name: 'Blocks', shape: kit.plunge(160, { grade: 0.5 }), obstacles: blocks.map((costume, k) => kit.block({ costume, at: 0.25 + k * 0.065, line: k % 2 ? 'left' : 'right' })) },
      { name: 'Tall', shape: kit.straight(40, { grade: 0.15 }), obstacles: [kit.block({ costume: 'giraffe', size: 'large' })], billboards: 2 },
      { name: 'Parked', shape: kit.straight(80, { grade: 0.15 }), obstacles: [kit.parked({ costume: 'ore-cart', at: 0.2, side: 'left' }), kit.parked({ costume: 'kick-sled', at: 0.6, side: 'right', length: 6 })], billboards: 2 },
      { name: 'Parked 2', shape: kit.straight(80, { grade: 0.15 }), obstacles: [kit.parked({ costume: 'piste-groomer', at: 0.2, side: 'left', length: 8 }), kit.parked({ costume: 'snowmobile', at: 0.6, side: 'right', length: 8 })] },
      { name: 'Poles', shape: kit.straight(60, { grade: 0.2 }), obstacles: [kit.slalom({ from: 0.15, to: 0.6 }), kit.peg({ costume: 'go-stone', at: 0.8 })] },
      { name: 'Curtain', shape: kit.straight(40, { grade: 0.2 }), obstacles: [kit.curtain({ costume: 'zebras', side: 'right' })] },
      { name: 'Swipe', shape: kit.sweep({ side: 'left', degrees: 60 }), obstacles: [kit.swipe({ costume: 'elephant' })] },
      { name: 'Swipe 2', shape: kit.sweep({ side: 'right', degrees: 60 }), obstacles: [kit.swipe({ costume: 'musk-ox' })] },
      { name: 'Out', shape: kit.plunge(60, { from: 0.1 }) },
    ],
  });
}

const slug = process.argv[2];
const track = slug === 'costume-gallery' ? costumeGallery() : physicsTrack(slug);
if (!track) {
  console.error(`No physics track "${slug}"`);
  process.exit(1);
}
const dir = path.resolve(__dirname, '../client/dev/.tracks');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${slug}.json`), JSON.stringify(track));
console.log(`Wrote client/dev/.tracks/${slug}.json`);
