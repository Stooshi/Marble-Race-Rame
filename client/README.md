# Marble Race — Frontend

React frontend for Marble Race, built with Vite. It talks to the backend REST API and Socket.io server at `http://localhost:5000` by default.

## Quick start

```bash
# 1. Start the backend (from the repo root): see ../README.md
npm run db:migrate && npm run dev        # listens on :5000

# 2. Start the frontend
cd client
cp .env.example .env                     # optional: change VITE_API_URL
npm install
npm run dev                              # http://localhost:5173
```

Set `CORS_ORIGIN=http://localhost:5173` in the backend `.env` (or leave it as `*` in development).

| Script | |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Vitest unit tests for formatting, split detection and track geometry |

## Pages

| Route | Page | What it shows |
| --- | --- | --- |
| `/` | `Home` | Sign in / create account, live and open races, recent results, leaderboard |
| `/dashboard` | `Dashboard` | Your profile, coins, all-time stats, track-specific records, recent races, open lobbies, and the **New race** form |
| `/profile/:userId` | `Dashboard` | Another player's public profile, stats and track records |
| `/race/:raceId` | `Race` | Lobby (enter a marble, start or cancel) → countdown → live race → finish banner |
| `/results/:raceId` | `Results` | Podium, your race against your personal bests, full results with halfway splits, and a replay |

## Components

| Component | Purpose |
| --- | --- |
| `MarbleSelector` | Your marbles (owned + free starters) with stat bars, plus a shop tab to buy more with coins |
| `TrackSelector` | **Choose track** (cards with layout preview, difficulty and your best time) or **Random track** (the server picks one when the race is created). **Shuffle** picks a random track you can see before racing |
| `RaceViewer` | Canvas renderer: track, obstacles, start/½/finish lines, 20 animated marbles, clock, live standings and the halfway split board. Used for both live races and replays |
| `Leaderboard` | Global leaderboard sortable by wins, podiums, races or coins |
| `StatsDisplay` | All-time stat tiles and the per-track records table |

## How the race is shown

- The server decides the race and streams about 10 frames per second over Socket.io (`race:frame`). `useRaceStream` keeps the last two frames and the renderer interpolates between them at display frame rate, so marbles move smoothly whatever the network jitter.
- **Halfway splits.** During a live race, the client interpolates each marble's halfway time between the two frames where it crosses 50% progress, and shows it on the split board straight away. When the race finishes, the official split times from the server replace these. If you join a race in progress, splits that happened before you joined show as `—` until the official results arrive.
- **Replays.** `GET /api/races/:id/replay` returns every frame. `useReplay` plays it back with play/pause, scrubbing and 1×/2×/4× speed through the same `RaceViewer`.
- **Personal bests.** The results page uses each result's `comparison` from the API to show your finish time, halfway split and the track record next to your previous bests, with PB, split PB and track-record badges.

## Responsive layout

The layout is mobile-first, with breakpoints at 640px and 960px:

- The race viewer's standings move below the track on narrower screens.
- Tables turn into stacked cards on phones.
- The nav collapses to the logo plus links.

It was checked at 375px and 1366px wide, with no horizontal scrolling on any page.

## Project layout

```
src/api/            fetch client (VITE_API_URL) and the shared Socket.io connection
src/context/        AuthContext: JWT in localStorage, current user, socket
src/hooks/          useAsync, useLobby, useRaceStream (live), useReplay
src/utils/          time formatting, split detection, track geometry
src/components/     MarbleSelector, TrackSelector, RaceViewer, Leaderboard, StatsDisplay, …
src/pages/          Home, Dashboard, Race, Results
test/               Vitest unit tests
```
