// How players' names show to others (Moses, 25 Oct 2026): the name they chose, else the player name,
// else a guest's guest_<number>; the player's name in the lists, a computer player's marble name.
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { entryLabel, entryPlayer, guestNumberName, handle, isGuest, isGuestName, plainName, shownName } from '../src/shared/playerName';
import { SHOWN_NAME } from '../src/site/account/NameChip';

const require = createRequire(import.meta.url);
const server = require('../../src/names/shown');

describe('the name shown', () => {
  it('a guest without a chosen name: guest_ and five digits, the same every time; no "@", no made-up names', () => {
    const n = plainName('guest_0da1cddb1b');
    expect(n).toMatch(/^guest_\d{5}$/);
    expect(plainName('guest_0da1cddb1b')).toBe(n);
    expect(plainName('guest_0da1cddb1c')).toBe(n); // (from the first 8 hex digits)
    expect(plainName('guest_ffffffff00')).not.toBe(n);
    expect(handle('guest_0da1cddb1b')).toBe(n);
    expect(guestNumberName('Topaz_Racer')).toBeNull();
  });
  it('a chosen name wins (a guest\'s too); a saved account without one shows its player name, no "@"', () => {
    expect(plainName('guest_0da1cddb1b', 'Nelly')).toBe('Nelly');
    expect(plainName('Topaz_Racer')).toBe('Topaz_Racer');
    expect(handle('Topaz_Racer')).toBe('Topaz_Racer');
    expect(shownName({ username: 'Topaz_Racer', display_name: 'Topaz' })).toBe('Topaz');
    expect(shownName({ username: 'x', name: 'From the server' })).toBe('From the server');
    // (a saved name that merely starts with "guest" stays as it is)
    expect(isGuestName('guest_star')).toBe(false);
    expect(plainName('guest_star')).toBe('guest_star');
    expect(isGuest({ username: 'Nova', is_guest: true })).toBe(true);
    expect(isGuest({ username: 'Nova', is_guest: false })).toBe(false);
  });
  it('the server shows names by the same rule (src/names/shown.js)', () => {
    for (const u of [
      { username: 'guest_0da1cddb1b' }, { username: 'guest_ffffffff00', is_guest: true }, { username: 'guest_123abc' },
      { username: 'Topaz_Racer' }, { username: 'guest_0da1cddb1b', display_name: 'Nelly' }, { username: 'guest_star' },
    ]) expect(server.shownName(u)).toBe(shownName(u));
  });
  it('a race entry: the player\'s name; a computer player\'s marble name', () => {
    const player = { user: { id: 'u', username: 'guest_0da1cddb1b', name: 'Nelly' }, marble: { name: 'Topaz' } };
    const old = { user: { id: 'u', username: 'guest_0da1cddb1b' }, marble: { name: 'Topaz' } }; // (a replay from before the names)
    const cpu = { user: null, isBot: true, marble: { name: 'Sunset Swirl' } };
    expect(entryLabel(player)).toBe('Nelly');
    expect(entryLabel(old)).toMatch(/^guest_\d{5}$/);
    expect(entryLabel(cpu)).toBe('Sunset Swirl');
    expect(entryPlayer(cpu)).toBeNull();
  });
  it('a chosen name: 3–24 letters, digits, spaces, _ or -, as the server takes it', () => {
    for (const ok of ['Nelly', 'Ana María', 'Topaz_Racer', 'Björn-7', 'abc']) expect(SHOWN_NAME.test(ok)).toBe(true);
    for (const bad of ['ab', ' Nelly', 'Nelly ', 'a'.repeat(25), 'Nelly!', '<b>x</b>', '-dash']) expect(SHOWN_NAME.test(bad)).toBe(false);
    const src = require('node:fs').readFileSync(new URL('../../src/names/index.js', import.meta.url), 'utf8');
    expect(src).toContain('const SHOWN = /^[\\p{L}\\p{N}][\\p{L}\\p{N} _-]{1,22}[\\p{L}\\p{N}_]$/u;');
  });
});

describe('a saved account chooses its shown name too (Moses, 27 Oct 2026)', () => {
  it('the name chip opens a menu with "Your name" and Settings; Settings has "Your name"', async () => {
    const { readFileSync } = await import('node:fs');
    const chip = readFileSync(new URL('../src/site/account/NameChip.jsx', import.meta.url), 'utf8');
    const settings = readFileSync(new URL('../src/site/pages/SettingsPage.jsx', import.meta.url), 'utf8');
    expect(chip).toContain('{open && <SavedNameMenu user={user} onClose={() => setOpen(false)} />}');
    expect(chip).toContain('<ChooseNameForm user={user} label="Your name" note={SAVED_NOTE(user)} />');
    expect(chip).not.toContain('<Link to="/settings" className={`ms-chip');
    // (the same rules and filter for everyone: one form, the server's check)
    expect(chip.match(/api\.setName\(n\)/g)).toHaveLength(1);
    expect(chip).toContain('if (checkName(n)) { setError(NAME_NOT_ALLOWED); return; }');
    expect(chip).toContain("const canReset = Boolean(user && !isGuest(user) && user.display_name && !user.name_hidden);");
    expect(settings).toContain('{user && <YourName user={user} />}');
    expect(settings).not.toContain('@{user.username}');
  });
});
