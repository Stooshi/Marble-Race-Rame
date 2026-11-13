/**
 * How many tracks the site says it has, in words that don't go stale: the live track count rounded
 * down to ten, "80+" (87 live tracks → "80+ tracks"). The build fetches the live count once
 * (vite.config.js → VITE_TRACK_COUNT) for the meta descriptions, the share previews, the
 * pre-rendered pages and the Help answers; without it (no server at build time, tests) "dozens of".
 */

/** "80+" for 87, "50+" for 50, the number itself under 10; null without a count. */
export function roundedTracks(n) {
  const count = Number(n);
  if (!Number.isFinite(count) || count <= 0) return null;
  if (count < 10) return String(Math.floor(count));
  return `${Math.floor(count / 10) * 10}+`;
}

/** The live track count at build time (null when the build couldn't reach the server). */
export const BUILD_TRACK_COUNT = (() => {
  const n = Number(import.meta.env?.VITE_TRACK_COUNT);
  return Number.isFinite(n) && n > 0 ? n : null;
})();

/** The live tracks' series at build time ("Grand Prix", "World Tour", …); [] when the build couldn't reach the server. */
export const BUILD_TRACK_SERIES = String(import.meta.env?.VITE_TRACK_SERIES || '').split('|').filter(Boolean);

/** "80+ tracks" (or "dozens of tracks"), from a live count when given, else the build's. */
export function tracksPhrase(n = BUILD_TRACK_COUNT) {
  const r = roundedTracks(n);
  return r ? `${r} tracks` : 'dozens of tracks';
}

/**
 * The landing page draft v2's words for the track count (Moses, 13 Nov 2026): "hundreds of tracks" from 200 live
 * tracks; below that the live count rounded down to the nearest 50 ("over 150 tracks" for 151 to 200, "over 100"
 * for 101 to 150; never "over 150" at exactly 150), and under 51 the rounded count ("40+ tracks"); "dozens of
 * tracks" without a count. The heading adds tracksOnTheWay().
 */
export function tracksWords(n = BUILD_TRACK_COUNT) {
  const count = Number(n);
  if (!Number.isFinite(count) || count <= 0) return 'dozens of tracks';
  if (count >= 200) return 'hundreds of tracks';
  const fifty = Math.floor((count - 1) / 50) * 50;
  if (fifty >= 50) return `over ${fifty} tracks`;
  return tracksPhrase(count);
}

/** The landing heading: "Over 150 tracks, with hundreds on the way" under 200, "Hundreds of tracks" from 200. */
export function tracksHeading(n = BUILD_TRACK_COUNT) {
  const words = tracksWords(n);
  const head = words.charAt(0).toUpperCase() + words.slice(1);
  const count = Number(n);
  return Number.isFinite(count) && count > 0 && count < 200 ? `${head}, with hundreds on the way` : head;
}
