# Daily video order

Moses's standing order, given on 5 Nov 2026. It runs from 6 Nov 2026 until Moses says stop.

**Trigger:** Moses writes "videos today". Make the set below that day. Don't make videos without the trigger.

## The set

### 17:00 set (ready by 16:30 Stockholm time)

| Slot | Format | Opening |
|---|---|---|
| TikTok Short | vertical | NEW |
| Instagram Reel | vertical | OLD |
| YouTube Short | vertical, a copy of the 17:00 TikTok | |
| YouTube LONG | horizontal, about 1:40, on a track not used in that day's Shorts | |

The YouTube LONG video needs a proper thumbnail: a sharp shot of the pack with big, short text.

### 23:00 set

| Slot | Format | Opening |
|---|---|---|
| TikTok Short | vertical | OLD |
| Instagram Reel | vertical | NEW |
| YouTube Short | vertical, a copy of the 23:00 Instagram Reel | |

### Sunday 09:00 set (Moses, 8 Nov 2026: on Sundays, on top of the 17:00 and 23:00 sets; posted 9:00–10:00 Stockholm time, ready the evening before)

| Slot | Format | Opening |
|---|---|---|
| TikTok Short | vertical | NEW |
| Instagram Reel | vertical | OLD |
| YouTube Short | vertical, a copy of the 09:00 TikTok | |

- One of the two is a Grand Prix track on a seed never used on any Grand Prix track; the other a track not used in the last 7 days (and never Champion Shooter).
- The same rules as every other video (below): packs at the curves and the finish, the end card, fresh lines.
- The three sets in a row on one platform count for the theme rotation and the 7-day line rule, so the 09:00 set sits between the night before's 23:00 and the day's 17:00.

### Video type: speed montage (Moses, 8 Nov 2026)

Instead of one race, when Moses asks for it in a slot (the first: 8 Nov 23:00, all three platforms):
- **15–20 s of fast cuts**, 1.5–3 s each, from **at least 6 tracks, Grand Prix included** (never Champion Shooter): waterfall free falls, plunges, speed pads, loops, steep drops, the fastest straights.
- **Low, close chase camera** behind the busiest group through each (`plans.mjs speedShot`, `template.json speedMontage.chase`).
- **The race music** (one tune under the whole montage) and **the game's speed-pad whoosh** on each shot that crosses a pad.
- **Short on-screen lines**: e.g. "Fast." / "Faster." / "Everyone thinks their marble is the best.", and the end card "Which one is yours?" / "marblespins.com" / "Follow for a new race every day", held 3 s. **Never say or suggest that buying makes a marble faster** (`montageLine()` refuses buy, shop, pay, upgrade and money words).
- **One vertical file** for TikTok, the Instagram Reel and the YouTube Short.
- **Check every shot's frames before sending** (9 Nov: the low chase went into the ground or a wall on drops and in chutes). A shot list can give a shot its own `lead` (ms; negative starts after the group reaches the section) and `chase` (`up`, `back`, …: higher where the low camera would hit a bank), or the shot is replaced by another on the same series.
- Make it: one race per shot with `node scripts/video-pick.js <slug> --seeds 60 --top 1 --feature "<section>"` (Grand Prix tracks on seeds never used on a Grand Prix track), a shot list in `client/video/montages/<date>-speed.json`, then `cd client && node video/speed-montage.mjs video/montages/<date>-speed.json --tune 11 --out ~/videos/<slot>-speed-montage.mp4`. The montage counts as the slot's theme SPEED for the rotation; its lines go in the log, and its Grand Prix seeds in the seed list. Its tracks are not added to "Tracks already used" (a few seconds each, not a race).

### Video type: collision montage (Moses, 10 Nov 2026)

