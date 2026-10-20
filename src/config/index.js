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


const DEV_JWT_SECRET = 'dev-only-insecure-secret';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? null : DEV_JWT_SECRET);
if (!jwtSecret || (isProduction && jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET must be set (at least 32 characters) in production');
}

function assertGameLimits(game) {
  const { minDurationMs: min, maxDurationMs: max, defaultMarbles } = game;
  if (!(min >= 50_000 && max <= 90_000 && min <= max)) {
    throw new Error('RACE_MIN_DURATION_MS / RACE_MAX_DURATION_MS must satisfy 50000 <= min <= max <= 90000');
  }
  if (!(defaultMarbles >= 10 && defaultMarbles <= 20)) {
    throw new Error('RACE_DEFAULT_MARBLES must be between 10 and 20');
  }
  return game;
}

const corsOrigin = (process.env.CORS_ORIGIN || '*').trim();

// The website's own addresses. marblespins.com and www.marblespins.com are always allowed; the
// Vercel address (or any other) comes in through CORS_ORIGIN or PUBLIC_SITE_URL. An entry may use
// one * for a subdomain wildcard, e.g. https://*.vercel.app (Vercel preview builds).
const SITE_DOMAINS = ['https://marblespins.com', 'https://www.marblespins.com'];
const stripSlash = (u) => u.trim().replace(/\/+$/, '');
const publicSiteUrl = stripSlash(process.env.PUBLIC_SITE_URL || (isProduction ? SITE_DOMAINS[0] : 'http://localhost:5173'));
const listed = corsOrigin === '*' ? [] : corsOrigin.split(',').map(stripSlash).filter(Boolean);
const siteOrigins = [...new Set([...SITE_DOMAINS, publicSiteUrl, ...listed])];

function originMatches(origin, entry) {
  if (!entry.includes('*')) return origin === entry;
  const [head, tail] = entry.split('*');
  return origin.startsWith(head) && origin.endsWith(tail) && /^[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test(origin.slice(head.length, origin.length - tail.length));
}

/** Is `origin` (e.g. "https://www.marblespins.com") one of the website's own addresses? */
function isSiteOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  return siteOrigins.some((entry) => originMatches(stripSlash(origin), entry));
}

// The iPhone and Android apps (Capacitor) load the site from inside the app, from these addresses.
const APP_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

/** For the cors package and socket.io: '*' when CORS_ORIGIN is '*', otherwise the site's addresses and the apps. */
const corsCheck = corsOrigin === '*' ? '*' : (origin, cb) => cb(null, !origin || isSiteOrigin(origin) || APP_ORIGINS.includes(origin));

module.exports = Object.freeze({
  env,
  isProduction,
  isTest: env === 'test',
  port: int('PORT', 5000),
  corsOrigin: corsCheck,
  siteOrigins,
  publicSiteUrl,
  isSiteOrigin,

  db: {
    connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/marble_race',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: int('DATABASE_POOL_MAX', 10),
  },

  auth: {
    jwtSecret,
    // A player's login lasts this long after their LAST visit: GET /api/auth/me renews it once a
    // day (sliding). Guests have no password to log back in with, so it is all that keeps them
    // (Moses, 20 Oct 2026: a guest is lost only after 180 days without a visit; was 7 days from
    // the login, for everyone). The back office has its own 30-minute login.
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '180d',
    renewAfterSeconds: 24 * 3600,
    bcryptRounds: int('BCRYPT_ROUNDS', 12),
  },

  // Coin packs on the website (Stripe Checkout). Test keys (sk_test_…) work as soon as they are
  // set; live keys (sk_live_…) are refused unless STRIPE_ALLOW_LIVE=true, so nothing goes live by mistake.
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || null,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || null,
    allowLive: process.env.STRIPE_ALLOW_LIVE === 'true',
    // Where Checkout sends the player back (the website).
    // (Normally the address the player bought from — www, without www, or the Vercel address — when it
    // is one of the site's own; this one otherwise.)
    siteUrl: publicSiteUrl,
    // Stripe Tax: on unless STRIPE_TAX=off; prices include VAT. Product tax code: General -
    // Electronically Supplied Services unless set (ask your accountant; see the setup notes).
    tax: process.env.STRIPE_TAX !== 'off',
    taxCode: process.env.STRIPE_TAX_CODE || 'txcd_10000000',
    // Stripe's own terms-of-service checkbox in Checkout (needs the terms URL set in the Stripe dashboard).
    tosInCheckout: process.env.STRIPE_TOS_IN_CHECKOUT === 'true',
  },

  // Email through Brevo (EU). Off until BREVO_API_KEY is set: then password-reset emails work, and
  // the same sender is used later for news emails. EMAIL_FROM must be a sender verified in Brevo.
  email: {
    brevoApiKey: process.env.BREVO_API_KEY || null,
    from: process.env.EMAIL_FROM || 'no-reply@marblespins.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Marble Spins',
  },

  // The support inbox (src/support): new contact-form messages are emailed here (when email is on),
  // and players' replies to support emails come back here. SUPPORT_EMAIL overrides the company's
  // support address (client/src/shared/company.json).
  support: {
    email: process.env.SUPPORT_EMAIL || require('../../client/src/shared/company.json').supportEmail || null,
  },

  game: assertGameLimits({
    // Hard limits enforced by the API and the database schema.
    minMarbles: 10,
    maxMarbles: 20,
    // Field size used when a race is created without explicit limits.
    defaultMarbles: int('RACE_DEFAULT_MARBLES', 20),
    // Total race length (until the last marble finishes). Must lie within
    // 50-90 s; set both to the same value for fixed-length races.
    minDurationMs: int('RACE_MIN_DURATION_MS', 90_000),
    maxDurationMs: int('RACE_MAX_DURATION_MS', 90_000),
    countdownMs: int('RACE_COUNTDOWN_MS', 5000),
    tickRateHz: int('RACE_TICK_RATE_HZ', 10),
    // A rematch (POST /api/races/:id/next) starts by itself this long after it is set up.
    nextRaceDelayMs: int('RACE_NEXT_DELAY_MS', 40_000),
  }),
});
