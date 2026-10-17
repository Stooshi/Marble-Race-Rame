// The track picker's pictures (scripts/track-banners.js): every track has one, small, in both
// sizes, and the picker shows them only once switched on.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import manifest from '../src/shared/trackBanners.json';
import { bannerSrc } from '../src/site/TrackBanner';

const require = createRequire(import.meta.url);
const { PHYSICS_TRACKS } = require('../../src/game/physicsTracks');
const { realTracks } = require('../../test/helpers/realTracks');
const DIR = path.resolve(__dirname, '../public/tracks');

const physics = PHYSICS_TRACKS.map((t) => t.slug).filter((s) => !s.startsWith('variety-') && !s.startsWith('kit-proving-ground'));
const every = [...new Set([...physics, ...realTracks().map((t) => t.slug)])];

/** A WebP's width and height (VP8, VP8L or VP8X). */
function webpSize(buf) {
  expect(buf.subarray(0, 4).toString('latin1')).toBe('RIFF');
  expect(buf.subarray(8, 12).toString('latin1')).toBe('WEBP');
  const kind = buf.subarray(12, 16).toString('latin1');
  if (kind === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; }
  return [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1]; // VP8X
}

describe('track pictures', () => {
  it('every track has one (switched-off tracks too): a new track gets its own from the track report', () => {
    const missing = every.filter((s) => !manifest.banners[s]);
    expect(missing, `run: node scripts/track-banners.js ${missing.join(' ')}`).toEqual([]);
  });

  it.each(every.map((s) => [s]))('%s: 640×360 under 40 kB, 1280×720 for sharp screens', (slug) => {
    const b = manifest.banners[slug];
    if (!b) return;
    const one = fs.readFileSync(path.join(DIR, `${slug}.webp`));
    const two = fs.readFileSync(path.join(DIR, `${slug}@2x.webp`));
    expect(webpSize(one)).toEqual([640, 360]);
    expect(webpSize(two)).toEqual([1280, 720]);
    expect(one.length).toBeLessThanOrEqual(40_000);
    expect(two.length).toBeLessThanOrEqual(110_000);
    expect(one.length).toBe(b.bytes);
    expect(bannerSrc(slug).srcSet).toContain(`@2x.webp?v=${b.v} 2x`);
  });

  it('every picture shows its track\'s own sky (its own lighting, unless scripts/track-banners.json picks another)', () => {
    const overrides = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../scripts/track-banners.json'), 'utf8'));
    for (const t of PHYSICS_TRACKS.filter((x) => manifest.banners[x.slug])) {
      const want = overrides[t.slug]?.lighting ?? t.physics.kit?.lighting ?? 'day';
      expect(manifest.banners[t.slug].lighting, t.slug).toBe(want);
    }
  });

  it('the landing page\'s series cards each show a picture that exists', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/site/landing/LandingPage.jsx'), 'utf8');
    const cards = [...src.matchAll(/^ {2}\['([^']+)', '[^']*', '[^']*', '([a-z0-9-]+)'(, true)?\],$/gm)];
    expect(cards.map((m) => m[1])).toEqual(['World Tour', 'Grand Prix', 'Coasters', 'Canyons', 'Blocks', 'Track and Field', 'Pinball', 'Arcade']);
    expect(src).toMatch(/\['Track and Field', [^\n]*, true\],/); // (hidden until the series has tracks live)
    expect(src).toMatch(/\['Blocks', [^\n]*, true\],/); // (a new series: its card shows only once it has tracks live)
    for (const [, series, slug] of cards) expect(manifest.banners[slug]?.series, `${series}: ${slug}`).toBe(series);
  });

  it('no picture without a track', () => {
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.webp')).map((f) => f.replace(/(@2x)?\.webp$/, ''));
    expect([...new Set(files)].filter((s) => !every.includes(s))).toEqual([]);
  });

  it('a track without a picture keeps its gradient', () => {
    expect(bannerSrc('no-such-track')).toBe(null);
    expect(typeof manifest.enabled).toBe('boolean');
  });
});
