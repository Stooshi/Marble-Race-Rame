// (17 Nov 2026, 20:00 post: Quebec Château Run again, front-facing shots and Moses's lines; one-off runner.)
import { record } from '../record.mjs';
const [format, out, stills] = process.argv.slice(2);
const tall = format === 'tall';
const text = {
  shots: [['start', 0, 3000], ['front', 3000, 6500, 4], ['follow', 6500, 12000], ['front', 12000, 14000, 4, 4], ['follow', 14000, 16000], ['front', 16000, 18000, 9]],
  lines: [
    { at: 0, dur: 6, text: '20 marbles. Shoulder to shoulder. Nobody gives an inch. 🏁' },
    { at: 7, dur: 7, text: 'Then comes the cliff... 👀' },
    { at: 15, dur: 3, text: 'Which marble would you back? 👇' },
  ],
  style: tall
    ? { vars: { '--text-top': '17vh', '--text-size': '8.2vmin' }, box: { padding: '0 8vw' }, mark: { top: '10.5vh', right: '4vmin' } }
    : { vars: { '--text-top': '8vh', '--text-size': '7vmin' }, box: { padding: '0 16vw' }, mark: {} },
};
await record({ slug: 'quebec-chateau-run', race: 'quebec-chateau-run.video-10842181', kind: 'teaserFront', format, tune: 11, at: 18000, text, out,
  stills: stills ? stills.split(',').map(Number) : null });
process.exit(0);
