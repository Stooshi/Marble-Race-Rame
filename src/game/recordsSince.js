'use strict';

/**
 * Records start again when a track gets a new layout (Moses, 6 Nov 2026).
 *
 * A track keeps its slug when its layout changes; the data update that puts the new layout in also
 * sets `tracks.records_since` to that moment. From then on only races finished at or after it count
 * for that track's records: the track record, the country records, and each player's personal bests
 * on it (finish time, halfway split, best place). Past results and replays stay as they are: races
 * and race_entries are never touched, and old races still replay on their own stored copy of the
 * track (races.track_snapshot).
 *
 * `records_since` is null for a track whose layout never changed: every finished race counts.
 *
 *   counts(race, track) → an SQL condition, true when race (alias) counts for track (alias)'s records.
 */
const counts = (race = 'r', track = 't') => `(${track}.records_since IS NULL OR ${race}.finished_at >= ${track}.records_since)`;

module.exports = { counts };
