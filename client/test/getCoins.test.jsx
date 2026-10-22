// "Get coins" instead of "Not enough coins" (Moses, 22 Oct 2026, first Android test): a button that opens
// the coin packs (the checkout: Stripe on the website, the app's own store in the apps), and after paying
// the player is back at the marble they wanted.
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import GetCoins, { getCoinsHref, notEnoughCoins, packFor, rememberWanted, safeBack, shortOf, wanted } from '../src/site/payments/GetCoins';

const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

describe('the Get coins button', () => {
  it('says how many coins are missing and opens the smallest pack that covers them, with the way back', () => {
    const html = renderToString(<MemoryRouter><GetCoins need={700} back="/collection/flame-swirl?shade=sunset" label="Flame Swirl" /></MemoryRouter>);
    expect(html).toContain('GET COINS');
    expect(html).toContain('● 700');
    expect(html).toContain(`href="/checkout?pack=coins-5000&amp;back=${encodeURIComponent('/collection/flame-swirl?shade=sunset').replace(/&/g, '&amp;')}"`);
    expect(packFor(5001).id).toBe('coins-10500');
    expect(packFor(999999).id).toBe('coins-57500');
    expect(shortOf(1200, 500)).toBe(700);
    expect(shortOf(1200, 1200)).toBe(0);
    expect(shortOf(null, 0)).toBe(0);
    expect(notEnoughCoins(new Error('Not enough coins'))).toBe(true);
  });

  it('only ever goes back to a page on this site', () => {
    expect(safeBack('/shop')).toBe('/shop');
    expect(safeBack('//evil.example')).toBeNull();
    expect(safeBack('https://evil.example')).toBeNull();
    expect(safeBack('/\\evil')).toBeNull();
    expect(getCoinsHref(10, 'https://x.example')).toBe('/checkout?pack=coins-5000');
  });
});

describe('the way back after paying', () => {
  const store = {};
  globalThis.sessionStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
  afterEach(() => { for (const k of Object.keys(store)) delete store[k]; });

  it('this tab remembers the marble across Stripe\'s payment page, for an hour, once', () => {
    rememberWanted('/collection/steelie?shade=classic', 'Steelie');
    expect(wanted()).toMatchObject({ back: '/collection/steelie?shade=classic', label: 'Steelie' });
    expect(wanted({ clear: true })?.label).toBe('Steelie');
    expect(wanted()).toBeNull();
    store['ms:wanted'] = JSON.stringify({ back: '/shop', at: Date.now() - 2 * 3600e3 });
    expect(wanted()).toBeNull();
  });

  it('the checkout goes straight back once paid (app stores, test payments); /purchases does after Stripe', () => {
    const checkout = src('src/site/pages/CheckoutPage.jsx');
    expect(checkout).toContain("navigate(back, { replace: true, state: { coinsAdded: pack.coins } })");
    expect(checkout).toContain('buyCoins(pack'); // (the app's own store in the apps: never the website's payment)
    expect(src('src/site/pages/PurchasesPage.jsx')).toContain('navigate(w.back, { replace: true, state: { coinsAdded: order.coins } })');
  });

  it('the shop, the bags and the race page\'s marble picker show Get coins, never "Not enough coins"', () => {
    const shop = src('src/site/pages/ShopPage.jsx');
    expect(shop).toContain('<GetCoins big need={short}');
    expect(shop).toContain('{msg?.key && <GetCoins');
    expect(shop).toContain('coins added. You have');
    const picker = src('src/components/MarbleSelector.jsx');
    expect(picker).toContain('getCoinsHref(');
    expect(picker).not.toContain('disabled={!affordable');
  });
});
