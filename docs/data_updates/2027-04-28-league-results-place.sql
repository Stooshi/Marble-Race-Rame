-- Leagues part 2 (28 Oct 2026; behind LEAGUES_PRO): a Pro League's end writes one league_results row per
-- member, also for members who didn't finish every track: they have no place (null). No rows change
-- (nothing has written league_results yet).
ALTER TABLE league_results ALTER COLUMN place DROP NOT NULL;
