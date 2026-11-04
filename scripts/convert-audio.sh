#!/bin/bash
# The game's music and sounds, from Moses's originals in music-inbox/ to small,
# phone-friendly files in client/public/audio/ (each in two formats: Opus in WebM,
# the smallest, for browsers that play it; AAC in M4A for the rest, iPhones included —
# the sound engine loads only the one the device plays, and only when needed).
#   bash scripts/convert-audio.sh            everything
#   SKIP_EFFECTS=1 bash scripts/convert-audio.sh   the music and the countdown only
#   ONLY_TUNES=1 bash scripts/convert-audio.sh     the race tunes only
#   ONLY_EFFECTS=1 bash scripts/convert-audio.sh   the race sounds only (start, crowd, collision, bump, speed pad)
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
  # (-movie_timescale 44100: the edit list that tells players where the audio really starts and ends is
  # then exact to the sample, so the apps' players loop a tune without a gap.)
  ffmpeg -v error -y -i "$f" -vn -map_metadata -1 -af "$af" -c:a aac -b:a "${ak}k" -ar 44100 -movie_timescale 44100 -movflags +faststart "$OUT/$name.m4a"
}

# The sound reset (Moses, 28 Oct 2026). Everything at about -20 LUFS (the engine mixes the music under
# the effects); the crowd 4 LU lower. Licences: music-inbox/LICENCES.md.
#
# The race tunes (Moses, 28 Oct 2026, the loop rule): the tune picked at GO loops seamlessly until the
# finish ceremony. So no fades at all, and any silence at the start and the end trimmed (below -60 dB),
# so the end runs straight into the start: no dip, no gap (engine.js plays them looping from memory).
TRIM="silenceremove=start_periods=1:start_threshold=-60dB:start_silence=0,areverse,silenceremove=start_periods=1:start_threshold=-60dB:start_silence=0,areverse"
dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }
# Then cut at zero crossings (scripts/loop-cut.py, needs python3 and numpy), so the loop point never clicks.
if [ -z "${ONLY_EFFECTS:-}" ]; then
TMP=$(mktemp -d)
# (RACE MUSIC 2 is no longer in the game: Moses, 28 Oct 2026; nor RACE MUSIC 1, 30 Oct 2026. Their originals stay in music-inbox.)
for i in 3 4 5 6 7 8 9 10 11 12 13 14; do
  f=$(ls "$IN"/RACE\ MUSIC\ $i\ -*.mp3)
  ffmpeg -v error -y -i "$f" -vn -af "$TRIM" -ac 2 -ar 48000 -f f32le - | python3 scripts/loop-cut.py > "$TMP/t.raw"
  ffmpeg -v error -y -f f32le -ar 48000 -ac 2 -i "$TMP/t.raw" -c:a flac "$TMP/tune-$i.flac"
  enc "$TMP/tune-$i.flac" "tune-$i" -20 40 56
  echo "tune-$i: $(ffprobe -v error -show_entries stream=duration_ts,sample_rate -of csv=p=0 "$TMP/tune-$i.flac" | awk -F, '{printf "%.6f", $2/$1}') s (engine.js TRACK_SECONDS: the exact loop length)"
done
rm -rf "$TMP"
[ -n "${ONLY_TUNES:-}" ] && exit 0
# The finish ceremony's song (unchanged rule, Moses 28 Oct 2026: only the file is new): loops while the
# ceremony is on screen, fading out after 45 s (engine.js CEREMONY_SECONDS).
enc "$IN"/FINISH\ LINE*.mp3 ceremony -20 40 56
# The countdown: four beeps, at 0.024, 1.026, 2.035 and 3.023 s (the fourth on GO: engine.js BEEPS_GO_S).
enc "$IN"/RACE\ START\ BEEPS*.mp3 start-beeps -20 64 96
fi

