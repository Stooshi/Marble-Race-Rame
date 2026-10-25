// Every empty player-name field shows a grey hint, as the email fields show "you@example.com" (Moses, 25 Oct 2026).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEXTS as SAVE_TEXTS } from '../src/site/account/saveTexts';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

describe('the player-name fields', () => {
  it('sign-up and save-your-marble: "Type your player name" (Swedish: "Skriv ditt spelarnamn")', () => {
    expect(SAVE_TEXTS.en.namePlaceholder).toBe('Type your player name');
    expect(SAVE_TEXTS.sv.namePlaceholder).toBe('Skriv ditt spelarnamn');
    expect(src('src/site/account/QuickSignup.jsx')).toContain('placeholder={t.namePlaceholder}');
  });
  it('choosing a name, a room\'s name and the old sign-up form', () => {
    for (const f of ['src/site/account/NameChip.jsx', 'src/site/pages/RoomPage.jsx', 'src/components/AuthForm.jsx']) expect(src(f)).toContain('placeholder="Type your player name"');
  });
});
