import { afterEach, describe, expect, it } from 'vitest';
import { captureOrigin, currentOrigin, resetOrigin } from '../src/utils/origin';

const at = (url) => new URL(url);

describe('where the visitor came from (13 Nov 2026): in memory only, no cookie', () => {
  afterEach(() => resetOrigin());
  it('keeps the three UTM values from the arrival address, nothing else', () => {
    captureOrigin(at('https://marblespins.com/?utm_source=tiktok&utm_medium=video&utm_campaign=nevada&gclid=x&email=a@b.c'), 'https://www.reddit.com/r/x');
    expect(currentOrigin()).toEqual({ utm_source: 'tiktok', utm_medium: 'video', utm_campaign: 'nevada' });
  });
  it('else the referring domain only, never its path', () => {
    captureOrigin(at('https://marblespins.com/tracks'), 'https://www.reddit.com/r/marbles/comments/abc?x=1');
    expect(currentOrigin()).toEqual({ referrer: 'www.reddit.com' });
  });
  it('nothing from our own site or without a referrer; the first capture stands', () => {
    captureOrigin(at('https://marblespins.com/'), 'https://marblespins.com/help');
    expect(currentOrigin()).toBeNull();
    captureOrigin(at('https://marblespins.com/'), '');
    expect(currentOrigin()).toBeNull();
    captureOrigin(at('https://marblespins.com/?utm_source=a'), '');
    captureOrigin(at('https://marblespins.com/?utm_source=b'), '');
    expect(currentOrigin()).toEqual({ utm_source: 'a' });
  });
  it('uses no cookie or browser storage', async () => {
    const src = (await import('node:fs')).readFileSync(new URL('../src/utils/origin.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).not.toMatch(/document\.cookie|localStorage|sessionStorage|indexedDB/);
  });
});
