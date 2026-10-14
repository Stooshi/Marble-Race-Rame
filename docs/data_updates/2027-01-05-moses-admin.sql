-- One-time data update: Moses's account (moses_25) is the back office's first admin.
-- (Admin rights alone don't open the back office: it also needs the 2-step login,
-- set up the first time with an authenticator app.) Changes nothing if the account
-- isn't there.
UPDATE users SET role = 'admin' WHERE username = 'moses_25' AND role <> 'admin';
