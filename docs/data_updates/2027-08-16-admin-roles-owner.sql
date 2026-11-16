-- One-time data update: every back-office admin until now becomes an owner (Moses, 16 Nov 2026, CRM
-- phase 2: roles). Owners can then give other admins narrower roles (Settings → Admins). Admins added
-- later get the role chosen when they are added.
UPDATE users SET admin_role = 'owner' WHERE role = 'admin' AND admin_role IS NULL;
