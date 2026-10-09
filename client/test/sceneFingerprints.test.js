// The safety net for the look of today's tracks: everything the 3D view builds
// for them (channel or road, obstacles, scenery, on phones and on computers)
// matches the fingerprints recorded before the track kit was built.
// To record them again, only when a change to an old track's look is meant:
//   UPDATE_SCENES=1 npx vitest run test/sceneFingerprints.test.js
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fingerprintedTracks, sceneFingerprints } from './helpers/sceneFingerprint';

const FILE = path.resolve(__dirname, 'fingerprints/scenes.json');
const tracks = fingerprintedTracks();

if (process.env.UPDATE_SCENES === '1') {
  const all = Object.fromEntries(tracks.map((t) => [t.slug, sceneFingerprints(t)]));
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, `${JSON.stringify(all, null, 1)}\n`);
}

const want = JSON.parse(fs.readFileSync(FILE, 'utf8'));

describe('today\'s tracks look exactly as before', () => {
  it('covers every track drawn before the track kit', () => {
    expect(Object.keys(want).sort()).toEqual(['bobsleigh-run', 'canyon-drop', 'meadow-loop', 'san-francisco', 'table-mountain-run', 'volcano-run']);
  });
  for (const track of tracks) {
    it(`${track.slug}: same channel, obstacles and scenery, phone and computer`, { timeout: 120_000 }, () => {
      expect(sceneFingerprints(track)).toEqual(want[track.slug]);
    });
  }
});
