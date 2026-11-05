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
  - use only tracks never used in a video before (list below);
  - every day includes at least one Grand Prix track.
- **The Grand Prix kit tracks share one layout.** On the same seed they run the same race; only the looks differ. So two Grand Prix videos must use different seeds.
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
- **Long video:** write its hook lines and captions as that video's own set (`broadcast.captionSets.<slug>` in `template.json`), using the same themes and rules.
- After rendering, add every line the video used to the log below.

## On-screen text log

One row per video. Keep at least the last 7 days. The YouTube Shorts copies count as YouTube.

| Date | Slot | Platform | Track | Theme | Lines used |
|---|---|---|---|---|---|
| 2026-11-05 | 17:00 | TikTok + YouTube Short | Sydney Marble Grand Prix | (before the rule) | "Off the Harbour Bridge." / "Side by side through the bends." |
| 2026-11-05 | 17:00 | Instagram | Final Level | (before the rule) | "Who wins? Pick one." / "Side by side through the bends." |
| 2026-11-05 | 23:00 | TikTok | Greenland Expedition | (before the rule) | "Who wins? Pick one." / "Side by side through the bends." |
| 2026-11-05 | 23:00 | Instagram + YouTube Short | Lagos Marble Grand Prix | (before the rule) | "Lagos, flat out." / "Side by side through the bends." |

## Tracks already used in a video

Any slot counts: Shorts, long videos, the Spotlight, and planned social clips.

- **Grand Prix:**
  - Dubai;
  - Delhi;
  - Elderglade;
  - Frostmere;
  - Istanbul (planned clip);
  - Lagos;
  - Pudong;
  - Sydney;
  - Wyrmwood Hollow.
- **Other tracks:** beijing-nest-200, bullet-hell (planned clip), checkpoint-rush, chobe, cotahuasi, danube, Final Level, flipper-spins, grand-canyon-burst, grand-champion (planned clip), Greenland Expedition, irrawaddy, k2, kali-gandaki, Kirkjufell Block Falls, marble-stadium-sprint, nanjing, niagara (Cube Falls), phantom-peak, pyramid-run, redwood, Rhine Castle Run, saint-tropez, san-francisco, sky-islands (planned clip), sognefjord, stockholm, the-stack, tokyo (planned clip), Venice Cube Canals, Verdon Burst, waimea (planned clip), zambezi, zurich.
