'use strict';

/**
 * The second data update of a track added after the packs and wildness (Moses, 12 Nov 2026: the eleven motorsport
 * Grand Prix tracks; 13 Nov 2026: the five more Rivers tracks): its pack (src/packs/list.js), not free, and its wildness, worked out from its full report's
 * first 1,000 races and ranked against the 143 tracks of 11 Nov 2026, whose own scores never change
 * (scripts/wildness.js one <slug> --from-report).
 *   node scripts/new-track-pack-sql.js <slug> > docs/data_updates/<date>-<slug>-to-<pack>.sql
 * (Named `<slug>-to-<pack>`: a pack move, which the track tests never take for a re-tune of the layout.)
 * Touches the one track's row only. Safe to run again.
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { physicsTrack } = require('../src/game/physicsTracks');
const { packFor, isFree } = require('../src/packs/list');

const slug = process.argv[2];
const track = physicsTrack(slug);
if (!track) {
  console.error(`No track "${slug}"`);
  process.exit(1);
}
// (Series as src/routes/tracks.js works it out: a Grand Prix's kit carries `grandPrix`, a Rivers track's `river`, a
// Canyons track's `canyon`, a Peaks track's `peak`, a Blocks track's `block`: Blocks 1 unless listed in BLOCKS_2.)
// A kit track with none of these markers is a World Tour track (a World Tour re-layout, 15 Nov 2026, uses this too).
const kit = track.physics.kit ?? {};
const series = kit.pinball ? 'Pinball' : kit.river ? 'Rivers' : kit.peak ? 'Peaks' : kit.arcade ? 'Arcade' : kit.canyon ? 'Canyons'
  : kit.block ? 'Blocks' : kit.athletics ? 'Track and Field' : kit.winterWonders ? 'Winter Wonders' : kit.coaster ? 'Coasters'
    : kit.grandPrix ? 'Grand Prix' : track.series ?? 'World Tour';
const out = execFileSync(process.execPath, [path.join(__dirname, 'wildness.js'), 'one', slug, '--from-report'], { encoding: 'utf8' });
const w = JSON.parse(out.trim().split('\n').pop());
const pack = packFor(slug, series);
const free = isFree(slug);
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
process.stdout.write(`-- One-time data update: ${track.name}'s pack and wildness (scripts/new-track-pack-sql.js).
--
-- In the ${q(pack)} pack${free ? ', free' : ', not free'}. Wildness ${w.score} (${w.wildness}), from its full report's first 1,000 races
-- (overtakes ${w.overtakes}, lead changes ${w.leadChanges}, obstacle hits ${w.hits}, gap ${w.gapS} s; loops ${w.loops},
-- splitters ${w.splitters}, drops ${w.drops}), ranked against the 143 tracks of 11 Nov 2026 (src/tracks/wildness.json),
-- whose own scores do not change. Locks nothing (the TRACK_PACKS switch). This track's row only.

UPDATE tracks SET pack_key = ${q(pack)}, is_free = ${free}, wildness_score = ${w.score}, wildness = ${q(w.wildness)} WHERE slug = ${q(slug)};

SELECT slug, pack_key, is_free, wildness_score, wildness FROM tracks WHERE slug = ${q(slug)};
`);
