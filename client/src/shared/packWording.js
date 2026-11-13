/**
 * What the site says about free tracks and track packs (Moses, 13 Nov 2026: 15 free tracks, the rest in track
 * packs; src/packs/list.js FREE, data update 2027-06-23-free-set-of-15). PACKS_LIVE is false while the TRACK_PACKS
 * switch is off on the server: then every track is open, and the live Help answer and landing page keep saying
 * so. Set it to true in the same commit as switching TRACK_PACKS on for everyone (docs/05-runbook.md, "Track
 * packs"), so the texts never say a track is locked when it isn't, or free when it isn't. The landing page draft
 * v2 (/preview/landing-v2) always shows the packs wording: it is the page for when packs go live.
 */
export const PACKS_LIVE = false;

/** The number of tracks free for everyone, always (src/packs/list.js FREE). */
export const FREE_TRACKS = 15;

/** "15 tracks are free for everyone, always; the others come in track packs, one per series." */
export const FREE_AND_PACKS = `${FREE_TRACKS} tracks are free for everyone, always; the others come in track packs, one per series`;
