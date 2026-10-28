#!/bin/bash
# The game's music and sounds, from Moses's originals in music-inbox/ to small,
# phone-friendly files in client/public/audio/ (each in two formats: Opus in WebM,
# the smallest, for browsers that play it; AAC in M4A for the rest, iPhones included —
# the sound engine loads only the one the device plays, and only when needed).
#   bash scripts/convert-audio.sh            everything
#   SKIP_EFFECTS=1 bash scripts/convert-audio.sh   the music and the countdown only
# Levels: everything at -20 LUFS, the crowd at -24 (the engine mixes the music under the
# effects and the crowd under the music). Two passes: the loudness is measured first, then one
# steady gain is applied to the whole file (loudnorm's linear mode), so a looping track
# sounds the same at its end as at its start.
set -euo pipefail
cd "$(dirname "$0")/.."
IN=music-inbox
OUT=client/public/audio
mkdir -p "$OUT"

enc() { # <input> <name> <loudness> <opus kbps> <aac kbps> [filters before levelling]
  local f="$1" name="$2" lufs="$3" ok="$4" ak="$5" pre="${6:-}"
  local m
  m=$(ffmpeg -hide_banner -nostats -i "$f" -vn -af "${pre:+$pre,}loudnorm=I=${lufs}:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
  val() { echo "$m" | sed -n "s/.*\"$1\" : \"\(.*\)\".*/\1/p"; }
  local af="${pre:+$pre,}loudnorm=I=${lufs}:TP=-1.5:LRA=11:measured_I=$(val input_i):measured_TP=$(val input_tp):measured_LRA=$(val input_lra):measured_thresh=$(val input_thresh):offset=$(val target_offset):linear=true"
  ffmpeg -v error -y -i "$f" -vn -map_metadata -1 -af "$af" -ar 48000 -c:a libopus -b:a "${ok}k" -vbr on -application audio "$OUT/$name.webm"
  ffmpeg -v error -y -i "$f" -vn -map_metadata -1 -af "$af" -c:a aac -b:a "${ak}k" -ar 44100 -movflags +faststart "$OUT/$name.m4a"
}

# The sound reset (Moses, 28 Oct 2026). Everything at about -20 LUFS (the engine mixes the music under
# the effects); the crowd 4 LU lower. Licences: music-inbox/LICENCES.md.
#
# The race tunes: one of 6 per race, from GO, played once. Each fades in over 30 ms (no click) and out
# over its last TUNE_FADE seconds, so a race longer than its tune goes quiet gently instead of stopping
# or looping (engine.js TRACK_SECONDS / TUNE_FADE_S).
TUNE_FADE=3
dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }
fades() { # <file>: fade in 30 ms, fade out over the last TUNE_FADE s
  local d; d=$(dur "$1")
  echo "afade=t=in:st=0:d=0.03,afade=t=out:st=$(echo "$d - $TUNE_FADE" | bc -l):d=$TUNE_FADE"
}
for i in 1 2 3 4 5 6; do
  f=$(ls "$IN"/RACE\ MUSIC\ $i\ -*.mp3)
  enc "$f" "tune-$i" -20 40 56 "$(fades "$f")"
done
# The finish ceremony's song (unchanged rule, Moses 28 Oct 2026: only the file is new): loops while the
# ceremony is on screen, fading out after 45 s (engine.js CEREMONY_SECONDS).
enc "$IN"/FINISH\ LINE*.mp3 ceremony -20 40 56
# The countdown: four beeps, at 0.024, 1.026, 2.035 and 3.023 s (the fourth on GO: engine.js BEEPS_GO_S).
enc "$IN"/RACE\ START\ BEEPS*.mp3 start-beeps -20 64 96

if [ -z "${SKIP_EFFECTS:-}" ]; then
  # The crowd cheering as the player's own marble passes a stand (all of it, 3 s), under the music.
  enc "$IN"/CROWD\ GRAND\ PRIX*.mp3 crowd-grand-prix -24 64 96
  # The pack leaving the gate: the first 5 s, fading out from 3.5 s.
  enc "$IN"/MARBLES\ SPEEDING\ UP*.mp3 launch -20 64 96 "atrim=0:5,afade=t=out:st=3.5:d=1.5"
  # The whoosh of an overtake: its first 2.2 s (the whoosh peaks at 1.1 s), fading out from 1.6 s.
  enc "$IN"/MARBLES\ OVERTAKING*.mp3 whoosh -20 64 96 "atrim=0:2.2,afade=t=out:st=1.6:d=0.6"
fi
ls -l "$OUT"
