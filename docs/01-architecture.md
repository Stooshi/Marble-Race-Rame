# 1. Architecture

*Last updated 14 Oct 2026 (Main 69b4a58).*

## The parts

```
                         players (browser, iPhone app, Android app)
                                   │                  │
            https://marblespins.com│(website files)   │ REST + live races (socket.io)
                                   ▼                  ▼
  ┌──────────────────────────────┐        ┌────────────────────────────────────┐
  │ Vercel: the website          │        │ Railway: the game server (Node)    │
  │ client/ built by Vite        │        │ src/ — Express API + socket.io     │
  │ static files only, no logic  │        │ races decided and streamed here    │
  │ /admin pages (noindex)       │        │ coins, shop, payments, back office │
  └──────────────────────────────┘        └───────────────┬────────────────────┘
                                                          │ SQL (pg pool)
  ┌──────────────────────────────┐        ┌───────────────▼────────────────────┐
  │ Capacitor apps (iOS/Android) │        │ Railway: PostgreSQL                │
  │ client/ios, client/android   │        │ schema: docs/database_schema.sql   │
  │ the same website, bundled    │        │ one-time changes: docs/data_updates│
  └──────────────────────────────┘        └────────────────────────────────────┘
                                                          ▲
  ┌──────────────────────────────┐   webhook (signed)     │
  │ Stripe: Checkout, Tax,       │────────────────────────┘ coins only after Stripe confirms
  │ (Brevo: email, called by the │
  │  server when the key is set) │
  │ receipts, refunds (web only) │◄── server creates Checkout sessions / refunds (API)
  └──────────────────────────────┘
```

| Part | Where it runs | Code | Deploys |
|---|---|---|---|
| **Website** | Vercel project `marble-race-rame-client`; domains marblespins.com, www.marblespins.com and the vercel.app address | `client/` (React 19, Vite, three.js) | **Automatically** on every push to `Main` |
| **Game server** | Railway service; public address https://marble-race-rame-production.up.railway.app | `src/` (Node 20 or later, Express 5, socket.io 4) | **By hand** by Moses (see the [runbook](05-runbook.md)). Pushing to `Main` does **not** deploy the server |
| **Database** | Railway PostgreSQL | `docs/database_schema.sql` + `docs/data_updates/*.sql` | Applied automatically by the server at every start |
| **Payments** | Stripe (web only) | `src/payments/` | Settings in the Stripe dashboard |
| **Apps** | iPhone and Android (Capacitor 8), app id `com.marblespins.app` | `client/ios`, `client/android` (wrapping `client/`) | Built on a Mac or PC (`npm run app:sync`); no store release yet |

**Note on the shared data files:** the server reads data files from inside the client folder: `client/src/shared/economy.json`, `client/src/shared/marbles/catalog.json` and `client/src/shared/payments/*.json`. Website and server therefore always use the same numbers. It also means the server must be deployed from the **whole repository**, not from `src/` alone.

## How the parts talk to each other

**Website or app → server (REST).**
- Every call goes to `${VITE_API_URL}/api/...` as JSON.
- A player is identified by a JWT in the `Authorization: Bearer` header. On the website it is stored in localStorage under `marble-race-token`.
- Guests ("Play free") get a real account with `is_guest = true`. Saving the account turns it into a normal one.
- The API reference is in the root `README.md`.

