#!/bin/bash
# The game's music and sounds, from Moses's originals in music-inbox/ to small,
# phone-friendly files in client/public/audio/ (each in two formats: Opus in WebM,
# the smallest, for browsers that play it; AAC in M4A for the rest, iPhones included —
# the sound engine loads only the one the device plays, and only when needed).
#   bash scripts/convert-audio.sh            everything
#   SKIP_EFFECTS=1 bash scripts/convert-audio.sh   the music and the countdown only
# Levels: music at -20 LUFS, the race sounds at -16 LUFS (the engine mixes the music
# lower still, under the sounds). Two passes: the loudness is measured first, then one
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

# The race music: one of 8 tracks per race, from GO, looping if the race is longer.
for i in 1 2 3 4 5 6 7 8; do
  f=$(ls "$IN"/RACE\ SOUND\ $i[!0-9]*.mp3)
  case $i in
    1) pre="atrim=0:61.9" ;;   # (a stray click after 0.5 s of silence at the end)
    8) pre="atrim=0:167.3" ;;  # (4 s of silence at the end)
    *) pre="" ;;
  esac
  enc "$f" "race-$i" -20 40 56 "$pre"
done
# The finish ceremony's song: loops while the ceremony is on screen, fading out after 45 s.
enc "$IN"/FINISH\ LINE*.mp3 ceremony -20 40 56
# The countdown: four beeps a second apart, the last (GO) at 3.02 s.
enc "$IN"/RACE\ START\ BEEPS*.mp3 start-beeps -16 64 96

if [ -z "${SKIP_EFFECTS:-}" ]; then
  # The crowd at the gates of a Grand Prix (all of it, 3 s).
  enc "$IN"/CROWD\ GRAND\ PRIX*.mp3 crowd-grand-prix -16 64 96
  # The pack leaving the gate: the first 5 s, fading out from 3.5 s.
  enc "$IN"/MARBLES\ SPEEDING\ UP*.mp3 launch -16 64 96 "atrim=0:5,afade=t=out:st=3.5:d=1.5"
  # The whoosh of an overtake: its first 2.2 s (the whoosh peaks at 1.1 s), fading out from 1.6 s.
  enc "$IN"/MARBLES\ OVERTAKING*.mp3 whoosh -16 64 96 "atrim=0:2.2,afade=t=out:st=1.6:d=0.6"
fi
ls -l "$OUT"
