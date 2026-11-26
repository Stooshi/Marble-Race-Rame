'use strict';

const db = require('../db');
const { verifyToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/httpError');

function bearerToken(req) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme && scheme.toLowerCase() === 'bearer' ? token : null;
}

async function loadUser(token) {
  const payload = verifyToken(token);
  if (!payload) return null;
  if (payload.aud === 'marble-admin') return null; // (a back-office token is not a player's token)
  // Re-read the user so deleted accounts and role changes take effect immediately.
  // A suspended account's token stops working at once.
  const { rows } = await db.query(
    `SELECT id, username, role, extract(epoch FROM password_changed_at)::bigint AS changed
       FROM users WHERE id = $1 AND suspended_at IS NULL AND deleted_at IS NULL`,
    [payload.sub],
  );
  if (!rows[0]) return null;
  // A password reset ends every login made before it.
  if (rows[0].changed != null && (payload.iat ?? 0) < Number(rows[0].changed)) return null;
  const { changed: _c, ...user } = rows[0];
  return { ...user, tokenPayload: payload };
}

/** Rejects the request with 401 unless a valid bearer token is supplied. */
async function requireAuth(req, _res, next) {
  const user = await loadUser(bearerToken(req));
  if (!user) throw unauthorized('Invalid or missing token');
  req.user = user;
  next();
}

/** Attaches req.user when a valid token is present; never rejects. */
async function optionalAuth(req, _res, next) {
  req.user = (await loadUser(bearerToken(req))) || null;
  next();
}

function requireAdmin(req, _res, next) {
  if (!req.user) throw unauthorized();
  if (req.user.role !== 'admin') throw forbidden('Admin access required');
  next();
}

module.exports = { requireAuth, optionalAuth, requireAdmin, loadUser };
