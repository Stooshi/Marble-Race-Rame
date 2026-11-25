'use strict';

// The sameness check's scores for every track at once (the track report runs it for one):
//   node scripts/variety-table.js            every kit track's verdict and closest track
//   node scripts/variety-table.js --matrix   every pair's layout score
const { PHYSICS_TRACKS } = require('../src/game/physicsTracks');
const { varietyCheck, profile, similarity } = require('../src/report/variety');

const tracks = PHYSICS_TRACKS.filter((t) => profile(t) && profile(t).family !== 'test');
if (process.argv.includes('--matrix')) {
  const ps = tracks.map(profile);
  console.log(['', ...ps.map((p, j) => String(j + 1).padStart(4))].join(''));
  ps.forEach((a, i) => console.log(`${String(i + 1).padStart(2)} ${a.slug.padEnd(36)}${ps.map((b) => (a === b ? '   -' : similarity(a.tokens, b.tokens).toFixed(2).slice(1).padStart(4))).join('')}`));
} else {
  for (const t of tracks) {
    const { lines } = varietyCheck(t, PHYSICS_TRACKS);
    const fails = lines.filter((l) => l.pass === false);
    console.log(`${fails.length ? 'FAIL' : 'pass'}  ${t.slug}`);
    for (const l of lines) console.log(`        ${l.pass === false ? 'x' : l.pass ? 'v' : '-'} ${l.what.split(':')[0]}: ${l.value}`);
  }
}
