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
  it('choosing a name and a room\'s name', () => {
    for (const f of ['src/site/account/NameChip.jsx', 'src/site/pages/RoomPage.jsx']) expect(src(f)).toContain('placeholder="Type your player name"');
  });
  it('sign-up starts empty: no suggested name, only a name the guest chose (never one hidden after reports)', () => {
    const form = src('src/site/account/QuickSignup.jsx');
    expect(form).not.toMatch(/suggestName|suggest-name/);
    expect(src('src/api/client.js')).not.toMatch(/suggestName|suggest-name/);
    expect(form).toContain("username: ''");
    expect(form).toContain("user?.name_hidden ? '' :");
  });
  it('one sign-up form: the old one (AuthForm, the old home page) is gone', () => {
    expect(() => src('src/components/AuthForm.jsx')).toThrow();
    expect(() => src('src/pages/Home.jsx')).toThrow();
  });
});
