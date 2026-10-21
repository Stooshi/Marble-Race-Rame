/**
 * What the website says about racing being free (Moses, 21 Oct 2026): during the Holiday Season
 * (1 Dec 2026 00:00 to 7 Jan 2027 23:59 Swedish time, the season row of data update
 * 2027-02-16-season-pass; keep these in step) the holiday tracks need the pass, so "every race is
 * free" becomes FREE_TO_PLAY. The pre-rendered pages pick it up from the season-start rebuild (runbook).
 */
export const HOLIDAY_STARTS = '2026-12-01T00:00:00+01:00';
export const HOLIDAY_ENDS = '2027-01-07T23:59:59+01:00';
export const FREE_TO_PLAY = 'Free to play — holiday tracks need the Holiday Pass';

/** Whether the holiday tracks are locked to the pass at `now`. */
export function holidayPassNeeded(now = new Date()) {
  const t = new Date(now).getTime();
  return t >= new Date(HOLIDAY_STARTS).getTime() && t < new Date(HOLIDAY_ENDS).getTime();
}
