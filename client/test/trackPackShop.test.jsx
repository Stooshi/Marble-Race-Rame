// Track packs in the shop (Moses, 12 Nov 2026): the price from one settings file ($7.99, or at most 25% in coins:
// 1,990 coins + $5.99, never coins alone), the Track packs tab and a pack's page from the approved mockup, and
// buying on the website (Stripe), on Android (Google Play, product ids with _) and on iPhone (App Store, a
// non-consumable), the coins set aside first in the apps and given back if the sheet is closed.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  isBillingSupported: vi.fn(async () => ({ isBillingSupported: true })),
  purchaseProduct: vi.fn(),
  getPurchases: vi.fn(async () => ({ purchases: [] })),
  getProducts: vi.fn(async () => ({ products: [] })),
  configure: vi.fn(async () => {}),
  finishTransaction: vi.fn(async () => {}),
  restorePurchases: vi.fn(async () => {}),
}));
vi.mock('@capgo/native-purchases', () => ({ NativePurchases: plugin, PURCHASE_TYPE: { INAPP: 'inapp' } }));
const api = vi.hoisted(() => ({
  googleAccount: vi.fn(), googleVerify: vi.fn(), appleAccount: vi.fn(), appleVerify: vi.fn(),
  packCheckout: vi.fn(), packCoinHold: vi.fn(), packCoinRelease: vi.fn(async () => ({ coinsBack: 1990 })), pack: vi.fn(), packs: vi.fn(),
}));
vi.mock('../src/api/client', () => ({ api }));
const auth = vi.hoisted(() => ({ value: { isAuthenticated: true, user: { id: 'u1', coins: 5000, is_guest: false }, refreshUser: async () => {} } }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => auth.value }));
const pageData = vi.hoisted(() => ({ value: null }));
vi.mock('../src/hooks/useAsync', () => ({ useAsync: () => ({ data: pageData.value, error: null, reload: () => {} }) }));

const { buyPack } = await import('../src/site/payments');
const { TrackPacksTab, PackPage } = await import('../src/site/shop/TrackPacks');
const { TRACK_PACK_PRICE, PACK_NAMES, packProductId } = await import('../src/shared/payments/trackPacks');
const require = createRequire(import.meta.url);
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

const PACK = { key: 'grand-prix', name: 'Grand Prix', series: 'Grand Prix', pic: 'pudong-marble-grand-prix', live: 20, fullAt: 20, complete: true, mix: { easy: 4, wild: 9, extreme: 7 }, owned: false, products: { money: 'trackpack-grand-prix', coins: 'trackpack-grand-prix-coins' } };
const SOON = { ...PACK, key: 'arcade', name: 'Arcade', series: 'Arcade', pic: 'kill-screen', live: 4, complete: false, mix: { easy: 2, wild: 0, extreme: 2 } };

describe('the price', () => {
  it('$7.99, or 1,990 coins + $5.99: coins at most 25% of the price, never coins alone (one settings file)', () => {
    expect(TRACK_PACK_PRICE.label).toBe('$7.99');
    expect(TRACK_PACK_PRICE.withCoins).toEqual({ coins: 1990, cents: 599, label: '$5.99' });
    const s = require('../src/shared/payments/trackPacks.json');
    expect((s.withCoins.coins * s.coinValueCentsPer1000) / 1000).toBeLessThanOrEqual(s.priceCents * s.maxCoinShare);
    expect(s.withCoins.priceCents).toBeGreaterThan(0);
  });
  it('the packs\' names and product ids match the server', () => {
    const { PACKS } = require('../../src/packs/list.js');
    expect(PACK_NAMES).toEqual(Object.fromEntries(PACKS.map((p) => [p.key, p.name])));
    expect(packProductId('blocks-2', true)).toBe('trackpack-blocks-2-coins');
  });
});

describe('the Track packs tab and a pack\'s page', () => {
  const html = (el, url = '/shop') => renderToString(<MemoryRouter initialEntries={[url]}><Routes><Route path="/shop" element={el} /><Route path="/shop/packs/:key" element={el} /></Routes></MemoryRouter>).replace(/<!-- -->/g, '');

  it('a card per pack: picture, 20 tracks, the wildness mix, the price, Unlock or Coming soon', () => {
    const out = html(<TrackPacksTab data={{ onSale: true, testBuy: false, packs: [PACK, SOON] }} />);
    expect(out).toContain('>Grand Prix</h3>');
    expect(out).toContain('20 tracks');
    expect(out).toContain('$7.99');
    expect(out.match(/>Unlock</g)).toHaveLength(1);
    expect(out).toContain('Coming soon');
    expect(out).toContain('4 ready, 16 on the way');
    expect(out).toContain('Paid leagues can race any track, locked ones included.');
  });

  it('the pack page: every track with its one line, "Unlock all 20 tracks – $7.99" at the top and the bottom, the coins option and split', () => {
    pageData.value = { onSale: true, testBuy: false, price: {}, pack: { ...PACK, tracks: [{ slug: 'lagos-marble-grand-prix', name: 'Lagos Marble Grand Prix', wildness: 'easy', line: 'Down a half-pipe into a busy market' }], planned: ['Nevada Drag Strip'] } };
    const out = html(<PackPage />, '/shop/packs/grand-prix');
    expect(out).toContain('Lagos Marble Grand Prix');
    expect(out).toContain('Down a half-pipe into a busy market');
    expect(out).toContain('Nevada Drag Strip');
    expect(out.match(/Unlock all 20 tracks – \$7\.99/g)).toHaveLength(2);
    expect(out).toContain('● 1,990 + $5.99'); // (the player has the coins: the second way to pay)
    expect(out).toContain('City circuits and motorsport');
  });

  it('a pack under 20 tracks: Coming soon, no buy button; not sold to the player: nothing to buy', () => {
    pageData.value = { onSale: true, testBuy: false, price: {}, pack: { ...SOON, tracks: [], planned: [] } };
    let out = html(<PackPage />, '/shop/packs/arcade');
    expect(out).not.toContain('Unlock all');
    expect(out).toContain('Coming soon');
    pageData.value = { onSale: false, testBuy: false, price: {}, pack: { ...PACK, tracks: [], planned: [] } };
    out = html(<PackPage />, '/shop/packs/grand-prix');
    expect(out).not.toContain('Unlock all');
    expect(out).toContain('Track packs aren&#x27;t for sale yet');
  });

  it('the shop shows tabs (Track packs first) only while packs are sold to the player; pack pages stay out of search', async () => {
    const shop = src('src/site/pages/ShopPage.jsx');
    expect(shop).toContain("const tabs = Boolean(packs.data?.onSale);");
    expect(shop).toContain("[['packs', 'Track packs'], ['marbles', 'Marbles'], ['pass', 'Season pass'], ['coins', 'Coins']]");
    const { metaFor } = await import('../src/site/pageMeta');
    expect(metaFor('/shop/packs/grand-prix').noindex).toBe(true);
    expect(src('src/site/pages/PurchasesPage.jsx')).toContain('o.pack_key ?');
  });
});

