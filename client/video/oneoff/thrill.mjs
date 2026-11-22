// A thrill clip (Moses, 22 Nov 2026): node video/oneoff/thrill.mjs <slug> <race> <tall|wide> <out.mp4> <pack,…> <featureFrom ms> <featurePack,…> [stills]
// The race file from: node scripts/video-pick.js <slug> --seed <n>; the packs and the feature's start from the seed search.
// THRILL_CAMS='{"chaseCam":{…},"lineCam":{…},"featureCam":{…},"lineMembers":[…]}' changes the cameras for one track.
import { record } from '../record.mjs';
const [slug, race, format, out, members, featFrom, featMembers, stills] = process.argv.slice(2);
const tall = format === 'tall';
const over = process.env.THRILL_CAMS ? JSON.parse(process.env.THRILL_CAMS) : {};
const chaseCam = { ...(tall ? { back: 8.5, up: 4.4, ahead: 3, side: 0.8, fov: 56 } : { back: 9.5, up: 4.6, ahead: 3.5, side: 0.8, fov: 54 }), ...(over.chaseCam ?? {}) };
const text = {
  window: 5300, lineMs: 1100, slowMs: 500, slowSpeed: 0.3, freeze: 0.3, endSeconds: 2, endSkip: 1.5,
  members: members.split(',').map(Number),
  feature: { from: Number(featFrom), dur: 3.5, members: featMembers.split(',').map(Number), cam: { ...chaseCam, ...(over.featureCam ?? {}) } },
  chaseCam,
  lineCam: { ...(tall ? { back: -16, up: 2.4, ahead: 0, side: 1.2, fov: 38 } : { back: -16, up: 2.2, ahead: 0, side: 1.2, fov: 32 }), ...(over.lineCam ?? {}) },
  lines: [{ at: 0, top: 'Is your marble good enough to cross the line first?' }, { at: 4, top: 'Race your friends' }, { at: 8, top: 'Who wins?' }],
  endLines: ['Invite your friends. Race them.', 'marblespins.com'],
  style: tall
    ? { vars: { '--text-top': '15vh', '--text-size': '8.2vmin' }, box: { padding: '0 7vw' }, mark: { top: '10.5vh', right: '4vmin' } }
    : { vars: { '--text-top': '8vh', '--text-size': '7.4vmin' }, box: { padding: '0 12vw' }, mark: {} },
};
if (over.lineMembers) text.lineMembers = over.lineMembers;
await record({ slug, race, kind: 'thrill', format, tune: 9, text, out, stills: stills ? stills.split(',').map(Number) : null });
process.exit(0);