Instead of one race, when Moses asks for it in a slot (the first: 10 Nov 17:00 and 23:00, all three platforms):
- **15–20 s of cuts**, 1.5–3 s each, from **at least 6 tracks in at least 3 series, Grand Prix included** (Pinball, Blocks, Grand Prix, Canyons, …; never Champion Shooter); different tracks in each montage of the day.
- **Satisfying collisions**: marbles bouncing off each other, off pegs, pinball bumpers and flippers, splitter tips and obstacles, packs bumping through tight bends.
- **Some shots in slow motion** (at least 2, at 0.5x, so each hit is clear), mixed with normal speed.
- **Low, close chase camera** on the pack (the speed montage's `speedShot`).
- **Sound:** the game's own click (marble on marble) and bump (marble on obstacle) up front, on each real hit as it happens in the shot (later in slow motion), louder the harder; the race music low under them (`template.json` `collisionMontage`).
- **Very little text**: e.g. "So satisfying." / "Click. Clack.", and the end card "Which one is yours?" / "marblespins.com" / "Follow for a new race every day". The second montage of the day gets its own lines on the same idea. No buy, shop, pay or upgrade words (`montageLine()`).
- **One vertical file per slot** for TikTok, the Instagram Reel and the YouTube Short.
- **Check every shot's frames before sending** (as the speed montage), and that each shot really has hits and clicks (the report beside the file lists them).
- Make it: one race per shot with `node scripts/collision-pick.js <slug> --p <a>-<b> --race-ms <ms> --seeds 60` (`--hard` for the hardest hits and biggest pile-ups, Moses 11 Nov 2026; for marbles big in frame a closer camera per shot, `"chase": { "back": 5, "up": 1.9, "ahead": 4, "fov": 62 }`, as on 11 Nov) (the stretch with the pegs, bumpers or splitter; `--race-ms` 1200 for a 2.4 s shot at 0.5x, 2000 for a 2 s shot; Grand Prix tracks with `--first 3000001` or later, on seeds never used on a Grand Prix track), a shot list `client/video/montages/<date>-<slot>-collision.json` (`{ "type": "collision", "shots": [...] }`, `"speed": 0.5` on the slow shots), then `cd client && node video/speed-montage.mjs video/montages/<file> --tune 11 --out ~/videos/<date>-<slot>-collision-montage.mp4`. The montage counts as the slot's theme COLLISIONS for the rotation; its lines go in the log, and its Grand Prix seeds in the seed list. Its tracks are not added to "Tracks already used" (a few seconds each, not a race).

### Video type: track montage (Moses, 13 Nov 2026)

One track's big moments from **one race**, cut together, when Moses asks for it (the first: Nevada Drag Strip, 13 Nov 23:00):
- **15–20 s**, at least 4 shots of 1.5–3 s, in the order of the track; Moses names the shots and the lines.
- Shots: `"start": true` (the game's own countdown camera and start lights, from `"startAt"` ms before GO), a low chase from where the group reaches `"p"` on the track, or `"follow": "leader"` (the game's camera on the leader, where a wide section spreads the group too far for the low chase, e.g. a half-pipe); `"padP"` puts the speed-pad whoosh on the pad.
- **Two formats** when asked: vertical (TikTok, the Instagram Reel, the YouTube Short) and `--format wide` (1920 × 1080, YouTube), the same shot list.
- Make it: `node scripts/video-pick.js <slug> --seeds 300 --first <fresh> --feature "<section>"`, a shot list `client/video/montages/<date>-<slot>-<track>.json` (`{ "type": "track", "shots": [...] }`), then `cd client && node video/speed-montage.mjs <list> --tune 11 [--format wide] --out ~/videos/<file>.mp4`. Its seed goes in the Grand Prix seed list on a Grand Prix track; the track goes in "Tracks already used". The same line rules (`montageLine()`: no buy, shop, pay, upgrade or money words).

## Rules for every video

- **Picking the race:**
  - search 300 seeds for each race;
  - keep packs of 3–4 through the curves and at the finish.
- **Feature and layout:**
  - show the track's signature feature properly;
  - follow the `template.json` rules, see `README.md`.
- **Champion Shooter** appears nowhere: not in the field, not on the standings or results boards. Its trademark check is still open; `houseLooksExclude` handles this.
- **End card:** "Follow for a new race every day".
- **Tracks:**
  - use live tracks only;
  - use only tracks never used in a video before (list below), except Grand Prix tracks (next point);
  - every day includes at least one Grand Prix track: Sahara on 7 Nov 2026, the last one never used. From 8 Nov a Grand Prix track may be used again, always on a new seed: **never a seed already used on any Grand Prix track** (list below; the shared-layout tracks run the same race on the same seed). Add every Grand Prix video's seed to the list (Moses, 6 Nov 2026).
- **Dubai and Frostmere Marble Grand Prix still share one layout** (the other Grand Prix kit tracks have their own since 6–8 Nov 2026). On the same seed they run the same race; only the looks differ. The seed rule above stays for every Grand Prix track (Moses, 6 Nov 2026).
  - On these tracks the TV cameras film from under the raised track, which shows empty hills.
  - Film the feature with a close camera behind the pack instead.

## Delivery and report

- Send each file to Moses as soon as it is checked.
- For each video, report:
  - file;
  - slot;
  - track;
  - opening;
  - winner and gate;
  - winning gap;
  - how close the pack was at the finish (e.g. "3 within 0.107 s").
- Report each video's theme and its on-screen lines too.
- Mention anything else that matters: a seed that was replaced, a changed opening line, or a commit to the video tools.
- **After each day,** add that day's tracks to the list below in the same commit as any tool changes, so the next session doesn't reuse them.

## On-screen text (Moses, 5 Nov 2026)

Every video gets fresh on-screen text written from the themes below. No line repeats within 7 days on the same platform (check the log at the end of this file).

**Line rules:**
- at most 6 words (the tool refuses longer lines);
- in the template's safe zone (the top band);
- readable in under 2 seconds.

**Theme rotation:** no two videos in a row on the same platform use the same theme. The YouTube Shorts are copies, so they share a theme with their source video; the YouTube long video rotates on its own.

**Themes and example lines:**
1. **SPEED:** "60 km/h into the first bend." / "Flat out to the line." / "No brakes. Only physics." / "Faster than you can blink."
2. **WINNING:** "Only one takes the gold." / "Decided by a hundredth." / "Leader to last in one bend." / "From gate 17 to the win."
3. **RACING FRIENDS:** "Race your friends. Free." / "Send a code. Race together." / "Who in your group wins?" / "Your crew vs. 20 marbles."
4. **CHALLENGE:** "Pick one. Watch it win." / "Bet you picked wrong." / "Can you call the winner?"
5. **THE TRACK:** one line about the track's own feature, e.g. "Through a loop over the sea."

**Content rules:**
- Use the race's real facts where they fit: the real gap, the real winning gate, and the real speed if it can be measured. A speed line needs a measured number; never guess one.
- Never claim a marble is faster because of its looks or rarity.
- Never say "win money" or mention prizes (the tool refuses money and prize words).
- The end card stays as it is: "Play free", marblespins.com, "Follow for a new race every day".

**How to set the lines:**
- **Shorts** (`--kind raceTall`): always pass all three flags. A flag left out falls back to the template's fixed line (e.g. "Side by side through the bends."), which breaks the 7-day rule.
  - `--hook "<line>"` is the opening line: the frozen frame on the OLD opening, frame 1 on the NEW one.
  - `--curve "<line>"` is the line over the curves.
  - `--feature-line "<line>"` is over the signature feature.
- **Long video:** write its hook lines and captions as that video's own set (`broadcast.captionSets.<slug>` in `template.json`: the captions, plus `hookLines` and `introSub` so its opening words are its own too), using the same themes and rules.
- After rendering, add every line the video used to the log below.

## On-screen text log

One row per video. Keep at least the last 7 days. The YouTube Shorts copies count as YouTube.

| Date | Slot | Platform | Track | Theme | Lines used |
|---|---|---|---|---|---|
| 2026-11-05 | 17:00 | TikTok + YouTube Short | Sydney Marble Grand Prix | (before the rule) | "Off the Harbour Bridge." / "Side by side through the bends." |
| 2026-11-05 | 17:00 | Instagram | Final Level | (before the rule) | "Who wins? Pick one." / "Side by side through the bends." |
| 2026-11-05 | 23:00 | TikTok | Greenland Expedition | (before the rule) | "Who wins? Pick one." / "Side by side through the bends." |
| 2026-11-05 | 23:00 | Instagram + YouTube Short | Lagos Marble Grand Prix | (before the rule) | "Lagos, flat out." / "Side by side through the bends." |
| 2026-11-06 | 17:00 | TikTok + YouTube Short | Nairobi Marble Grand Prix | WINNING | "Decided by 0.007 seconds." / "From gate 10 to the win." / "Only one takes the gold." |
| 2026-11-06 | 17:00 | Instagram | London Steeplechase | CHALLENGE | "Can you call the winner?" / "Pick one. Watch it win." / "Bet you picked wrong." |
| 2026-11-06 | 17:00 | YouTube long | Paris Eiffel Tower Run | THE TRACK | hook "One thousandth of a second." / "Pick your marble for Paris." / "Back to Montmartre. Watch."; intro "Twenty marbles across Paris."; captions "From Montmartre to the Seine." / "Twenty gates above Montmartre." / "Down the Montmartre plunge." / "Elbow to elbow in Paris." / "Every bend reshuffles Paris." / "Tour Eiffel watching every bounce." / "The whole city on one track." / "Still backing your Paris pick?" / "A new leader in Paris." / "Last plunge to the Seine." / "Paris, raced by real physics." |
| 2026-11-06 | 23:00 | TikTok | Thames Bridges Run | RACING FRIENDS | "Your crew's pick?" / "Send a code. Race together." / "Race your friends. Free." |
| 2026-11-06 | 23:00 | Instagram + YouTube Short | Singapore Block Gardens | THE TRACK | "Into Singapore's block gardens." / "Bending through the garden city." / "Through the dome waterfall." |
| 2026-11-07 | 17:00 | all | (reposts of the 6 Nov 17:00 videos: Buffer did not send them) | | (no new lines) |
| 2026-11-07 | 23:00 | TikTok | Hong Kong Crossing | THE TRACK | "Who wins the harbour crossing?" / "Swooping over Victoria Harbour." / "Forty-five metres above the sea." |
| 2026-11-07 | 23:00 | Instagram + YouTube Short | Pudong Marble Grand Prix | WINNING | "Decided by 0.003 seconds." / "Three marbles, one gold." / "Round the loop for gold." |
| 2026-11-08 | 09:00 | TikTok + YouTube Short | Sahara Marble Grand Prix | CHALLENGE | "Pick your marble. Now." / "Still happy with your pick?" / "Over the dunes. Still yours?" |
| 2026-11-08 | 09:00 | Instagram | Ha Long Bay Spins | RACING FRIENDS | "Your group's pick?" / "Your crew vs. 20 marbles." / "Round the islands with friends." |
| 2026-11-08 | 23:00 | TikTok + Instagram + YouTube Short | Speed montage: Sydney, Cotahuasi Free Fall, Pudong, Lagos, Elderglade, Nairobi, Sahara (17.4 s) | SPEED | "Fast." / "Faster." / "Everyone thinks their marble is the best." / end "Which one is yours? marblespins.com" |
| 2026-11-09 | 17:00 | TikTok + Instagram + YouTube Short | Speed montage: Waimea Free Fall, Amazon Water Run, Stockholm Marble Grand Prix, Zambezi Falls Run, Magma Core, Everest Icefall Run (15.8 s) | SPEED | "Blink…" / "…and you miss it." / "Can your marble keep up?" / end "Pick yours. marblespins.com" |
| 2026-11-09 | 23:00 | TikTok + Instagram + YouTube Short | Speed montage: Dubai Marble Grand Prix, Verdon Burst, Saint-Tropez, Danube Night Run, Chiang Mai, Alaska Tidewater Run (15.8 s) | SPEED | "Look away…" / "…it's already over." / "Can yours hold the pace?" / end "Find yours. marblespins.com" |
| 2026-11-10 | 17:00 | TikTok + Instagram + YouTube Short | Collision montage: Flipper Spins (0.5x), Combo Drop, Colca Spin (0.5x), Delhi Red Fort Marble Grand Prix, Yangtze Lock Run (0.5x), Kill Screen, Tilt (18.2 s) | COLLISIONS | "So satisfying." / "Click. Clack." / end "Which one is yours? marblespins.com" |
| 2026-11-10 | 23:00 | TikTok + Instagram + YouTube Short | Collision montage: Multiball Manor (0.5x), Sunstone Temple, Wyrmwood Hollow Marble Grand Prix (0.5x), Tiger Leaping Spins, Aconcagua Penitentes (0.5x), Wizard Mode, Slingshot Spins (18.2 s) | COLLISIONS | "Hear that?" / "Bump. Bounce. Repeat." / end "Spot yours. marblespins.com" |
| 2026-11-11 | 17:00 | TikTok + Instagram + YouTube Short | Collision montage (hardest hits): Thames Bridges Run (0.5x), Baikal Clear Ice, Lagos Marble Grand Prix (0.5x), Roraima Cloud Falls, Wadi Mujib Burst (0.5x), Final Round Spin, Replay (18.2 s) | COLLISIONS | "SMASH." / "CRASH." / "Nobody's safe." / end "Which one survives? marblespins.com" |
| 2026-11-11 | 23:00 | TikTok + Instagram + YouTube Short | Collision montage (hardest hits): Volga Port Burst (0.5x), Tre Cime Cube Towers, Sydney Marble Grand Prix (0.5x), Everest Icefall Run, Yarlung Tsangpo Spins (0.5x), Pyramid Run, Grand Champion (18.2 s) | COLLISIONS | "Crash out." / "Smash through." / "Last one standing?" / end "Who makes it out? marblespins.com" |
| 2026-11-13 | 23:00 | TikTok + Instagram + YouTube Short (vertical) and YouTube (16:9) | Track montage: Nevada Drag Strip, seed 7388592 (start lights and the low camera in front of the field, the full-width speed pads, the half-pipe twice, the loop; 16.6 s) | THE TRACK | "Lights out…" / "…full send" / end "Nevada Drag Strip. marblespins.com" |
| 2026-11-14 | 23:00 | TikTok + Instagram + YouTube Short (vertical) and YouTube (16:9) | Track montage: Iguazú Devil's Throat, seed 7977166 (the start, the catwalks, the field down the Devil's Throat in two shots, the low chase then the leader's camera looking back up the falls, the split round the island, the finish; 19.6 s with the end card). Winner Berry Oxblood (gate 11) by 0.176 s, 4 within 0.213 s | THE TRACK | "Into the Devil's Throat…" / "…who comes out first?" / end "Iguazú Devil's Throat. marblespins.com" |
| 2026-11-12 | 23:00 | TikTok + Instagram + YouTube Short | Wildness montage "EASY OR EXTREME?": Easy Redwood Forest Run, Kyoto Block Gardens, Fuji Cinder Sunrise (calm, higher camera); Extreme Pudong Marble Grand Prix (the loop), Huascarán Turquoise Lakes (the first fall), San Francisco (Russian Hill crest), Stockholm 1912 Relay (pile-up) (17.8 s) | WILDNESS | "Easy…" / "…or EXTREME?" / "Which one do you race?" / end "Easy. Wild. Extreme. marblespins.com" |

## Tracks already used in a video

Any slot counts: Shorts, long videos, the Spotlight, and planned social clips.

- **Grand Prix** (none left unused since Sahara on 8 Nov 09:00; from then every Grand Prix video reuses a track, on a new seed. On 7 Nov Sahara, Nairobi, Delhi and Wyrmwood Hollow got new layouts, not yet deployed that day, and Moses ruled out the re-laid tracks, so Pudong was that day's Grand Prix track on a new seed. The four new layouts were deployed on 8 Nov just after midnight,)
  - Dubai;
  - Delhi;
  - Elderglade;
  - Frostmere;
  - Istanbul (planned clip);
  - Lagos;
  - Nevada Drag Strip (13 Nov 23:00, track montage);
  - Nairobi;
  - Pudong;
  - Sydney;
  - Wyrmwood Hollow.
- **Grand Prix seeds used** (never again on any Grand Prix track): Elderglade 1113814; Frostmere 2467963; Lagos 2784723; Nairobi 2539234; Pudong 1945309, 2832237, 2665938 (7 Nov 23:00); Sahara 2760966 (8 Nov 09:00, its new layout); speed montage 8 Nov 23:00: Sydney 1026705, Pudong 907920, Lagos 1272194, Elderglade 1074219, Nairobi 1280113, Sahara 1335546; speed montages 9 Nov: Stockholm 1137571 (17:00), Dubai 915839 (23:00); collision montages 10 Nov: Delhi 3007920 (17:00), Wyrmwood Hollow 3253409 (23:00); collision montages 11 Nov: Lagos 3840518 (17:00), Sydney 3745490 (23:00); wildness montage 12 Nov 23:00: Pudong 4527627; track montage 13 Nov 23:00: Nevada Drag Strip 7388592; Stockholm 1604792 (the Spotlight); Sydney 2507558; Wyrmwood Hollow 2357097. Not known: the planned clips and the earlier Dubai, Delhi and Istanbul videos; their seeds were not recorded.
- **Other tracks:** iguazu-devils-throat (14 Nov 23:00, track montage), beijing-nest-200, bullet-hell (planned clip), checkpoint-rush, chobe, cotahuasi, danube, Final Level, flipper-spins, grand-canyon-burst, grand-champion (planned clip), Greenland Expedition, ha-long-bay-spins (8 Nov), hong-kong-crossing (7 Nov), irrawaddy, k2, kali-gandaki, Kirkjufell Block Falls, London Steeplechase, marble-stadium-sprint, nanjing, niagara (Cube Falls), Paris Eiffel Tower Run, phantom-peak, pyramid-run, redwood, Rhine Castle Run, saint-tropez, san-francisco, Singapore Block Gardens, sky-islands (planned clip), sognefjord, stockholm, Thames Bridges Run, the-stack, tokyo (planned clip), Venice Cube Canals, Verdon Burst, waimea (planned clip), zambezi, zurich.
