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
  // Re-read the user so deleted accounts and role changes take effect immediately.
  const { rows } = await db.query('SELECT id, username, role FROM users WHERE id = $1', [payload.sub]);
  return rows[0] || null;
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
