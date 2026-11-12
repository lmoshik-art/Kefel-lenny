@echo off
chcp 65001 >nul
REM הפעלת מערכת המסחר (סימולציה) ב-Windows. לחיצה כפולה על הקובץ מספיקה.
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo לא נמצא Python. התקינו Python 3.11 ומעלה מהאתר python.org וסמנו "Add Python to PATH".
  pause
  exit /b 1
)
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo נוצר קובץ .env מתוך הדוגמה. ניתן לערוך אותו בפנקס רשימות.
)
if not exist "venv" (
  echo יוצר סביבה וירטואלית...
  python -m venv venv
)
call venv\Scripts\activate.bat
python -m pip install -q -r requirements.txt
echo מפעיל את המערכת. לוח המחוונים ייפתח בדפדפן. לעצירה: סגרו חלון זה או לחצו Ctrl+C.
python -m app
pause
