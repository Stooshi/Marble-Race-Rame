// The iPhone and Android apps use the same phone layout as the mobile website (Moses, 25 Oct 2026, after
// the first Android build from Main still showed the apps' old header): the header with its menu drawer,
// the race on the whole screen with its ✕, the three yellow race buttons, the safe areas for the notch
// and landscape. These tests fail if an app-only layout comes back.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

let auth = { isAuthenticated: true, loading: false, token: 't', user: { id: 'u1', username: 'Nova', is_guest: false, coins: 1234, streak: 0 } };
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../src/sound/settings', () => ({ useSoundSettings: () => ({ settings: { music: 1, effects: 1, muted: false }, update: () => {} }) }));
const { default: SiteHeader } = await import('../src/site/SiteHeader');
const { RaceFullScreen } = await import('../src/pages/Race');

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const header = (path) => renderToString(<MemoryRouter initialEntries={[path]}><SiteHeader /></MemoryRouter>);
const asApp = (platform = 'android') => { globalThis.window.Capacitor = { isNativePlatform: () => true, getPlatform: () => platform }; };

const hadWindow = 'window' in globalThis;
if (!hadWindow) globalThis.window = {};
afterEach(() => { delete globalThis.window.Capacitor; });

describe('the header: the same in the apps as on the website', () => {
  const people = {
    'signed in': { isAuthenticated: true, loading: false, token: 't', user: { id: 'u1', username: 'Nova', is_guest: false, coins: 1234, streak: 2 } },
    guest: { isAuthenticated: true, loading: false, token: 't', user: { id: 'g1', username: 'guest_4821', is_guest: true, coins: 50, streak: 0 } },
    visitor: { isAuthenticated: false, loading: false, token: null, user: null },
  };
  for (const [who, a] of Object.entries(people)) {
    for (const path of ['/', '/home', '/shop', '/bag', '/race/abc', '/checkout']) {
      it(`${who}, ${path}: Android and iPhone render exactly the website's header`, () => {
        auth = a;
        const web = header(path);
        asApp('android');
        expect(header(path)).toBe(web);
        asApp('ios');
        expect(header(path)).toBe(web);
      });
    }
  }
  it('the phone header: a menu button that opens the drawer (the pages behind it on a phone\'s screen)', () => {
    auth = people['signed in'];
    asApp();
    const html = header('/home');
    expect(html).toContain('ms-header__menu');
    expect(html).toContain('aria-label="Menu"');
    expect(src('src/site/SiteHeader.jsx')).toContain('<MenuSheet drawer');
    expect(src('src/site/SiteHeader.jsx')).not.toMatch(/isNativeApp|AppHeader/);
  });
});

describe('the race on the whole screen with its ✕ (phones and the apps)', () => {
  it('in the apps: the ✕ to leave and the ⋯ for the 2D view, as on a phone\'s website', () => {
    asApp('ios');
    const html = renderToString(<RaceFullScreen onLeave={() => {}} on2d={() => {}} />);
    expect(html).toContain('aria-label="Leave the race"');
    expect(html).toContain('aria-label="More"');
  });
  it('one set of rules for the phone race (html.is-race-phone), none for the apps alone', () => {
    const page = src('src/pages/Race.jsx');
    expect(page).toContain("root.classList.add('is-race-full', 'is-race-phone');");
    expect(page).toContain("export const PHONE_QUERY = '(max-width: 700px), (orientation: landscape) and (max-height: 500px)';");
  });
});

describe('the three yellow race buttons', () => {
  it('the home hub has no app-only path', () => {
    const hub = src('src/site/pages/HomeHub.jsx');
    expect(hub).not.toMatch(/isNativeApp|nativePlatform|is-app/);
    for (const to of ['/play/quick', '/play/track', '/play/friends']) expect(hub).toContain(`to="${to}"`);
  });
});

