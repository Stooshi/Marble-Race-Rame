'use strict';

/**
 * Marketing email (Moses, 16 Nov 2026, CRM phase 6; plan: claude/crm-plan.md §3.2–3.3). SENDING IS OFF: nothing is
 * emailed unless MARKETING_SENDING=on (and email is set up), which only Moses switches after approving the texts.
 * Until then the jobs only count who would get what, and the back office shows it.
 *
 *   Onboarding: four emails, day 1, 3, 7 and 10 after a player saves an account (their first confirmation email), to
 *   players who agreed to news and are allowed by the rules (./audience.js); it stops at their first purchase
 *   (Moses, 16 Nov 2026: buyers get the newsletters instead). Each step once, in the Swedish morning (9 to 11).
 *   Newsletters: written in the back office, to a segment under the same rules; sent in batches (300 every 10
 *   minutes) once an admin presses Send with a reason, and only while sending is on.
 * Every marketing email carries the one-click unsubscribe (link and headers). No open or click tracking.
 */
const email = require('../email');
const library = require('../email/library');
const unsubscribe = require('../email/unsubscribe');
const config = require('../config');
const audience = require('./audience');

const STEPS = [{ kind: 'onboarding-1', day: 1 }, { kind: 'onboarding-2', day: 3 }, { kind: 'onboarding-3', day: 7 }, { kind: 'onboarding-4', day: 10 }];
const LATE_DAYS = 3; // (a step not sent within 3 days of its day is skipped: no old welcome emails when sending starts)
const BATCH = 300;

const site = () => (config.publicSiteUrl || 'https://marblespins.com').replace(/\/+$/, '');
const apiUrl = () => process.env.PUBLIC_API_URL || (process.env.RAILWAY_PUBLIC_DOMAIN && `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`) || site();
const SAVED_AT = `(SELECT min(ec.created_at) FROM email_confirmations ec WHERE ec.user_id = u.id)`;

/** The players due one onboarding step now. */
async function due(db, step) {
  const { rows } = await db.query(
    `SELECT u.id, u.username, u.email FROM users u
      WHERE ${audience.allowedSql()} AND u.marketing_opt_in AND NOT ${audience.ANY_PURCHASE}
        AND ${SAVED_AT} <= now() - make_interval(days => $1) AND ${SAVED_AT} > now() - make_interval(days => $2)
        AND NOT EXISTS (SELECT 1 FROM marketing_sends m WHERE m.user_id = u.id AND m.kind = $3 AND m.newsletter_id IS NULL)
      ORDER BY u.id LIMIT 5000`,
    [step.day, step.day + LATE_DAYS, step.kind],
  );
  return rows;
}

async function newTracks(db) {
  const { rows } = await db.query(`SELECT name FROM tracks WHERE is_active AND season_key IS NULL ORDER BY created_at DESC LIMIT 3`);
  return rows.map((r) => r.name).join(', ');
}

/** One marketing email to one player (claimed in marketing_sends first, so it goes once). */
async function sendOne(db, user, kind, { newsletter = null, values = {} } = {}) {
  const { rowCount } = await db.query(
    `INSERT INTO marketing_sends (user_id, kind, newsletter_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [user.id, kind, newsletter?.id ?? null],
  );
  if (!rowCount) return false;
  try {
    const unsubscribeUrl = unsubscribe.pageLink(user.id, site());
    const m = newsletter
      ? { ...library.render('newsletter', newsletter, { values: { name: user.username }, unsubscribeUrl }), templateVersion: null }
      : await library.compose(db, kind, { values: { name: user.username, ...values }, unsubscribeUrl, fallback: () => library.render(kind, library.KINDS[kind].defaults, { values: { name: user.username, ...values }, unsubscribeUrl }) });
    await email.send({ to: user.email, toName: user.username, subject: m.subject, html: m.html, kind, userId: user.id, templateVersion: m.templateVersion, headers: unsubscribe.headers(user.id, apiUrl()), tags: [kind] });
    return true;
  } catch (err) {
    await db.query(`UPDATE marketing_sends SET status = 'failed' WHERE user_id = $1 AND kind = $2 AND newsletter_id IS NOT DISTINCT FROM $3`, [user.id, kind, newsletter?.id ?? null]);
    console.error(`[marketing] ${kind} to a player failed: ${err.message}`);
    return false;
  }
}

/** The onboarding run. → { dryRun, steps: [{ kind, due, sent }] }. Sending off: only counts. */
async function runOnboarding(db, { now = new Date() } = {}) {
  const on = audience.sendingOn();
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', hour: '2-digit', hour12: false }).format(now));
  const morning = hour >= 9 && hour < 11;
  const values = { play_url: `${site()}/play`, rooms_url: `${site()}/play/friends`, collection_url: `${site()}/shop`, tracks_url: `${site()}/tracks`, new_tracks: await newTracks(db) };
  const steps = [];
  for (const step of STEPS) {
    const users = await due(db, step);
    let sent = 0;
    if (on && morning) for (const u of users) if (await sendOne(db, u, step.kind, { values })) sent += 1;
    steps.push({ kind: step.kind, day: step.day, due: users.length, sent });
  }
  return { dryRun: !on, steps };
}

/** Sends the next batch of every newsletter being sent (only while sending is on). → how many sent. */
async function runNewsletters(db) {
  if (!audience.sendingOn()) return 0;
  const { rows: letters } = await db.query(`SELECT * FROM newsletters WHERE status = 'sending' ORDER BY send_started_at`);
  let total = 0;
  for (const n of letters) {
    const params = [n.id];
    const { rows: users } = await db.query(
      `SELECT u.id, u.username, u.email FROM users u
        WHERE ${audience.allowedSql()} AND ${audience.segmentSql(n.segment, params)}
          AND NOT EXISTS (SELECT 1 FROM marketing_sends m WHERE m.user_id = u.id AND m.newsletter_id = $1)
        ORDER BY u.id LIMIT ${BATCH}`,
      params,
    );
    let sent = 0;
    for (const u of users) if (await sendOne(db, u, 'newsletter', { newsletter: n })) sent += 1;
    total += sent;
    await db.query(
      `UPDATE newsletters SET sent_count = sent_count + $2, status = CASE WHEN $3 THEN 'sent' ELSE status END, sent_at = CASE WHEN $3 THEN now() ELSE sent_at END WHERE id = $1`,
      [n.id, sent, users.length < BATCH],
    );
  }
  return total;
}

function startJobs(db) {
  const run = async () => {
    try {
      const r = await runOnboarding(db);
      if (!r.dryRun) { const n = r.steps.reduce((a, s) => a + s.sent, 0); if (n) console.log(`[marketing] onboarding: ${n} sent`); }
    } catch (err) { console.error(`[marketing] onboarding: ${err.message}`); }
    try { const n = await runNewsletters(db); if (n) console.log(`[marketing] newsletters: ${n} sent`); } catch (err) { console.error(`[marketing] newsletters: ${err.message}`); }
  };
  const timer = setInterval(run, 10 * 60_000);
  timer.unref?.();
  return timer;
}

module.exports = { STEPS, LATE_DAYS, BATCH, due, runOnboarding, runNewsletters, sendOne, startJobs, audience };
