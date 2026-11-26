'use strict';

/**
 * Unsubscribe links for the news emails (ready for when emails are sent).
 *
 * Every email carries a personal link, https://marblespins.com/unsubscribe?u=<player id>&t=<token>,
 * that works without logging in. The token is an HMAC of the player id with the server's secret
 * (EMAIL_LINK_SECRET, or derived from JWT_SECRET), so links can't be guessed or made for someone
 * else, and they don't expire. For mail apps' own "Unsubscribe" button (RFC 8058), the email's
 * headers point at the API:
 *   List-Unsubscribe: <https://api…/api/users/unsubscribe?u=…&t=…>
 *   List-Unsubscribe-Post: List-Unsubscribe=One-Click
 */
const crypto = require('crypto');
const config = require('../config');

const SECRET = process.env.EMAIL_LINK_SECRET
  || crypto.createHash('sha256').update(`email-links:${config.auth.jwtSecret}`).digest('hex');

function token(userId) {
  return crypto.createHmac('sha256', SECRET).update(`unsubscribe:${String(userId).toLowerCase()}`).digest('base64url').slice(0, 32);
}

function valid(userId, given) {
  if (typeof userId !== 'string' || typeof given !== 'string' || given.length !== 32) return false;
  const want = Buffer.from(token(userId));
  const got = Buffer.from(given);
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

const query = (userId) => `u=${encodeURIComponent(userId)}&t=${token(userId)}`;

/** The link in the email's footer (a page on the website that confirms it). */
function pageLink(userId, siteUrl = config.publicSiteUrl) {
  return `${siteUrl}/unsubscribe?${query(userId)}`;
}

/** The email headers for mail apps' one-click unsubscribe; `apiUrl` is the server's public address. */
function headers(userId, apiUrl) {
  return {
    'List-Unsubscribe': `<${apiUrl.replace(/\/+$/, '')}/api/users/unsubscribe?${query(userId)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

module.exports = { token, valid, pageLink, headers };
