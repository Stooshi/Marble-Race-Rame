# 5. Operations runbook

*Last updated 30 Oct 2026.* How to deploy, change data, roll back, back up, and fix the usual problems. Items marked **[check]** should be confirmed the first time they are done.

## Deploying

### The website (Vercel): automatic
Every push to `Main` that changes the website builds `client/` on Vercel and puts it live at marblespins.com within a few minutes. There is nothing to do by hand. Only `leagues-pro` also gets preview builds (below).
- **Settings:** Vercel → project `marble-race-rame-client` → Settings → Environment Variables (`VITE_API_URL`).
- After changing a variable, **redeploy** the latest build, because variables are built into the website.

**Which commits build the website (Ignored Build Step, 28 Oct 2026; `client/scripts/vercel-ignore.mjs`, `ignoreCommand` in `client/vercel.json`):** only branches `Main` (the live site) and `leagues-pro` (Leagues part 2 previews) build; other branches make no preview deployments. A commit that changes nothing the website is built from (docs, server code `src/`, server tests, data updates, `client/test/`, `client/report/`, the Android and iPhone projects, Markdown) is skipped: the build log shows `[ignored build step] SKIP: …` and the deployment shows as ignored. Always built: the same commit again (**Redeploy**, or a Deploy Hook), and anything in the forced window around the season-start rebuild (1 Dec 2026, 22:30–03:00 UTC). When it can't tell, it builds. A track switched on by SQL needs a website build for its page and the count: press **Redeploy** on the latest production deployment.

**Old deployments:** Vercel's Deployment Retention Policy, set at team level for every project (the live deployment is never removed). One website build is about 26 MB (28 Oct 2026; static files about 23 MB: track pictures 8 MB, music 7 MB in two formats, share pictures 4 MB, code 3.4 MB, hub pictures 1.8 MB; pre-rendered pages about 2 MB). It was about 35 MB until each Help question's own page held the whole Help Centre (9.7 MB for the 94 pages; now 1.1 MB). Retention (set by Moses at team level, 28 Oct 2026): canceled and errored deployments 1 week, previews 30 days, production 60 days.

### The game server (Railway): by hand
Pushing to `Main` does **not** deploy the server. Moses deploys it by uploading the code from his computer with the Railway command-line tool.

**First time only:**
1. Install Node.js (nodejs.org, LTS).
2. Install the Railway tool: `npm i -g @railway/cli`.
3. Log in: `railway login`.

**After Railway invalidates its tokens (the October 2026 security incident) or when `railway` says you're not logged in:**
1. `railway logout`, then `railway login` (it opens the browser; sign in to the Railway account that owns the project). On a computer without a browser: `railway login --browserless` and follow the link it prints.
2. `railway whoami` shows your account; `railway status` (in the project folder) shows the project and service it's linked to. If it says "No linked project", run `railway link` again (step 3 below).
3. If you use a Railway API token anywhere else (for example a GitHub Actions secret or a script), make a new one in the Railway dashboard (Account → Tokens) and replace the old one: invalidated tokens don't come back. Never paste a token in chat or docs.
4. Also check Railway's own instructions for the incident (status.railway.com, their email): if they ask for anything else (rotating the database password, new variables), do that first, then copy the new `DATABASE_PUBLIC_URL` to your password manager ([below](#when-the-railway-dashboard-is-down)).

**Every deploy:**
0. Check you're logged in: `railway whoami`. If not, log in as above.
1. On GitHub, open `Stooshi/Marble-Race-Rame` and check that the branch is **Main**. Choose **Code → Download ZIP**, then unzip it.
   - Run it in the **whole unzipped folder** (the top folder): the server reads data files from `client/src/shared/`; `.railwayignore` picks what is uploaded.
