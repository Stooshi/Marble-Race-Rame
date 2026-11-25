// The App Store Connect API helpers (scripts/asc-api.mjs) and the iPhone build's signing settings
// (scripts/app-release-lib.mjs setPbxprojBuildSettings), Moses 23 Nov 2026.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMPLETE_PACKS, LIMITS, ascToken, checkProducts, productsFromRepo } from '../scripts/asc-api.mjs';
import { readPbxprojVersions, setPbxprojBuildSettings } from '../scripts/app-release-lib.mjs';

const PBX = fs.readFileSync(path.join(import.meta.dirname, '..', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'), 'utf8');

describe('App Store Connect token', () => {
  it('is an ES256 JWT that verifies with the key, for at most 20 minutes', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const p8 = privateKey.export({ format: 'pem', type: 'pkcs8' });
    const t = ascToken({ keyId: 'ABC123DEFG', issuerId: 'issuer-uuid', p8, now: 1_700_000_000_000 });
    const [h, b, s] = t.split('.');
    const dec = (x) => JSON.parse(Buffer.from(x, 'base64url').toString());
    expect(dec(h)).toEqual({ alg: 'ES256', kid: 'ABC123DEFG', typ: 'JWT' });
    const body = dec(b);
    expect(body.aud).toBe('appstoreconnect-v1');
    expect(body.iss).toBe('issuer-uuid');
    expect(body.exp - body.iat).toBeLessThanOrEqual(1200);
    expect(crypto.verify('sha256', Buffer.from(`${h}.${b}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'))).toBe(true);
  });
  it('refuses a missing key', () => {
    expect(() => ascToken({ keyId: '', issuerId: 'x', p8: 'y' })).toThrow(/missing/);
  });
});

describe('the App Store products', () => {
  const list = productsFromRepo();
  it('are the same 21 ids as Google Play, with _', () => {
    expect(list).toHaveLength(5 + 2 * COMPLETE_PACKS.length);
    expect(list.length).toBe(21);
    expect(list.map((p) => p.productId)).toEqual(expect.arrayContaining(['coins_5000', 'coins_10500', 'coins_27500', 'coins_57500', 'holiday_pass_2026', 'trackpack_grand_prix', 'trackpack_blocks_2_coins', 'trackpack_coasters_coins']));
    expect(list.every((p) => !p.productId.includes('-'))).toBe(true);
  });
  it("keep Apple's limits and the prices", () => {
    expect(checkProducts(list)).toEqual([]);
    expect(list.every((p) => [...p.name].length <= LIMITS.displayName && [...p.description].length <= LIMITS.description)).toBe(true);
    const price = Object.fromEntries(list.map((p) => [p.productId, p.price]));
    expect(price).toMatchObject({ coins_5000: '4.99', coins_10500: '9.99', coins_27500: '24.99', coins_57500: '49.99', holiday_pass_2026: '9.99', trackpack_rivers: '6.99', trackpack_rivers_coins: '4.99' });
  });
  it('coins are consumable; the pass and the packs non-consumable with Family Sharing off', () => {
    for (const p of list) {
      expect(p.type).toBe(p.productId.startsWith('coins_') ? 'CONSUMABLE' : 'NON_CONSUMABLE');
      expect(p.familySharable).toBe(false);
    }
  });
  it('point the coin packs and the pass at review screenshots that exist', () => {
    for (const p of list.filter((x) => !x.productId.startsWith('trackpack_'))) {
      expect(fs.existsSync(path.join(import.meta.dirname, '..', '..', p.screenshot))).toBe(true);
    }
  });
  it('catches a name that is too long', () => {
    expect(checkProducts([{ ...list[0], name: 'x'.repeat(31) }])[0]).toMatch(/name is 31/);
  });
});

describe('manual signing for the GitHub build (setPbxprojBuildSettings)', () => {
  it('changes only the App target Release configuration', () => {
    const out = setPbxprojBuildSettings(PBX, { CODE_SIGN_STYLE: 'Manual', DEVELOPMENT_TEAM: 'ABCDE12345', PROVISIONING_PROFILE_SPECIFIER: 'Marble Spins GitHub 1', 'CODE_SIGN_IDENTITY[sdk=iphoneos*]': 'Apple Distribution' });
    expect(out.match(/CODE_SIGN_STYLE = Manual;/g)).toHaveLength(1);
    expect(out).toContain('PROVISIONING_PROFILE_SPECIFIER = "Marble Spins GitHub 1";');
    expect(out).toContain('"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "Apple Distribution";');
    expect(out.match(/CODE_SIGN_STYLE = Automatic;/g)).toHaveLength(1); // Debug untouched
    expect(readPbxprojVersions(out)).toEqual(readPbxprojVersions(PBX));
    expect(setPbxprojBuildSettings(out, { CODE_SIGN_STYLE: 'Manual' })).toBe(out);
  });
});
