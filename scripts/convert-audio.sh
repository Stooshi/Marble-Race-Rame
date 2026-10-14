#!/bin/bash
# The game's music and sounds, from Moses's originals in music-inbox/ to small,
# phone-friendly files in client/public/audio/ (each in two formats: Opus in WebM,
# the smallest, for browsers that play it; AAC in M4A for the rest, iPhones included —
# the sound engine loads only the one the device plays, and only when needed).
#   bash scripts/convert-audio.sh
# Levels: music at -20 LUFS, the race sounds at -16 LUFS (the engine mixes the music
# lower still, under the sounds).
set -euo pipefail
cd "$(dirname "$0")/.."
IN=music-inbox
OUT=client/public/audio
mkdir -p "$OUT"

enc() { # <input> <name> <loudness> <opus kbps> <aac kbps> [extra filters]
  local f="$1" name="$2" lufs="$3" ok="$4" ak="$5" extra="${6:-}"
  local af="loudnorm=I=${lufs}:TP=-1.5:LRA=11${extra:+,$extra}"
  ffmpeg -v error -y -i "$f" -vn -map_metadata -1 -af "$af" -c:a libopus -b:a "${ok}k" -vbr on -application audio "$OUT/$name.webm"
  ffmpeg -v error -y -i "$f" -vn -map_metadata -1 -af "$af" -c:a aac -b:a "${ak}k" -ar 44100 -movflags +faststart "$OUT/$name.m4a"
}

i=1
for f in "$IN"/BACKGROUND\ MUSIC*.mp3; do
  enc "$f" "music-$i" -20 40 56
  i=$((i + 1))
done
# The crowd at the gates of a Grand Prix (all of it, 3 s).
enc "$IN"/CROWD\ GRAND\ PRIX*.mp3 crowd-grand-prix -16 64 96
# The pack leaving the gate: the first 5 s, fading out from 3.5 s.
enc "$IN"/MARBLES\ SPEEDING\ UP*.mp3 launch -16 64 96 "atrim=0:5,afade=t=out:st=3.5:d=1.5"
# The whoosh of an overtake: its first 2.2 s (the whoosh peaks at 1.1 s), fading out from 1.6 s.
enc "$IN"/MARBLES\ OVERTAKING*.mp3 whoosh -16 64 96 "atrim=0:2.2,afade=t=out:st=1.6:d=0.6"
ls -l "$OUT"
