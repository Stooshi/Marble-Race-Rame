// The Android app pays for coin packs with Google Play Billing: the purchase is made with the
// player's Play account id and then sent to our server, which checks it with Google and adds the
// coins (once). The website keeps Stripe. Prices come from Google Play in the player's currency.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  isBillingSupported: vi.fn(async () => ({ isBillingSupported: true })),
  purchaseProduct: vi.fn(),
  getPurchases: vi.fn(async () => ({ purchases: [] })),
  getProducts: vi.fn(),
}));
vi.mock('@capgo/native-purchases', () => ({ NativePurchases: plugin, PURCHASE_TYPE: { INAPP: 'inapp' } }));
const api = vi.hoisted(() => ({ googleAccount: vi.fn(), googleVerify: vi.fn(), checkout: vi.fn() }));
vi.mock('../src/api/client', () => ({ api }));

const { buyCoins, resumeStorePurchases, storeProvider } = await import('../src/site/payments');
const pack = { id: 'coins-10500', coins: 10500 };

describe('Google Play Billing in the Android app', () => {
  beforeEach(() => {
    globalThis.window = { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } };
    api.googleAccount.mockResolvedValue({ accountId: 'acct-123', live: true, packageName: 'com.marblespins.app' });
  });
  afterEach(() => { delete globalThis.window; vi.clearAllMocks(); });

  it('uses Google Play, never Stripe, inside the Android app', async () => {
    expect(storeProvider()).toBe('google');
    plugin.purchaseProduct.mockResolvedValue({ purchaseToken: 'tok-1', orderId: 'GPA.1', productIdentifier: pack.id });
    api.googleVerify.mockResolvedValue({ status: 'paid', coins: 12000, orderNo: 'MS-1' });
    const r = await buyCoins(pack, { consent: true });
    expect(r).toMatchObject({ status: 'paid', coins: 12000 });
    expect(plugin.purchaseProduct).toHaveBeenCalledWith(expect.objectContaining({ productIdentifier: 'coins-10500', productType: 'inapp', appAccountToken: 'acct-123', autoAcknowledgePurchases: false }));
    expect(api.googleVerify).toHaveBeenCalledWith({ productId: 'coins-10500', purchaseToken: 'tok-1' });
    expect(api.checkout).not.toHaveBeenCalled();
  });

  it('a purchase the server already counted is still "paid" (coins were added once)', async () => {
    plugin.purchaseProduct.mockResolvedValue({ purchaseToken: 'tok-1' });
    api.googleVerify.mockResolvedValue({ status: 'duplicate', coins: 12000 });
    expect((await buyCoins(pack)).status).toBe('paid');
  });

  it('closing the sheet is a cancel, a slow payment is pending, and nothing is bought while switched off', async () => {
    plugin.purchaseProduct.mockRejectedValueOnce(Object.assign(new Error('User cancelled'), { code: 'USER_CANCELLED' }));
    expect((await buyCoins(pack)).status).toBe('cancelled');
    plugin.purchaseProduct.mockResolvedValueOnce({ purchaseToken: 'tok-2' });
    api.googleVerify.mockResolvedValueOnce({ status: 'pending' });
    expect((await buyCoins(pack)).status).toBe('pending');
    api.googleAccount.mockResolvedValueOnce({ accountId: 'acct-123', live: false });
    plugin.purchaseProduct.mockClear();
    expect((await buyCoins(pack)).status).toBe('unavailable');
    expect(plugin.purchaseProduct).not.toHaveBeenCalled();
  });

  it('unconfirmed purchases are sent to the server again', async () => {
    plugin.getPurchases.mockResolvedValue({ purchases: [{ purchaseToken: 'tok-3', productIdentifier: 'coins-5000' }, { purchaseToken: 'tok-4', productIdentifier: 'coins-57500' }] });
    api.googleVerify.mockResolvedValueOnce({ status: 'paid' }).mockResolvedValueOnce({ status: 'pending' });
    expect(await resumeStorePurchases()).toBe(1);
    expect(api.googleVerify).toHaveBeenCalledTimes(2);
  });

  it('the website keeps Stripe and never touches Google Play', async () => {
    delete globalThis.window;
    expect(['stripe', 'test']).toContain(storeProvider());
    expect(await resumeStorePurchases()).toBe(0);
    expect(plugin.getPurchases).not.toHaveBeenCalled();
  });
});

describe('Android release build', () => {
  const { readFileSync } = require('node:fs');
  const { join } = require('node:path');
  const src = (p) => readFileSync(join(__dirname, '..', p), 'utf8');

  it('signs release bundles with the upload key from outside Git, and takes its version from app-version.json', () => {
    const gradle = src('android/app/build.gradle');
    expect(gradle).toMatch(/rootProject\.file\('keystore\.properties'\)/);
    expect(gradle).toMatch(/signingConfig signingConfigs\.release/);
    expect(gradle).toMatch(/versionCode appVersion\.versionCode/);
    expect(gradle).not.toMatch(/storePassword ['"]/); // (no password written in the build file)
    const v = JSON.parse(src('app-version.json'));
    expect(Number.isInteger(v.versionCode) && v.versionCode >= 1).toBe(true);
    for (const pattern of ['keystore.properties', '*.jks', '*.keystore']) expect(src('android/.gitignore')).toContain(pattern);
  });

  it('includes Google Play Billing and leaves out the advertising ID', () => {
    expect(src('android/capacitor.settings.gradle')).toMatch(/capgo-native-purchases/);
    expect(src('android/app/src/main/AndroidManifest.xml')).toMatch(/permission\.AD_ID" tools:node="remove"/);
  });
});
