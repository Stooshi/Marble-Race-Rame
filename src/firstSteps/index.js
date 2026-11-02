'use strict';

/**
 * A new player's first steps (Moses, 2 Nov 2026), for the back office Dashboard's funnel:
 * 'tap' when the guest is made (they tapped Play, Quick race, Race solo or joined a room;
 * guests are no longer made when a page or room link is only opened) and 'go' when they
 * first saw GO. Each is kept once per player (the first time). Joining a race and finishing
 * one come from race_entries. Recording never gets in the way: a failure is only logged.
 */
const db = require('../db');

const STEPS = ['tap', 'go'];
const SOURCES = ['quick', 'solo', 'friends', 'room'];

async function record(userId, step, source = null, client = db) {
  if (!STEPS.includes(step)) throw new Error(`Unknown first step ${step}`);
  try {
    await client.query(
      'INSERT INTO first_steps (user_id, step, source) VALUES ($1, $2, $3) ON CONFLICT (user_id, step) DO NOTHING',
      [userId, step, SOURCES.includes(source) ? source : null],
    );
  } catch (err) {
    console.error(`[first-steps] could not record ${step}: ${err.message}`);
  }
}

module.exports = { STEPS, SOURCES, record };
