# Videos for social media (the recorder)

Development tools only: nothing here is part of the website or the apps (Vite builds only `index.html`
and what it imports; this folder is never imported, and the finished videos are kept outside the repository).
Nothing is ever posted from here: Moses reviews and posts.

## What makes a video

| File | What it is |
| --- | --- |
| `template.json` | **The video template** (Moses, 28 Oct 2026), the one file every video follows: calm and stylish, the races bring the energy; the brand's colours (navy #0E1320, yellow #FFD21F, orange #FF7A1A, and the logo's near-white for words), one font (Lilita One) for all text, one text style and place (one line, centred in the top band, pure white with a tight dark outline and a soft shadow, fading in in 0.15 s: high contrast on any picture, Moses 30 Oct 2026), the small Marble Spins mark in the same corner on every frame (top right), intro A on the productions, the same end card on everything ("Pick your marble. Race your friends. Play free at marblespins.com") with intro A's whoosh as its signature sound, the music lifted a little at the big moments, the game's lines (`promos`: 3–4 per video, rotated across videos with `--promos <n>`, placed in calm moments) and **every word on screen**. Change it here and render again. `{track}` and `{marble}` are filled in. |
| `assets.mjs` | The sounds used: the game's own files in `public/audio/` (the race tunes, the start beeps, the gate sound, the ceremony song) and the logo's whoosh from `music-inbox/` (soundreality, Pixabay 383023). Licences: `music-inbox/LICENCES.md`. Music and on-screen text only, no voice-over. |
| `recorder.html`, `recorder.js` | The recorder's page: the track and race drawn by the game's own `TrackScene`, with the game's cameras (the follow camera, the track's TV moments, the countdown and finish shots, the winner's push-in), the calm helicopter flyover made longer (`?fly=<ms>`, 15 s in the productions), trackside pans and fixed cameras for replays, and the texts and podium card over the picture. No buttons, no game interface. The field wears the standard collection's finished looks (never a seasonal or limited one) and is named after them. |
| `logo.html` | The logo sting (versions A, B and C; Moses chose A, the marble rolling in, 28 Oct 2026) and the end card, drawn as a function of time. |
| `director.mjs` | **The director** (Moses, 29 Oct 2026: "the pack is the show"): reads the race before it is filmed (bunches, contacts, overtakes in the pack, marbles in the air, lead changes) and picks the shots: the start wide (from behind the gate, high, looking down the track as all 20 leave it, so the lane and gate markings read the right way up; Moses, 30 Oct 2026), about half the race on the pack (the game's follow camera on the bunch's last marble so the bunch is in front of the lens, or a wide chase camera behind the bunch; the TV cameras show the pack coming towards them), back to the leader for lead changes and the last stretch, the finish head-on so the leader and the chasers are seen arriving; 3–6 s a shot. |
| `plans.mjs` | What goes into each kind of video, shot by shot: `production` (horizontal, about 2 minutes), `broadcast` (horizontal, about 1:40: the race as a TV broadcast, below), `cutdown` (vertical, 30–60 s) and `clip` (vertical, 10–30 s: `--clip flyover|close|wild|pick`, `--at <race ms>` for a wild moment: it follows the marble highest in the air then if it flies 1.5 m or more, otherwise the leader just after). |
| `record.mjs` | Draws the frames in a headless browser, 60 fps, 1920×1080 (`--format wide`) or 1080×1920 (`--format tall`), mixes the sound (levelled to -14 LUFS, the level YouTube, TikTok and Instagram play at) and writes the MP4 (H.264, AAC). `--stills 1,5,10` writes those seconds as pictures instead, for checking. |
| `render-logo.mjs` | The logo sting alone (`node video/render-logo.mjs A out.mp4 [--tall] [--end]`). |
| `spotlight.html` | The Marble Spotlight's close-up (3 Nov 2026): one marble in the shop's own 3D look (the shared materials), spinning, then its name, rarity, Marble ID and collection, with "Looks only. Every marble races the same." Drawn as a function of time (`window.spotAt`). |
| `../../scripts/video-pick.js` | Picks the race by searching seeds (Moses, 3 Nov 2026): a pack of 3–4 side by side through at least two curves, 3–4 marbles over the line within about 0.3 s, a close gap; writes the moments (`video`: the curves, the signature feature, the Spotlight's marble) into the race file. |
| `../../scripts/video-race.js` | Picks the race: runs a track's races locally on the real simulator (seeds 900001 + k × 7919) and scores them for a close finish, late lead changes and the top three swapping; writes the race for the recorder. It never reads or changes the database. |

## Making one

```
node scripts/video-race.js pyramid-run                 # the best of 80 races (or --seed <n>)
cd client
node video/record.mjs pyramid-run pyramid-run.video-1090057 --kind production --tune 7 --logo A --out ~/videos/pyramid-run.mp4
node video/record.mjs pyramid-run pyramid-run.video-1090057 --kind cutdown --format tall --tune 7 --out ~/videos/pyramid-run-vertical.mp4
```

Drawing is done in software (no graphics card here): about half a second a frame at 1080p, so a
2-minute production takes about an hour.

## A production, shot by shot

1. The teaser: 2.6 s of the race's best moment, from the last TV camera, slowed a little.
2. The logo sting (2 s, A, B or C), with the whoosh.
3. The flyover (15 s): the wide overview, then slow moves to the highlights; the track's name, then "20 marbles. One winner."
4. The countdown with the start beeps, the fourth on GO; the gate sound at GO.
5. The whole race through the game's cameras and TV moments, with two trackside pans where the top five reshuffle; "Final stretch!", then "Photo finish!" (a finish closer than 0.4 s) or "<marble> wins!".
6. Replays: the finish in slow motion from beside the line (when it was close), the best overtaking moment and the first TV camera's moment, at half speed.
7. The podium card (the first three, their looks and times) over the finish, with the ceremony song.
8. The end card: the logo, "Pick your marble. Race your friends." and "Play free at marblespins.com".

The vertical cut-down: the last seconds of the countdown, the start, the TV moments and an overtake, the last 8 seconds to the line, the slow-motion finish, the podium and the end card.

## The broadcast (`--kind broadcast`, Moses, 1 Nov 2026)

One whole race as a TV motorsport broadcast, in our own style only (navy, yellow, orange, Lilita One, the mark top right; nothing copied from any real series, team, driver, sponsor or game). Its words are all in `template.json` `broadcast` (the hook lines, the intro card, the captions, the results board, the end card's lines).

1. The hook (5 s): the final metres in slow motion from beside the line, frozen 0.4 s before the winner's line with the three contenders side by side ("0.064 seconds decided it."), rings and names on the three ("Who wins? Pick one."), a quick rewind ("20 marbles. 1 minute 40. Watch.", the video's own length). The winner is shown only at the real finish.
2. The flyover (4.5 s) with the intro card ("MARBLE SPINS GRAND PRIX · DUBAI") for 1.5 s; the countdown (3.5 s); GO by 13 s on the whole pack leaving the gate.
3. The race with the overlay: the standings tower top left (the top 10: place, the marble's colour, its name, the gap to the front of the race, green and red arrows for places won and lost in the last 1.5 s), the race clock and the three sectors top right beside the mark, name tags over the marbles near the camera; cuts every 2–4 s.
4. The captions, lower third, one at a time, at the race's own moments (the grid, GO, the first bunch, the first big overtake, a pack shot, a calm stretch, a lead change, the three contenders close, the final stretch); a line whose moment doesn't happen is left out.
5. The finish live (from high behind the line), then in slow motion ("PHOTO FINISH", then the winner's time); the results board for 8.4 s (the winner's card, then place, marble, start gate, time and gap for all 20), then its caption over the finish area (so the board never hides it); the end card.

```
node scripts/video-race.js dubai-marble-grand-prix --seeds 120
cd client && node video/record.mjs dubai-marble-grand-prix dubai-marble-grand-prix.video-1794848 --kind broadcast --tune 7 --out ~/videos/dubai-broadcast.mp4
```

### A track's own captions (`template.json` `broadcast.captionSets.<slug>`)

A track can have its own broadcast lines: they replace the shared captions key by key (the rest stay). Sognefjord has one (Moses, 1 Nov 2026, the long YouTube version: racing lines and a few fjord lines, all different from Dubai's). Its race: `sognefjord.video-1066300` (seed 1066300, won by 0.009 s, the third 0.054 s back), the closest of 120 not used in the two verticals:

```
node scripts/video-race.js sognefjord --seed 1066300
cd client && node video/record.mjs sognefjord sognefjord.video-1066300 --kind broadcast --tune 7 --out ~/videos/sognefjord-grand-prix-broadcast.mp4
```

### The A/B opening test (`--kind abTall --opening old|new --format tall`, Moses, 2 Nov 2026)

Watch time was stuck at about 5 s, so four 15 s verticals that differ only in the opening (`template.json` `abTall`, every word there):

- **old:** 0–3 s frozen just before the line, the contenders marked, "Who wins? Pick one.", a quick rewind.
- **new:** no freeze: frame 1 is already the race's busiest bunch (the game's follow camera), with the track's own big line on screen from frame 1 (`newHooks` by slug: Flipper Spins "Bumper chaos.", Venice Cube Canals "Through the canals.").
- **Then the same for both:** three fast cuts (1.7, 1.6, 1.7 s) of the busiest moments with the small lines "20 marbles. Real physics." and "Race up to 19 friends in one race." (`#line`); the finish as a speed ramp (one low camera close behind the first two, `rampChase`: 1.4 s slowed to about a third, then 1.6 s at full speed through the line into the finish area; never a camera looking back up the track); the winner and the gap; the winner and the big end card (`#endBig`: "Play free" and "marblespins.com", the address 11vmin ≈ 119 px, our yellow) seen from a little above the winner (`wonChase`, so marbles arriving behind never hide it), frozen and dimmed to 55%, held 3 s (2.57 s readable), then the 0.25 s fade into frame 1, so it loops.

Pick races with comparable gaps for all four, so the opening is the only difference:

```
node scripts/video-race.js flipper-spins --seed 1668144        # 0.024 s
node scripts/video-race.js niagara-cube-falls --seed 1581035   # 0.021 s
node scripts/video-race.js grand-canyon-burst --seed 1565197   # 0.020 s
node scripts/video-race.js venice-cube-canals --seed 1549359   # 0.018 s
cd client && node video/record.mjs flipper-spins flipper-spins.video-1668144 --kind abTall --opening new --format tall --tune 9 --out ~/videos/ab-1900-tiktok-flipper-new.mp4
```

Render from a copy that nobody edits while it runs (the recorder runs on a live development server: an edited file reloads the page and stops the render).

### The end card rule (every video, Moses, 1 Nov 2026)

The end card is on screen for **at least 2.5 s, fully readable** (`template.json` `endCard.minSeconds`); making a plan stops with an error otherwise. The logo-page end card (production, cutdown, clip, broadcast) lasts `endCard.seconds` (4.5–5 s): its lines fade in by 1.8 s (`endCard.linesIn`), so they are readable 2.7–3.2 s (the broadcast's 2.8 s). The vertical broadcasts end on their play line instead (`endHold()` in `plans.mjs`): held `endCard.hold.seconds` (3 s) on a calm frame, the finish frozen, dimmed to 38% navy over 0.4 s (`#dimFx`), readable for at least 2.5 s before the loop's 0.25 s fade into the first picture.

### The vertical cut (`--kind broadcastTall --format tall`, Moses, 1 Nov 2026)

27 s for TikTok, Reels and Shorts, 1080×1920: 0–3 s the hook (frozen 0.65 s before the winner's line, the three contenders marked, "Who wins? Pick one."), 3–4 s a quick rewind to GO, 4–18 s six cuts of the best moments (the start scramble, the biggest bunch, the biggest overtake, a lead change), 18–23 s the final stretch and the photo finish in slow motion, 23–24.3 s the winner, then 24.3–27.3 s "Play free at marblespins.com" held on the frozen finish, slowly dimmed (the end card rule below). A compact tower (top 5) and the race clock, bigger text, nothing in the bottom 20% or at the right edge. It ends on the hook's first view, so it loops. Its words: `template.json` `broadcast.tall`.

### Two different vertical cuts of one track (`--kind broadcastTallV --variant A|B --format tall`, Moses, 1 Nov 2026)

For the same night on two apps (Sognefjord: A for TikTok, B for Instagram): two different races (the two closest of a batch: `node scripts/video-race.js <slug> --seeds 120 --top 120`, then `--seed <n>` for each), two hooks (A: frozen before the line, the contenders marked; B: the race's biggest overtake frozen as it starts, "Watch number <place> go."), other cameras (B chases where A follows, its finish from high behind the line), the variant's own lines and the intro tag, then "PHOTO FINISH", the winner and the gap, "Race your friends. Play free at marblespins.com", held 3 s on the frozen, dimmed finish (about 27.3 s in all). The last 0.25 s fade into the first picture, so it loops. Words: `template.json` `broadcast.tallVariants`.

### Race shorts, the long broadcasts and the Marble Spotlight (Moses, 3 Nov 2026)

Pick the race by searching, not by luck: `scripts/video-pick.js` runs about 300 seeds per track and keeps the race with all three of a pack of 3–4 side by side through at least two curves, 3–4 marbles over the line within about 0.3 s and a close gap (it prints how many had all three).

- **`--kind raceTall --opening old|new --format tall`** (15 s): the opening (old: frozen before the line, "Who wins? Pick one."; new: the start is frame 1 with the track's line from `raceTall.newHooks`), the start (from behind and above the gate, then cut on to the plunge with the game's camera), two curves with the pack low and close (not in the last 6 s), the signature feature, the speed-ramp finish low behind the 3–4 that cross together, a four-row results board (place, marble, gate, gap), the big end card held 3 s. A track's own feature camera: `raceTall.features.<slug>` (`camera: "game"`: the game's camera on a marble a few places back in the group, for halls, roofs and blocks); `raceTall.curveCameras.<slug>`: `"game"` where blocks stand in a chase camera's way.
- **`--kind broadcast`** on a race picked this way puts in up to three curves and the feature, and ends in a slow speed ramp (`broadcast.slowRamp`) before the slow-motion replay; outside the Grand Prix the cards name the track and series (`broadcast.otherSeries`).
- **`--kind spotlight --format tall`** (15 s): `node scripts/video-pick.js <slug> --seeds 150 --spotlight <look>` gives the look to the middle marble of the race's longest pack through a curve (looks only); then the 4 s spin, the name, rarity and Marble ID, that marble marked in the pack, "Collect it. Race it.", the end card.
- **The end card's follow line** (Moses, 4 Nov 2026): the race shorts and the Spotlight (`raceTall.endCard`, `abTall.endCard`) carry a third line, "Follow for a new race every day", under the address (`#endBig3`).
- **A feature filmed from the track's own TV camera** (4 Nov 2026): `raceTall.features.<slug>.tv` = the number of its `tvCameras` entry, turning to keep the group in the picture (Pudong: the loop with the lit skyline behind it, `{ "tv": 0, "fov": 50, "leadMs": -2400 }`); a fixed `eye` beside it works the same way (Saint-Tropez: the loop seen from the land side with the sea behind it, `{ "eye": { "p": 0.29, "beside": 42, "up": 16, "fov": 52 }, "leadMs": -2400 }`). A negative `leadMs` starts the shot later, so the marbles are in the loop.
- **`--tune <n>`** takes the race tunes that exist, 3–14 (`client/public/audio/tune-<n>`); another number stops the render at the sound mix, after drawing every frame.
- The field never wears a design in `houseLooksExclude` (Champion Shooter while its trademark check is open).
- Long videos take about 2 hours to draw: a background job stops at 2 hours, so draw them in two parts (`--to 48`, then `--from 48`, at a shot's start) and join them with `ffmpeg -f concat -c copy`.

```
node scripts/video-pick.js elderglade-marble-grand-prix --seeds 300 --feature "Waterfall plunge"
cd client && node video/record.mjs elderglade-marble-grand-prix elderglade-marble-grand-prix.video-1113814 --kind raceTall --opening new --format tall --tune 9 --out ~/videos/1900-tiktok-elderglade-new.mp4
```