if [ -z "${SKIP_EFFECTS:-}" ]; then
  # The crowd cheering as the player's own marble passes a stand (all of it, 3 s), under the music.
  enc "$IN"/CROWD\ GRAND\ PRIX*.mp3 crowd-grand-prix -24 64 96
  # The start sound at GO: the marbles start rolling (Moses, 30 Oct 2026; it replaces MARBLES SPEEDING UP,
  # "launch"). First at the old sound's level (-33.5 LUFS by loudnorm: mean -33.4 dB), then 50% louder, +3.5 dB
  # (Moses, 30 Oct 2026): a mean of -29.9 dB. At 3.2 s loudnorm levels it dynamically and not exactly, so one
  # steady gain to that mean instead (its peak about -14 dBFS, under the music's).
  f=$(ls "$IN"/MARLES\ START\ ROLLING*.mp3)
  g=$(ffmpeg -hide_banner -nostats -i "$f" -af volumedetect -f null - 2>&1 | sed -n 's/.*mean_volume: \(.*\) dB/\1/p')
  ff="volume=$(awk -v m="$g" 'BEGIN { print -29.9 - m }')dB"
  ffmpeg -v error -y -i "$f" -vn -map_metadata -1 -af "$ff" -ar 48000 -c:a libopus -b:a 64k -vbr on -application audio "$OUT/start-rolling.webm"
  ffmpeg -v error -y -i "$f" -vn -map_metadata -1 -af "$ff" -c:a aac -b:a 96k -ar 44100 -movflags +faststart "$OUT/start-rolling.m4a"
  # The player's own marble hitting another (Moses, 30 Oct 2026): a 0.13 s click, too short for the loudness
  # measure, so levelled by its peak instead (to -9 dBFS); the engine plays it soft, under the music (HIT_LEVEL).
  f=$(ls "$IN"/MARBLE\ COLLISSION*.mp3)
  g=$(ffmpeg -hide_banner -nostats -i "$f" -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(.*\) dB/\1/p')
  ff="volume=$(awk -v m="$g" 'BEGIN { print -9 - m }')dB"
  ffmpeg -v error -y -i "$f" -vn -map_metadata -1 -af "$ff" -ar 48000 -c:a libopus -b:a 64k -vbr on -application audio "$OUT/marble-hit.webm"
  ffmpeg -v error -y -i "$f" -vn -map_metadata -1 -af "$ff" -c:a aac -b:a 96k -ar 44100 -movflags +faststart "$OUT/marble-hit.m4a"
  # The player's own marble hitting an obstacle (Moses, 31 Oct 2026): "the same level as the collision sound".
  # First matched by energy (mean level), which left it 5 LU quieter to the ear than the click and hard to
  # hear (Moses, 1 Nov 2026): now matched by loudness, both measured padded to 0.4 s (the loudness measure's
  # shortest window), the click as levelled above; the bump's peak stays under the click's. The 28 ms of
  # silence at its start trimmed, so it sounds on the hit.
  lufs() { ffmpeg -hide_banner -nostats -i "$1" -af "$2apad=pad_dur=0.4,ebur128" -f null - 2>&1 | sed -n 's/^ *I: *\(-*[0-9.]*\) LUFS/\1/p' | tail -1; }
  hl=$(lufs "$f" "volume=$(awk -v m="$g" 'BEGIN { print -9 - m }')dB,")
  b=$(ls "$IN"/MARBLE\ BUMP\ ON\ OBSTICALS*.mp3)
  trim="atrim=start=0.028,asetpts=PTS-STARTPTS"
  bl=$(lufs "$b" "$trim,")
  # Then 16 dB over the click's loudness (Moses, 1 Nov 2026: "I still can't hear it", +4 dB; "still too
  # low", +8; "maybe to 16 dB, we can decrease if it's too loud"): a short knock in a busy race needs more
  # than the click. Its peak about -2 dBFS: above the click's, still clear of clipping.
  ff="$trim,volume=$(awk -v t="$hl" -v m="$bl" 'BEGIN { print t - m + 16 }')dB"
  ffmpeg -v error -y -i "$b" -vn -map_metadata -1 -af "$ff" -ar 48000 -c:a libopus -b:a 64k -vbr on -application audio "$OUT/marble-bump.webm"
  ffmpeg -v error -y -i "$b" -vn -map_metadata -1 -af "$ff" -c:a aac -b:a 96k -ar 44100 -movflags +faststart "$OUT/marble-bump.m4a"
  # The speed pad (Moses, 4 Nov 2026): the old overtaking whoosh brought back, when the player's own marble
  # rolls onto a speed pad. From 0.7 s to 2.9 s of the file (its peak at 1.2 s, so it swells as the pad kicks
  # the marble on), a 30 ms fade in and a 0.6 s fade out. At -20 LUFS like the other effects (measured with
  # ebur128 and one steady gain: at 2.2 s loudnorm would level it dynamically); the engine plays it at
  # PAD_LEVEL with the music dipping under it.
  f=$(ls "$IN"/MARBLES\ OVERTAKING*.mp3)
  cut="atrim=start=0.7:end=2.9,asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=1.6:d=0.6"
  pl=$(ffmpeg -hide_banner -nostats -i "$f" -af "$cut,ebur128" -f null - 2>&1 | sed -n 's/^ *I: *\(-*[0-9.]*\) LUFS/\1/p' | tail -1)
  ff="$cut,volume=$(awk -v m="$pl" 'BEGIN { print -20 - m }')dB"
  ffmpeg -v error -y -i "$f" -vn -map_metadata -1 -af "$ff" -ar 48000 -c:a libopus -b:a 64k -vbr on -application audio "$OUT/speed-pad.webm"
  ffmpeg -v error -y -i "$f" -vn -map_metadata -1 -af "$ff" -c:a aac -b:a 96k -ar 44100 -movflags +faststart "$OUT/speed-pad.m4a"
fi
ls -l "$OUT"
