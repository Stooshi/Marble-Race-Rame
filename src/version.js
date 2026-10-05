'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { SIMULATOR_VERSION } = require('./game/simulator');

/**
 * Which code is running, for /health. A deploy uploaded with the Railway CLI
 * carries no git history, so besides the commit (when the platform provides
 * it) we report a fingerprint of the backend source: compare it with the one
 * for Main to see whether the live server runs the latest code.
 */
function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? listFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]))
    .filter((f) => f.endsWith('.js'));
}

function codeFingerprint(root = __dirname) {
  const hash = crypto.createHash('sha256');
  for (const file of listFiles(root).sort()) {
    hash.update(path.relative(root, file).split(path.sep).join('/'));
    hash.update('\0');
    hash.update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')); // same on Windows checkouts
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 12);
}

const VERSION = Object.freeze({
  commit: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.SOURCE_COMMIT || null,
  codeFingerprint: codeFingerprint(),
  simulator: SIMULATOR_VERSION,
  startedAt: new Date().toISOString(),
});

module.exports = { VERSION, codeFingerprint };