describe('no app-only layout anywhere', () => {
  const css = src('src/site/site.css');
  it('site.css: .is-app only for touch behaviour (no text selection, no tap flash, no rubber band), never layout', () => {
    const appRules = css.split('\n').filter((l) => /\.is-(app|android|ios)\b/.test(l));
    expect(appRules).toEqual([
      '.is-app body { overscroll-behavior: none; -webkit-user-select: none; user-select: none; }',
      '.is-app input, .is-app textarea { -webkit-user-select: text; user-select: text; }',
      '.is-app { -webkit-tap-highlight-color: transparent; }',
    ]);
    expect(css).not.toMatch(/\.ms-apphead \{/);
  });
  it('only these files ask whether they run in an app, each for content or store rules, not layout', () => {
    const allowed = {
      'app/native.js': 'the app itself',
      'app/push.js': 'push notifications exist only in the apps',
      'app/OfflineScreen.jsx': 'the offline screen re-checks the connection in the apps',
      'pages/Race.jsx': 'the race is always on the whole screen in the apps (the phone layout)',
      'site/SiteFooter.jsx': 'Settings instead of cookie settings, no store buttons (store rules)',
      'site/SocialLinks.jsx': 'no links out to social media in the apps (store rules)',
      'site/help/HelpPage.jsx': 'the Help answers for the platform',
      'site/landing/LandingPage.jsx': 'one sentence: "Free to play" instead of "in your browser"',
      'site/pages/RedeemPage.jsx': 'no gift codes in the apps (store rules)',
    };
    const root = new URL('../src/', import.meta.url).pathname;
    const files = [];
    const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(jsx?|css)$/.test(f)) files.push(p); } };
    walk(root);
    const asking = files.filter((p) => /isNativeApp|nativePlatform|\.is-app\b|'is-app'/.test(readFileSync(p, 'utf8'))).map((p) => p.slice(root.length)).filter((f) => f !== 'site/site.css');
    expect(asking.sort()).toEqual(Object.keys(allowed).sort());
  });
});

describe('safe areas: the notch, the home bar and landscape', () => {
  const css = src('src/site/site.css');
  it('the header keeps clear of the notch and the status bar, and of the sides in landscape', () => {
    expect(css).toMatch(/\.ms-header \{[^}]*padding-top: env\(safe-area-inset-top, 0px\)/);
    expect(css).toMatch(/\.ms-header__inner \{[^}]*padding: 12px max\(16px, env\(safe-area-inset-right, 0px\)\) 12px max\(16px, env\(safe-area-inset-left, 0px\)\)/);
    expect(src('index.html')).toContain('viewport-fit=cover');
  });
  it('the race fills the screen, its buttons clear of the notch and the home bar; only while html.is-race-full is set', () => {
    expect(css).toContain('.is-race-full .race-page .preview3d__stage { position: absolute; inset: 0;');
    expect(css).toMatch(/\.is-race-full \.segmented--camera \{\s*position: fixed;[^}]*bottom: calc\(env\(safe-area-inset-bottom/);
    expect(css).toContain('.is-race-phone.is-race-full .ms-header { display: none; }');
    expect(css).toContain('.is-race-phone.is-race-full .race-page > .segmented { display: none; }');
    expect(css).toMatch(/\.is-race-phone\.is-race-full \.race-float \{[^}]*top: calc\(env\(safe-area-inset-top, 0px\) \+ 8px\)/);
    expect(css).toContain('.is-race-phone.is-race-full .race-float--exit { left: calc(env(safe-area-inset-left, 0px) + 8px); }');
    expect(css).toContain('@media (orientation: landscape) and (max-height: 500px) {');
    const raceRules = css.split('\n').filter((l) => /is-race-full/.test(l) && /^\S/.test(l));
    expect(raceRules.length).toBeGreaterThan(10);
    for (const l of raceRules) expect(/^(\.is-race-phone)?\.is-race-full\b/.test(l) || l.startsWith('/*')).toBe(true);
  });
  it('the menu drawer goes on the page itself (the header\'s blur would trap it), clear of the notch', () => {
    expect(src('src/site/MenuSheet.jsx')).toContain('createPortal(');
    expect(css).toMatch(/\.ms-appmenu--drawer \.ms-appmenu__panel \{[^}]*env\(safe-area-inset-top, 0px\)/);
  });
});
