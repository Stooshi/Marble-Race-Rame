'use strict';

/**
 * Who may get marketing email (Moses, 16 Nov 2026, CRM phase 6; plan: claude/crm-plan.md §3.3). One set of rules,
 * used by every marketing send (onboarding and newsletters); a segment only ever narrows it.
 *
 *   - a saved account with an email address, not deleted or suspended, not an admin;
 *   - 18 or over (age group 18+): never 13–17 (Moses, 16 Nov 2026), never under 13;
 *   - played in the last 12 months (else the permission sleeps until they play again);
 *   - hasn't said no (their latest email_consents row is not a no);
 *   - and either agreed (users.marketing_opt_in, the unticked box), or is a buyer under soft opt-in: a paid purchase,
 *     not fully refunded or withdrawn, made on or after MARKETING_SOFT_OPT_IN_FROM, the day the purchase pages got their
 *     "Don't send me news" box. Unset (today): no soft opt-in at all, as the box is only a draft.
 *
 * Sending is off unless MARKETING_SENDING=on and email is set up; until then everything is counted, nothing sent.
 */
const email = require('../email');

const sendingOn = () => email.enabled() && String(process.env.MARKETING_SENDING || '').toLowerCase() === 'on';
const softOptInFrom = () => {
  const v = process.env.MARKETING_SOFT_OPT_IN_FROM;
  return v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null;
};

const BUYER = (from) => `EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.status = 'paid' AND p.withdrawn_at IS NULL
  AND COALESCE(p.refunded_cents, 0) < COALESCE(p.charged_cents, p.amount_cents)${from ? ` AND p.paid_at >= '${from}'::timestamptz` : ''})`;
const ANY_PURCHASE = `EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.status IN ('paid', 'refunded'))`;

/** The SQL condition (on users u) for "may get marketing email". */
function allowedSql() {
  const from = softOptInFrom();
  return `(u.is_guest = false AND u.deleted_at IS NULL AND u.suspended_at IS NULL AND u.email IS NOT NULL AND u.role <> 'admin'
    AND u.age_group = '18+'
    AND COALESCE(u.last_login_at, u.created_at) > now() - interval '12 months'
    AND COALESCE((SELECT c.consent FROM email_consents c WHERE c.user_id = u.id ORDER BY c.created_at DESC, c.id DESC LIMIT 1), true)
    AND (u.marketing_opt_in${from ? ` OR ${BUYER(from)}` : ''}))`;
}

/**
 * Segments (saved on a newsletter as { buyers, lapsedDays, newDays, country }), each narrowing the rules:
 *   buyers: 'any' | 'coins' | 'pass' | 'pack' | 'none';  lapsedDays: 30 | 60 | 90 (no visit for at least that long);
 *   newDays: 30 (saved in the last 30 days);  country: a two-letter code (first visit's country).
 */
const BUYERS = { any: ANY_PURCHASE, coins: `EXISTS (SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.status = 'paid' AND p.season_key IS NULL AND p.pack_key IS NULL)`, pass: `EXISTS (SELECT 1 FROM season_passes s WHERE s.user_id = u.id AND s.revoked_at IS NULL)`, pack: `EXISTS (SELECT 1 FROM pack_owners o WHERE o.user_id = u.id AND o.revoked_at IS NULL)`, none: `NOT ${ANY_PURCHASE}` };

function segmentSql(segment = {}, params = []) {
  const parts = [];
  if (BUYERS[segment.buyers]) parts.push(BUYERS[segment.buyers]);
  if ([30, 60, 90].includes(Number(segment.lapsedDays))) parts.push(`COALESCE(u.last_login_at, u.created_at) < now() - interval '${Number(segment.lapsedDays)} days'`);
  if (Number(segment.newDays) === 30) parts.push(`u.created_at > now() - interval '30 days'`);
  if (/^[A-Z]{2}$/.test(segment.country ?? '')) {
    params.push(segment.country);
    parts.push(`(SELECT s.country FROM security_events s WHERE s.user_id = u.id AND s.country IS NOT NULL ORDER BY s.created_at, s.id LIMIT 1) = $${params.length}`);
  }
  return parts.length ? parts.join(' AND ') : 'TRUE';
}

/** How many players a segment reaches now (under the rules). */
async function count(db, segment = {}) {
  const params = [];
  const { rows: [r] } = await db.query(`SELECT count(*)::int AS n FROM users u WHERE ${allowedSql()} AND ${segmentSql(segment, params)}`, params);
  return r.n;
}

/** May this one player get marketing email now? */
async function allowed(db, userId) {
  const { rows } = await db.query(`SELECT 1 FROM users u WHERE u.id = $1 AND ${allowedSql()}`, [userId]);
  return rows.length > 0;
}

module.exports = { sendingOn, softOptInFrom, allowedSql, segmentSql, count, allowed, BUYERS, ANY_PURCHASE };
