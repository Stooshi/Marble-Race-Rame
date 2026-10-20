// How players' names show to others (pre-launch item 9): never "@guest_0da1cddb1b".
import { expect, it } from 'vitest';
import { handle, plainName, isGuestName } from '../src/shared/playerName';

it('a guest shows as "Guest" and four characters, a saved account as @name', () => {
  expect(handle('guest_0da1cddb1b')).toBe('Guest 0DA1');
  expect(plainName('guest_0da1cddb1b')).toBe('Guest 0DA1');
  expect(handle('Topaz_Racer')).toBe('@Topaz_Racer');
  expect(plainName('Topaz_Racer')).toBe('Topaz_Racer');
  expect(plainName('guest_0da1cddb1b', 'Nelly')).toBe('Nelly');
  // (a saved name that merely starts with "guest" stays as it is)
  expect(isGuestName('guest_star')).toBe(false);
  expect(handle('guestly')).toBe('@guestly');
});
