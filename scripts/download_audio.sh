#!/usr/bin/env bash
# =============================================================================
# download_audio.sh
# Downloads all 6236 Quran ayah MP3s from everyayah.com
#
# Usage:
#   bash download_audio.sh
#   bash download_audio.sh --reciter Husary_128kbps   # override reciter
#   bash download_audio.sh --out /custom/path          # override output dir
#
# Features:
#   - Resumes interrupted downloads (skips complete files)
#   - Retries failed downloads with exponential backoff
#   - Validates downloaded file size (rejects empty/corrupt files)
#   - Logs all failures to failed.log for review
#   - Prints live progress and a summary at the end
#   - Respects the server with a small delay between requests
# =============================================================================

set -euo pipefail

# ── Config (override via CLI flags) ──────────────────────────────────────────
RECITER="Alafasy_128kbps"
BASE_URL="https://everyayah.com/data"
OUT_DIR="$(dirname "$0")/../quran-front/public/audio/Alafasy_128kbps"
MAX_RETRIES=5
RETRY_DELAY=3      # seconds (doubles on each retry)
REQUEST_DELAY=0.3  # seconds between successful downloads
MIN_FILE_SIZE=1024 # bytes — anything smaller is considered corrupt

# ── Parse CLI args ────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --reciter) RECITER="$2"; shift 2 ;;
    --out)     OUT_DIR="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── Ayah counts for all 114 surahs ───────────────────────────────────────────
AYAH_COUNTS=(
  0        # index 0 unused (surahs are 1-based)
  7 286 200 176 120 165 206 75 129 109   # 1–10
  123 111 43 52 99 128 111 110 98 135    # 11–20
  112 78 118 64 77 227 93 88 69 60       # 21–30
  34 30 73 54 45 83 182 88 75 85         # 31–40
  54 53 89 59 37 35 38 29 18 45          # 41–50
  60 49 62 55 78 96 29 22 24 13          # 51–60
  14 11 11 18 12 12 30 52 52 44          # 61–70
  28 28 20 56 40 31 50 40 46 42          # 71–80
  29 19 36 25 22 17 19 26 30 20          # 81–90
  15 21 11 8 8 19 5 8 8 11               # 91–100
  11 8 3 9 5 4 7 3 6 3                   # 101–110
  5 4 5 6                                # 111–114
)

# ── Setup ─────────────────────────────────────────────────────────────────────
mkdir -p "$OUT_DIR"
LOG_FILE="$OUT_DIR/failed.log"
SUMMARY_FILE="$OUT_DIR/download_summary.txt"

# Truncate failed log at start (fresh run), but keep it if resuming
# (we append during the run so interrupted sessions accumulate)
: > "$LOG_FILE"

TOTAL_AYAHS=6236
downloaded=0
skipped=0
failed=0
start_time=$(date +%s)

echo "============================================================"
echo "  Quran Audio Downloader"
echo "  Reciter : $RECITER"
echo "  Output  : $OUT_DIR"
echo "  Total   : $TOTAL_AYAHS files"
echo "============================================================"
echo ""

# ── Download function ─────────────────────────────────────────────────────────
download_file() {
  local surah=$1
  local ayah=$2
  local filename
  filename="$(printf '%03d%03d' "$surah" "$ayah").mp3"
  local dest="$OUT_DIR/$filename"
  local url="$BASE_URL/$RECITER/$filename"

  # Skip if already downloaded and valid
  if [[ -f "$dest" && $(stat -c%s "$dest" 2>/dev/null || stat -f%z "$dest" 2>/dev/null) -ge $MIN_FILE_SIZE ]]; then
    skipped=$((skipped + 1))
    return 0
  fi

  # Remove partial/corrupt file if exists
  [[ -f "$dest" ]] && rm -f "$dest"

  local attempt=0
  local delay=$RETRY_DELAY

  while [[ $attempt -lt $MAX_RETRIES ]]; do
    attempt=$((attempt + 1))

    # curl flags:
    #   -f  fail silently on HTTP errors (returns exit code 22)
    #   -s  silent
    #   -S  show error on failure
    #   -L  follow redirects
    #   --retry 0   we handle retries ourselves
    #   --connect-timeout 15
    #   --max-time 60
    if curl -fsSL \
         --connect-timeout 15 \
         --max-time 60 \
         --retry 0 \
         -o "$dest" \
         "$url" 2>/dev/null; then

      # Validate downloaded size
      local size
      size=$(stat -c%s "$dest" 2>/dev/null || stat -f%z "$dest" 2>/dev/null || echo 0)
      if [[ $size -ge $MIN_FILE_SIZE ]]; then
        downloaded=$((downloaded + 1))
        sleep "$REQUEST_DELAY"
        return 0
      else
        echo "    [WARN] File too small (${size}B), retrying... (attempt $attempt/$MAX_RETRIES)"
        rm -f "$dest"
      fi
    else
      local http_code
      http_code=$(curl -o /dev/null -s -w "%{http_code}" --connect-timeout 15 --max-time 10 "$url" 2>/dev/null || echo "000")
      if [[ "$http_code" == "404" ]]; then
        echo "    [SKIP] $filename not found on server (HTTP 404)"
        echo "404: $url" >> "$LOG_FILE"
        failed=$((failed + 1))
        return 0  # don't retry 404s
      fi
      echo "    [FAIL] attempt $attempt/$MAX_RETRIES failed (HTTP $http_code), retrying in ${delay}s..."
    fi

    sleep "$delay"
    delay=$((delay * 2))  # exponential backoff
  done

  # All retries exhausted
  echo "  [ERROR] GAVE UP on $filename after $MAX_RETRIES attempts"
  echo "FAILED: $url" >> "$LOG_FILE"
  failed=$((failed + 1))
  [[ -f "$dest" ]] && rm -f "$dest"
  return 0  # don't exit script on failure
}

# ── Main loop ─────────────────────────────────────────────────────────────────
processed=0

for surah in $(seq 1 114); do
  ayah_count=${AYAH_COUNTS[$surah]}
  echo "--- Surah $surah ($ayah_count ayahs) ---"

  for ayah in $(seq 1 "$ayah_count"); do
    processed=$((processed + 1))
    pct=$(( processed * 100 / TOTAL_AYAHS ))

    filename="$(printf '%03d%03d' "$surah" "$ayah").mp3"

    printf "  [%3d%%] %d/%d  %s ... " "$pct" "$processed" "$TOTAL_AYAHS" "$filename"

    download_file "$surah" "$ayah"

    # Print result on same line
    if [[ -f "$OUT_DIR/$filename" ]]; then
      echo "OK"
    else
      echo "FAILED"
    fi
  done
done

# ── Summary ───────────────────────────────────────────────────────────────────
end_time=$(date +%s)
elapsed=$(( end_time - start_time ))
mins=$(( elapsed / 60 ))
secs=$(( elapsed % 60 ))

echo ""
echo "============================================================"
echo "  DONE"
echo "  Downloaded : $downloaded"
echo "  Skipped    : $skipped (already existed)"
echo "  Failed     : $failed"
echo "  Time       : ${mins}m ${secs}s"
echo "  Output     : $OUT_DIR"
if [[ $failed -gt 0 ]]; then
  echo "  Failed log : $LOG_FILE"
fi
echo "============================================================"

{
  echo "Run completed: $(date)"
  echo "Downloaded: $downloaded"
  echo "Skipped: $skipped"
  echo "Failed: $failed"
  echo "Time: ${mins}m ${secs}s"
} > "$SUMMARY_FILE"

exit 0
