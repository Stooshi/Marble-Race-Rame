// Logging back in and where new guests stop (Moses, 9 Nov 2026): "Log in" for guests in the header, the
// menu and the name menu; the save form's "That email already has an account: Log in instead" with the
// email filled in (in the page's state, never the address bar); no auto-capitals or autocorrect on name
// and email fields; 'error' and 'left' before the first GO (nothing typed, nothing about the player).
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

describe('logging back in', () => {
  it('a guest sees Log in in the header (computer), the menu drawer and the name menu (phone)', () => {
    expect(src('src/site/SiteHeader.jsx')).toContain('{user.is_guest && <Link to="/signup?mode=login" className="ms-header__login ms-header__guestlogin">Log in</Link>}');
    expect(src('src/site/MenuSheet.jsx')).toContain('{user.is_guest && <Link to="/signup?mode=login" onClick={onClose}>Log in</Link>}');
    expect(src('src/site/account/NameChip.jsx')).toContain('<Link to="/signup?mode=login" className="ms-namemenu__login" onClick={onClose}>Already have an account? Log in</Link>');
  });
  it('the save form: an email with an account offers Log in instead, the email carried in the page state', () => {
    const q = src('src/site/account/QuickSignup.jsx');
    expect(q).toContain("err.details?.code === 'email_taken'");
    expect(q).toContain('<Link to="/signup?mode=login" state={{ login: taken }}>{t.logInInstead}</Link>');
    expect(q).not.toMatch(/mode=login&login=|login=\$\{/);
    const sp = src('src/site/pages/SignupPage.jsx');
    expect(sp).toContain("login: typeof location.state?.login === 'string' ? location.state.login : ''");
    expect(sp).toContain('setF((v) => ({ ...v, login: l }))');
    const texts = src('src/site/account/saveTexts.js');
    expect(texts).toContain("emailTaken: 'That email already has an account.'");
    expect(texts).toContain("logInInstead: 'Log in instead'");
  });
  it('no auto-capitals or autocorrect on the player name, email and login fields', () => {
    const q = src('src/site/account/QuickSignup.jsx');
    expect(q).toMatch(/autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck=\{false\}/);
    expect(q).toMatch(/autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck=\{false\}/);
    expect(src('src/site/pages/SignupPage.jsx')).toContain('autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required');
    expect(src('src/site/pages/PasswordPages.jsx')).toContain('autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email"');
  });
});

describe('where new guests stop before their first race', () => {
  afterEach(() => { vi.resetModules(); delete globalThis.sessionStorage; });

  it("an error's detail is what failed, the status and the code only", async () => {
    const { errorDetail } = await import('../src/api/firstSteps');
    expect(errorDetail('quick', { status: 409, details: { code: 'quick_starting' }, message: 'This quick race is starting' })).toBe('quick:409:quick_starting');
    expect(errorDetail('start', { message: 'Network down' })).toBe('start:0');
  });

  it("'left' is sent once as the page closes, with the login, where and the seconds since the tap", async () => {
    const store = new Map();
    globalThis.sessionStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
    vi.doMock('../src/api/client', () => ({ api: { firstStep: vi.fn(async () => ({})) }, API_URL: 'https://api.test', getStoredToken: () => 'tok' }));
    const fs = await import('../src/api/firstSteps');
    fs.noteTap(Date.now() - 12_000);
    const calls = [];
    const fetchImpl = (url, opts) => { calls.push([url, opts]); return Promise.resolve({}); };
    expect(fs.sendLeft('quick-wait', { fetchImpl })).toBe(true);
    expect(fs.sendLeft('loading', { fetchImpl })).toBe(false); // (once)
    expect(calls).toHaveLength(1);
    const [url, opts] = calls[0];
    expect(url).toBe('https://api.test/api/users/me/first-step');
    expect(opts.keepalive).toBe(true);
    expect(opts.headers.Authorization).toBe('Bearer tok');
    const body = JSON.parse(opts.body);
    expect(body.step).toBe('left');
    expect(body.detail).toBe('quick-wait');
    expect(body.seconds).toBeGreaterThanOrEqual(11);
    expect(Object.keys(body).sort()).toEqual(['detail', 'seconds', 'step']);
  });

  it('nothing after the first GO, and only for guests', async () => {
    vi.doMock('../src/api/client', () => ({ api: { firstStep: vi.fn(async () => ({})) }, API_URL: 'https://api.test', getStoredToken: () => 'tok' }));
    const fs = await import('../src/api/firstSteps');
    const { api } = await import('../src/api/client');
    fs.firstStepError('quick', { status: 500 }, { is_guest: false });
    expect(api.firstStep).not.toHaveBeenCalled();
    fs.sawGo();
    fs.firstStepError('quick', { status: 500 }, { is_guest: true });
    expect(api.firstStep).toHaveBeenCalledTimes(1); // (the 'go' only)
    expect(fs.sendLeft('loading', { fetchImpl: () => Promise.resolve() })).toBe(false);
  });

  it('the screens report: the quick-race wait, the starting line, the room, a first race loading', () => {
    const rf = src('src/site/pages/RaceFlow.jsx');
    expect(rf).toContain("useLeftReport('quick-wait', user)");
    expect(rf).toContain("useLeftReport('start-line', user, !busy)");
    expect(rf).toContain("firstStepError('quick', e, user)");
    expect(rf).toContain("firstStepError('start', e, user)");
    expect(src('src/site/pages/RoomPage.jsx')).toContain("useLeftReport('room', user");
    expect(src('src/components/LiveRaceViewer3D.jsx')).toContain("useLeftReport('loading', me, phase === 'loading')");
    expect(src('src/context/AuthContext.jsx')).toContain('api.guest(source, { app: isNativeApp() })');
  });
});
