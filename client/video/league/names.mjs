// Writes a copy of a video race file with the Demo league's usernames and looks (race.league)
// (video/league/racers.json; racer k drives gate k). Looks only: the race itself is untouched.
//   node video/league/names.mjs <race> <out>
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '..', '..', 'dev', '.tracks');
const [race, out] = process.argv.slice(2);
const { racers, looks } = JSON.parse(readFileSync(join(here, 'racers.json'), 'utf8'));
const r = JSON.parse(readFileSync(join(dir, `${race}.json`), 'utf8'));
// The recorder dresses and renames the field itself, so the league's names and looks go in race.league,
// which it applies last (video/recorder.js).
r.league = { names: racers, looks };
const nameOf = (i) => racers[r.entries[i].lane] ?? r.entries[i].marble?.name;
writeFileSync(join(dir, `${out}.json`), JSON.stringify(r));
console.log(r.results.slice(0, 3).map((x) => `${nameOf(x.index)} ${(x.finishTimeMs / 1000).toFixed(3)}`).join(' · '));
