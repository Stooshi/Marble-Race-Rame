'use strict';

/** Every status a race can be in, in lifecycle order. Must match the race_status type in the schema. */
const RACE_STATUSES = Object.freeze(['lobby', 'countdown', 'running', 'finished', 'cancelled']);

module.exports = { RACE_STATUSES };
