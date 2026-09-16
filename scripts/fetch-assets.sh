#!/usr/bin/env bash
# מוריד את נכסי האפליקציה המקוריים אל public/assets ומייצר מהם את אייקוני ה-PWA.
# יש להריץ ממחשב עם גישת רשת אל d8j0ntlcm91z4.cloudfront.net:
#   bash scripts/fetch-assets.sh
set -uo pipefail

BASE="https://d8j0ntlcm91z4.cloudfront.net/user_3EXHOR3GdvIPrnDYc76PDR1FysN"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/public/assets"
LIST="$ROOT/scripts/assets.txt"
MIN_BYTES=4096

mkdir -p "$OUT"
failed=0

while read -r dest src; do
  [ -z "${dest:-}" ] && continue
  tmp="$(mktemp)"
  if curl -sS -f -L --retry 3 --retry-delay 2 -o "$tmp" "$BASE/$src"; then
    size=$(wc -c < "$tmp")
    type=$(file -b --mime-type "$tmp" 2>/dev/null || echo "image/png")
    if [ "$size" -lt "$MIN_BYTES" ] || [ "$type" != "image/png" ]; then
      echo "FAIL  $dest (size=$size type=$type)"
      failed=$((failed + 1))
      rm -f "$tmp"
      continue
    fi
    mv "$tmp" "$OUT/$dest"
    echo "OK    $dest ($size bytes)"
  else
    echo "FAIL  $dest (download error)"
    failed=$((failed + 1))
    rm -f "$tmp"
  fi
done < "$LIST"

if [ "$failed" -gt 0 ]; then
  echo "לא ירדו $failed קבצים. יש לבדוק את החיבור ולהריץ שוב."
  exit 1
fi

echo "כל 21 הקבצים ירדו. מייצר אייקוני PWA מתוך coin.png..."
python3 "$ROOT/scripts/make-icons.py"
