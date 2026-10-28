// The readiness report (Moses, 28 Oct 2026): once per race, was this screen ready by GO, and if not,
// what was missing and how long after GO it caught up. A screen opened mid-race sends nothing.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { watchReadiness } from '../src/components/raceReadiness';

describe('the readiness report', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1_000_000); });
  afterEach(() => vi.useRealTimers());
  const sound = (missing = []) => () => ({ backend: 'web', started: true, running: true, missing });

  it('ready by GO: one report, nothing missing', () => {
    const sent = [];
    watchReadiness({ kind: 'room', goWall: () => 1_003_000, pieces: () => ({ track: true, marbles: true }), sound: sound(), send: (b) => sent.push(b) });
    vi.advanceTimersByTime(10_000);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ kind: 'room', missing: [], lateMs: 0, details: { backend: 'web' } });
  });

  it('not ready by GO: what was missing, and how long after GO it caught up', () => {
    const sent = [];
    let p = { track: true, marbles: false };
    let s = ['tune-3', 'ceremony'];
    watchReadiness({ kind: 'room', platform: 'android', goWall: () => 1_002_000, pieces: () => p, sound: () => ({ backend: 'native', started: true, running: true, missing: s }), send: (b) => sent.push(b) });
    vi.advanceTimersByTime(2500);
    expect(sent).toHaveLength(0);
    p = { track: true, marbles: true };
    s = [];
    vi.advanceTimersByTime(1000);
    expect(sent).toHaveLength(1);
    expect(sent[0].platform).toBe('android');
    expect(sent[0].missing).toEqual(['marbles', 'tune-3', 'ceremony']);
    expect(sent[0].details.sound).toEqual(['tune-3', 'ceremony']);
    expect(sent[0].lateMs).toBeGreaterThanOrEqual(500);
    expect(sent[0].lateMs).toBeLessThanOrEqual(1000);
  });

  it('a hold decided after GO (the view shows the countdown late): still late from the GO it missed', () => {
    const sent = [];
    let go = 1_001_000;
    let ready = false;
    watchReadiness({ kind: 'room', goWall: () => go, pieces: () => ({ track: ready, marbles: ready }), sound: sound(), send: (b) => sent.push(b) });
    vi.advanceTimersByTime(3000);
    ready = true;
    go = 1_006_000; // (held back: this screen's countdown shown from its start, later)
    vi.advanceTimersByTime(500);
    expect(sent).toHaveLength(1);
    expect(sent[0].missing).toEqual(['track', 'marbles']);
    expect(sent[0].lateMs).toBeGreaterThanOrEqual(2000);
  });

  it('opened after GO (watching mid-race): no report', () => {
    const sent = [];
    watchReadiness({ kind: 'room', goWall: () => 990_000, pieces: () => ({ track: false, marbles: false }), sound: sound(['x']), send: (b) => sent.push(b) });
    vi.advanceTimersByTime(70_000);
    expect(sent).toHaveLength(0);
  });

  it('the race view sends it, and a solo race waits for its sound before starting ("Loading…")', () => {
    const view = fs.readFileSync(path.resolve(__dirname, '../src/components/LiveRaceViewer3D.jsx'), 'utf8');
    expect(view).toContain('send: (body) => api.raceReadiness(id, body).catch(() => {}),');
    expect(view).toContain('whenSoundReady(raceId ?? meta?.raceId ?? null, SOLO_SOUND_WAIT_MS)');
    expect(view).toContain("label={soundWait && trackReady ? 'Loading the sound…' : 'Loading…'}");
    // (A shared race never waits for anyone: its sounds join in step.)
    // (Once the race has started its clock runs: only a short check then, or the hold would cut the countdown.)
    expect(view).toContain('const sounds = intro && meta?.raceId ? whenSoundReady(meta.raceId, SOUND_RECHECK_MS) : Promise.resolve();');
    for (const f of ['src/site/pages/RoomPage.jsx', 'src/site/pages/RaceFlow.jsx', 'src/site/leagues/LeaguesPages.jsx']) {
      expect(fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8'), f).toContain('useRaceSoundPreload(');
    }
  });
});
