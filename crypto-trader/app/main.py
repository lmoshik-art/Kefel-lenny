"""שרת האינטרנט ולוח המחוונים.

הפעלה:  python -m app
הלוח נפתח בדפדפן בכתובת http://127.0.0.1:8000 (או לפי HOST ו-PORT בקובץ הסביבה).
השרת מריץ את לולאת המסחר ברקע ומגיש את המצב הנוכחי לדפדפן דרך /api/state.
"""
from __future__ import annotations

import asyncio
import logging
import sys
import threading
import webbrowser
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from .bot import TradingBot
from .config import ConfigError, Settings, load_settings
from .journal import Journal
from .kraken import KrakenPublicClient

STATIC_DIR = Path(__file__).parent / "static"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("main")


def create_app(settings: Settings) -> FastAPI:
    """בניית אפליקציית FastAPI עם הבוט שרץ ברקע לאורך חיי השרת."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        journal = Journal(settings.db_path)
        client = KrakenPublicClient(default_fee_pct=settings.default_taker_fee_pct)
        bot = TradingBot(settings, journal, client)
        app.state.bot = bot
        task = asyncio.create_task(bot.run_forever())
        try:
            yield
        finally:
            bot.stop()
            task.cancel()
            await client.close()
            journal.close()

    app = FastAPI(title="מערכת מסחר אוטומטית, סימולציה", lifespan=lifespan)

    @app.get("/")
    async def index():
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/api/state")
    async def state():
        return JSONResponse(app.state.bot.snapshot())

    @app.post("/api/pause")
    async def pause():
        bot: TradingBot = app.state.bot
        bot.paused = True
        bot.consecutive_errors = 0
        bot._event("המערכת הושהתה ידנית. פוזיציות פתוחות ממשיכות להיות מנוהלות.", "warning")
        return {"ok": True}

    @app.post("/api/continue")
    async def unpause():
        bot: TradingBot = app.state.bot
        bot.paused = False
        bot.consecutive_errors = 0
        bot._event("המערכת ממשיכה.")
        return {"ok": True}

    @app.post("/api/resume-after-halt")
    async def resume_after_halt():
        bot: TradingBot = app.state.bot
        if not bot.halted:
            raise HTTPException(status_code=400, detail="המערכת אינה בעצירת חירום")
        bot.resume()
        return {"ok": True}

    @app.post("/api/close-all")
    async def close_all():
        bot: TradingBot = app.state.bot
        bot.close_all("סגירה ידנית מלוח המחוונים")
        return {"ok": True}

    return app


def main() -> None:
    try:
        settings = load_settings()
    except ConfigError as exc:
        print(f"שגיאת הגדרות: {exc}", file=sys.stderr)
        sys.exit(1)
    if not settings.is_simulation:
        print("מצב live אינו פעיל בגרסה זו. שנו MODE=simulation בקובץ .env", file=sys.stderr)
        sys.exit(1)

    url = f"http://{settings.host}:{settings.port}"
    print(f"לוח המחוונים: {url}")
    threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    uvicorn.run(create_app(settings), host=settings.host, port=settings.port, log_level="warning")


if __name__ == "__main__":
    main()
