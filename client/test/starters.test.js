// Every player's own 4 starter marbles and the save pop-up (Moses, 20 Oct 2026).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { plainLookOf, plainBadge } from '../src/shared/marbles/badge';
import starters from '../src/shared/marbles/starters.json';
import { TEXTS, MONTHS, ageFrom } from '../src/site/account/saveTexts';

it('a two-colour starter is half and half: one colour each side, fixed in the ball (2D and 3D alike)', () => {
  const look = plainLookOf({ color_primary: '#E0262B', color_secondary: '#1E44E6', pattern: 'half' });
  expect(look.material).toBe('plain-half');
  expect(look.parts.pattern.map).toBe('caps');
  expect(look.parts.pattern.base).toBe('#E0262B');
  expect(look.parts.pattern.caps[0]).toMatchObject({ size: 90, color: '#1E44E6' });
  expect(look.colours).toEqual(['#E0262B', '#1E44E6']);
  expect(plainBadge({ color_primary: '#E0262B', color_secondary: '#1E44E6', pattern: 'half' }).layers.length).toBe(2);
  // A one-colour starter is the plain glossy marble it always was.
  expect(plainLookOf({ color_primary: '#E0262B', pattern: 'solid' }).material).toBe('plain-solid');
});

it('12 colours, 1 one-colour and 3 two-colour starters each', () => {
  expect(starters.palette).toHaveLength(12);
  expect(new Set(starters.palette.map(([, hex]) => hex)).size).toBe(12);
  expect(starters.perPlayer).toEqual({ solid: 1, half: 3 });
});

it('the pop-up and the quick sign-up say the same in English and Swedish', () => {
  for (const L of ['en', 'sv']) {
    expect(TEXTS[L].bullets).toHaveLength(6);
    expect(MONTHS[L]).toHaveLength(12);
    expect(TEXTS[L].note(3)).toContain('3');
  }
  expect(TEXTS.en.headline).toBe("Save your marble — it's free");
  expect(TEXTS.sv.headline).toBe('Spara din kula – det är gratis');
  expect(TEXTS.en.bullets[4]).toContain('28 November');
});

it('age from birth year and month: the birth month counts as not yet reached', () => {
  const now = new Date(Date.UTC(2026, 9, 20)); // 20 Oct 2026
  expect(ageFrom(2013, 9, now)).toBe(13);
  expect(ageFrom(2013, 10, now)).toBe(12); // (October: maybe not yet)
  expect(ageFrom(2013, 11, now)).toBe(12);
  expect(ageFrom(2008, 9, now)).toBe(18);
});

it('the pop-up comes after every 3rd race, "Later" always closes it, never for saved players', () => {
  const code = readFileSync(join(__dirname, '..', 'src', 'site', 'account', 'SavePrompt.jsx'), 'utf8');
  expect(code).toMatch(/const EVERY = 3;/);
  expect(code).toMatch(/n % EVERY !== 0/);
  expect(code).toMatch(/!me\?\.user\?\.is_guest/);
  expect(code).toMatch(/onClick=\{onClose\}>\{t\.later\}/);
});
