'use strict';

/**
 * Lighting and weather presets (track kit, step 6). Drawing only: the race
 * engine never reads them, so rain or snow never slows a marble and a variant
 * races exactly like its track.
 *
 * A track file names its own preset (`lighting`) and the extra variants it
 * allows (`variants`); anything it doesn't list is ruled out for it (Paris: no
 * night). Each race picks one from its seed when it is decided, and the pick is
 * stored with the race (in its track snapshot), so the replay looks the same.
 * Variants share the track's records: same track, same physics.
 */
const LIGHTINGS = ['day', 'sunset', 'midnight-sun', 'night-northern-lights', 'fog', 'snow', 'rain', 'night'];

// The track's own preset comes up this many times as often as each variant.
const OWN_WEIGHT = 2;

/** The presets a kit track may race in: its own first, then its variants. */
function allowedLightings(kit) {
  if (!kit) return [];
  const own = kit.lighting || 'day';
  return [own, ...(kit.variants || []).filter((v) => v !== own)];
}

/** This race's preset, from its seed: the same seed always gives the same one. */
function chooseLighting(kit, seed) {
  const allowed = allowedLightings(kit);
  if (allowed.length <= 1) return allowed[0] ?? null;
  const tickets = [...Array(OWN_WEIGHT).fill(allowed[0]), ...allowed.slice(1)];
  // A small fixed hash of the seed (not the race's random stream, which stays untouched).
  let h = (Number(seed) >>> 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = (h ^ (h >>> 16)) >>> 0;
  return tickets[h % tickets.length];
}

/** The track's physics with this race's preset written in (for the race's snapshot). */
function withLighting(physics, seed) {
  if (!physics?.kit) return physics;
  const lighting = chooseLighting(physics.kit, seed);
  return { ...physics, kit: { ...physics.kit, lighting } };
}

module.exports = { LIGHTINGS, OWN_WEIGHT, allowedLightings, chooseLighting, withLighting };
