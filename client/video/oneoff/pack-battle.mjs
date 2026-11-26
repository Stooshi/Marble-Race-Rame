// A pack battle (Moses, 18 Nov 2026): node video/oneoff/pack-battle.mjs <slug> <race> <tall|wide> <out.mp4> [near m] [stills]
// The race file from: node scripts/video-pick.js <slug> --seed <n>. The shots: race ms before the winner crosses.
import { record } from '../record.mjs';
const [slug, race, format, out, near = '4', stills] = process.argv.slice(2);
const tall = format === 'tall';
const W = 9000;
// [kind, from, to, metres]: front (a camera ahead looking back), side (low beside the leaders), line (low at the line)
const rel = [['front', 0, 2200], ['side', 2200, 3800], ['front', 3800, 6000], ['side', 6000, 7400], ['line', 7400, 9000]];
const text = {
  window: W, near: Number(near), freeze: 1, endSeconds: 2, endSkip: 1.5,
  endLines: ['Create a league. Race your friends.', 'marblespins.com'],
  style: tall
    ? { vars: { '--text-top': '17vh', '--text-size': '8.4vmin', '--counter-top': '26vh', '--counter-size': '5vmin' }, box: { padding: '0 8vw' }, mark: { top: '10.5vh', right: '4vmin' } }
    : { vars: { '--text-top': '8vh', '--text-size': '7.2vmin', '--counter-top': '19vh', '--counter-size': '4.4vmin' }, box: { padding: '0 16vw' }, mark: {} },
};
const raceJson = JSON.parse((await import('node:fs')).readFileSync(new URL(`../../dev/.tracks/${race}.json`, import.meta.url), 'utf8'));
const fin = raceJson.results.map((r) => r.finishTimeMs).filter(Number.isFinite).sort((a, b) => a - b);
const A = fin[0] - W;
text.shots = rel.map(([k, a, b, m]) => [k, A + a, A + b, m]);
await record({ slug, race, kind: 'packBattle', format, tune: 7, text, out, stills: stills ? stills.split(',').map(Number) : null });
process.exit(0);
