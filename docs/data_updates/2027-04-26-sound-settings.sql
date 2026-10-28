-- No volume controls (Moses, 28 Oct 2026): players use the device's own volume. The sound settings
-- saved with accounts keep only "muted" and "music" (Settings → Game music, on or off): the old slider
-- numbers are dropped, music on unless it was at 0.
UPDATE users
   SET settings = jsonb_set(
         settings, '{sound}',
         ((settings->'sound') - 'effects' - 'music')
         || jsonb_build_object('music', CASE
              WHEN jsonb_typeof(settings->'sound'->'music') = 'number' THEN (settings->'sound'->>'music')::numeric > 0
              WHEN jsonb_typeof(settings->'sound'->'music') = 'boolean' THEN (settings->'sound'->>'music')::boolean
              ELSE true END))
 WHERE jsonb_typeof(settings->'sound') = 'object';
