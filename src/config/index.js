'use strict';

require('dotenv').config({ quiet: true });

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) throw new Error(`Environment variable ${name} must be an integer`);
  return value;
}

function intList(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.split(',').map((part) => {
    const value = Number.parseInt(part.trim(), 10);
    if (Number.isNaN(value) || value < 0) throw new Error(`${name} must be a list of non-negative integers`);
    return value;
  });
}

const DEV_JWT_SECRET = 'dev-only-insecure-secret';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? null : DEV_JWT_SECRET);
if (!jwtSecret || (isProduction && jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET must be set (at least 32 characters) in production');
}

const corsOrigin = (process.env.CORS_ORIGIN || '*').trim();

module.exports = Object.freeze({
  env,
  isProduction,
  isTest: env === 'test',
  port: int('PORT', 3000),
  corsOrigin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()),

  db: {
    connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/marble_race',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: int('DATABASE_POOL_MAX', 10),
  },

  auth: {
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: int('BCRYPT_ROUNDS', 12),
  },

  game: {
    minMarbles: 10,
    maxMarbles: 20,
    minDurationMs: 50_000,
    maxDurationMs: 90_000,
    countdownMs: int('RACE_COUNTDOWN_MS', 5000),
    tickRateHz: int('RACE_TICK_RATE_HZ', 10),
    podiumRewards: intList('REWARD_COINS_PODIUM', [100, 50, 25]),
    participationReward: int('REWARD_COINS_PARTICIPATION', 10),
  },
});
