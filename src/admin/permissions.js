'use strict';

/**
 * Back-office roles (Moses, 16 Nov 2026, CRM phase 2; users.admin_role). Every back-office endpoint names the
 * permission it needs (`need('payments:refund')`), and test/adminPermissions.test.js fails for one that doesn't.
 * The website hides what an admin's role can't do; the server refuses it (403) either way.
 *
 *   owner      everything, including admins and roles, the audit log, exports of email addresses
 *   finance    customers (read), purchases, refunds, billing and its export
 *   support    customers (read, rename, suspend, email consent off, security), the support inbox, names;
 *              no refunds, coins, exports or deletions
 *   marketing  reports, gift codes (read), email templates, onboarding and newsletter drafts (not sending). Never email addresses
 *   read-only  the dashboard and reports
 *
 * An admin with no role (users.admin_role empty) is read-only.
 */
const { forbidden } = require('../utils/httpError');

const ROLES = ['owner', 'finance', 'support', 'marketing', 'read-only'];

const ALL = ROLES;
const PERMISSIONS = {
  'reports:read': ALL, // the dashboard, race readiness, the economy
  'customers:read': ['owner', 'finance', 'support'],
  'customers:security': ['owner', 'support'], // a player's IP addresses (each opening audited)
  'customers:edit': ['owner', 'support'], // rename, suspend, email consent off
  'customers:delete': ['owner'],
  'coins:adjust': ['owner'], // coins and marbles given or taken
  'staff:set': ['owner'],
  'payments:read': ['owner', 'finance', 'support'],
  'payments:refund': ['owner', 'finance'],
  'billing:read': ['owner', 'finance'],
  'billing:export': ['owner', 'finance'],
  'support:read': ['owner', 'support'],
  'support:answer': ['owner', 'support'],
  'names:moderate': ['owner', 'support'],
  'gift-codes:read': ['owner', 'marketing'],
  'gift-codes:make': ['owner'],
  'emails:read': ['owner'], // the email list (addresses) and its export
  'emails:templates': ['owner', 'marketing'],
  'marketing:read': ['owner', 'marketing'], // onboarding and newsletters: drafts, previews, counts (CRM phase 6)
  'marketing:send': ['owner'], // start a newsletter's sending (and only while MARKETING_SENDING=on)
 // edit, publish and test-send the email templates (CRM phase 5)
  'audit:read': ['owner'],
  'admins:manage': ['owner'],
};

const roleOf = (admin) => (ROLES.includes(admin?.admin_role) ? admin.admin_role : 'read-only');

function can(admin, permission) {
  const roles = PERMISSIONS[permission];
  if (!roles) throw new Error(`Unknown back-office permission ${permission}`);
  return roles.includes(roleOf(admin));
}

/** The permissions an admin has (for the website, to hide what they can't do). */
const permissionsOf = (admin) => Object.keys(PERMISSIONS).filter((p) => can(admin, p));

/** Middleware: the request's admin must have `permission`. */
function need(permission) {
  if (!PERMISSIONS[permission]) throw new Error(`Unknown back-office permission ${permission}`);
  const check = (req, _res, next) => {
    if (!can(req.admin, permission)) throw forbidden(`Your back-office role (${roleOf(req.admin)}) can't do this`);
    next();
  };
  check.permission = permission;
  return check;
}

module.exports = { ROLES, PERMISSIONS, roleOf, can, permissionsOf, need };
