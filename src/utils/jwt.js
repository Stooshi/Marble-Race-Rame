'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

function signToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, role: user.role }, config.auth.jwtSecret, {
    expiresIn: config.auth.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

/** Returns the decoded payload, or null if the token is missing/invalid/expired. */
function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, config.auth.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

module.exports = { signToken, verifyToken };