describe('buying a pack', () => {
  afterEach(() => { delete globalThis.window; vi.clearAllMocks(); });

  it('the website: a Stripe checkout on the server (coins or not), then Stripe\'s page', async () => {
    globalThis.window = { location: { assign: vi.fn() } };
    api.packCheckout.mockResolvedValue({ next: { kind: 'redirect', url: 'https://checkout.stripe.com/x' } });
    expect((await buyPack('grand-prix', { useCoins: true, consent: true })).status).toBe('redirecting');
    expect(api.packCheckout).toHaveBeenCalledWith({ pack: 'grand-prix', useCoins: true, provider: 'stripe', consent: true });
    expect(window.location.assign).toHaveBeenCalledWith('https://checkout.stripe.com/x');
    expect(plugin.purchaseProduct).not.toHaveBeenCalled();
  });

  describe('Android', () => {
    beforeEach(() => {
      globalThis.window = { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } };
      api.googleAccount.mockResolvedValue({ accountId: 'acct-1', live: true });
    });
    it('Google Play with _ ids, kept (not consumed); with coins the coins are set aside first', async () => {
      api.packCoinHold.mockResolvedValue({ holdId: 'h1', coins: 1990 });
      plugin.purchaseProduct.mockResolvedValue({ purchaseToken: 'tok-1' });
      api.googleVerify.mockResolvedValue({ status: 'paid', pack: 'pack-granted', orderNo: 'MS-9' });
      expect((await buyPack('track-and-field', { useCoins: true })).status).toBe('paid');
      expect(api.packCoinHold).toHaveBeenCalledWith('track-and-field', { test: false });
      expect(plugin.purchaseProduct).toHaveBeenCalledWith(expect.objectContaining({ productIdentifier: 'trackpack_track_and_field_coins', appAccountToken: 'acct-1', isConsumable: false, autoAcknowledgePurchases: false }));
      expect(api.googleVerify).toHaveBeenCalledWith({ productId: 'trackpack-track-and-field-coins', purchaseToken: 'tok-1' });
      expect(api.packCoinRelease).not.toHaveBeenCalled();
    });
    it('the sheet closed: the coins come back; refused by the server: back too, with a refund note', async () => {
      api.packCoinHold.mockResolvedValue({ holdId: 'h2', coins: 1990 });
      plugin.purchaseProduct.mockRejectedValueOnce(Object.assign(new Error('User cancelled'), { code: 'USER_CANCELLED' }));
      expect((await buyPack('grand-prix', { useCoins: true })).status).toBe('cancelled');
      expect(api.packCoinRelease).toHaveBeenCalledWith('h2');
      plugin.purchaseProduct.mockResolvedValueOnce({ purchaseToken: 'tok-2' });
      api.googleVerify.mockResolvedValueOnce({ status: 'not-on-sale' });
      const r = await buyPack('grand-prix', { useCoins: true });
      expect(r).toMatchObject({ status: 'unavailable' });
      expect(r.message).toMatch(/Google Play refunds the payment by itself/);
      expect(api.packCoinRelease).toHaveBeenCalledTimes(2);
    });
  });

  it('iPhone: the App Store product (a non-consumable), finished once the server has it', async () => {
    globalThis.window = { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' } };
    api.appleAccount.mockResolvedValue({ accountToken: 'tok-uuid', live: true });
    plugin.purchaseProduct.mockResolvedValue({ jwsRepresentation: 'jws', transactionId: '77' });
    api.appleVerify.mockResolvedValue({ status: 'paid', pack: 'pack-granted', finish: true });
    expect((await buyPack('grand-prix')).status).toBe('paid');
    expect(plugin.purchaseProduct).toHaveBeenCalledWith(expect.objectContaining({ productIdentifier: 'trackpack-grand-prix', appAccountToken: 'tok-uuid' }));
    expect(plugin.finishTransaction).toHaveBeenCalledWith({ transactionId: '77' });
    expect(api.packCoinHold).not.toHaveBeenCalled();
  });
});
