import { describe, expect, it } from 'vitest';
import { isStaleCodeError, reloadOnceForNewCode } from '../src/utils/staleCode';

const store = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};

describe('code files gone after an update', () => {
  it('recognises a code file that failed to load, not an ordinary bug', () => {
    expect(isStaleCodeError(new TypeError("'text/html' is not a valid JavaScript MIME type."))).toBe(true);
    expect(isStaleCodeError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/a.js'))).toBe(true);
    expect(isStaleCodeError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isStaleCodeError(new TypeError("Cannot read properties of undefined (reading 'x')"))).toBe(false);
  });

  it('reloads once, and never again within a minute (no loop)', () => {
    const s = store();
    let reloads = 0;
    const reload = () => { reloads += 1; };
    expect(reloadOnceForNewCode(s, reload, 1_000)).toBe(true);
    expect(reloadOnceForNewCode(s, reload, 5_000)).toBe(false);
    expect(reloadOnceForNewCode(s, reload, 59_000)).toBe(false);
    expect(reloads).toBe(1);
    expect(reloadOnceForNewCode(s, reload, 1_000 + 61_000)).toBe(true); // a later update, much later
    expect(reloads).toBe(2);
  });

  it('never reloads when the browser keeps no storage', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => {} };
    let reloads = 0;
    expect(reloadOnceForNewCode(broken, () => { reloads += 1; }, 1)).toBe(false);
    expect(reloads).toBe(0);
  });
});
