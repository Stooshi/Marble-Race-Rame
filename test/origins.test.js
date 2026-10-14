'use strict';

// The website's addresses: marblespins.com with and without www always, plus the Vercel address
// from CORS_ORIGIN (one * allowed for preview builds); nothing else.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.CORS_ORIGIN = 'https://marble-race-rame-client.vercel.app, https://marble-race-rame-client-*-stooshi.vercel.app/';
delete process.env.PUBLIC_SITE_URL;
const config = require('../src/config');

test('marblespins.com (www or not) and the Vercel addresses are the site; others are not', () => {
  for (const ok of ['https://marblespins.com', 'https://www.marblespins.com', 'https://marble-race-rame-client.vercel.app', 'https://marble-race-rame-client-git-main-stooshi.vercel.app']) {
    assert.equal(config.isSiteOrigin(ok), true, ok);
  }
  for (const bad of ['http://marblespins.com', 'https://marblespins.com.evil.com', 'https://evil.com', 'https://marble-race-rame-client-x.y-stooshi.vercel.app.evil.com', null, '']) {
    assert.equal(config.isSiteOrigin(bad), false, String(bad));
  }
});

test('CORS lets the site and the apps in (and requests with no origin, like Stripe\'s webhook), not other sites', () => {
  const check = (origin) => new Promise((res) => config.corsOrigin(origin, (_e, ok) => res(ok)));
  return Promise.all([
    check('https://www.marblespins.com').then((ok) => assert.equal(ok, true)),
    check(undefined).then((ok) => assert.equal(ok, true)),
    check('https://evil.com').then((ok) => assert.equal(ok, false)),
    check('capacitor://localhost').then((ok) => assert.equal(ok, true)), // (the iPhone app)
    check('https://localhost').then((ok) => assert.equal(ok, true)), // (the Android app)
  ]);
});
