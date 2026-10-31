# Music and sound licences

The game's music and sounds (28 Oct 2026, the sound reset; RACE MUSIC 7–14 added and RACE MUSIC 2 taken out the same evening; 30 Oct 2026 RACE MUSIC 1 taken out: 12 race tunes; 30 Oct 2026: the start sound "Marles start rolling" replaced "Marbles speeding up", and the own marble's hit sound "Marble collision" added; 31 Oct 2026: the own marble's bump on obstacles, "Marble bump on obsticals"). The originals here are converted by
`scripts/convert-audio.sh` into `client/public/audio/`. This folder is never part of the website build or
the server upload.

## Source and licence

Every file was downloaded from **Pixabay** (pixabay.com). The file names keep Pixabay's own download
names (`<contributor>-<title>-<Pixabay id>.mp3`).

`freesound_community` is Pixabay's account for sounds imported from Freesound. On Pixabay those
sounds are under the Pixabay Content License, like every other item.

The **Pixabay Content License** (https://pixabay.com/service/license-summary/ and the full text in
Pixabay's Terms of Service) allows:
- free use, commercial included;
- no attribution needed;
- changing and adapting (we trim, fade and level).

It forbids:
- selling or distributing the files on their own, without our creative work around them;
- using them in a trademark or brand name;
- uses that are illegal, immoral or misleading.

So:
- **A commercial game (website and apps):** allowed. The sounds are part of a larger work, the game, and are never offered as files to download on their own.
- **Our videos (social media, ads, store previews):** allowed. Pixabay's FAQ: "You may use Pixabay music in commercial video projects, including content you sell or distribute", as part of a larger creative work.
- **YouTube Content ID:** some Pixabay contributors register their tracks with Content ID. Those pages show a shield icon. A claim isn't a copyright strike, but it can take a video's ad money. If a video gets one, dispute it in YouTube Studio: "I have permission or a license to use the content", with the track's Pixabay page as proof. **To do (Moses):** open each music track's page below and note whether it shows the shield (and the new sound effects: 90863 and 105088, added 30 Oct 2026, and 66796, added 31 Oct 2026).

| In the game (`client/public/audio/`) | Original in this folder | Pixabay contributor | Pixabay id | Type | Content ID shield? |
|---|---|---|---|---|---|
| `start-beeps` (the countdown) | RACE START BEEPS - transcendedlifting-race-start-beeps-125125 (1).mp3 | transcendedlifting | 125125 | sound effect | (sound effect: not registered) |
| `tune-3` | RACE MUSIC 3 - xtremefreddy-game-music-loop-5-144569-cut (mp3cut.net).mp3 | xtremefreddy | 144569 | music | to check |
| `tune-4` | RACE MUSIC 4 - xtremefreddy-game-music-loop-3-144252 (mp3cut.net).mp3 | xtremefreddy | 144252 | music | to check |
| `tune-5` | RACE MUSIC 5 - igors93-turbo_coin_run-514606.mp3 | igors93 | 514606 | music | to check |
| `tune-6` | RACE MUSIC 6 - freesound_community-8-bit-heaven-26287.mp3 | freesound_community | 26287 | music | to check |
| `tune-7` (from 28 Oct 2026) | RACE MUSIC 7 - xtremefreddy-bit-beats-1-168243 (mp3cut.net).mp3 | xtremefreddy | 168243 | music | to check |
| `tune-8` (from 28 Oct 2026) | RACE MUSIC 8 - xtremefreddy-game-music-loop-1-143979-cut (mp3cut.net).mp3 | xtremefreddy | 143979 | music | to check |
| `tune-9` (from 28 Oct 2026) | RACE MUSIC 9 - xtremefreddy-game-music-loop-4-144341-cut (mp3cut.net).mp3 | xtremefreddy | 144341 | music | to check |
| `tune-10` (from 28 Oct 2026) | RACE MUSIC 10 - xtremefreddy-game-music-loop-8-145362-cut (mp3cut.net).mp3 | xtremefreddy | 145362 | music | to check |
| `tune-11` (from 28 Oct 2026) | RACE MUSIC 11 - xtremefreddy-game-music-loop-10-145572-cut (mp3cut.net).mp3 | xtremefreddy | 145572 | music | to check |
| `tune-12` (from 28 Oct 2026) | RACE MUSIC 12 - xtremefreddy-game-music-loop-13-147206-cut (mp3cut.net).mp3 | xtremefreddy | 147206 | music | to check |
| `tune-13` (from 28 Oct 2026) | RACE MUSIC 13 - xtremefreddy-game-music-loop-17-153390-cut (mp3cut.net).mp3 | xtremefreddy | 153390 | music | to check |
| `tune-14` (from 28 Oct 2026) | RACE MUSIC 14 - xtremefreddy-game-music-loop-20-156390-cut (mp3cut.net).mp3 | xtremefreddy | 156390 | music | to check |
| `ceremony` (the finish ceremony) | FINISH LINE and CEREMONY SONG - freesound_community-suits-you-69233.mp3 | freesound_community | 69233 | music | to check |
| `crowd-grand-prix` (a stand cheering) | CROWD GRAND PRIX - freesound_community-scream-ride-start-91271.mp3 | freesound_community | 91271 | sound effect | (sound effect) |
| `start-rolling` (the start sound, 1 s after GO, from 30 Oct 2026) | MARLES START ROLLING  - freesound_community-bowling-ball-90863-CUT (mp3cut.net) - pixabay.mp3 | freesound_community | 90863 | sound effect | to check (sound effect: usually not registered) |
| `marble-hit` (the player's own marble hitting another, from 30 Oct 2026) | MARBLE COLLISSION  - freesound_community-lotto-ball-105088 (mp3cut.net) - pixabay.mp3 | freesound_community | 105088 | sound effect | to check (sound effect: usually not registered) |
| `marble-bump` (the player's own marble hitting an obstacle, from 31 Oct 2026) | MARBLE BUMP ON OBSTICALS - PIXABAY - freesound_community-phone-handling-66796 (mp3cut.net).mp3 | freesound_community | 66796 | sound effect | to check (sound effect: usually not registered) |
| (not in the game since 30 Oct 2026; replaced by `start-rolling`) launch | MARBLES SPEEDING UP - diff_style-start-your-engine-13152.mp3 | diff_style | 13152 | sound effect | (sound effect) |
| (not in the game since 28 Oct 2026) whoosh | MARBLES OVERTAKING ONLY PLAYED NEXT TO THE PLAYERS OWN MARBLE-soundreality-whoosh-race-2-383023.mp3 | soundreality | 383023 | sound effect | (sound effect) |

**No longer in the game** (the originals stay here, unused): RACE SOUND 1–8 (28 Oct 2026; RACE SOUND 6 is the same file as RACE MUSIC 5), RACE MUSIC 2 (darren_hirst, "Gamer Music 140 BPM", Pixabay id 355954; taken out by Moses, 28 Oct 2026) and RACE MUSIC 1 (freesound_community / Kris Klavenes, "Epic game music", Pixabay id 49771; taken out by Moses, 30 Oct 2026: too like RACE MUSIC 2). 12 race tunes from 30 Oct 2026.

**Find a page:** search the Pixabay id on pixabay.com, or the title from the file name.

**Keep a copy:** for each file, save its Pixabay page (as a PDF or a screenshot) with the date downloaded. That shows the licence it came under if a store or YouTube asks.
