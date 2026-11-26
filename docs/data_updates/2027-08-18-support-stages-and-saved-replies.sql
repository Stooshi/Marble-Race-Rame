-- One-time data update: support's four stages and the first saved replies (Moses, 16 Nov 2026, CRM phase 4).
--
-- Every message gets its stage from its status: new → new, open → open, done → closed (the history stays in the
-- audit log). Then four saved replies to start from, drafted from the Help Centre's answers; admins edit them in
-- the back office. Safe to run again: only messages without a stage change, and each reply is added once.

UPDATE support_messages
   SET stage = CASE status WHEN 'done' THEN 'closed' ELSE status END,
       stage_at = COALESCE(status_at, created_at)
 WHERE stage IS NULL;

INSERT INTO support_saved_replies (title, body)
SELECT v.title, v.body FROM (VALUES
  ('Coins missing after a purchase', E'Hi {{name}},\n\nThanks for writing. I''ve checked your order {{order_no}}: the payment went through and the coins are on your account now. Close the game and open it again if you don''t see them yet.\n\nHappy racing!'),
  ('Refund request', E'Hi {{name}},\n\nThanks for your message about order {{order_no}}. I''ve refunded it: the money goes back the same way you paid, usually within 5 to 10 working days, and you''ll get a credit note by email.'),
  ('Change of name', E'Hi {{name}},\n\nI''ve changed the name for you. It shows in your next race and on the scoreboards.'),
  ('Delete my account', E'Hi {{name}},\n\nYou can delete your account yourself under Settings → Delete my account. Everything is removed then, and it can''t be undone. If you''d like me to do it for you, just reply to this email and say so.')
) AS v(title, body)
WHERE NOT EXISTS (SELECT 1 FROM support_saved_replies s WHERE s.title = v.title);

SELECT stage, count(*) FROM support_messages GROUP BY stage;
