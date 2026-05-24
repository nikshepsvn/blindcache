#!/bin/bash
# Compose the v0.2 launch video.
# 8 scenes with bold text overlays, fade in/out per scene, crossfades between.
# Outputs: docs/blindcache-v0.2.mp4 + docs/blindcache-v0.2.gif
set -e

cd "$(dirname "$0")/.."

OUT_DIR=docs
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

W=1280
H=720
FPS=30
FONT_BOLD="/System/Library/Fonts/Helvetica.ttc"
FONT_MONO="/Users/nikshepsvn/Library/Fonts/JetBrainsMonoNL-SemiBold.ttf"
BANNER="docs/banner.jpg"

# ── helpers ──────────────────────────────────────────────────────────────────

# Fade an overlay in for 0.4s and out for 0.4s; constant in between.
alpha_expr() {
  local dur=$1
  local fade_in=0.4
  local fade_out=0.4
  local stay_end=$(echo "$dur - $fade_out" | bc -l)
  echo "if(lt(t,$fade_in),t/$fade_in,if(lt(t,$stay_end),1,($dur-t)/$fade_out))"
}

# Render a solid-color scene with two stacked text lines.
scene_text() {
  local out=$1 dur=$2 bg=$3 line1=$4 size1=$5 color1=$6 line2=$7 size2=$8 color2=$9
  local alpha
  alpha=$(alpha_expr "$dur")
  local filters="drawtext=fontfile=${FONT_BOLD}:text='${line1}':fontsize=${size1}:fontcolor=${color1}:x=(w-text_w)/2:y=(h-text_h)/2-${size2}:alpha='${alpha}'"
  if [[ -n "$line2" ]]; then
    filters+=",drawtext=fontfile=${FONT_MONO}:text='${line2}':fontsize=${size2}:fontcolor=${color2}:x=(w-text_w)/2:y=(h-text_h)/2+${size1}-10:alpha='${alpha}'"
  fi
  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "color=${bg}:s=${W}x${H}:d=${dur}:r=${FPS}" \
    -vf "$filters,format=yuv420p" \
    -c:v libx264 -pix_fmt yuv420p "$out"
}

# Render a scene with the banner image as background + overlay text.
scene_banner() {
  local out=$1 dur=$2 line1=$3 size1=$4 color1=$5 line2=$6 size2=$7 color2=$8
  local alpha
  alpha=$(alpha_expr "$dur")
  local filters="scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},eq=brightness=-0.45:contrast=0.85:saturation=0.7"
  filters+=",drawtext=fontfile=${FONT_BOLD}:text='${line1}':fontsize=${size1}:fontcolor=${color1}:x=(w-text_w)/2:y=(h-text_h)/2-${size2}:alpha='${alpha}':shadowcolor=black:shadowx=2:shadowy=2"
  if [[ -n "$line2" ]]; then
    filters+=",drawtext=fontfile=${FONT_MONO}:text='${line2}':fontsize=${size2}:fontcolor=${color2}:x=(w-text_w)/2:y=(h-text_h)/2+${size1}-10:alpha='${alpha}':shadowcolor=black:shadowx=2:shadowy=2"
  fi
  ffmpeg -y -hide_banner -loglevel error \
    -loop 1 -i "$BANNER" -t "$dur" -r "$FPS" \
    -vf "${filters},format=yuv420p" \
    -c:v libx264 -pix_fmt yuv420p "$out"
}

# ── scenes ───────────────────────────────────────────────────────────────────

# Brand blue (a softer version of the banner blue for clean cards)
BG_DARK="0x05080F"
BG_BLUE="0x0A4D8C"
BG_FLASH="0x1A8CFF"
CYAN="0x4FBDFF"
WHITE="white"
GREY="0xA8B4C8"

echo "▸ scene 1: hook"
scene_text "$TMP_DIR/01.mp4" 3.2 "$BG_DARK" \
  "your AI forgets you" 78 "$WHITE" \
  "every session" 38 "$GREY"

echo "▸ scene 2: title (banner)"
scene_banner "$TMP_DIR/02.mp4" 3.5 \
  "BLINDCACHE" 110 "$WHITE" \
  "encrypted memory for AI agents" 32 "$CYAN"

echo "▸ scene 3: how it works"
scene_text "$TMP_DIR/03.mp4" 3.2 "$BG_DARK" \
  "sharded across 3 Nillion nodes" 56 "$WHITE" \
  "no operator can read your content" 32 "$GREY"

echo "▸ scene 4: NEW IN v0.2 flash"
scene_text "$TMP_DIR/04.mp4" 1.8 "$BG_FLASH" \
  "NEW IN v0.2" 96 "$WHITE" \
  "" 0 "$WHITE"

echo "▸ scene 5: feature 1"
scene_text "$TMP_DIR/05.mp4" 3.5 "$BG_DARK" \
  "semantic search" 84 "$CYAN" \
  "search by meaning, not substring" 32 "$GREY"

echo "▸ scene 6: differentiator"
scene_text "$TMP_DIR/06.mp4" 3.8 "$BG_DARK" \
  "embeddings happen locally" 64 "$WHITE" \
  "your text never leaves the SDK" 32 "$CYAN"

echo "▸ scene 7: vs the rest"
scene_text "$TMP_DIR/07.mp4" 4.2 "$BG_DARK" \
  "they send your text to OpenAI to embed" 40 "$WHITE" \
  "BlindCache stays local" 48 "$CYAN"

echo "▸ scene 8: CTA (banner)"
scene_banner "$TMP_DIR/08.mp4" 4.0 \
  "npx blindcache-mcp" 76 "$WHITE" \
  "github.com/nikshepsvn/blindcache" 28 "$CYAN"

# ── concat with crossfade ────────────────────────────────────────────────────

echo "▸ stitching with crossfades"

# Build the filter_complex: chain xfades between successive clips.
# xfade requires both inputs to be the same size/fps (they are) and an offset
# = (cumulative duration so far - transition duration).

XFADE=0.35

# Get the duration of each clip so we can offset correctly.
durs=()
for i in 01 02 03 04 05 06 07 08; do
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP_DIR/$i.mp4")
  durs+=("$d")
done

inputs=""
for i in 01 02 03 04 05 06 07 08; do
  inputs+=" -i $TMP_DIR/$i.mp4"
done

# Build the xfade chain.
filter=""
cum=0
prev_label="[0:v]"
for idx in 1 2 3 4 5 6 7; do
  cum=$(echo "$cum + ${durs[$((idx-1))]} - $XFADE" | bc -l)
  if [[ $idx -lt 7 ]]; then
    out_label="[v${idx}]"
  else
    out_label="[vout]"
  fi
  filter+="${prev_label}[${idx}:v]xfade=transition=fade:duration=${XFADE}:offset=${cum}${out_label};"
  prev_label="${out_label}"
done

# Strip trailing ;
filter="${filter%;}"

ffmpeg -y -hide_banner -loglevel error \
  $inputs \
  -filter_complex "$filter" \
  -map "[vout]" \
  -c:v libx264 -pix_fmt yuv420p -preset slow -crf 18 \
  "$OUT_DIR/blindcache-v0.2.mp4"

echo "▸ rendering gif"

# Convert mp4 to GIF with a custom palette for quality.
ffmpeg -y -hide_banner -loglevel error -i "$OUT_DIR/blindcache-v0.2.mp4" \
  -vf "fps=15,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" \
  "$OUT_DIR/blindcache-v0.2.gif"

echo ""
echo "✓ done"
ls -lh "$OUT_DIR/blindcache-v0.2.mp4" "$OUT_DIR/blindcache-v0.2.gif"