**Website or app → server (live races).**
- socket.io runs on the same address. The client sends `race:watch` with a race id.
- The server streams `race:countdown`, `race:start`, `race:frame` (10–20 a second), `race:finished` and `race:next`.
- The full event list is in the [code map](02-code-map.md#sockets).

**How a race is run.**
- Every race is decided entirely on the server before its countdown, from a random seed.
- The result is written to the database at that point, but the API keeps it hidden until the race has finished.
- The client only draws the positions it is sent. Nothing on the client can change a result.

**Back office.**
- The `/admin` pages are on Vercel. They aren't linked from the site, and search engines are told not to index them.
- All data and actions go through `/api/admin/*` on the server. The server checks on every request:
  - that the account is an admin;
  - that the 2-step code was given;
  - that the admin session was used within the last 30 minutes.

**Payments (web).**
1. The server creates a Stripe Checkout session.
2. The player pays on Stripe's page.
3. Stripe calls the server's webhook at `/api/payments/stripe/webhook`. The call is signed and the server checks the signature.
4. **Only then** are the coins added, once per payment.
5. Refunds and disputes arrive the same way and remove the coins.

**Payments (apps).** In-app purchases through Apple and Google are not built yet; the apps show a placeholder.

**CORS.**
- The server accepts calls from:
  - https://marblespins.com and https://www.marblespins.com (always);
  - the addresses listed in `CORS_ORIGIN` (for example the vercel.app address);
  - the apps' own addresses (`capacitor://localhost`, `https://localhost`).
- `CORS_ORIGIN=*` (the default) accepts every address.

**Email.**
- Sent through **Brevo** (EU), and switched off until `BREVO_API_KEY` is set on Railway.
- Today it sends **password-reset** links (`/forgot-password` → email → `/reset-password?token=…`).
- News emails will use the same sender; signed unsubscribe links are ready (`src/email/unsubscribe.js`).
- Stripe sends its own receipts.

## Environments

| | Local development | Production |
|---|---|---|
| Website | `cd client && npm run dev` → http://localhost:5173 | Vercel → https://marblespins.com |
| Server | `npm run dev` → http://localhost:5000 | Railway |
| Database | Local Postgres (`DATABASE_URL`) | Railway Postgres |
| Stripe | Test keys, or `PAYMENTS_TEST=true` (instant fake payments, refused in production) | Test keys now; live keys only when Moses decides (`STRIPE_ALLOW_LIVE=true`) |

There is no separate staging server. Vercel makes a preview build for every branch; those previews talk to the production server unless their `VITE_API_URL` points elsewhere.

## Variables (names only)

### Railway (server)

| Variable | Needed | What it does |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection (Railway sets it) |
| `DATABASE_SSL` | depends on the database | `true` for managed Postgres that requires TLS |
| `DATABASE_POOL_MAX` | no | Pool size (default 10) |
| `JWT_SECRET` | **yes** (at least 32 characters in production) | Signs login tokens. Also the fallback key for the admin 2-step secrets and email links, so changing it logs everyone out |
| `JWT_EXPIRES_IN` | no | Login lifetime (default 7 days) |
| `BCRYPT_ROUNDS` | no | Password hashing cost (default 12) |
| `ADMIN_2FA_KEY` | recommended | Encrypts the admin 2-step secrets. Changing it forces every admin to set up the 2-step login again |
| `EMAIL_LINK_SECRET` | recommended | Signs unsubscribe links. Changing it breaks links in emails already sent |
| `BREVO_API_KEY` | to send email | Brevo API key (v3). Without it, email is off and "Forgot your password?" is hidden |
| `EMAIL_FROM` | with Brevo | Sender address, verified in Brevo (default `no-reply@marblespins.com`) |
| `EMAIL_FROM_NAME` | no | Sender name (default "Marble Spins") |
| `CORS_ORIGIN` | no | `*`, or a comma-separated list of extra website addresses (e.g. the vercel.app one) |
| `PUBLIC_SITE_URL` | no | The website's main address (default https://marblespins.com). Stripe returns players here if their own address isn't recognised |
| `NODE_ENV` | yes (`production`) | Turns on the production checks |
| `PORT` | set by Railway | |
| `STRIPE_SECRET_KEY` | for payments | `sk_test_…` now |
| `STRIPE_WEBHOOK_SECRET` | for payments | `whsec_…` from the webhook endpoint in Stripe |
| `STRIPE_ALLOW_LIVE` | **only when going live** | `true` lets a `sk_live_…` key work |
| `STRIPE_TAX` | no | `off` turns off Stripe Tax |
| `STRIPE_TAX_CODE` | no | Default `txcd_10000000` (to be confirmed by the accountant) |
| `STRIPE_TOS_IN_CHECKOUT` | no | `true` also asks for the terms on Stripe's page |
| `PAYMENTS_TEST` | never in production | `true`: instant fake payments, for local development |
| `RACE_COUNTDOWN_MS`, `RACE_MIN_DURATION_MS`, `RACE_MAX_DURATION_MS`, `RACE_DEFAULT_MARBLES`, `RACE_TICK_RATE_HZ`, `RACE_NEXT_DELAY_MS` | no | Race timing defaults (see the root README) |
| `RAILWAY_GIT_COMMIT_SHA`, `SOURCE_COMMIT` | set by the platform | Shown on `/health` as the commit, when known |

### Vercel (website)

| Variable | What it does |
|---|---|
| `VITE_API_URL` | The server's address (the Railway URL). Built into the website at build time |
| `VITE_SITE_URL` | Optional; canonical address, default https://marblespins.com |
| `VITE_PAYMENTS_TEST` | Development only: `true` uses the fake payment provider |

### The apps

The apps are built with `npm run app:sync`. This sets `VITE_API_URL` to the live Railway address unless another https address is given. They need no other settings.

### Stripe dashboard (settings, not variables)

- **Webhook endpoint:** `https://<server>/api/payments/stripe/webhook`. The events are listed in the [runbook](05-runbook.md#stripe).
- **Also turn on:**
  - Stripe Tax;
  - Adaptive Pricing;
  - Apple Pay and Google Pay;
  - email receipts.

## Checking what is live

- `GET https://marble-race-rame-production.up.railway.app/health` returns a JSON object with:
  - `status` and `db`;
  - `version.commit` (when the platform provides it);
  - `version.codeFingerprint`: a hash of all server code, so a deploy uploaded by hand can still be identified;
  - `version.simulator` and `version.physics`: the race engines' versions.
- To compare with a checkout of the code: `node -e "console.log(require('./src/version').VERSION.codeFingerprint)"`.
- The website's version is whatever Vercel last built from `Main` (see the Vercel dashboard).

## Scaling limits (today)

- **One server instance only.** Race timers live in the memory of the server that started the race. Running several instances would need the socket.io Redis adapter and one owner per race (see "Scaling notes" in the root README).
- Races are simulated in a worker thread, so the main thread keeps streaming.
- The database is a single Railway Postgres.