2. Open a terminal in the unzipped folder.
3. The first time in a new folder, run `railway link` and choose the project and the server service.
4. **If the deploy contains data updates** (new files in `docs/data_updates/`), take a [backup](#backups) first.
5. Run `railway up`. This uploads the folder; Railway installs and starts it with `npm start`.
   - **What goes up** (`.railwayignore`, 27 Oct 2026, after uploads of the whole 88 MB folder kept failing): only what the server reads, about 7 MB (about 1.6 MB packed): `package.json`, `package-lock.json`, `src/`, `scripts/`, `docs/database_schema.sql`, `docs/data_updates/` and `client/src/shared/`. The website, the apps, pictures, music, store material, tests and the other docs stay behind. **If the server starts reading a new file outside these, check `.railwayignore` doesn't leave it out.**
6. Watch the logs, either in the Railway dashboard → service → Deployments → View logs, or with `railway logs`. Look for:
   - `[db-setup] Applying docs/database_schema.sql` … `OK`
   - `[db-setup] Data update <name>: applied …` for each new data update
   - `[db-setup] Columns: all N expected columns present`
   - `Marble Race backend listening on :PORT`
7. **Check it's the right code:**
   - Open `https://marble-race-rame-production.up.railway.app/health` and note `version.codeFingerprint`.
   - In the same folder, run `node -e "console.log(require('./src/version').VERSION.codeFingerprint)"`.
   - The two must match.

**What happens at start:**
1. The database is checked.
2. The schema is applied (additions only).
3. New data updates run once each.
4. Unfinished races are recovered.
5. The race scheduler starts, and the IP trimming runs (then daily).
6. The background jobs start: guest retention, push (dry runs until `PUSH_SENDING=on`), purchase emails, Google Play (hourly and every 6 hours), the season jobs, the leagues (every 30 s: leagues that have ended, League Nights about to start) and the replays over 30 days old (daily, dry runs until `REPLAY_TRIM=on`) (`src/server.js`).

**Restart without a new deploy:** Railway dashboard → service → ⋮ → Restart. Races in progress resume or finish correctly after a restart.

**Changing variables: never with the dashboard's Deploy button.** Deploying staged variable changes in the dashboard does not restart our last `railway up`: Railway **rebuilds the service from the GitHub branch still linked to it**, `claude/kind-franklin-mj16u8`, frozen at 2 Oct 2026 (seen twice: 23 Oct and 27 Oct 2026). That build has no `version` on `/health` (`{"status":"ok","db":"ok","uptime":…}` only) and none of the routes added since, including saving a guest's marble (`POST /api/auth/claim`: "Route … not found") and starting as a guest, on the website and in the apps alike. Railway users report the same: a variable change redeploys the last linked commit, not the last CLI deployment ([Railway Help Station](https://station.railway.com/questions/deploy-after-variable-update-skips-cli-d-53228681)).

1. **Once (stops it for good; done 27 Oct 2026):** Railway → the server service → **Settings → Source → Disconnect** the GitHub repository. Our deploys come only from `railway up`, so nothing else changes. (The old branch can then be deleted on GitHub; ask first, it is the only copy of the 2 Oct code.)
2. **Every variable change, from the unzipped folder of the build that is live** (a fresh ZIP of Main if unsure):
   ```
   railway variables --set "LEAGUES=admins" --skip-deploys
   railway up
   ```
   `--skip-deploys` sets the variable without Railway redeploying anything; `railway up` then starts our code with it. Several variables: one `--set "NAME=value"` each, in the same command.
3. **Then check `/health` as in step 7:** `version.codeFingerprint` must be there and match. **No `version` block at all means the old 2 Oct build:** run `railway up` again from the folder at once.
4. A variable changed in the dashboard by mistake: don't press Deploy; discard the staged change and do it as in step 2. Pressed Deploy anyway: check `/health` and, without `version`, run `railway up` from the folder.

**[check] Deploying from GitHub:** switched off on purpose, and the repository should not even be linked to the service (above: a linked branch is what Railway rebuilds on a variable change). If it's ever switched on, the "Deploying" section of the root README becomes true again.

## Data updates

`docs/database_schema.sql` can only **add** things: tables, columns and indexes. Any change to **existing rows** goes in a one-time file in `docs/data_updates/`. Examples: switching a track on, fixing a value, granting admin.

**How to write one:**
1. Create `docs/data_updates/<name>.sql`. Files run in **name order**, and names are only an ordering key (many are dated in the future). Pick a name that sorts **after the last existing file**; today (31 Oct 2026) that is `2027-05-14-add-abisko-aurora-run.sql` (Peaks 6–15 and the Chobe `2027-04-27` to `2027-05-07`, Track and Field start shots `2027-05-08`, Dubai and Redwood TV cameras `2027-05-09`, Blocks Series 2's test five `2027-05-10` to `2027-05-14`), so the next one would be, for example, `2027-05-15-<what>.sql`. (The Leagues part 2 updates on branch `leagues-pro` must be renamed to sort after the last file on Main before they are merged.)
2. Start with a comment saying what the file changes and why, and how it was generated if a script made it.
3. Write it so that running it on a database where the change is already done changes nothing. For example, `UPDATE … WHERE role <> 'admin'`.
4. Optionally, end with a `SELECT` returning one row. That row is saved as the file's summary in the `data_updates` table.
5. **Coins:** never write to `users.coins` directly. Insert matching `coin_ledger` lines with `balance_after` and keep the totals right. See `2027-01-03-coins-only.sql` for an example.
6. Test it locally on a copy of the database: `DATABASE_URL=… npm run db:migrate`.
7. Commit, push, and deploy the server.

**The rules:**
- **Never edit a file that has already run.** Write a new one that corrects it.
- A file that **failed** has not been recorded, so it can be fixed and redeployed.
- All files and the schema run in **one transaction**. If anything fails, everything rolls back, the error is logged, and the server keeps running on the database as it was. It refuses to start only if core tables are missing.

**Tracks:** new tracks are added **switched off** with SQL generated by `node scripts/physics-track-sql.js <slug> --add-hidden "<note>"`, and switched on later with a data update setting `is_active = true`. Tests check that the committed SQL matches the generator.

## Rolling back

- **Website:** Vercel → Deployments → pick the last good one → ⋮ → **Promote to Production** (or "Instant Rollback").
- **Server:** Railway → service → Deployments → pick the last good one → ⋮ → **Redeploy**. Or download the ZIP of the older commit from GitHub and run `railway up`.
- **Database:**
  - The schema is additive, so older server code runs fine on a newer database: extra columns are ignored.
  - **Data updates can't be undone automatically.** To reverse one, write a new data update that changes the rows back, or restore a [backup](#backups) (this loses everything since the backup).
  - Don't delete rows from the `data_updates` table; that makes a file run again.
- **Race results are never rolled back.** If a code change would alter past races, the race-fingerprint tests fail before it ships.

## Guest accounts: the deletion job (from the deploy of 21 Oct 2026)

Guests not seen for 90 days are anonymised once a day (`src/account/retention.js`). It starts as a **dry run**: each day the Railway logs show
`[retention] DRY RUN (GUEST_RETENTION_MODE is not "delete"): would anonymise N guest accounts … Nothing was changed.`
- **Last visit:** the latest of the account's last seen (set to the deploy time for every account that existed then), its creation, its last login and its last race. So nobody can be due before 90 days after the deploy, and the dry run should say 0 for now.
- **Switching it on:** after reading the log (Moses: after 7 days), set `GUEST_RETENTION_MODE=delete` in Railway → Variables and restart the server. The next run logs `[retention] anonymised N guest accounts …`. Remove the variable to go back to the dry run.
- Each anonymised guest is in the audit log (`account-deleted`, "Guest account: 90 days without a visit").

## Backups

**[check]** Whether Railway takes automatic backups of the Postgres database on the current plan. Look in Railway → the Postgres service → **Backups**. Until that is confirmed, take manual backups:

```bash
# The connection string is in Railway → Postgres service → Variables → DATABASE_PUBLIC_URL (never paste it anywhere public)
pg_dump "<DATABASE_PUBLIC_URL>" -Fc -f marble-spins-$(date +%F).dump        # back up
pg_restore --clean --if-exists --no-owner -d "<DATABASE_URL>" marble-spins-YYYY-MM-DD.dump   # restore (replaces data!)
```

- **When:** before every deploy with data updates, before switching Stripe to live, and weekly.
- **Where:** keep backups off the laptop too, encrypted. They contain personal data.
- **Retention:** payment records must be kept 7 years (Swedish bookkeeping law). The Stripe dashboard also keeps its own records.

### When the Railway dashboard is down

A Railway outage can take down the dashboard, the API and the CLI while the database itself keeps running. The connection string is then out of reach in Railway, so **keep a copy of `DATABASE_PUBLIC_URL` in your password manager** (Railway → the Postgres service → Variables → `DATABASE_PUBLIC_URL`; copy it again whenever Railway changes it, for example after a password reset of the database).

With it, a backup needs only your own computer:

1. **Install the Postgres tools** once, the same major version as the database or newer (`pg_dump --version`). On a Mac: `brew install postgresql@16`. On Windows: the "Command Line Tools" from the PostgreSQL installer.
2. **Put the URL in a variable** without leaving it in the shell's history. Mac/Linux: type `read -rs DB` and paste the URL from the password manager, then press Enter (nothing shows).
3. **Back up:**
   ```bash
   pg_dump "$DB" -Fc -f marble-spins-$(date +%F).dump
   ```
   If it says SSL is required, add `?sslmode=require` to the end of the URL.
4. **Check the file:** `pg_restore -l marble-spins-YYYY-MM-DD.dump | head` lists the tables. A file of a few kB means it failed.
5. **Store it** encrypted, off the laptop, like any backup (it holds personal data). Then `unset DB`.

If `pg_dump` cannot connect at all (a timeout or "connection refused"), the database itself is down too: wait for Railway's status page (status.railway.com) to show it back. Don't restore anything or change variables during an outage.

## The server's own address: api.marblespins.com (prepared 22 Oct 2026, not switched yet)

**Why:** today the website, the apps and the payment providers all call `https://marble-race-rame-production.up.railway.app`, which only Railway controls. With **api.marblespins.com** as the address, a move to another host is just a DNS change ([below](#moving-to-another-host)), and nothing in the apps or the stores has to change. The Railway address keeps working as the **fallback**. **Do this before the store submissions**, so the apps in the stores are built against api.marblespins.com.

Nothing is live until step 4. Steps 1 and 2 need the Railway dashboard.

### 1. Railway: add the custom domain
1. railway.com → log in → the project → click the **server** service (not Postgres).
2. **Settings** tab → **Networking** → **Public Networking** → **+ Custom Domain**.
3. Type `api.marblespins.com`. For the **port**, pick the one the existing `marble-race-rame-production.up.railway.app` domain uses (shown next to it, the port the server listens on). → **Add Domain**.
4. Railway now shows **two records** to add at the DNS provider: a **CNAME** (name `api`, value like `xxxxxx.up.railway.app`) and a **TXT** for proof of ownership. Both are needed: with only the CNAME the domain is never verified and answers 404. Copy both **exactly** and keep the page open.
5. **Leave the `…up.railway.app` domain as it is.** It is the fallback, and the apps already installed use it. (The Hobby plan allows two custom domains per service.)

### 2. Simply.com: the DNS records
1. simply.com → log in → your account → **marblespins.com** → **DNS**.
2. First take a screenshot of the records as they are. Don't touch the ones for `marblespins.com` and `www` (Vercel) or the email ones (MX, SPF, DKIM, DMARC: Brevo and the mailbox).
3. Check that no record is already named `api` (an A or AAAA record there would clash with the CNAME). If one is, ask before deleting it.
4. **New record** → type **CNAME** → **Name** `api` (Simply adds `.marblespins.com` itself; if the form clearly wants the full name, type `api.marblespins.com`) → **Value** the target Railway showed in step 1.4, exactly → TTL 300 if it can be chosen, otherwise leave it → **Save**.
5. **New record** → type **TXT** → **Name** the name Railway shows, without `.marblespins.com` at the end → **Value** Railway's text exactly → **Save**.
6. Wait. Usually minutes; Railway says up to 72 hours at worst. Railway shows a **green check** next to the domain once verified, and issues the certificate (Let's Encrypt, renewed by itself), usually within an hour.
7. From your computer: `nslookup -type=CNAME api.marblespins.com` shows the Railway target.

### 3. Check it before switching anything
From a checkout of the code (any computer with Node):
```bash
node scripts/check-api-address.js
```
It checks api.marblespins.com against the Railway address and changes nothing: the name and the certificate; `/health` and that it is the same server code; the track list; the website's and the apps' calls allowed (CORS from marblespins.com, www, `capacitor://localhost`, `https://localhost`); the live connection (socket.io); and the Stripe, Google Play and App Store notification addresses (each must refuse an empty unsigned call: 400, 403, 400). **Switch only when all 13 pass.**

### 4. Switch, in this order
1. **Railway** → server → Variables → `PUBLIC_API_URL` = `https://api.marblespins.com` (the address in the emails' one-click unsubscribe header) → the service redeploys.
2. **Vercel** → project `marble-race-rame-client` → Settings → Environment Variables → `VITE_API_URL` → Edit → `https://api.marblespins.com` for Production (and Preview) → Save → Deployments → the latest Production deployment → ⋯ → **Redeploy**. The address is built into the website, so it only changes with a new build. Check marblespins.com: play a race, and in the browser's developer tools (Network) the calls go to api.marblespins.com.
3. **Stripe** (test mode now) → Developers → Webhooks → our endpoint → ⋯ → **Update details** → Endpoint URL `https://api.marblespins.com/api/payments/stripe/webhook` → Update. **Editing keeps the signing secret**, so `STRIPE_WEBHOOK_SECRET` stays as it is. → *Send test webhook* → 200. When going live later, create the live endpoint with the api address from the start ([Stripe](#switching-to-live-only-when-moses-says-so)).
4. **Google Play notifications** (once set up, [Google Play Billing](#google-play-billing-coins-in-the-android-app) step 8): Google Cloud console → Pub/Sub → Subscriptions → `play-rtdn-push` → **Edit** → endpoint `https://api.marblespins.com/api/payments/google/rtdn?token=` + the same token → Update. Play Console → Monetization setup → **Send test notification** → Railway's log shows `[google-play] test notification received`. Not set up yet: use the api address from the start.
5. **App Store notifications** (once set up, [App Store purchases](#app-store-purchases-the-iphone-app) step 4): App Store Connect → the app → App Information → App Store Server Notifications → Production URL and Sandbox URL `https://api.marblespins.com/api/payments/apple/notifications` → Save → *Request a test notification* → the log shows `[app-store] notification: test`.
6. **The apps:** in `client/app-api.json` set `"api"` to `"https://api.marblespins.com"` (Claude does this with the docs, step 7). From then on `npm run app:sync`, `npm run android:release` and `npm run ios:release` build against it; they refuse to build if its `/health` doesn't answer. App builds already installed keep calling the Railway address, which is why it stays.
7. **Docs:** the Railway address is replaced by api.marblespins.com in `docs/01-architecture.md`, this runbook and `client/README.md` (the Railway address kept as the fallback), in the same commit as step 6.
8. **CORS:** nothing to change. CORS is about who calls the server (marblespins.com, www, the apps), not the server's own address. The check in step 3 shows it.

**Back to the Railway address** (if api.marblespins.com ever fails): Vercel `VITE_API_URL` back plus Redeploy; Stripe, Google and Apple URLs back (the same secrets); `client/app-api.json` `"api"` back to the `"fallback"` before the next app build. Apps built against api.marblespins.com need the DNS fixed, which is why the check in step 3 must pass before any store build.

## Moving to another host

Once the website, the apps, Stripe, Google and Apple all call api.marblespins.com, moving the server is a new host and one DNS change. Nothing in the apps or the stores changes.

1. **A day before:** Simply.com → DNS → the `api` record → TTL 300 (5 minutes), so the switch spreads fast. On the new host, make a Node service (Node 20 or later) with a PostgreSQL database (version 15 or later). It runs `npm start` from the repository's root (the same folder as a Railway deploy), must listen on the `PORT` it is given and must allow WebSockets.
2. **Variables:** copy every variable from Railway → server → Variables (the **Raw Editor** shows them all at once) into the new service, through the password manager, never chat, email or Git. The names are listed in [01-architecture.md, Variables](01-architecture.md#variables-names-only). Change `DATABASE_URL` (and `DATABASE_SSL` if the new database requires TLS) to the new database. Leave out `RAILWAY_*`. `PUBLIC_API_URL` stays `https://api.marblespins.com`.
3. **Rehearse** with a copy: take a [backup](#backups), restore it into the new database (`pg_restore --no-owner -d "<new DATABASE_URL>" marble-spins-YYYY-MM-DD.dump`), deploy the code and open the new host's own address `/health` (status ok, the same `codeFingerprint` as `node -e "console.log(require('./src/version').VERSION.codeFingerprint)"`). Then empty the new database again (drop and recreate it) for the real move.
4. **The move**, at a quiet hour (races stop for about 15 minutes):
   1. Stop the Railway server so nothing more is written: Railway → server → Deployments → the active one → ⋯ → **Remove**. The website shows "Can't reach the race track" until step 5.
   2. Take the final backup with `pg_dump` ([Backups](#backups)) and check it (`pg_restore -l … | head`).
   3. Restore it into the new, empty database: `pg_restore --no-owner -d "<new DATABASE_URL>" marble-spins-YYYY-MM-DD.dump`.
   4. Start the new server. At start it adds anything missing from the schema, skips data updates already applied and finishes or resumes races that were running (`recover()`). Check its own address `/health`.
   5. Add `api.marblespins.com` as a custom domain on the new host. At Simply.com change the `api` record's value to the target the new host gives (a CNAME, or an A record if it gives an IP address), plus any verification TXT it asks for.
   6. After a few minutes: `node scripts/check-api-address.js https://api.marblespins.com --against https://<the new host's own address>` → all pass. Play a race on the website and in an app.
5. **Nothing else changes:** Vercel, the apps, Stripe, Google Play and the App Store all keep calling api.marblespins.com.
6. **Keep** the stopped Railway service and its database for a week before deleting them, and keep the final backup ([Retention](#backups)). The Railway fallback address stops working once the Railway server is gone: put Vercel's `VITE_API_URL` on api.marblespins.com before the move if it isn't already.

## Back office: admins and the 2-step login

- **Back office address:** https://marblespins.com/admin.
- **Logging in:**
  1. Enter the player name and password of an admin account.
  2. Enter the 6-digit code from the authenticator app. The first time, a QR code is shown to set the app up.
- **Sessions** end after 30 minutes without use, or when the tab is closed.
- **Making someone an admin:** add a data update like `2027-01-05-moses-admin.sql` (`UPDATE users SET role = 'admin' WHERE username = '…'`).
- **Removing an admin:** add a data update setting `role = 'player'`. Their sessions stop working at once.
- **Reset the 2-step login** (lost phone or new authenticator app):
  1. Delete the admin's secret. Either run this in Railway → Postgres → Data → Query, or add it as a data update:
     ```sql
     DELETE FROM admin_2fa WHERE user_id = (SELECT id FROM users WHERE username = 'moses_25');
     ```
  2. The next back-office login shows a new QR code to set up again.
- **"Too many wrong codes"** (5 wrong codes): wait 15 minutes. The counter is kept in the server's memory, so restarting the server also clears it.
- **Changing `ADMIN_2FA_KEY`** (or `JWT_SECRET` while `ADMIN_2FA_KEY` isn't set) makes the stored secrets unreadable. Afterwards, run `DELETE FROM admin_2fa;` and every admin sets up the 2-step login again. Changing `JWT_SECRET` also logs every player out.
- **The audit log** (back office → Audit log) shows every admin action with its reason. It is never edited.

## Stripe

### Test mode (now)
- **Railway:**
  - `STRIPE_SECRET_KEY` = `sk_test_…`
  - `STRIPE_WEBHOOK_SECRET` = the test endpoint's `whsec_…`
  - `PUBLIC_SITE_URL` (optional)
- **Stripe dashboard (test mode) → Developers → Webhooks:**
  - The endpoint is `https://marble-race-rame-production.up.railway.app/api/payments/stripe/webhook`.
  - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `refund.created`, `refund.updated`, `charge.dispute.created`.
- **Also set up in the dashboard:** Stripe Tax (registrations and business address), Adaptive Pricing, Apple Pay and Google Pay, and email receipts.
- **Test purchase:** card `4242 4242 4242 4242`, any future date, any CVC. While test keys are set, the checkout page shows a "TEST MODE" note.

### Switching to live (only when Moses says so)
1. Take a [backup](#backups).
   Also check Stripe → Settings → Business → **Public details**: business name Voltron Robotics AB, support email support@marblespins.com, support address, statement descriptor (e.g. MARBLESPINS). Stripe prints these on receipts; our checkout line also names the seller and support email.
2. In the Stripe dashboard **in live mode**, create the same webhook endpoint (same address, same events) and copy its live signing secret. Check that Tax, Adaptive Pricing, payment methods and receipts are set up in live mode too.
3. On Railway set:
   - `STRIPE_SECRET_KEY` = `sk_live_…`
   - `STRIPE_WEBHOOK_SECRET` = the **live** `whsec_…`
   - `STRIPE_ALLOW_LIVE` = `true`

   Then restart. **Without `STRIPE_ALLOW_LIVE`, a live key is refused** and checkout shows "not connected".
4. Check that the checkout page no longer shows "TEST MODE". Make one small real purchase, see the coins arrive and the order on `/purchases`, then refund it from the back office.

Test-mode orders stay in the `payments` table. They can be recognised by their Stripe ids, which start with `cs_test_`.

### Back to test
Remove `STRIPE_ALLOW_LIVE`, put the test key and the test `whsec_…` back, and restart.

## Email (Brevo)

Email is off until Brevo is set up. When it's on, "Forgot your password?" appears on the log-in page and reset emails are sent, and **every new sign-up gets a "Confirm your email" link** (EN/SV; texts in project doc `claude/signup-confirm-email.md`; Settings sends a new one). Before then, accounts are saved without confirmation.

1. **Create the account.** Make a Brevo account (brevo.com) in the company's name.
2. **Authenticate marblespins.com.** In Brevo, go to Senders, Domains & Dedicated IPs → Domains → Add a domain → `marblespins.com`.
   - Brevo shows DNS records: a Brevo code, DKIM, DMARC and SPF.
   - Add each record at the domain's DNS provider, **Simply.com → marblespins.com → DNS** (as in [Simply.com: the DNS records](#2-simplycom-the-dns-records)), exactly as Brevo shows it, then click **Verify** in Brevo.
3. **Add the sender.** Go to Senders → Add a sender → `no-reply@marblespins.com`, name "Marble Spins". It is verified through the domain.
4. **Create the key.** Go to SMTP & API → API keys → Generate a new API key, named for example "railway".
5. **Set the variables on Railway, then restart:**
   - `BREVO_API_KEY` = the key (never paste it in chat or docs);
   - optional: `EMAIL_FROM` (default `no-reply@marblespins.com`) and `EMAIL_FROM_NAME` (default "Marble Spins").
6. **Test it:**
   1. On marblespins.com, choose Log in → Forgot your password?
   2. Enter your own account's email.
   3. The email arrives within a minute. The link opens `/reset-password` and works once, for 60 minutes.
   4. Brevo → Transactional → Logs shows each message.
   5. Sign up a test account (or save a guest): "Check your email" shows; the email's link opens `/confirm-email` and says it's confirmed (`users.email_verified_at`). Try it from a Swedish browser too.

To turn email off again, remove `BREVO_API_KEY` and restart.

**Support emails.** Contact-form messages go to support@marblespins.com (the company's address in `client/src/shared/company.json`; `SUPPORT_EMAIL` on Railway overrides it). With Brevo on, every new message is emailed there, with a link to it in the back office; replying to that email goes straight to the player (but isn't logged in the back office, so prefer replying there). Replies written in the back office are emailed to the player from `EMAIL_FROM`, with `SUPPORT_EMAIL` as the reply-to address. Without Brevo, messages and replies are still saved; the back office says a reply wasn't emailed.

## Replays: kept 30 days (switching on)

Built 27 Oct 2026 (`src/game/replayRetention.js`). After the deploy that brings it, the server logs once a day (and 5 minutes after it starts) what it would delete: `[replays] DRY RUN: N replays over 30 days old would be deleted (X MB)`. Results are never deleted, and the replays something shows are kept (the latest 200 races, track, player and country records, each collection marble's first win). Once the number looks right: `railway variables --set "REPLAY_TRIM=on" --skip-deploys`, then `railway up` from the folder and check `/health` (never the dashboard's Deploy button: see Changing variables). New replays are already about a third of the old size (no switch). The first deleting run takes at most 20,000 replays; the rest follow day by day. The database reuses the freed space; the next backup is smaller at once.

## Leagues: testing and switching on

Built switched off; **on for everyone since 27 Oct 2026** (`LEAGUES=on`, the deploy `b10e1672d598`). The server variable `LEAGUES` decides (see `docs/01-architecture.md`):
1. **After the deploy** that brings leagues: leave `LEAGUES` unset (off). `GET /api/leagues/status` answers `{"enabled":false}`; everything else under `/api/leagues` answers 404, and the website shows nothing.
2. **To test in production:** `railway variables --set "LEAGUES=admins" --skip-deploys`, then `railway up` from the folder, then check `/health` ([Changing variables](#the-game-server-railway-by-hand)); never the dashboard's Deploy button. Only admin accounts then see LEAGUES on the home page and can make and race leagues.
3. **For everyone:** `railway variables --set "LEAGUES=on" --skip-deploys`, then `railway up`, then check `/health` (it must show `version`; if not, `railway up` again). Check the variable with `railway variables --kv | grep '^LEAGUES='`. While off or admins only, an invite link shows "Leagues are coming soon" (not a 404). Back to off: delete the variable (or `off`). Leagues already made stay in the database and come back when switched on again; their end job keeps running either way.

## Push notifications (apps): setting up and switching on

Built and **switched off twice**: the apps don't ask until `client/src/shared/push.json` has `"enabled": true` (needs a new app build in the stores), and the server sends nothing until `PUSH_SENDING=on` on Railway (until then it logs `[push] DRY RUN …`). Do the accounts first, then test with the test apps, then switch on.

**1. Firebase (Android), about 15 minutes:**
1. Go to console.firebase.google.com → **Add project** → name "Marble Spins" → Google Analytics: **off** (the apps use no analytics) → Create.
2. In the project: **Add app → Android** → package name `com.marblespins.app` → nickname "Marble Spins Android" → Register. **Download `google-services.json`** and put it in `client/android/app/` (it holds no secrets; commit it). Skip the SDK steps (the plugin has them).
3. Project settings (gear) → **Cloud Messaging**: check "Firebase Cloud Messaging API (V1)" says **Enabled** (if not, click its menu → Manage API in Google Cloud Console → Enable).
4. Project settings → **Service accounts** → **Generate new private key** → a JSON file downloads. Put its whole contents in Railway as `FCM_SERVICE_ACCOUNT` (Railway → server service → Variables). Keep the file in your password manager, then delete the download. Never paste it in chat or docs.

**2. Apple (iPhone), about 15 minutes, once the Apple Developer account exists:**
1. developer.apple.com → Account → **Certificates, Identifiers & Profiles → Identifiers** → `com.marblespins.app` (and `com.marblespins.app.dev`) → tick **Push Notifications** → Save.
2. **Keys** → **+** → name "Marble Spins push" → tick **Apple Push Notifications service (APNs)** → Configure: Environment **Sandbox & Production**, Key Restriction **Team Scoped** → Continue → Register → **Download** the `AuthKey_XXXXXXXXXX.p8` (only once!). Note the **Key ID** (10 characters) and your **Team ID** (top right, or Membership).
3. Railway: `APNS_KEY` = the .p8 file's text (open it in TextEdit, copy all, including the BEGIN/END lines), `APNS_KEY_ID`, `APNS_TEAM_ID`. Keep the .p8 in your password manager.
4. Xcode: open `client/ios/App/App.xcodeproj` (there is no workspace: the project uses Swift Package Manager) → target **App** → **Signing & Capabilities** → check **Push Notifications** is listed (the entitlement file is already there; with automatic signing Xcode adds the capability to your app id).

**3. Test, then switch on:**
1. Set `"enabled": true` in `client/src/shared/push.json` on a test branch, build the test apps (APP-TESTING.md), finish a race: the question appears; say yes; the phone asks.
2. Railway: `PUSH_SENDING=on` → redeploy → the log says `[push] sending ON; Android keys set, iPhone keys set`.
3. Turn on the daily reminder in the test app's Settings → Notifications; or host a room on the website and **Invite** the test account (it must have raced in a room with you): the phone gets it.
4. When it works: push the `push.json` change to Main, build the store apps with it (a new version), and keep `PUSH_SENDING=on`.
- **Season news** goes by itself: within 6 hours after the pass sale opens (28 Nov 00:00) and after the season starts (1 Dec 00:00), to saved accounts that turned it on. Nothing to do on the night.
- **Turn everything off at once:** remove `PUSH_SENDING` (or set it to anything else) and redeploy.
- **Privacy:** the store forms (App Privacy, Data safety) must list the push token as "Device ID / other identifiers… App functionality"; see `docs/08-store-rules.md`.

## Player names: reports and the word list

- **Back office → Name reports:** open reports by player (most reporters first). Write a reason, then **Rename** (the account gets a neutral name like Player48213 and its shown name is cleared; a guest's shown name is cleared) or **Dismiss** (the reports close, the name stays). Both are in the audit log. The player can log in with their email as before (tell them their new name if they ask; they can ask support for another friendly one).
- **Names the filter would block:** names chosen before the filter (or set by an admin). Rename them the same way.
- **A word gets through:** add it to `client/src/shared/nameFilter.js` (the right language; CONTAINS only if it never occurs inside an ordinary word, else WORDS), run `npx vitest run test/nameFilter.test.js` in `client/`, push. The website checks with the new list after Vercel's build, the server after the next deploy.
- **An ordinary name is refused:** add it to `ALLOW` in the same file.

## Gift codes (back office)

**Switched off for players** until `client/src/shared/giftCodes.json` has `"enabled": true`; switching on = change it, push to Main (Vercel builds the website) **and deploy the server** (it reads the same file). Before switching on, the database needs the two new tables (`gift_codes`, `gift_code_redemptions`): the server makes them by itself when it starts after the deploy (the `[db-setup]` lines in its log). Codes can be made before that and work once it's on.

- **Make codes:** back office → **Gift codes** → *Make codes*. Choose what it gives (coins, or a season's pass), single-use (and how many: up to 500 at once, e.g. one per giveaway winner) or multi-use up to a limit (e.g. a creator's code for their viewers; give it an own word like `MARBLEJOE`), the expiry date (the end of that day), the creator or campaign (**tag**: use one tag per creator, e.g. `creator-marblejoe`, so their totals add up), an optional note and a reason. The codes appear at once: **Copy**, or **Download CSV** for a batch. Making codes is in the audit log.
- **See how a creator or campaign did:** the table at the top sums every tag: codes, redemptions, coins given, passes given. Click a tag to list its codes; click a code to see who redeemed it.
- **Switch a code off** (posted publicly by mistake, a creator deal ended): open the code → reason → *Switch off*. No more redemptions; what was redeemed stays. To take coins or a pass back from a player, use their page (Coins, or Marbles for the season marble) with a reason.
- **What players see:** Settings → *Redeem a code* (website only, saved accounts). Coins from codes count as bought coins and never on scoreboards; the Economy page shows them per day (*Gift codes*).
- **In the apps:** no field and no link, on purpose (Apple guideline 3.1.1). Don't tell players in the app to go to the website to redeem; say it in the creator's video, an email or social posts instead.

## Support messages (back office)

- **Where:** back office → **Support messages**. Filter by New / Open / Done and by category; search by name, email, player, order number, reference (`S-1001`) or words in the message.
- **A message:** who sent it and how it was linked to an account (*logged in*, or *by email*: matched on the email they typed, which they may not own; check before acting on an account), the order number, device, the screenshot (click for full size), replies and the history.
- **Status:** New → Open → Done, from the list or the message. Every change is in the audit log (an optional note becomes its reason). Sending a reply moves a New message to Open.
- **Replies** are emailed to the player when Brevo is on, and logged. With email off they are saved but not sent; answer the player another way.
- **On the player's profile**, the **Messages** tab lists everything they sent (logged in, or from their email).

## Track pictures (the track picker)

- **Review:** `/preview/banners` shows every track's picture as a picker card (with its moment, side, marbles in view and file sizes).
- **Switch on:** set `"enabled": true` in `client/src/shared/trackBanners.json` and push; Vercel builds it. Back off: `false`.
- **Redo one:** give the track a moment (ms after GO) and a side in `scripts/track-banners.json`, e.g. `{ "indus-spins": { "t": 21000, "side": -1 } }`, run `node scripts/track-banners.js indus-spins`, and commit the two pictures and the list.
- **New tracks** get theirs from the track report; `node scripts/track-banners.js --missing` draws any missing. A client test fails while a track has none.

## Analytics, Meta Pixel and the cookie banner (website only)

- **Switch on:** Vercel → project `marble-race-rame-client` → Settings → Environment Variables, Production: `VITE_GA4_ID` (the GA4 measurement ID, `G-…`, from Google Analytics → Admin → Data streams → the web stream) and/or `VITE_META_PIXEL_ID` (the Pixel's ID, digits, from Meta Events Manager → Data sources). Then **redeploy**. With both empty there is no banner and nothing loads.
- **What a visitor sees:** a banner with REJECT ALL / ACCEPT ALL and Settings; nothing but necessary storage until they choose. "Cookie settings" in the footer and on `/cookies` changes it. Never in the apps; the Pixel never for an account under 13.
- **In Google Analytics:** mark `sign_up` and `purchase` as key events. Events: `sign_up`, `first_race`, `race_finished`, `view_item_list` (shop), `begin_checkout`, `purchase` (value and currency; the order number is the transaction ID).
- **In Meta Events Manager:** CompleteRegistration, ViewContent (shop), InitiateCheckout, Purchase (value, currency; the order number as event ID), and custom FirstRace and RaceFinished. Don't switch on "automatic advanced matching": we send no email or phone.
- **Changing what a category covers:** update `STORAGE_LIST` and the privacy text, and raise `CONSENT_VERSION` in `client/src/site/consent/consent.js` so everyone is asked again.
- **Consent records:** `cookie_consents` (one row per logged-in decision).

## Search engines and link previews

- Pages, sitemap and share pictures are made by `npm run build` (see `docs/02-code-map.md`, `scripts/prerender.mjs`). A track switched on gets its page at the next website build: after a data update that switches tracks on, **redeploy the website** in Vercel too.
- Check: `https://marblespins.com/sitemap.xml`, `/robots.txt`, and a page's preview in Facebook's Sharing Debugger. Submit the sitemap once in Google Search Console.
- A new track's share picture: `public/share/tracks/<slug>.jpg`, 1200 × 630 (cut from its `@2x.webp`); without one its picker picture is used.

## Season, store buttons and the iPhone silent switch

- **Start a season:** add a row to the `seasons` table with a data update (`key`, `name`, `starts_at`, `ends_at`, `free_from`, `badge_top`) and deploy the server. The "This season" board, the season name and the days left follow its dates by themselves (`src/routes/scoreboard.js` `currentSeason`; the Holiday Season 2026 is in that table). Only when no season in the table is on or has ended is `season` in `client/src/shared/economy.json` used (`number`, `startsAt`, `endsAt`, e.g. `2026-11-01T00:00:00Z`; all empty today, 25 Oct 2026): set it, push, and deploy the server too (it reads the same file).
- **App Store / Google Play buttons on the website:** put each store page's https link in `client/src/shared/storeLinks.json` and push. An empty link hides its button. The apps never show them.
- **iPhone silent switch:** the app uses an "ambient" audio session, so the switch mutes the game's music and sounds and the player's own music keeps playing. Since the native audio plugin (28 Oct 2026) the game sets it with `NativeAudio.configure({ focus: false })` at start-up (the plugin itself would choose "playback", which ignores the switch). Check it on a real iPhone after each app build (switch on and off during a race, and with Spotify or Apple Music playing).

## Race sound: checking it on a device (28 Oct 2026)

The apps play the sound through `@capacitor-community/native-audio` (a native plugin: the apps need a new build, `npm run app:sync`, to have it; an older build keeps using Web Audio). The website uses Web Audio. Check after each app build, on an iPhone or iPad, an Android phone, Safari on a Mac or iPhone, and Chrome:
1. A solo race: the track card says "Loading…" (then maybe "Loading the sound…"), the countdown follows; the fourth beep is exactly on GO, the race tune starts on GO.
2. The same on a slow connection (a phone on 3G, or Chrome DevTools → Network → Slow 3G): the countdown still waits for the sound in a solo race; in a room it doesn't, and a tune that arrives late starts part-way in, in step with the race.
3. A long race (or a tune shorter than the race): the tune loops with no gap, no dip and no click at the loop point (Android's player is the one to listen to most closely).
4. Lock the phone (or switch apps) mid-race for 10 s and come back: the music picks up where the race is.
5. iPhone: the silent switch mutes the game; music from another app keeps playing under it.
6. Safari: play a video in another tab mid-race, come back and tap: the sound resumes.
7. Back office → **Race readiness**: your test races are there (platform, missing, how late). Railway logs show `[readiness] race … NOT READY …` for each screen that wasn't ready.

**Android: reading the sound log in Logcat** (28 Oct 2026). `npm run app:sync` prints `native audio included` (it runs `npm install` first if a plugin is missing; without it the app falls back to the slower Web Audio). In Android Studio → Logcat, filter `package:mine message:"[sound]"` (the lines come from tag `Capacitor/Console`). Expect, in a solo race:
- `[sound] backend: native` (not `backend: web`; `native audio plugin missing` means the build lacks it);
- `[sound] start-beeps: loaded in N ms`, `start-rolling: …`, `marble-hit: …`, `marble-bump: …`, `tune-N: …` (each well under a second);
- `[sound] sound ready in N ms` (or `NOT ready after 6000 ms: …`, naming what's missing);
- `[sound] race …: GO in N ms (native, beeps loaded, tune …)`;
- `[sound] the player took N ms to start` (the start-up time allowed for);
- trouble shows as `skipped … (late)`, `load … timed out` or `falling back to web audio: …`.
To check the plugin itself registered: filter `tag:Capacitor message:NativeAudio`. Back office → **Race readiness** shows the Sound column (native/web) per race.

## The season-start website rebuild (1 Dec 2026, automatic)

The website learns of the holiday tracks only at a build (their pages, the sitemap, the track count: 121 live tracks in ten series today, "120+ tracks"; with the 31 holiday tracks from 1 Dec, "150+ tracks"; 30 Oct 2026); the server shows them from 1 Dec 00:00 by date. The GitHub Actions workflow **"Season start: rebuild the website"** (`.github/workflows/season-start-rebuild.yml`) starts that build at **1 Dec 2026 00:05 Swedish time** (spares at 00:35 and 01:15, which do nothing once the holiday tracks are on the site), waits for it, and checks the sitemap has `/tracks/tromso-aurora-grand-prix`. If anything fails, the run fails and GitHub emails the repository's owner; then press Redeploy in Vercel by hand. Nobody has to be awake for it.

It calls a **Vercel Deploy Hook**: a secret URL that rebuilds Main. The URL is kept only in GitHub's secret `VERCEL_DEPLOY_HOOK_SEASON`, never in code, chat, docs or logs. Set-up (once):
1. **Vercel:** the project `marble-race-rame-client` → **Settings** → **Git** → **Deploy Hooks**. Name: `season-start`, branch: `Main` → **Create Hook**. Copy the URL it shows (Vercel shows it again on that page).
2. **GitHub:** the repository `Stooshi/Marble-Race-Rame` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Name `VERCEL_DEPLOY_HOOK_SEASON`, value: the URL → **Add secret**.
3. **Test it once:** **Actions** → "Season start: rebuild the website" → **Run workflow** (branch `Main`, leave the box unticked) → green within a minute; Vercel → **Deployments** shows a new production build "Deploy Hook: season-start", live in a few minutes. Actions must be allowed (Settings → Actions → General → "Allow all actions"; and scheduled runs stop on a repository with no activity for 60 days: any push keeps it alive).
4. **On 1 Dec, morning:** Actions shows the 00:05 run green; `marblespins.com/tracks` lists the holiday tracks.

A hook that leaks only lets someone rebuild the website (no code or data). Replace it then: delete it in Vercel, make a new one, update the secret.

## Starter marbles and the save pop-up (20 Oct 2026)

- **Every player's own 4 starters** are made when an account is made; players from before get theirs the first time they race or open their Marble Bag. Check in Railway → Postgres → Query: `SELECT count(DISTINCT owner_id) AS players_with_starters, count(*) AS starters FROM marbles WHERE owner_id IS NOT NULL;` (4 per player).
- **A player asks about a starter's ID:** `SELECT m.name, m.marble_code, u.username FROM marbles m JOIN users u ON u.id = m.owner_id WHERE m.marble_code = 'STXXXXX1';` Its certificate: `marblespins.com/certificate/<ID>`.
- **The pop-up** shows for guests after every 3rd finished race; nothing to switch. To see it yourself: play 3 races as a guest (a private window), then open Race.
- **Under 13** at sign-up: no account is made and nothing is stored; the player keeps racing as a guest.

## Checking the website's routing before a push

Any change to `client/vercel.json`, the build, or the pre-rendering: build exactly as Vercel does and click through.
1. In `client/`: `npx vercel build --prod` (needs `client/.vercel/project.json`: `npx vercel link` with your Vercel login, or a local one with `"settings": {"framework": "vite", "outputDirectory": "dist"}`; set `VITE_API_URL` in `.vercel/.env.production.local`).
2. `node scripts/serve-vercel-output.mjs . 4300` serves that output with Vercel's own routing rules.
3. Open, and refresh, at least: `/`, `/help`, a `/help/<question>`, `/tracks/<slug>`, `/cookies`, `/play/track`, a race (`/race/<id>`), `/preview/physics?track=spawn-point`, `/preview/banners`, `/admin`, and a made-up address (it must show the app's "Lost the marble" page with HTTP 404, not "404: NOT_FOUND"; `curl -s -o /dev/null -w '%{http_code}' localhost:4300/made-up` says 404, and every in-game address 200).

## App links: links open the app (from the next app build)

Built 27 Oct 2026. A tapped `https://marblespins.com` (or `www.marblespins.com`, which serves the same site without redirecting) link to a league (`/l/…`), a room (`/r/…`), `/leagues`, `/tracks`, a result (`/results/…`), a certificate (`/certificate/…`) or `/scores` opens the app when it's installed, at that page; without the app, or before the phone has checked the website, it opens the website as before. The shop, checkout, the pass and gift codes are never app links.

Shared league and room links (Copy, WhatsApp, Share, the QR code) always use `marblespins.com` without www (`SITE_URL`), on the website and in the apps.

**One list:** `client/app-links.json` (the two hosts, the paths, the Android fingerprints, the Apple Team ID). After changing it: `cd client && npm run app:links`, then commit `app-links.json` and `client/public/.well-known/` together and push (Vercel serves `https://marblespins.com/.well-known/assetlinks.json` and `/.well-known/apple-app-site-association`). A test checks the files, the Android manifest's intent filter and the iPhone entitlement all match. Fingerprints and the Team ID are public, not secrets. An empty slot is left out. Paths changed? They're also in the app (`AndroidManifest.xml`, the app's own check in `client/src/app/native.js`), so that needs an app build.

**The fingerprints (SHA-256, 32 pairs like `AB:CD:…`), slot by slot:**
1. `debug`: the key Android Studio signs test builds with, one per computer. On that computer: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android` (Windows: `%USERPROFILE%\.android\debug.keystore`; `keytool` comes with Android Studio: `<Android Studio>/jbr/bin/keytool`), the line **SHA256**. Or `cd client/android && ./gradlew signingReport`, Variant `debug`, **SHA-256**.
2. `upload`: the upload key (`npm run android:key`). `keytool -list -v -keystore <the storeFile in client/android/keystore.properties>` (it asks for the keystore password), **SHA256**. Or, after the first upload, Play Console → the app → **Test and release → App integrity → App signing** → "Upload key certificate" → **SHA-256 certificate fingerprint**. Needed for release builds installed straight from Android Studio.
3. `playAppSigning`: the key Google signs the store app with (Play App Signing, created at the first upload). Play Console → the app → **Test and release → App integrity → App signing** → "App signing key certificate" → **SHA-256 certificate fingerprint** (the same page also shows a ready "Digital Asset Links JSON"; ours is made from `app-links.json` instead). Without it, links from the Play Store app open the website.
4. `ios.teamId`: developer.apple.com → **Account → Membership details → Team ID** (10 letters and digits), once Apple has approved the account. The app id also needs **Associated Domains**: Identifiers → `com.marblespins.app` → tick Associated Domains (with automatic signing Xcode does it). Until then the iPhone file lists no app.

**Testing on an Android phone** (a debug build, once its fingerprint is live on the website): install the build, then on the computer `adb shell pm verify-app-links --re-verify com.marblespins.app` and `adb shell pm get-app-links com.marblespins.app`: `marblespins.com: verified` and `www.marblespins.com: verified`. On the phone: Settings → Apps → Marble Spins → **Set as default** → Supported web addresses shows marblespins.com. Then tap a league link in WhatsApp or Messages: the app opens at the league. Logcat (filter `app-links`) shows `[app-links] open /l/…`. "none" or "1024" instead of verified: the fingerprint doesn't match that build's key, or the website doesn't have it yet (open `https://marblespins.com/.well-known/assetlinks.json`).

## App versions and release notes

Both apps take their version from `client/app-version.json`: `versionCode` is Android's versionCode **and** the iPhone build number (+1 for every upload to either store), `versionName` is what players see (`1.0.1`). Android's `app/build.gradle` reads the file; the iPhone project carries `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` itself (Info.plist reads them), so the script writes them into both build configurations of the App target in `project.pbxproj` (and `npm run ios:release` puts them back in step if they differ).

In `client/` (step by step for beginners: `client/APP-TESTING.md`, "Releasing a new version"):
1. `npm run app:version` (patch: 1.0.0 (1) → 1.0.1 (2)); `-- minor`, `-- major`, `-- 1.2.0`, or `-- build` (same version, new build number, e.g. after a rejected build). A lower or equal version is refused.
2. It writes the release-notes draft `client/release-notes/<versionName>.md` (same as `npm run app:notes`): a short **player text** with `[EDIT]` template lines, and the commit subjects since the previous `app-v*` tag (no tag yet: the last 30 commits), grouped by what they touched (the apps; game and website, which reach app players only with an update; server, already live; docs and tools). Commit subjects aren't player language, so a person writes the player text.
3. Edit the player text, then `npm run app:notes` again: it keeps the `.md` and writes `<versionName>.play.txt` (Google Play, `<en-US>…</en-US>`, at most 500 characters) and `<versionName>.appstore.txt` (App Store "What's New", at most 4000). It refuses while `[EDIT]` lines, `<` or `>` remain or the text is too long. `-- --fresh` rewrites the draft.
4. Commit `app-version.json`, `ios/App/App.xcodeproj/project.pbxproj` and `release-notes/`. Nothing is committed, tagged or pushed by the scripts.
5. Build and upload (sections below). After the first successful upload of a version, tag it with the command the release script prints: `git tag app-vX.Y.Z && git push origin app-vX.Y.Z`. The next notes start from that tag.

Release files go to `MarbleSpins-releases` in your home folder (`MS_RELEASE_DIR` overrides). Both release scripts refuse a build number that already has a file there (`-- --again` rebuilds it, for a build never uploaded).

## Android release (Google Play)

Built on **your own computer** (the Windows PC, or a Mac), in a terminal in `client/` (Command Prompt on Windows), with Android Studio installed (it brings Java 21 and the Android SDK; open `client/android` in it once so it downloads the SDK, as in `client/APP-TESTING.md`). The cloud workspace can't build Android apps: Google's download servers are blocked there.

### The upload key (once)

`npm run android:key` makes it. It asks for a password (12+ characters; save it in your password manager first) and writes:

| File | What | Secret? |
|---|---|---|
| `C:\Users\<you>\MarbleSpins-keys\marblespins-upload.jks` (Mac: `~/MarbleSpins-keys/…`) | The upload key (PKCS12, alias `upload`, RSA 4096, valid ~27 years) | **Yes** |
| `…\MarbleSpins-keys\upload_certificate.pem` | Its public certificate (for an upload-key reset) | No |
| `client/android/keystore.properties` | Where the key is and its alias. **No password.** Gitignored | No |

It also prints the key's SHA-256 fingerprint. The folder is in your home folder (`C:\Users\<you>` on Windows, `/Users/<you>` on a Mac); another folder can be set with the `MS_KEY_DIR` variable (never inside the project). The script refuses to make a second key.

**Why not in the project or GitHub:** anyone with the key and password could upload an app as Marble Spins. `.gitignore` blocks `*.jks`, `*.keystore` and `keystore.properties`, and the key lives outside the repository anyway.

**Back it up the same day, two copies:**
1. Your password manager (1Password, Bitwarden or similar): an entry "Marble Spins Google Play upload key" with the password, the SHA-256 fingerprint, and the `.jks` and `.pem` files attached.
2. Offline: an encrypted USB stick or encrypted disk image (Windows: BitLocker To Go, right-click the USB drive → Turn on BitLocker; Mac: Disk Utility, "AES-256") with the `.jks` and `.pem`, kept somewhere safe at home or at the office. Not in a shared Dropbox/Google Drive folder, email or chat.

**If it is lost or leaked:** with Play App Signing, Google holds the real signing key, so the app is not lost. Make a new key (move the old `MarbleSpins-keys` folder away first), then Play Console → Test and release → Setup → **App signing** → *Request upload key reset*, and upload the new `upload_certificate.pem`. Google takes a few days; until then you can't upload.

### Building the bundle

1. `npm run app:version` and the release notes (above). Commit them.
2. `npm run android:release`. It never changes the version, and refuses if `MarbleSpins-releases` already has a bundle with this `versionCode` or higher (`npm run android:release -- --again` to rebuild one never uploaded). It asks for the key password, builds the app against the live Railway server (`npm run app:sync`), runs Gradle's `bundleRelease`, checks that the bundle is signed with the upload key, and copies it to `MarbleSpins-releases\marblespins-<versionName>-<versionCode>.aab` in your home folder. At the end it prints the `git tag` command for this version (run it after the upload).
3. Release notes in Play Console: paste `client/release-notes/<versionName>.play.txt` (the whole `<en-US>` block).
4. The password can also come from `MS_UPLOAD_STOREPASSWORD` (e.g. for a build machine); it is never written to a file.

Android Studio instead: Build → Generate Signed App Bundle, with the same `.jks`, alias `upload`.

### First upload: internal testing

Voltron Robotics AB is an organisation account, so the "12 testers for 14 days" closed-test rule for new personal accounts doesn't apply.
1. Play Console → **Create app**: name Marble Spins, default language English (United States), App, Free, accept the declarations. (Free with in-app products.)
2. Test and release → Testing → **Internal testing** → *Testers* tab → *Create email list* "Marble Spins team" → add moses.ntereke@gmail.com (the Google account on your phone) → Save, and tick the list.
3. *Releases* tab → **Create new release**. At "App signing" keep **Google-generated key** (Play App Signing) and continue.
4. Upload the `.aab` from `MarbleSpins-releases` in your home folder. Release name e.g. `1.0.0 (1)`, release notes "First internal test". Next → fix anything flagged as an error (warnings are fine) → **Save and publish** / *Start rollout to Internal testing*.
5. Check the upload key: Setup → App signing → *Upload key certificate* SHA-256 must equal the fingerprint `npm run android:key` printed.
6. *Testers* tab → **Copy link** ("Join on the web"). Open it on the phone, signed in with that Google account → *Accept invite* → *Download it on Google Play*. The first release can take a few minutes to an hour to appear.
Play may first ask for some "App content" answers (privacy policy, ads, app access, content rating, target audience, data safety): the answers are in `claude/store-submission-drafts.md` in the project.

## iPhone release (App Store)

Built on a **Mac with Xcode** (the cloud workspace and Windows can't), in Terminal in `client/`. The iPhone project uses **Swift Package Manager** (`ios/App/CapApp-SPM`), not CocoaPods: there is no `App.xcworkspace`, and the build uses `ios/App/App.xcodeproj` (the script switches to a workspace if one ever appears).

### Once

1. The paid **Apple Developer Program** account (Voltron Robotics AB). Its **Team ID** (developer.apple.com → Account → Membership details; 10 letters and digits, not secret) goes in `client/ios/apple-team-id.txt` (gitignored) or the `MS_APPLE_TEAM_ID` variable. **Not set yet: Moses provides it once the account exists.**
2. Xcode → Settings → Accounts: sign in with an Apple ID of that team (signing is automatic: Xcode makes the certificates and profiles).
3. App Store Connect → Apps → + → New App: iOS, Marble Spins, English (U.S.), bundle id `com.marblespins.app` (register it under Certificates, Identifiers & Profiles → Identifiers if it isn't listed, with In-App Purchase), SKU `marblespins-ios`.

### Building and uploading

1. `npm run app:version` and the release notes (above). Commit them.
2. `npm run ios:release`. It checks it runs on a Mac with Xcode and has the Team ID, refuses a build number that already has an archive in `MarbleSpins-releases` (`-- --again` overrides), sets the iPhone project's version from `app-version.json`, builds the site against the live server (`app-sync.mjs ios`: `vite build`, `npx cap sync ios`), then:
   - `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination generic/platform=iOS -archivePath ~/MarbleSpins-releases/MarbleSpins-<versionName>-<versionCode>.xcarchive -allowProvisioningUpdates DEVELOPMENT_TEAM=<team> archive`
   - `xcodebuild -exportArchive` with a generated `ExportOptions.plist` (method `app-store-connect`, automatic signing, the team, `manageAppVersionAndBuildNumber` off) into `MarbleSpins-<versionName>-<versionCode>-export/App.ipa`.
3. **Upload (beginner path):** double-click the `.xcarchive` in Finder → Xcode Organizer → **Distribute App** → **TestFlight & App Store** (older Xcode: App Store Connect) → Distribute. Or `npm run ios:release -- --upload` (export destination `upload`; uses the Xcode account).
4. App Store Connect → the app → TestFlight: the build appears after 5–30 minutes; paste `<versionName>.appstore.txt` into **What to Test**; add internal testers. `ITSAppUsesNonExemptEncryption` is already false in `Info.plist`, so no export-compliance question.
5. For the App Store: Distribution → the version → **What's New in This Version** (`.appstore.txt`) → pick the build → Add for Review. Purchases first need the steps in "App Store purchases" below.
6. Tag the version with the printed `git tag` command (once per version, after the first upload of either app).

## Google Play Billing: coins in the Android app

The app sells the same four packs through Google Play; the server checks every purchase with Google before adding coins (see [architecture](01-architecture.md)). Order matters:

1. **Deploy the server** with this code (new columns and `/api/payments/google/*`). Without the variables below, the app says buying coins isn't switched on yet.
2. **Payments profile:** Play Console → Settings → *Payments profile* (or Monetize with Play → *Monetization setup*): set up the merchant account for Voltron Robotics AB (bank account, VAT number). Paid products need it.
3. **Upload an `.aab` first** (internal testing, above). Play only offers in-app products once a bundle with Google Play Billing (the `BILLING` permission) is uploaded.
4. **Products:** Monetize with Play → Products → **One-time products** → *Create one-time product*, four times:

   | Product ID | Name | Description | Price (US) |
   |---|---|---|---|
   | `coins_5000` | 5,000 coins | 5,000 Marble Spins coins for the shop. For looks only. | USD 4.99 |
   | `coins_10500` | 10,500 coins | 10,500 Marble Spins coins for the shop. For looks only. | USD 9.99 |
   | `coins_27500` | 27,500 coins | 27,500 Marble Spins coins for the shop. For looks only. | USD 24.99 |
   | `coins_57500` | 57,500 coins | 57,500 Marble Spins coins for the shop. For looks only. | USD 49.99 |

   Prices in the apps: $4.99 / $9.99 / $24.99 / $49.99 (the website stays $5 / $10 / $25 / $50; `storeAmountCents` in `client/src/shared/payments/packs.json`). The IDs must be exactly these, **with underscores** (Google Play allows no hyphens in product ids; our own ids are `coins-5000` and so on, and the app and server translate: `playId` in `src/payments/google.js` and `client/src/site/payments/index.js`). They can never be changed or reused. Set the price (purchase option "buy", consumable), let Play convert the other countries, check SEK and EUR look sensible, then **Activate** each one. Prices shown to players are Play's own, in their currency with VAT.
5. **Google Cloud project and API:** console.cloud.google.com, signed in as the account that owns the Play developer account → create project `marble-spins-play` → APIs & Services → Library → enable **Google Play Android Developer API** and **Cloud Pub/Sub API**. (If Play Console shows Setup → *API access* with "Link a Google Cloud project", link this project there.)
6. **Service account:** Cloud console → IAM & Admin → Service accounts → *Create*: name `play-billing`, no project roles → Done. Open it → *Keys* → Add key → JSON → it downloads one file. Paste the **whole file's contents** into Railway as `GOOGLE_PLAY_SERVICE_ACCOUNT`. Then put the file in your password manager and delete the download. Never in chat, email or Git.
7. **Give it access in Play:** Play Console → **Users and permissions** → *Invite new users* → the service account's email (`play-billing@marble-spins-play.iam.gserviceaccount.com`) → App permissions → add Marble Spins → tick **View financial data, orders and cancellation survey responses** and **Manage orders and subscriptions** → Invite. It can take up to 24 hours before Google accepts its calls (until then the server logs `Google Play 401/403`). Editing and saving one product's description sometimes makes it work sooner.
8. **Real-time notifications (Pub/Sub):**
   - Make the token: a long random string (e.g. `openssl rand -hex 32`). Put it in Railway as `GOOGLE_PLAY_RTDN_TOKEN`.
   - Cloud console → Pub/Sub → Topics → *Create topic* `play-rtdn` (no default subscription).
   - Topic → *Permissions* → Add principal `google-play-developer-notifications@system.gserviceaccount.com` with role **Pub/Sub Publisher**.
   - Subscriptions → *Create subscription* `play-rtdn-push` on that topic → Delivery type **Push** → endpoint `https://marble-race-rame-production.up.railway.app/api/payments/google/rtdn?token=<the token>` → Create.
   - Play Console → Monetize with Play → **Monetization setup** → Real-time developer notifications: topic name `projects/marble-spins-play/topics/play-rtdn` → notifications for **subscriptions, voided purchases and all one-time products** → Save → **Send test notification**. Railway logs show `[google-play] test notification received`.
9. **Restart** the server after setting the variables. `GET /api/payments/google/account` (logged in) now says `"live": true`.
10. **License testers:** Play Console → Settings (all apps) → **License testing** → add moses.ntereke@gmail.com → Save. Purchases from this account on the internal test use test cards ("always approves", "slow test card, approves after a few minutes", "declines") and cost nothing.
11. **Test on the phone** (internal test build): buy each pack with "always approves" → coins arrive at once, the order shows on Purchases and in the back office (Payments, provider `google`, order id `GPA.…`). Close the app during a "slow" purchase → coins arrive by themselves within minutes. Refund one from the back office → within a few minutes the coins go and the refund appears like a Stripe refund.

**Refunds and chargebacks:**
- From us: back office → player → Payments → *Refund* (full only, a reason required). The server asks Google to refund and revoke; when the voided purchase comes back (usually minutes) the coins are taken back once, recorded in `payment_refunds`, the coin ledger (`pack-refund`) and the audit log. Refunds made in Play Console → Order management work the same way (pick "Remove entitlement").
- From the player or the bank (Google's 48-hour refunds, chargebacks): the same voided-purchase path; reason "Chargeback" or "Friendly fraud" counts as a dispute, as with Stripe. Coins already spent show as "short".
- The server checks voided purchases every 6 hours and on every notification; Google keeps 30 days of them.

## The season pass (Holiday Season 2026)

The pass `holiday-pass-2026` ($9.99) is bought with real money only. Its season, dates, price and Track of the Day list are in the `seasons` table (data update `2027-02-16-season-pass`; the sale start moved to 28 Nov by `2027-03-22-holiday-pass-pre-sale`); see [game rules](04-game-rules.md#seasons-and-the-season-pass).

- **Website (Stripe):** nothing to set up in the dashboard. The Checkout line is built by the server (as for coin packs), on the same webhook and events. Test it in test mode while the season is on (or on a test database with a season whose dates are now): `/pass` → tick both boxes → card `4242 4242 4242 4242` → back on the site the pass shows as owned and the holiday tracks unlock. Refund it from the back office (Payments → Refund, in full): the pass is revoked when Stripe's refund event arrives.
- **Google Play:** Play Console → Monetize with Play → Products → **One-time products** → *Create one-time product*: ID `holiday_pass_2026` (underscores: Google Play allows no hyphens), name "Holiday Season Pass 2026", description "Every holiday track from 1 Dec 2026 to 7 Jan 2027, the Track of the Day bonus (+50% race coins) and the Winter Solstice marble. Activates 1 December. One payment, not a subscription." (project doc `claude/store-submission-drafts.md` 7.2; if the product already exists, change its description to this), price USD 9.99 → **Activate**. (The app buys it with the player's Play account id; the server acknowledges it and never consumes it, so it stays owned.) Deactivate the product after 7 Jan 2027 23:59; the server refuses purchases made outside the sale window anyway, and Google refunds those by itself after 3 days because they are never acknowledged.
- **App Store:** App Store Connect → the app → In-App Purchases → *Create*: type **Non-Consumable**, product ID `holiday-pass-2026`, reference name "Holiday Season Pass 2026", price USD 9.99, the same description as on Google Play, **Family Sharing off** (the server refuses family-shared purchases), a review screenshot of the pass page. Remove it from sale after 7 Jan 2027 23:59. Setting up App Store purchases in general: "App Store purchases" below.
- **The pre-sale (28 Nov 00:00 to 1 Dec 00:00 Swedish time):** the pass is sold on every platform from 28 Nov and activates on 1 Dec; nothing to deploy or switch on either date. A pre-sale buyer who asks for a refund before 1 Dec gets it in full, no questions: website and Google Play from the back office (player → Payments → Refund, in full; Google: or Play Console → Order management, "Remove entitlement"), the pass is revoked when the refund comes back from Stripe or Google; App Store: the player asks Apple (reportaproblem.apple.com) and Apple's refund notification revokes it.
- **Checking both dates before 28 Nov:** after the deploy, check that the sale opens on 28 Nov and the pass activates on 1 Dec, in Swedish time:
  1. Railway → Postgres → Data → Query:
     ```sql
     SELECT key,
            to_char(pass_sale_starts_at AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD HH24:MI') AS sale_opens,
            to_char(starts_at AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD HH24:MI') AS activates,
            to_char(pass_sale_ends_at AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD HH24:MI') AS sale_ends
       FROM seasons WHERE key = 'holiday-2026';
     ```
     It must say `sale_opens 2026-11-28 00:00`, `activates 2026-12-01 00:00`, `sale_ends 2027-01-07 23:59`. (The data update `2027-03-22-holiday-pass-pre-sale` prints the first two in the Railway log when it runs.)
  2. Without the database: open `https://marble-race-rame-production.up.railway.app/api/seasons/holiday-2026` in a browser. `pass.saleStartsAt` must be `2026-11-27T23:00:00.000Z` and `pass.activatesAt` (and `startsAt`) `2026-11-30T23:00:00.000Z` (UTC: one hour behind Swedish time in winter). Before 28 Nov `pass.onSale` is `false` and `pass.preSale` is `true`.
  3. On the site: marblespins.com/pass shows "Activates 1 December" with a countdown and "On sale from 28 November 2026; activates 1 December" (logged in as a tester (`PASS_TESTERS`), it shows the buy box marked as a test purchase instead).
- **"Remind me when sales open" (collected, not sent yet):** how many have asked, in Railway → Postgres → Data → Query: `SELECT count(*) FILTER (WHERE user_id IS NOT NULL) AS players, count(*) FILTER (WHERE email_wanted) AS by_email, count(*) FILTER (WHERE email_wanted AND confirmed_at IS NOT NULL) AS confirmed FROM pass_reminders WHERE season_key = 'holiday-2026' AND cancelled_at IS NULL;`. **Sending** (built, off): set `BREVO_API_KEY` and `PASS_REMINDERS_SENDING=on` on Railway and redeploy; the log says `[pass-reminders] sending is ON`, then `[pass-reminders] sent N confirmation(s), M reminder(s)` as they go (every 5 minutes, 50 at most a run). Stop at once: remove `PASS_REMINDERS_SENDING` (or set `off`) and redeploy. Brevo's free plan sends 300 a day: if more than about 250 have asked, move to a paid plan before 28 Nov. Test first with your own Gmail and Outlook (a Swedish browser for the Swedish emails): ask on /pass, the confirmation arrives within 5 minutes, try Confirm, Cancel and the mail app's Unsubscribe. A person who asks to be taken off: `UPDATE pass_reminders SET cancelled_at = now() WHERE lower(email) = lower('<address>') AND cancelled_at IS NULL; SELECT 1;` (the hourly job then deletes it).
- **Testing before the sale starts (App Review, our testers):** on Railway set `PASS_TESTERS` to the tester accounts' emails, comma-separated (our testers, and the demo account given to App Review in App Store Connect's review notes and Google Play's app access). Those accounts see the pass on sale early, marked as a test purchase. Before the sale starts (28 Nov) the server accepts only test purchases: Apple sandbox and TestFlight, Google Play licence testers (Play Console → Settings → License testing), and Stripe in test mode by a tester. Real purchases are refused until 28 Nov 00:00 Swedish time. Empty the variable after 28 Nov if you like; it changes nothing once the sale is open.
- **A second pass paid for** (bought on the website and in the app at the same time): the audit log shows `pass-duplicate` for that player. Refund the second payment from the back office.
- **Before the season starts** nobody can race the holiday tracks, even when switched on, and they are not in the track list (the picker, the website); at 1 Dec 00:00 Swedish time they appear and open by themselves. Switch them on ahead of time with data update `2027-03-31-switch-on-holiday-tracks` (any day before 30 Nov 23:00 UTC; best well before). The website rebuilds itself at 00:05 so its track pages and count include them ("The season-start website rebuild" above); from 7 Jan 2027 23:59 Swedish time they are free for everyone. Nothing has to be deployed on either date.
- **The season marble** (Winter Solstice) is given by the server with each pass, numbered, and taken back with a full refund; nothing to do. Its hourly job also gives it to any pass holder still without one (for example passes from before the deploy that built it).
- **The holiday tracks** are added switched off with `season_key` set: a track file with `season: 'holiday-2026'` makes `node scripts/physics-track-sql.js <slug> --add-hidden "…"` write `season_key` into its data update. Store texts for the products: project doc `claude/store-submission-drafts.md`, section 7.

## App Store purchases (the iPhone app)

The iPhone app sells the same four coin packs and the season pass through the App Store (StoreKit 2). The server checks Apple's signature on every purchase itself, with Apple's public certificates: no key or secret is needed. Order matters:

1. **Apple Developer Program** (the company, Voltron Robotics AB) and in App Store Connect the **Paid Apps agreement**, banking and tax forms (Business → Agreements). In-app purchases can't be sold before they are active.
2. **The app** in App Store Connect with bundle id `com.marblespins.app`.
3. **Products** (App Store Connect → the app → In-App Purchases), each with a review screenshot (the shop or the pass page):

   | Product ID | Type | Reference name | Price (US) |
   |---|---|---|---|
   | `coins-5000` | Consumable | 5,000 coins | USD 4.99 |
   | `coins-10500` | Consumable | 10,500 coins | USD 9.99 |
   | `coins-27500` | Consumable | 27,500 coins | USD 24.99 |
   | `coins-57500` | Consumable | 57,500 coins | USD 49.99 |
   | `holiday-pass-2026` | Non-Consumable, Family Sharing off | Holiday Season Pass 2026 | USD 9.99 |

   The IDs must be exactly these. Prices in the apps are $4.99 / $9.99 / $24.99 / $49.99 (Moses, 27 Oct 2026, like the credits and the pass; the website stays $5 / $10 / $25 / $50): pick these US price points and let Apple set the other countries. Players see Apple's own price in their currency.
4. **Server Notifications** (App Store Connect → the app → App Information → App Store Server Notifications): **Version 2**, Production URL and Sandbox URL both `https://marble-race-rame-production.up.railway.app/api/payments/apple/notifications`. Then *Request a test notification*: Railway's log shows `[app-store] notification: test`.
5. **Railway:** `APPLE_IAP_ENABLED=true` (and `APPLE_BUNDLE_ID` only if it isn't `com.marblespins.app`). Restart. `GET /api/payments/apple/account` (logged in) now says `"live": true`. Sandbox purchases (TestFlight, App Review) are accepted by default, as App Review needs; `APPLE_ACCEPT_SANDBOX=false` refuses them.
6. **Sandbox testers:** App Store Connect → Users and Access → Sandbox → Test Accounts. On the test iPhone, sign in to the sandbox account under Settings → App Store → Sandbox Account.
7. **Test on the phone** (a TestFlight build): buy a pack → coins arrive, the order shows on Purchases and in the back office (provider `apple`, Apple's transaction id). Close the app during a purchase → the coins arrive at the next start (unfinished transactions are sent again). Buy the pass while the season is on (or on a test database) → the holiday tracks unlock; delete and reinstall the app → *Restore purchases* on the pass page shows it as owned. Refund a sandbox purchase (Settings → App Store → Sandbox Account → Manage → Refund) → within minutes the coins (or the pass) go, logged like a Stripe refund.

**Refunds:** only Apple refunds App Store purchases (the player asks at reportaproblem.apple.com); the back office can't. Apple's signed REFUND notification takes the coins back once (coins already spent show as "short") or revokes the pass. A pass bought outside its window or a second pass isn't given; the audit log shows `apple-pass-refused` so support can tell the player to ask Apple for the refund.

## Common problems

| Symptom | Likely cause and fix |
|---|---|
| Some addresses (in-game pages, `/race`, `/play`, `/preview`, `/admin`) answer Vercel's "404: NOT_FOUND" while the pre-rendered pages work | The fallback rewrite in `client/vercel.json` doesn't reach `app-shell` (with `cleanUrls` it must be `/app-shell`, not `/app-shell.html`). Promote the last good deployment, then check routing locally ("Checking the website's routing" above) |
| The website is blank (often only when logged in) while the page source has text | The pre-rendered copy and the app: check in a browser's console and with `client/test/prerender.test.js`. Fastest fix: Vercel → Deployments → promote the last good one |
| Website shows "Can't reach the server", the offline screen ("Can't reach the race track"), or CORS errors in the browser | Server down (Railway logs, `/health`). Or `VITE_API_URL` on Vercel is wrong. Or the site's address is missing from `CORS_ORIGIN` (marblespins.com and www are always allowed; add the vercel.app address) |
| Server won't start in production | `JWT_SECRET` missing or under 32 characters (the log says so). Or the database is unreachable (`DATABASE_URL`) |
| Logs show `[db-setup] FAILED, rolled back, no changes were made` | The schema or a data update failed. Nothing changed and the server runs on the old database. Read the error, fix the new file (it didn't run), and redeploy |
| Logs show `WARNING missing columns` or `WARNING race statuses differ from the code` | The database lags the code. Usually a failed migration (see the row above) |
| A paid player got no coins | Stripe → Developers → Webhooks → the endpoint → recent deliveries. A 400 there means a signature problem: `STRIPE_WEBHOOK_SECRET` doesn't match **this** endpoint, or the test and live secrets are mixed up. A 5xx means a server error (Railway logs `[stripe]`). Use "Resend" in Stripe: repeated events are safe and never credit twice |
| Coins taken back after a refund look wrong | Back office → Payments shows the refunded amount and the coins "short" (already spent). Each refund is in `payment_refunds`, the audit log and the coin ledger (`pack-refund`) |
| Android app: "Buying coins in the app isn't switched on yet" | `GOOGLE_PLAY_SERVICE_ACCOUNT` isn't set on Railway, or the server wasn't restarted |
| Android app: purchase made but no coins, logs show `Google Play 401` or `403` | The service account isn't invited in Play Console (Users and permissions) with the two permissions, or it's within the first ~24 hours. Coins are added later by itself (the app resends at login, the server checks hourly) |
| Android app: "This purchase belongs to another account" | The purchase was made while logged in to a different Marble Spins account on that phone; log in to that one |
| No Google notifications (`[google-play]` never in logs) | Pub/Sub topic permission for `google-play-developer-notifications@…`, the push address, or the `?token=` doesn't match `GOOGLE_PLAY_RTDN_TOKEN` (the server answers 403) |
| Play refuses the `.aab`: "signed with the wrong key" | Built with another key: use the original `.jks` from the backup, or request an upload-key reset |
| Play refuses the `.aab`: "version code already used" | `npm run app:version` (or `-- build`), commit, and build again |
| `npm run android:release` / `ios:release`: "already has a bundle" / "was already made" | That build number was built before: `npm run app:version` first. Never uploaded? Add `-- --again` |
| `npm run ios:release`: "Xcode isn't ready", or xcodebuild says the developer directory is a command line tools instance | Install and open Xcode once, then `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` |
| `xcodebuild archive`: "No Accounts", "No profiles for 'com.marblespins.app'", "requires a development team" | Sign in under Xcode → Settings → Accounts with the paid team's Apple ID; check `ios/apple-team-id.txt`; the bundle id must be registered and the app made in App Store Connect |
| App Store Connect refuses the upload: "bundle version must be higher" or "train is closed" | The build number was used (`npm run app:version -- build`), or that version is already approved (`npm run app:version`, a new version) |
| Checkout says Stripe isn't connected | No `STRIPE_SECRET_KEY`, or a live key without `STRIPE_ALLOW_LIVE=true` |
| A race seems stuck in countdown or running | Restart the server: `recover()` finishes or resumes every unfinished race from what is stored |
| Players see an old version of the website | It reloads itself once when old code files are gone. Otherwise a hard refresh. Check that Vercel finished building `Main` |
| `raceFingerprints` test fails | A change altered how past races run. **Do not ship it.** Revert the engine change, or move the change to the new physics with a version bump (`PHYSICS_VERSION`). Never re-record fingerprints without a deliberate decision |
| A track looks wrong (scenery in the track, camera inside a tunnel) | Drawing only, in `client/src/three/`; the race is unaffected. Run `node scripts/clear-check.js <slug> --clear-only` (covers the finish straight, the catch area after the line and the finish shot too). The picture after the race (a roof over it, the parked marbles hard to see, a marble right in front of the lens): `node scripts/finish-frame-check.js <slug>`. Mirrored text: `cd client && npx vitest run test/trackText.test.js` |
| Admin locked out of the back office | See [2-step reset](#back-office-admins-and-the-2-step-login) |
| "Forgot your password?" missing on the log-in page | `BREVO_API_KEY` isn't set on Railway (or the server wasn't restarted after setting it) |
| Reset email doesn't arrive | Look in Brevo → Transactional → Logs. If there's nothing there, see the Railway logs for `Brevo 4xx` (wrong key, or a sender that isn't verified). The player should also check spam. At most 3 links are sent per account per hour |
| Contact-form messages don't arrive by email | They are always in the back office (Support messages). The email needs `BREVO_API_KEY` (the address is support@marblespins.com unless `SUPPORT_EMAIL` overrides it), and that mailbox must exist; Railway logs show `[support] notification … failed` if Brevo refused it |
| A player says the contact form keeps failing | The form allows 6 messages an hour from one address ("Too many messages from here"). A form left open over 12 hours fetches a new token by itself |
| A player asks for their data or to be deleted | They can do both themselves in Settings. Support can delete from the back office (player → Delete account, with a reason) |
| The app shows an older design than the website | Compare the build at the bottom of any page (footer: "Build <date> UTC · app") with what `npm run app:sync` printed last ("Done (build …)"). Different: Android Studio or Xcode is running a project from another folder (an older download). In the folder you just synced, run `npx cap open android` (or `ios`) and Run from there. `app:sync` itself stops with an error if an app's copy of the web files isn't this build's |
| App shows "Can't reach the race track" | Same as the first row. The app talks to the address built in by `npm run app:sync` (`client/app-api.json`: the Railway address now, api.marblespins.com after the [switch](#the-servers-own-address-apimarblespinscom-prepared-22-oct-2026-not-switched-yet)) |

## Monitoring (today)

There is no paging or uptime monitor yet (see [gaps](07-gaps-roadmap.md)). Check these:
- Railway logs and metrics.
- `/health` (the database state and the version).
- The back office Economy page (daily players, races, coins, possible coin farming).
- Stripe's dashboard (payments, webhooks, disputes).
