// English only for now, everywhere (Moses, 21 Oct 2026); the Swedish texts are kept for later.
import { afterEach, describe, expect, it, vi } from 'vitest';
import LANGUAGE from '../src/shared/language.json';
import { TEXTS, lang } from '../src/site/account/saveTexts';

describe('the site\'s language', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('is English, even for a Swedish browser; the Swedish texts stay for later', () => {
    expect(LANGUAGE.ENGLISH_ONLY).toBe(true);
    vi.stubGlobal('navigator', { language: 'sv-SE' });
    expect(lang()).toBe('en');
    expect(TEXTS.sv).toBeTruthy();
  });
});
