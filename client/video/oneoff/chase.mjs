// A chase (Moses, 19 Nov 2026): node video/oneoff/chase.mjs <slug> <race> <tall|wide> <out.mp4> <members,…> [stills]
// The race file from: node scripts/video-pick.js <slug> --seed <n>; members: the pack's entry indexes (the seed search).
import { record } from '../record.mjs';
const [slug, race, format, out, members, stills] = process.argv.slice(2);
const tall = format === 'tall';
const text = {
  window: 9600, lineMs: 1500, freeze: 0.4, endSeconds: 2, endSkip: 1.5,
  members: members.split(',').map(Number),
  // Close and low behind the pack from its back right, a bit of track ahead; then at the line, looking back at it.
  chaseCam: tall ? { back: 8.5, up: 4.4, ahead: 3, side: 0.8, fov: 56 } : { back: 9.5, up: 4.6, ahead: 3.5, side: 0.8, fov: 54 },
  lineCam: tall ? { back: -16, up: 2.4, ahead: 0, side: 1.2, fov: 38 } : { back: -16, up: 2.2, ahead: 0, side: 1.2, fov: 32 },
  lines: [{ at: 0, top: "Think you'd win this?" }, { at: 3, top: 'Race your friends' }, { at: 6, top: 'Create a league' }, { at: 9, top: 'Who crosses first?' }],
  endLines: ['Invite your friends. Race them.', 'marblespins.com'],
  style: tall
    ? { vars: { '--text-top': '16vh', '--text-size': '9.6vmin' }, box: { padding: '0 7vw' }, mark: { top: '10.5vh', right: '4vmin' } }
    : { vars: { '--text-top': '9vh', '--text-size': '8.4vmin' }, box: { padding: '0 14vw' }, mark: {} },
};
await record({ slug, race, kind: 'chase', format, tune: 7, text, out, stills: stills ? stills.split(',').map(Number) : null });
process.exit(0);
