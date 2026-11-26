// Gift codes on the website (Moses, 21 Oct 2026): a "Redeem a code" page at /redeem, linked from
// Settings, for saved accounts only; never in the apps (Apple 3.1.1: no app-own codes unlocking
// content); a 404 and no link while client/src/shared/giftCodes.json is off.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import settings from '../src/shared/giftCodes.json';

const auth = { isAuthenticated: true, loading: false, user: { username: 'Nova', is_guest: false }, refreshUser: () => {} };
let native = false;
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../src/app/native', () => ({ isNativeApp: () => native }));
vi.mock('../src/site/account/QuickSignup', () => ({ default: ({ title }) => <p>{`QUICK SIGNUP: ${title}`}</p> }));
const { default: RedeemPage, giftCodesOn } = await import('../src/site/pages/RedeemPage');

const NF = () => <p>NOT FOUND</p>;
const page = () => renderToString(<MemoryRouter><RedeemPage NotFound={NF} /></MemoryRouter>);
const src = (p) => readFileSync(join(__dirname, '..', p), 'utf8');

afterEach(() => { settings.enabled = false; native = false; auth.user = { username: 'Nova', is_guest: false }; auth.isAuthenticated = true; });

describe('the Redeem a code page', () => {
  it('is off in the repository: the 404 page, and no link in Settings', () => {
    expect(settings.enabled).toBe(false);
    expect(giftCodesOn()).toBe(false);
    expect(page()).toContain('NOT FOUND');
    expect(src('src/site/pages/SettingsPage.jsx')).toMatch(/\{giftCodesOn\(\) && user && !user\.is_guest && \(/);
  });
  it('when on: a saved account gets the form; a guest saves first; logged out logs in first', () => {
    settings.enabled = true;
    expect(page()).toContain('Your code');
    auth.user = { username: 'g', is_guest: true };
    expect(page()).toContain('QUICK SIGNUP: Save your marble to redeem a code');
    auth.isAuthenticated = false; auth.user = null;
    expect(page()).toContain('href="/signup?mode=login&amp;next=%2Fredeem"');
  });
  it('never in the apps, even when on', () => {
    settings.enabled = true;
    native = true;
    expect(giftCodesOn()).toBe(false);
    expect(page()).toContain('NOT FOUND');
  });
  it('the route, its rewrite on Vercel, and kept out of search results', () => {
    expect(src('src/App.jsx')).toMatch(/<Route path="\/redeem" element=\{<RedeemPage NotFound=\{NotFound\} \/>\} \/>/);
    expect(src('vercel.json')).toMatch(/\|redeem\|/);
    expect(src('src/site/pageMeta.js')).toMatch(/redeem/);
  });
  it('the back office can make, list and switch off codes', () => {
    const a = src('src/admin/adminApi.js');
    for (const p of ["'/admin/gift-codes'", '/admin/gift-codes/${id}/disable']) expect(a).toContain(p);
    expect(src('src/admin/AdminApp.jsx')).toMatch(/<NavLink to="\/admin\/gift-codes">Gift codes<\/NavLink>/);
  });
});
