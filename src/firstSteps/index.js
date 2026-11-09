'use strict';

/**
 * A new player's first steps (Moses, 2 Nov 2026), for the back office Dashboard's funnel:
 * 'tap' when the guest is made (they tapped Play, Quick race, Race solo or joined a room;
 * guests are no longer made when a page or room link is only opened) and 'go' when they
 * first saw GO. Each is kept once per player (the first time). Joining a race and finishing
 * one come from race_entries. Recording never gets in the way: a failure is only logged.
 *
 * Since 9 Nov 2026 (Moses: where do guests with 0 races stop?):
 * - the tap keeps the kind of browser (browser.js: a short class such as 'tiktok/phone'; never
 *   the User-Agent, the address or anything else about the player);
 * - 'error' (first_step_events): the first call that failed before the first race, as
 *   "<what>:<status>[:<code>]", e.g. "quick:409:quick_starting";
 * - 'left': the page closed before the first race reached GO, with where (start-line,
 *   quick-wait, room, loading) and the seconds since the tap.
 * Each kept once per player (the first time).
 */
const db = require('../db');
const { browserClass } = require('./browser');

const STEPS = ['tap', 'go'];
const SOURCES = ['quick', 'solo', 'friends', 'room'];
const EVENTS = ['error', 'left'];
const WHERE = ['start-line', 'quick-wait', 'room', 'loading', 'other'];

async function record(userId, step, source = null, client = db, { browser = null } = {}) {
  if (!STEPS.includes(step)) throw new Error(`Unknown first step ${step}`);
  try {
    await client.query(
      'INSERT INTO first_steps (user_id, step, source, browser) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, step) DO NOTHING',
      [userId, step, SOURCES.includes(source) ? source : null, browser ? String(browser).slice(0, 24) : null],
    );
  } catch (err) {
    console.error(`[first-steps] could not record ${step}: ${err.message}`);
  }
}

/** The detail of an 'error' or 'left' event, cleaned: letters, digits, '-', '_' and ':' only, 64 at most. */
function cleanDetail(kind, detail) {
  const d = String(detail ?? '').replace(/[^A-Za-z0-9_:-]/g, '').slice(0, 64);
  if (kind === 'left') return WHERE.includes(d) ? d : 'other';
  return d || 'unknown';
}

/**
 * An 'error' or 'left' event, once per player, only before their first race reached GO and only
 * within a day of the tap (a guest's first visit). → whether it was kept.
 */
async function event(userId, kind, detail, seconds = null, client = db) {
  if (!EVENTS.includes(kind)) throw new Error(`Unknown first-step event ${kind}`);
  try {
    const { rowCount } = await client.query(
      `INSERT INTO first_step_events (user_id, kind, detail, seconds)
       SELECT $1, $2, $3, $4
        WHERE EXISTS (SELECT 1 FROM first_steps WHERE user_id = $1 AND step = 'tap' AND created_at > now() - interval '1 day')
          AND NOT EXISTS (SELECT 1 FROM first_steps WHERE user_id = $1 AND step = 'go')
       ON CONFLICT (user_id, kind) DO NOTHING`,
      [userId, kind, cleanDetail(kind, detail), Number.isFinite(seconds) ? Math.max(0, Math.min(86_400, Math.round(seconds))) : null],
    );
    return rowCount > 0;
  } catch (err) {
    console.error(`[first-steps] could not record ${kind}: ${err.message}`);
    return false;
  }
}

/**
 * One log line when a new player's way into a first race is refused (POST /api/auth/guest,
 * POST /api/rooms/quick, status 400 or more): the path, the status and the error code, never
 * who or from where. Express middleware.
 */
function logRefused(req, res, next) {
  res.on('finish', () => {
    if (res.statusCode < 400) return;
    const code = res.locals?.errorCode ? ` ${res.locals.errorCode}` : '';
    console.warn(`[first-steps] refused ${req.method} ${req.baseUrl}${req.path === '/' ? '' : req.path} ${res.statusCode}${code}`);
  });
  next();
}

module.exports = { STEPS, SOURCES, EVENTS, WHERE, record, event, cleanDetail, logRefused, browserClass };
