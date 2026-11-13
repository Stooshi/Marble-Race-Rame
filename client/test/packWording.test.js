import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { FREE_AND_PACKS, FREE_TRACKS, PACKS_LIVE } from '../src/shared/packWording';
import { tracksHeading, tracksWords } from '../src/site/trackCount';

const require = createRequire(import.meta.url);

describe('free tracks and track packs wording (13 Nov 2026)', () => {
  it('says as many free tracks as the free set has (src/packs/list.js)', () => {
    const { FREE } = require('../../src/packs/list.js');
    expect(Object.values(FREE).flat().length).toBe(FREE_TRACKS);
    expect(FREE_AND_PACKS).toContain(`${FREE_TRACKS} tracks are free`);
  });
  it('keeps the live texts at "every track free" while the TRACK_PACKS switch is off', () => {
    // (Set PACKS_LIVE to true in the commit that switches TRACK_PACKS on for everyone: docs/05-runbook.md.)
    expect(PACKS_LIVE).toBe(false);
  });
});

describe('tracksWords and tracksHeading: the landing draft v2 track count (13 Nov 2026)', () => {
  it('says hundreds from 200, else the live count rounded down to 50', () => {
    expect(tracksWords(213)).toBe('hundreds of tracks');
    expect(tracksWords(200)).toBe('hundreds of tracks');
    expect(tracksWords(199)).toBe('over 150 tracks');
    expect(tracksWords(151)).toBe('over 150 tracks');
    expect(tracksWords(150)).toBe('over 100 tracks');
    expect(tracksWords(143)).toBe('over 100 tracks');
    expect(tracksWords(87)).toBe('over 50 tracks');
    expect(tracksWords(43)).toBe('40+ tracks');
    expect(tracksWords(null)).toBe('dozens of tracks');
  });
  it('adds "with hundreds on the way" until 200', () => {
    expect(tracksHeading(162)).toBe('Over 150 tracks, with hundreds on the way');
    expect(tracksHeading(143)).toBe('Over 100 tracks, with hundreds on the way');
    expect(tracksHeading(200)).toBe('Hundreds of tracks');
    expect(tracksHeading(null)).toBe('Dozens of tracks');
  });
});
