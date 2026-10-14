// The sound: no sound before a tap, the music always under the race sounds, the
// shuffle never repeating a track, and small, phone-friendly files.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DUCK, MUSIC_TRACKS, MUSIC_UNDER, SOUNDS, _resetOrder, isUnlocked, levels, nextTrack, play } from '../src/sound/engine';

const AUDIO = path.resolve(__dirname, '../public/audio');

describe('sound', () => {
  it('nothing plays or loads before the first tap', () => {
    expect(isUnlocked()).toBe(false);
    expect(play('launch')).toBe(false);
  });

  it('the music is always mixed under the race sounds, and dips further under them', () => {
    for (const music of [0, 0.3, 0.7, 1]) {
      for (const effects of [0.5, 0.8, 1]) {
        const l = levels({ music, effects, muted: false });
        if (music <= effects) expect(l.music).toBeLessThan(l.effects + 1e-9);
        expect(l.music).toBeCloseTo(music * MUSIC_UNDER, 9);
      }
    }
    expect(MUSIC_UNDER).toBeLessThanOrEqual(0.35); // (about -10 dB)
    expect(DUCK).toBeLessThan(1);
    expect(levels({ music: 1, effects: 1, muted: true })).toEqual({ music: 0, effects: 0 });
  });

  it('the shuffle plays every track once a round and never the same one twice in a row', () => {
    _resetOrder();
    let rand = 1;
    const random = () => { rand = (rand * 16807) % 2147483647; return rand / 2147483647; };
    let last = null;
    for (let round = 0; round < 50; round += 1) {
      const seen = new Set();
      for (let k = 0; k < MUSIC_TRACKS.length; k += 1) {
        const t = nextTrack(last, random);
        expect(t).not.toBe(last);
        seen.add(t);
        last = t;
      }
      expect(seen.size).toBe(MUSIC_TRACKS.length);
    }
  });

  it('every file in both formats, small: the 4 tracks about 3 MB a format, the race sounds a few kB', () => {
    for (const fmt of ['webm', 'm4a']) {
      const music = MUSIC_TRACKS.reduce((n, t) => n + fs.statSync(path.join(AUDIO, `${t}.${fmt}`)).size, 0);
      expect(music, fmt).toBeLessThan(3.6e6);
      for (const s of Object.values(SOUNDS)) expect(fs.statSync(path.join(AUDIO, `${s}.${fmt}`)).size, `${s}.${fmt}`).toBeLessThan(120e3);
    }
  });
});
