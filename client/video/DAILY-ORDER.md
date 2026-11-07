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
  - use only tracks never used in a video before (list below), except Grand Prix tracks (next point);
  - every day includes at least one Grand Prix track: Sahara on 7 Nov 2026, the last one never used. From 8 Nov a Grand Prix track may be used again, always on a new seed: **never a seed already used on any Grand Prix track** (list below; the shared-layout tracks run the same race on the same seed). Add every Grand Prix video's seed to the list (Moses, 6 Nov 2026).
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

## Tracks already used in a video

Any slot counts: Shorts, long videos, the Spotlight, and planned social clips.

- **Grand Prix** (unused live ones left after 6 Nov: Sahara only. On 7 Nov Sahara, Nairobi, Delhi and Wyrmwood Hollow got new layouts, not yet deployed that day, and Moses ruled out the re-laid tracks, so Pudong was that day's Grand Prix track on a new seed. The four new layouts were deployed on 8 Nov just after midnight, so Sahara, still never in a video, is the next Grand Prix track):
  - Dubai;
  - Delhi;
  - Elderglade;
  - Frostmere;
  - Istanbul (planned clip);
  - Lagos;
  - Nairobi;
  - Pudong;
  - Sydney;
  - Wyrmwood Hollow.
- **Grand Prix seeds used** (never again on any Grand Prix track): Elderglade 1113814; Frostmere 2467963; Lagos 2784723; Nairobi 2539234; Pudong 1945309, 2832237, 2665938 (7 Nov 23:00); Stockholm 1604792 (the Spotlight); Sydney 2507558; Wyrmwood Hollow 2357097. Not known: the planned clips and the earlier Dubai, Delhi and Istanbul videos; their seeds were not recorded.
- **Other tracks:** beijing-nest-200, bullet-hell (planned clip), checkpoint-rush, chobe, cotahuasi, danube, Final Level, flipper-spins, grand-canyon-burst, grand-champion (planned clip), Greenland Expedition, hong-kong-crossing (7 Nov), irrawaddy, k2, kali-gandaki, Kirkjufell Block Falls, London Steeplechase, marble-stadium-sprint, nanjing, niagara (Cube Falls), Paris Eiffel Tower Run, phantom-peak, pyramid-run, redwood, Rhine Castle Run, saint-tropez, san-francisco, Singapore Block Gardens, sky-islands (planned clip), sognefjord, stockholm, Thames Bridges Run, the-stack, tokyo (planned clip), Venice Cube Canals, Verdon Burst, waimea (planned clip), zambezi, zurich.
