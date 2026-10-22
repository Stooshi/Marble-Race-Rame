// The apps' own layout (Moses, 22 Oct 2026, first Android test): a compact header with a small logo and
// one menu button (a bottom sheet), and the 3D race on the whole screen with its buttons over it. The
// website keeps its header and race page.
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const auth = { isAuthenticated: true, loading: false, token: 't', user: { id: 'u1', username: 'Nova', is_guest: false, coins: 1234, streak: 0 } };
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../src/sound/settings', () => ({ useSoundSettings: () => ({ settings: { music: 1, effects: 1, muted: false }, update: () => {} }) }));
const { default: SiteHeader } = await import('../src/site/SiteHeader');

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const header = (path) => renderToString(<MemoryRouter initialEntries={[path]}><SiteHeader /></MemoryRouter>);

const hadWindow = 'window' in globalThis;
if (!hadWindow) globalThis.window = {};
afterEach(() => { delete globalThis.window.Capacitor; });

describe('the header', () => {
  it('the website: the full header with its row of pages', () => {
    const html = header('/home');
    expect(html).toContain('ms-header');
    expect(html).toContain('Scoreboards');
    expect(html).not.toContain('ms-apphead');
  });
  it('the apps: one compact bar, a small logo, the coins, sound and one menu button; back off the home screen', () => {
    globalThis.window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android' };
    const home = header('/home');
    expect(home).toContain('ms-apphead');
    expect(home).toContain('aria-label="Menu"');
    expect(home).toContain('● 1,234');
    expect(home).not.toContain('Scoreboards'); // (the pages are behind the menu)
    expect(home).not.toContain('aria-label="Back"');
    expect(header('/shop')).toContain('aria-label="Back"');
  });
});

describe('the race on the whole screen (apps only)', () => {
  const css = src('src/site/site.css');
  it('the race page marks it while the 3D view shows, only in the apps', () => {
    const page = src('src/pages/Race.jsx');
    expect(page).toContain("{(meta || preparing) && shown === '3d' && <RaceFullScreen />}");
    expect(page).toMatch(/if \(!isNativeApp\(\)\) return undefined;\s+const root = document\.documentElement;\s+root\.classList\.add\('is-race-full'\)/);
  });
  it('fills the screen, the buttons over it, clear of the notch and the home bar; every rule only in the apps', () => {
    expect(css).toContain('.is-app.is-race-full .race-page .preview3d__stage { position: absolute; inset: 0;');
    expect(css).toMatch(/\.is-app\.is-race-full \.segmented--camera \{\s*position: fixed;[^}]*bottom: calc\(env\(safe-area-inset-bottom/);
    expect(css).toMatch(/\.ms-apphead \{[^}]*padding: env\(safe-area-inset-top, 0px\) env\(safe-area-inset-right, 0px\) 0 env\(safe-area-inset-left, 0px\)/);
    const raceRules = css.split('\n').filter((l) => /is-race-full/.test(l) && /^\S/.test(l));
    expect(raceRules.length).toBeGreaterThan(10);
    for (const l of raceRules) expect(l.startsWith('.is-app.is-race-full') || l.startsWith('/*')).toBe(true);
  });
  it('the menu sheet goes on the page itself (the header\'s blur would trap it)', () => {
    expect(src('src/site/AppHeader.jsx')).toContain('createPortal(');
  });
});
