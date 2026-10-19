-- One-time data update: switch on the Holiday Season 2026's 31 tracks, ahead of time (Moses, 19 Oct).
--
-- Safe to run any day before the season: nothing opens until 1 Dec 2026 00:00 Swedish time
-- (seasons.starts_at), by date, with nothing to deploy then:
--   - every request that puts a marble on a season track is refused before the season starts
--     ("This track opens with the Holiday Season on 1 December": src/seasons trackAccess), also for
--     pass holders, in friend rooms and in Holiday races;
--   - the public random pick never picks a locked season track;
--   - the track list (GET /api/tracks, the picker, the website's pre-rendered pages and its track
--     count) leaves a season's tracks out until the season starts; they appear at 00:00 on 1 Dec.
-- Only the pass page's "All 31 holiday tracks" counts them now.

UPDATE tracks SET is_active = true WHERE season_key = 'holiday-2026' AND NOT is_active;

SELECT count(*) FILTER (WHERE is_active) AS holiday_tracks_on, count(*) AS holiday_tracks
  FROM tracks WHERE season_key = 'holiday-2026';
