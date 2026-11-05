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
- Mention anything else that matters: a seed that was replaced, a changed opening line, or a commit to the video tools.
- **After each day,** add that day's tracks to the list below in the same commit as any tool changes, so the next session doesn't reuse them.

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
