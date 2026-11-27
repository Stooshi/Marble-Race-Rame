// A pack breakout clip (Moses, 27 Nov 2026): node video/oneoff/packbreak.mjs <slug> <race> <out.mp4> <members,…> <from ms> <breakAt ms> [stills]
// Only the clear opening's pack, then the breakout (plans.mjs packBreak); tall 9:16. The race and its moments from
// a seed search (the pack's spread and the breakout). PACK_TEXT='{"lines":[…],"endLines":[…]}', PACK_CAM='{…}'.
import { record } from '../record.mjs';
const [slug, race, out, members, from, breakAt, stills] = process.argv.slice(2);
const words = process.env.PACK_TEXT ? JSON.parse(process.env.PACK_TEXT) : {};
const cam = { back: 9, up: 7, ahead: 2, side: 1.2, fov: 58, ...(process.env.PACK_CAM ? JSON.parse(process.env.PACK_CAM) : {}) };
const text = {
  members: members.split(',').map(Number), from: Number(from), breakAt: Number(breakAt), cam,
  lines: (words.lines ?? ['20 marbles. One pack.', 'Who breaks out first?', 'Is it yours?']).map((top, i) => ({ at: [0, 6, 12][i], top })),
  endLines: words.endLines ?? ['Pick your marble.', 'marblespins.com'],
  style: { vars: { '--text-top': '15vh', '--text-size': '9.6vmin' }, box: { padding: '0 6vw' }, mark: { top: '10.5vh', right: '4vmin' } },
};
await record({ slug, race, kind: 'packBreak', format: 'tall', tune: 11, text, out, stills: stills ? stills.split(',').map(Number) : null });
process.exit(0);
