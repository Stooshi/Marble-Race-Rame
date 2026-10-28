# Videos for social media (the recorder)

Development tools only: nothing here is part of the website or the apps (Vite builds only `index.html`
and what it imports; this folder is never imported, and the finished videos are kept outside the repository).
Nothing is ever posted from here: Moses reviews and posts.

## What makes a video

| File | What it is |
| --- | --- |
| `texts.json` | **Every word on screen**, in one file: the taglines, the replay labels, the podium title and the end card. Change a line, render again. `{track}` and `{marble}` are filled in. |
| `assets.mjs` | The sounds used: the game's own files in `public/audio/` (the race tunes, the start beeps, the gate sound, the ceremony song) and the logo's whoosh from `music-inbox/` (soundreality, Pixabay 383023). Licences: `music-inbox/LICENCES.md`. Music and on-screen text only, no voice-over. |
| `recorder.html`, `recorder.js` | The recorder's page: the track and race drawn by the game's own `TrackScene`, with the game's cameras (the follow camera, the track's TV moments, the countdown and finish shots, the winner's push-in), the calm helicopter flyover made longer (`?fly=<ms>`, 15 s in the productions), trackside pans and fixed cameras for replays, and the texts and podium card over the picture. No buttons, no game interface. The field wears the standard collection's finished looks (never a seasonal or limited one) and is named after them. |
| `logo.html` | The logo sting (versions A, B and C) and the end card, drawn as a function of time. |
| `plans.mjs` | What goes into each kind of video, shot by shot: `production` (horizontal, about 2 minutes) and `cutdown` (vertical, 30–60 s). |
| `record.mjs` | Draws the frames in a headless browser, 60 fps, 1920×1080 (`--format wide`) or 1080×1920 (`--format tall`), mixes the sound (levelled to -14 LUFS, the level YouTube, TikTok and Instagram play at) and writes the MP4 (H.264, AAC). `--stills 1,5,10` writes those seconds as pictures instead, for checking. |
| `render-logo.mjs` | The logo sting alone (`node video/render-logo.mjs A out.mp4 [--tall] [--end]`). |
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
