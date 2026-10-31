// Cookie consent, tracking and page meta on the website: nothing pre-ticked, nothing loads without
// IDs and consent, the /cookies list covers every storage key the site uses, and every public page
// has its own title, description and canonical address.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONSENT_VERSION, STORAGE_LIST, allowed, readConsent, saveConsent } from '../src/site/consent/consent';
import { TRACKING_CONFIGURED, applyConsent, track } from '../src/site/consent/tracking';
import { metaFor } from '../src/site/pageMeta';
import manifest from '../src/shared/trackBanners.json';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};

describe('consent', () => {
  it('is empty until the player chooses, and only necessary storage is allowed', () => {
    const s = memory();
    expect(readConsent(s)).toBe(null);
    expect(allowed('necessary', null)).toBe(true);
    expect(allowed('statistics', null)).toBe(false);
    expect(allowed('marketing', null)).toBe(false);
  });

  it('keeps the choice per category, with its time and version', () => {
    const s = memory();
    const c = saveConsent({ statistics: true }, s, new Date('2026-10-16T08:00:00Z'));
    expect(c).toEqual({ v: CONSENT_VERSION, statistics: true, marketing: false, at: '2026-10-16T08:00:00.000Z' });
    expect(readConsent(s)).toEqual(c);
    expect(allowed('marketing', c)).toBe(false);
  });

  it('asks again when the banner version changes, and ignores anything but true', () => {
    const s = memory();
    s.setItem('marble-consent', JSON.stringify({ v: CONSENT_VERSION - 1, statistics: true, marketing: true }));
    expect(readConsent(s)).toBe(null);
    s.setItem('marble-consent', JSON.stringify({ v: CONSENT_VERSION, statistics: 'yes', marketing: 1 }));
    expect(readConsent(s)).toMatchObject({ statistics: false, marketing: false });
  });

  it('the /cookies list names every key the site stores', () => {
    const names = STORAGE_LIST.map((r) => r.name).join(' ');
    const files = [];
    const walk = (dir) => readdirSync(dir).forEach((f) => { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/\.jsx?$/.test(f)) files.push(p); });
    walk(join(__dirname, '..', 'src'));
    const keys = new Set();
    for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/'(marble-[a-z-]+(?::[a-z-]+)?)/g)) keys.add(m[1]);
    for (const k of keys) {
      if (k === 'marble-spins-my-data') continue; // (the "Download my data" file name)
      if (k === 'marble-hit') continue; // (the own marble's hit sound, an audio file name: not a stored key)
      if (manifest.banners[k]) continue; // (a track's name, Marble Stadium Sprint's: not a stored key)
      const short = k.replace(/:.*$/, '');
      expect(names, `${k} is missing from the cookie list`).toContain(short);
    }
    for (const r of STORAGE_LIST) expect(['necessary', 'statistics', 'marketing']).toContain(r.category);
  });
});

describe('tracking', () => {
  it('loads nothing and sends nothing without the IDs (build without VITE_GA4_ID / VITE_META_PIXEL_ID)', () => {
    expect(TRACKING_CONFIGURED).toBe(false);
    expect(() => applyConsent({ v: 1, statistics: true, marketing: true }, null)).not.toThrow();
    expect(() => track('purchase', { value: 4.99, currency: 'eur', orderNo: 'X' }, { onceKey: 'purchase:X' })).not.toThrow();
  });
});

describe('page meta', () => {
  it('every public page has its own title, description and canonical address', () => {
    const seen = new Set();
    for (const p of ['/', '/shop', '/scores', '/help', '/legal', '/cookies', '/tracks']) {
      const m = metaFor(p);
      expect(m.title).toMatch(/Marble Spins/);
      expect(m.description.length).toBeGreaterThan(40);
      expect(m.description.length).toBeLessThanOrEqual(170);
      expect(m.canonical).toBe(`https://marblespins.com${p}`);
      expect(m.noindex).toBe(false);
      expect(seen.has(m.title)).toBe(false);
      seen.add(m.title);
    }
  });

  it('player pages, the back office and previews are not indexed; /collection points at /shop', () => {
    for (const p of ['/admin', '/admin/users', '/preview/3d', '/settings', '/checkout', '/race/abc', '/r/ABC123', '/home']) expect(metaFor(p).noindex, p).toBe(true);
    expect(metaFor('/collection').canonical).toBe('https://marblespins.com/shop');
  });

  it('a help question and a track get their own title, with no placeholder brackets', () => {
    const q = metaFor('/help/can-i-get-a-refund');
    expect(q.title).toMatch(/· Help · Marble Spins$/);
    expect(q.description).not.toMatch(/\[/);
    const t = metaFor('/tracks/sydney-marble-grand-prix', { track: { slug: 'sydney-marble-grand-prix', name: 'Sydney Marble Grand Prix', series: 'Grand Prix', description: 'A harbour race.' } });
    expect(t.title).toBe('Sydney Marble Grand Prix: race it · Marble Spins');
    expect(t.image).toBe('https://marblespins.com/share/tracks/sydney-marble-grand-prix.jpg');
  });
});
