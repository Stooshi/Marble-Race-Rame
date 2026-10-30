// The sound (the sound reset, Moses 28 Oct 2026): no sound before a tap, the music always under the race
// sounds, one of 12 race tunes per race (shuffled, never the previous race's), looping seamlessly to the ceremony
// its end, the ceremony song after it (unchanged rule), the crowd under the music once per stand, and
// small, phone-friendly files.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BEEPS_GO_S, CEREMONY, CEREMONY_FADE_S, CEREMONY_SECONDS, CROWD_UNDER, DUCK, MUSIC_UNDER, RACE_TRACKS, SOUNDS, START_SOUND_MS, TRACK_SECONDS,
  _resetOrder, crowdCheer, isUnlocked, levels, musicState, nextTrack, nowPlaying, play, raceCeremony, raceCountdown, raceEnd, raceGo, trackFor,
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

  it('race tunes come in shuffled rounds of all 12, never the same one twice in a row', () => {
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
    raceGo('a', Date.now()); // (GO as shown, now)
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

  it('the countdown beeps: a second apart, matching the 3-2-1 on screen, the fourth exactly on GO', () => {
    // (Measured in the file: beeps at 0.024, 1.026, 2.035 and 3.023 s; the 3, 2 and 1 show at GO-3, -2, -1 s.)
    expect(BEEPS_GO_S).toBe(3.023);
    for (const [beep, digit] of [[0.024, -3], [1.026, -2], [2.035, -1]]) expect(Math.abs(beep - BEEPS_GO_S - digit)).toBeLessThan(0.015);
    expect(SOUNDS.beeps).toBe('start-beeps');
  });

  it('the race tune picked at GO loops seamlessly from memory until the ceremony: no crossfade, no fades, no gap', () => {
    expect(RACE_TRACKS).toEqual(['tune-3', 'tune-4', 'tune-5', 'tune-6', 'tune-7', 'tune-8', 'tune-9', 'tune-10', 'tune-11', 'tune-12', 'tune-13', 'tune-14']); // (RACE MUSIC 2 out, 7-14 in: 28 Oct 2026; RACE MUSIC 1 out: 30 Oct 2026)
    for (const t of RACE_TRACKS) expect(TRACK_SECONDS[t], t).toBeGreaterThan(20);
    const engine = fs.readFileSync(path.resolve(__dirname, '../src/sound/engine.js'), 'utf8');
    expect(engine).toContain("race.tune.voice = backend.start(name, { atWall, bus: 'music', loop: true, loopLength: TRACK_SECONDS[name] });");
    expect(engine).not.toMatch(/crossfade\(|CROSSFADE_S|TUNE_FADE_S|takeTune\(name\)/);
    expect(engine).toContain("c.voice = backend.start(CEREMONY, { atWall: now(), bus: 'music', loop: true });"); // (the ceremony rule as before)
    expect(TRACK_SECONDS[CEREMONY]).toBeGreaterThan(CEREMONY_SECONDS); // (the ceremony song fades out before it would loop)
    // The files: no fades, the silence at both ends trimmed, cut at zero crossings (no click at the loop point).
    const script = fs.readFileSync(path.resolve(__dirname, '../../scripts/convert-audio.sh'), 'utf8');
    const tunes = script.slice(script.indexOf('# The race tunes'), script.indexOf('# The finish ceremony'));
    expect(tunes).not.toContain('afade');
    expect(tunes).toContain('silenceremove=start_periods=1:start_threshold=-60dB');
    expect(tunes).toContain('python3 scripts/loop-cut.py');
    expect(script).toContain('-movie_timescale 44100'); // (the apps' players: an edit list exact to the sample)
    // Each tune's loop length is the file's real length: the m4a's edit list, sample-exact.
    for (const t of RACE_TRACKS) {
      const b = fs.readFileSync(path.join(AUDIO, `${t}.m4a`));
      const k = b.indexOf('elst');
      const v = b[k + 4];
      const samples = v === 0 ? b.readUInt32BE(k + 12) : Number(b.readBigUInt64BE(k + 12));
      expect(Math.abs(samples / 44100 - TRACK_SECONDS[t]), t).toBeLessThan(0.0001);
    }
    // Web Audio only on the website: no <audio> elements play anything.
    for (const f of ['engine.js', 'webBackend.js']) expect(fs.readFileSync(path.resolve(__dirname, `../src/sound/${f}`), 'utf8')).not.toMatch(/new Audio\(\)\.play|createMediaElementSource|\.play\(\)/);
    // The website loops the buffer itself (loopStart/loopEnd: the music only, sample for sample).
    const web = fs.readFileSync(path.resolve(__dirname, '../src/sound/webBackend.js'), 'utf8');
    expect(web).toContain('src.loopStart = from;');
    expect(web).toContain('src.loopEnd = to;');
  });

  it('no overtaking whoosh for now; the start sound at GO (the marbles start rolling, 30 Oct 2026)', () => {
    expect(SOUNDS).toEqual({ crowd: 'crowd-grand-prix', launch: 'start-rolling', beeps: 'start-beeps', hit: 'marble-hit' });
    // (The old gate sound, MARBLES SPEEDING UP, is gone from the game.)
    expect(fs.existsSync(path.resolve(__dirname, '../public/audio/launch.webm'))).toBe(false);
    for (const n of ['start-rolling', 'marble-hit']) for (const ext of ['webm', 'm4a']) expect(fs.existsSync(path.resolve(__dirname, `../public/audio/${n}.${ext}`))).toBe(true);
    const view = fs.readFileSync(path.resolve(__dirname, '../src/components/LiveRaceViewer3D.jsx'), 'utf8');
    expect(view).not.toContain("'whoosh'");
    // (1 s after the GO beep, on the race clock, not dipping the music; Moses, 30 Oct 2026.)
    expect(START_SOUND_MS).toBe(1000);
    expect(view).toContain("playSound('launch', { duck: false })");
    expect(view).toContain('f.t >= START_SOUND_MS && ((lastT !== null && lastT < START_SOUND_MS)');
    // (50% louder than the old gate sound, Moses 30 Oct 2026: its mean -29.9 dB, 3.5 dB over the old one's -33.4.)
    expect(fs.readFileSync(path.resolve(__dirname, '../../scripts/convert-audio.sh'), 'utf8')).toContain("print -29.9 - m");
  });

  it('the crowd: once per stand per race, under the music, never ducking it', () => {
    expect(crowdCheer('cr', 0)).toBe(false); // (not unlocked: nothing plays, but the stand is counted)
    expect(crowdCheer('cr', 0)).toBe(false);
    expect(CROWD_UNDER).toBeLessThan(MUSIC_UNDER * 1.5);
    const engine = fs.readFileSync(path.resolve(__dirname, '../src/sound/engine.js'), 'utf8');
    expect(engine).toContain("return play('crowd', { gain: CROWD_UNDER, duck: false });");
    const view = fs.readFileSync(path.resolve(__dirname, '../src/components/LiveRaceViewer3D.jsx'), 'utf8');
    expect(view).toContain('for (const k of scene.crowdsNear(i)) crowdCheer(meta.raceId, k);');
    expect(view).not.toContain("playSound('crowd')");
  });

  it('every file in both formats, small; the old music is gone', () => {
    for (const fmt of ['webm', 'm4a']) {
      for (const t of [...RACE_TRACKS, CEREMONY]) {
        const size = fs.statSync(path.join(AUDIO, `${t}.${fmt}`)).size;
        expect(size, `${t}.${fmt}`).toBeLessThan(TRACK_SECONDS[t] * 9_000); // (under 72 kbps)
      }
      const all = [...RACE_TRACKS, CEREMONY].reduce((n, t) => n + fs.statSync(path.join(AUDIO, `${t}.${fmt}`)).size, 0);
      expect(all, fmt).toBeLessThan(5e6); // (12 tunes; a race loads only its own and the next one)
      for (const s of Object.values(SOUNDS)) expect(fs.statSync(path.join(AUDIO, `${s}.${fmt}`)).size, `${s}.${fmt}`).toBeLessThan(120e3);
    }
    expect(fs.readdirSync(AUDIO).filter((f) => /^(music-|race-\d)/.test(f))).toEqual([]);
    // (Only what the engine plays: no originals, nothing else.)
    const used = new Set([...RACE_TRACKS, CEREMONY, ...Object.values(SOUNDS)]);
    for (const f of fs.readdirSync(AUDIO)) expect(used.has(f.replace(/\.(webm|m4a)$/, '')), f).toBe(true);
  });
});
