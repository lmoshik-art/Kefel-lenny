#!/usr/bin/env bash
# הפעלת מערכת המסחר (סימולציה) ב-Mac או Linux: bash start.sh
set -e
cd "$(dirname "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo "לא נמצא Python. התקינו Python 3.11 ומעלה מהאתר python.org"
  exit 1
fi
if [ ! -f .env ]; then
  cp .env.example .env
  echo "נוצר קובץ .env מתוך הדוגמה. ניתן לערוך אותו בכל עורך טקסט."
fi
if [ ! -d venv ]; then
  echo "יוצר סביבה וירטואלית..."
  python3 -m venv venv
fi
# shellcheck disable=SC1091
source venv/bin/activate
python -m pip install -q -r requirements.txt
echo "מפעיל את המערכת. לוח המחוונים ייפתח בדפדפן. לעצירה: Ctrl+C"
python -m app
