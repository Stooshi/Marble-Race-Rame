// The sound: no sound before a tap, the music always under the race sounds, one race track
// per race (shuffled, never the previous race's), the ceremony song after it, and small,
// phone-friendly files.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BEEPS_GO_S, CEREMONY, CEREMONY_FADE_S, CEREMONY_SECONDS, DUCK, LOOP_BUFFER_S, MUSIC_UNDER, RACE_TRACKS, SOUNDS, TRACK_SECONDS,
  _resetOrder, buffered, isUnlocked, levels, musicState, nextTrack, nowPlaying, play, raceCeremony, raceCountdown, raceEnd, raceGo, trackFor,
} from '../src/sound/engine';
import { CEREMONY_PHASES, phaseAt } from '../src/utils/finishShow';

const AUDIO = path.resolve(__dirname, '../public/audio');
const seeded = () => { let r = 7; return () => { r = (r * 16807) % 2147483647; return r / 2147483647; }; };

describe('sound', () => {
  it('nothing plays or loads before the first tap', () => {
    expect(isUnlocked()).toBe(false);
    expect(play('launch')).toBe(false);
    expect(raceCountdown('r0', 4000)).toBe(false); // (no beeps: not unlocked)
    raceGo('r0');
    expect(nowPlaying()).toBe(null); // (wanted, but nothing plays until a tap)
    raceEnd('r0');
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

  it('race tracks come in shuffled rounds of all 8, never the same one twice in a row', () => {
    _resetOrder();
    const random = seeded();
    let last = null;
    for (let round = 0; round < 50; round += 1) {
      const seen = new Set();
      for (let k = 0; k < RACE_TRACKS.length; k += 1) {
        const t = nextTrack(last, random);
        expect(t).not.toBe(last);
        seen.add(t);
        last = t;
      }
      expect(seen.size).toBe(RACE_TRACKS.length);
    }
  });

  it('one track per race: the countdown and GO agree, and the next race gets another', () => {
    _resetOrder();
    const random = seeded();
    let prev = null;
    for (let race = 0; race < 30; race += 1) {
      const id = `race-${race}`;
      const t = trackFor(id, random);
      expect(trackFor(id, random)).toBe(t); // (asked again: the same)
      expect(t).not.toBe(prev);
      prev = t;
    }
  });

  it('a race: its track from GO, the ceremony song from the ceremony, nothing after leaving', () => {
    raceCountdown('a', 5000);
    expect(musicState()).toBe(null); // (no music during the countdown)
    raceGo('a');
    expect(musicState()).toEqual({ raceId: 'a', kind: 'race', track: trackFor('a') });
    raceGo('a'); // (again, e.g. the 3D view after the 2D one: still the same one track)
    expect(musicState().track).toBe(trackFor('a'));
    raceCeremony('a');
    expect(musicState()).toEqual({ raceId: 'a', kind: 'ceremony', track: CEREMONY });
    raceEnd('b'); // (another race's page closing doesn't stop this one)
    expect(musicState().raceId).toBe('a');
    raceCountdown('b', 5000); // (the next race's countdown ends the ceremony)
    expect(musicState()).toBe(null);
    raceGo('b');
    raceEnd('b');
    expect(musicState()).toBe(null);
  });

  it('the ceremony song starts with the winner\'s moment and fades softly after 45 s', () => {
    const plan = { winnerMs: 50_000, ceremonyAt: 56_000, podiumAt: 80_000, boardAt: 86_000 };
    expect(CEREMONY_PHASES).not.toContain(phaseAt(52_000, plan)); // (medals: still the race music)
    expect(CEREMONY_PHASES).toContain(phaseAt(56_000, plan));
    expect(CEREMONY_PHASES).toContain(phaseAt(52_000, plan, true)); // (skipped to the board)
    expect(CEREMONY_SECONDS).toBe(45);
    expect(CEREMONY_FADE_S).toBeGreaterThanOrEqual(3);
  });

  it('the countdown beeps put their last beep on GO', () => {
    expect(BEEPS_GO_S).toBeGreaterThan(2.9);
    expect(BEEPS_GO_S).toBeLessThan(3.1);
    expect(SOUNDS.beeps).toBe('start-beeps');
  });

  it('short tracks loop gaplessly from memory, long ones stream (phones keep little in memory)', () => {
    for (const t of RACE_TRACKS) expect(TRACK_SECONDS[t], t).toBeGreaterThan(15);
    const decoded = RACE_TRACKS.filter(buffered);
    expect(decoded.length).toBeGreaterThanOrEqual(6);
    for (const t of decoded) expect(TRACK_SECONDS[t] * 48_000 * 2 * 4).toBeLessThan(18e6); // (decoded: under 18 MB)
    expect(TRACK_SECONDS[CEREMONY]).toBeGreaterThan(CEREMONY_SECONDS); // (it fades out before it would loop: it streams)
    expect(buffered(CEREMONY)).toBe(false);
    expect(LOOP_BUFFER_S).toBeLessThanOrEqual(45);
  });

  it('every file in both formats, small; the old background music is gone', () => {
    for (const fmt of ['webm', 'm4a']) {
      for (const t of [...RACE_TRACKS, CEREMONY]) {
        const size = fs.statSync(path.join(AUDIO, `${t}.${fmt}`)).size;
        expect(size, `${t}.${fmt}`).toBeLessThan(TRACK_SECONDS[t] * 9_000); // (under 72 kbps)
      }
      const all = [...RACE_TRACKS, CEREMONY].reduce((n, t) => n + fs.statSync(path.join(AUDIO, `${t}.${fmt}`)).size, 0);
      expect(all, fmt).toBeLessThan(4.5e6);
      for (const s of Object.values(SOUNDS)) expect(fs.statSync(path.join(AUDIO, `${s}.${fmt}`)).size, `${s}.${fmt}`).toBeLessThan(120e3);
    }
    expect(fs.readdirSync(AUDIO).filter((f) => f.startsWith('music-'))).toEqual([]);
  });
});
