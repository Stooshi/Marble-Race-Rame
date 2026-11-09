'use strict';

/**
 * The kind of browser a new guest tapped in (Moses, 9 Nov 2026: where do guests with 0 races stop?),
 * worked out from the User-Agent at the tap and kept as a short class only: never the User-Agent
 * itself, the address or anything else about the player.
 *
 *   browserClass(userAgent, { app }) → e.g. 'tiktok/phone', 'safari/phone', 'chrome/desktop',
 *                                      'app/phone' (our Android app), 'bot', 'other/phone'
 */
const IN_APP = [
  ['tiktok', /musical_ly|tiktok|bytedancewebview|trill_/i],
  ['instagram', /instagram/i],
  ['facebook', /\bFBAN\b|\bFBAV\b|FB_IAB|FBIOS/i],
  ['snapchat', /snapchat/i],
  ['messenger', /messenger/i],
  ['x', /twitter|\bX\/\d/i],
  ['reddit', /reddit/i],
  ['discord', /discord/i],
  ['line', /\bLine\//i],
];
const BOT = /bot\b|crawler|spider|headlesschrome|phantomjs|puppeteer|playwright|lighthouse|preview|facebookexternalhit|slurp|python-requests|curl\/|wget/i;

function deviceOf(ua) {
  if (/ipad|tablet/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return 'tablet';
  if (/iphone|ipod|android.*mobile|mobile/i.test(ua)) return 'phone';
  return 'desktop';
}

function browserClass(userAgent, { app = false } = {}) {
  const ua = String(userAgent ?? '');
  if (!ua) return 'unknown';
  if (BOT.test(ua)) return 'bot';
  const device = deviceOf(ua);
  if (app) return `app/${device}`;
  for (const [name, re] of IN_APP) if (re.test(ua)) return `${name}/${device}`;
  if (/; wv\)/.test(ua)) return `webview/${device}`;
  if (/SamsungBrowser/i.test(ua)) return `samsung/${device}`;
  if (/EdgA?\//.test(ua) || /Edg\//.test(ua)) return `edge/${device}`;
  if (/Firefox|FxiOS/i.test(ua)) return `firefox/${device}`;
  if (/CriOS|Chrome\//.test(ua)) return `chrome/${device}`;
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return `safari/${device}`;
  return `other/${device}`;
}

module.exports = { browserClass };
