// Search results: the icon Google shows beside the site (a square favicon in a multiple of 48 px,
// /favicon.ico at the root, linked from every page, not blocked by robots.txt) and the track count
// in descriptions (the live count rounded down, never a number that goes stale).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { roundedTracks, tracksPhrase } from './trackCount';

const client = join(__dirname, '..', '..');
const html = readFileSync(join(client, 'index.html'), 'utf8');
const pngSize = (file) => { const b = readFileSync(join(client, 'public', file)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

describe('the favicon, as Google wants it', () => {
  it('/favicon.ico is at the root, with a 48 × 48 image, and linked', () => {
    const ico = readFileSync(join(client, 'public', 'favicon.ico'));
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => ico[6 + i * 16] || 256);
    expect(sizes).toContain(48);
    expect(html).toMatch(/<link rel="icon" href="\/favicon\.ico"/);
  });
  it('square PNG icons in multiples of 48 px are linked with their sizes', () => {
    const links = [...html.matchAll(/<link rel="icon" href="\/([^"]+\.png)" type="image\/png" sizes="(\d+)x(\d+)"/g)];
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const [, file, w, h] of links) {
      expect(pngSize(file)).toEqual([Number(w), Number(h)]);
      expect(Number(w) % 48).toBe(0);
    }
  });
  it('robots.txt blocks none of the icons', () => {
    const robots = readFileSync(join(client, 'public', 'robots.txt'), 'utf8');
    const blocked = robots.split('\n').filter((l) => /^Disallow:/i.test(l)).map((l) => l.split(':')[1].trim()).filter(Boolean);
    for (const path of ['/favicon.ico', '/favicon-48x48.png', '/favicon-96x96.png', '/icon-192.png', '/favicon.svg']) {
      expect(blocked.some((b) => path.startsWith(b))).toBe(false);
    }
  });
  it('the pre-rendered pages keep the icon links (the build only swaps title, description, canonical, og, twitter, robots)', () => {
    const prerender = readFileSync(join(client, 'scripts', 'prerender.mjs'), 'utf8');
    expect(prerender).not.toMatch(/rel="icon"/);
  });
});

describe('the track count in descriptions', () => {
  it('is rounded down to ten: "80+"', () => {
    expect(roundedTracks(90)).toBe('90+');
    expect(roundedTracks(87)).toBe('80+');
    expect(roundedTracks(50)).toBe('50+');
    expect(roundedTracks(7)).toBe('7');
    expect(roundedTracks(0)).toBe(null);
    expect(tracksPhrase(93)).toBe('90+ tracks');
    expect(tracksPhrase(null)).toBe('dozens of tracks');
  });
  it('index.html has no hard-coded count (the build fills it in)', () => {
    expect(html).not.toMatch(/\d+\+? (wild )?tracks/);
    expect(html.match(/__TRACKS_PHRASE__/g)).toHaveLength(2);
  });
});
