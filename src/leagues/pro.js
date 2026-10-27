'use strict';

/**
 * The LEAGUES_PRO switch (Leagues part 2: Pro Leagues and credits): 'off' (the default), 'admins' or
 * 'on', like LEAGUES and never more open than it: with LEAGUES off nobody sees Pro; with LEAGUES
 * 'admins', LEAGUES_PRO 'on' still means admins only. Off: no Pro option, no credits anywhere (the API
 * answers 404), only the "Pro Leagues are coming" line.
 */
const leagues = require('./index');

const MODES = ['off', 'admins', 'on'];

function mode(env = process.env) {
  const m = String(env.LEAGUES_PRO ?? 'off').trim().toLowerCase();
  return MODES.includes(m) ? m : 'off';
}

/** Whether Pro Leagues and credits are open to this player: both switches must let them in. */
function openFor(user, env = process.env) {
  if (!leagues.openFor(user, env)) return false;
  const m = mode(env);
  if (m === 'on') return true;
  return m === 'admins' && user?.role === 'admin';
}

module.exports = { mode, openFor };
