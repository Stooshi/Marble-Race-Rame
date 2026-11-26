// The country a player races for (Moses, 22 Oct 2026): an optional picker when saving the account and
// in Settings (with the change rule), the "Countries" tab on the scoreboards and the country records on
// each track's page. Shown by name, never a flag. Server side: src/country, test/country.test.js.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const auth = { isAuthenticated: true, loading: false, user: { id: 'u1', username: 'Nova', is_guest: true, country: null }, claim: vi.fn(), register: vi.fn(), refreshUser: () => {} };
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => auth }));
const { default: CountryPicker } = await import('../src/site/country/CountryPicker');
const { COUNTRY_LIST, countryName, browserCountry, CHANGE_RULE } = await import('../src/site/country/countries');
const { default: QuickSignup } = await import('../src/site/account/QuickSignup');
const { default: ScoresPage } = await import('../src/site/pages/ScoresPage');

const src = (p) => readFileSync(join(__dirname, '..', p), 'utf8');

describe('the country picker', () => {
  it('lists every country by its English name, "No country" first, and shows no flags', () => {
    const html = renderToString(<CountryPicker value="SE" onChange={() => {}} label="Your country" />);
    expect(COUNTRY_LIST.length).toBe(249);
    expect((html.match(/<option/g) ?? []).length).toBe(250);
    expect(html).toContain('<option value="">No country</option>');
    expect(html).toMatch(/<option value="SE" selected="">Sweden<\/option>/);
    expect(html).toContain('aria-label="Your country"');
    expect(html).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u); // (no flag emoji)
    expect(countryName('NO')).toBe('Norway');
    expect(countryName('XX')).toBe(null);
    expect(CHANGE_RULE).toBe('You can change your country once every 90 days.');
  });
  it("guesses from the browser's region when the server can't", () => {
    const was = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { value: { language: 'sv-SE' }, configurable: true });
    try { expect(browserCountry()).toBe('SE'); } finally { if (was) Object.defineProperty(globalThis, 'navigator', was); else delete globalThis.navigator; }
  });
});

describe('where it is asked and shown', () => {
  it('saving the account: optional, with the rule, sent only when chosen', () => {
    const html = renderToString(<MemoryRouter><QuickSignup onDone={() => {}} /></MemoryRouter>);
    expect(html).toContain('The country you race for (optional)');
    expect(html).toContain('once every 90 days');
    expect(src('src/site/account/QuickSignup.jsx')).toContain('...(f.country && { country: f.country })');
  });
  it('Settings: its own section with the next change date and the rule', () => {
    const page = src('src/site/pages/SettingsPage.jsx');
    expect(page).toContain('<YourCountry />');
    expect(page).toContain('Your next change is possible from');
    expect(page).toContain('CHANGE_RULE');
  });
  it('the scoreboards have a Countries tab, by track and by country', () => {
    const html = renderToString(<MemoryRouter initialEntries={['/scores?board=countries']}><ScoresPage /></MemoryRouter>);
    expect(html).toMatch(/aria-selected="true"[^>]*>Countries</);
    expect(html).toContain('By track');
    expect(html).toContain('By country');
    expect(html).toContain('The fastest time on each track, country by country.');
  });
  it("each track's page shows its country records (after the page loads; nothing in the pre-rendered page)", () => {
    const page = src('src/site/pages/TrackPages.jsx');
    expect(page).toContain('<TrackCountryRecords');
    expect(page).toContain('/scores?board=countries&track=');
  });
});
