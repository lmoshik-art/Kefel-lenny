"""לקוח ל-API הציבורי של Kraken.

בסימולציה נעשה שימוש רק בנקודות הקצה הציבוריות (ללא מפתחות):
AssetPairs  רשימת כל זוגות המסחר ומאפייניהם (סטטוס, מינימום הזמנה, עמלות)
Ticker      מחירי קנייה ומכירה, מחיר אחרון, נפח 24 שעות, לכל הזוגות בבקשה אחת
OHLC        נרות מחיר ונפח לזוג בודד

תיעוד רשמי: https://docs.kraken.com/api/
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any

import httpx

log = logging.getLogger("kraken")

BASE_URL = "https://api.kraken.com/0/public"

# Kraken מכנה דולר אמריקאי ZUSD וביטקוין XXBT. הפונקציה normalize_asset מנקה זאת.
_ASSET_ALIASES = {"ZUSD": "USD", "ZEUR": "EUR", "ZGBP": "GBP", "XXBT": "XBT", "XETH": "ETH",
                  "XXRP": "XRP", "XLTC": "LTC", "XXLM": "XLM", "XXMR": "XMR", "XZEC": "ZEC",
                  "XETC": "ETC", "XXDG": "XDG", "XMLN": "MLN", "XREP": "REP", "ZCAD": "CAD",
                  "ZJPY": "JPY", "ZAUD": "AUD"}


def normalize_asset(code: str) -> str:
    """המרת קוד נכס פנימי של Kraken לשם מוכר (ZUSD -> USD)."""
    return _ASSET_ALIASES.get(code, code)


class KrakenError(Exception):
    """שגיאה שהוחזרה מ-Kraken או כשל תקשורת."""


@dataclass
class PairInfo:
    """מאפייני זוג מסחר כפי שהוחזרו מ-AssetPairs."""

    pair_id: str          # המזהה הפנימי, למשל XXBTZUSD
    altname: str          # השם הקצר, למשל XBTUSD
    wsname: str           # השם הקריא, למשל XBT/USD
    base: str             # הנכס הנקנה
    quote: str            # מטבע הציטוט
    status: str           # online / cancel_only / post_only / reduce_only / limit_only
    ordermin: float       # כמות מינימלית להזמנה, ביחידות הנכס
    costmin: float        # עלות מינימלית להזמנה, במטבע הציטוט
    lot_decimals: int     # מספר ספרות אחרי הנקודה בכמות
    pair_decimals: int    # מספר ספרות אחרי הנקודה במחיר
    taker_fee_pct: float  # עמלת לוקח במדרגה הראשונה, באחוזים


@dataclass
class Ticker:
    """נתוני מחיר ונפח לזוג, כפי שהוחזרו מ-Ticker."""

    pair_id: str
    ask: float            # מחיר המכירה הטוב ביותר (הקונה משלם אותו)
    bid: float            # מחיר הקנייה הטוב ביותר (המוכר מקבל אותו)
    last: float           # מחיר העסקה האחרונה
    open_today: float     # מחיר הפתיחה של היום
    volume_24h: float     # נפח 24 שעות ביחידות הנכס
    vwap_24h: float       # מחיר ממוצע משוקלל נפח ב-24 שעות
    trades_24h: int       # מספר עסקאות ב-24 שעות

    @property
    def spread_pct(self) -> float:
        """המרווח בין קנייה למכירה באחוזים מהמחיר."""
        if self.ask <= 0:
            return float("inf")
        return (self.ask - self.bid) / self.ask * 100

    @property
    def quote_volume_24h(self) -> float:
        """נפח 24 שעות במטבע הציטוט (כמות כפול מחיר ממוצע)."""
        return self.volume_24h * self.vwap_24h

    @property
    def change_today_pct(self) -> float:
        """שינוי המחיר באחוזים מפתיחת היום."""
        if self.open_today <= 0:
            return 0.0
        return (self.last - self.open_today) / self.open_today * 100


@dataclass
class Candle:
    """נר מחיר ונפח אחד מנקודת הקצה OHLC."""

    time: int
    open: float
    high: float
    low: float
    close: float
    vwap: float
    volume: float   # נפח ביחידות הנכס
    count: int      # מספר עסקאות בנר

    @property
    def quote_volume(self) -> float:
        return self.volume * (self.vwap if self.vwap > 0 else self.close)


def parse_asset_pairs(result: dict[str, Any], default_fee_pct: float) -> dict[str, PairInfo]:
    """פענוח תשובת AssetPairs למילון של PairInfo לפי מזהה הזוג."""
    pairs: dict[str, PairInfo] = {}
    for pair_id, raw in result.items():
        fees = raw.get("fees") or []
        fee_pct = default_fee_pct
        if fees and isinstance(fees[0], (list, tuple)) and len(fees[0]) >= 2:
            fee_pct = float(fees[0][1])
        pairs[pair_id] = PairInfo(
            pair_id=pair_id,
            altname=raw.get("altname", pair_id),
            wsname=raw.get("wsname", pair_id),
            base=normalize_asset(raw.get("base", "")),
            quote=normalize_asset(raw.get("quote", "")),
            status=raw.get("status", "unknown"),
            ordermin=float(raw.get("ordermin", 0) or 0),
            costmin=float(raw.get("costmin", 0) or 0),
            lot_decimals=int(raw.get("lot_decimals", 8)),
            pair_decimals=int(raw.get("pair_decimals", 5)),
            taker_fee_pct=fee_pct,
        )
    return pairs


def parse_tickers(result: dict[str, Any]) -> dict[str, Ticker]:
    """פענוח תשובת Ticker. שורות פגומות מדולגות ונרשמות ביומן."""
    tickers: dict[str, Ticker] = {}
    for pair_id, raw in result.items():
        try:
            tickers[pair_id] = Ticker(
                pair_id=pair_id,
                ask=float(raw["a"][0]),
                bid=float(raw["b"][0]),
                last=float(raw["c"][0]),
                open_today=float(raw["o"]),
                volume_24h=float(raw["v"][1]),
                vwap_24h=float(raw["p"][1]),
                trades_24h=int(raw["t"][1]),
            )
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            log.debug("דילוג על טיקר פגום %s: %s", pair_id, exc)
    return tickers


def parse_ohlc(result: dict[str, Any], pair_id: str) -> list[Candle]:
    """פענוח תשובת OHLC לרשימת נרות. הנר האחרון הוא הנר הנוכחי, שעדיין לא נסגר."""
    rows = result.get(pair_id)
    if rows is None:
        # Kraken מחזירה לעיתים את הזוג תחת שם אחר. ניקח את המפתח היחיד שאינו last.
        keys = [k for k in result if k != "last"]
        rows = result[keys[0]] if keys else []
    candles = []
    for row in rows:
        candles.append(Candle(
            time=int(row[0]), open=float(row[1]), high=float(row[2]), low=float(row[3]),
            close=float(row[4]), vwap=float(row[5]), volume=float(row[6]), count=int(row[7]),
        ))
    return candles


class KrakenPublicClient:
    """לקוח אסינכרוני ל-API הציבורי. שומר על קצב בקשות מנומס (בקשה אחת בשנייה)."""

    def __init__(self, default_fee_pct: float = 0.4, min_interval: float = 1.0, timeout: float = 20.0):
        self._default_fee_pct = default_fee_pct
        self._min_interval = min_interval
        self._client = httpx.AsyncClient(base_url=BASE_URL, timeout=timeout,
                                         headers={"User-Agent": "crypto-trader-sim/1.0"})
        self._lock = asyncio.Lock()
        self._last_request = 0.0

    async def close(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        """ביצוע בקשת GET עם השהיה בין בקשות ובדיקת שגיאות של Kraken."""
        async with self._lock:
            loop = asyncio.get_running_loop()
            wait = self._min_interval - (loop.time() - self._last_request)
            if wait > 0:
                await asyncio.sleep(wait)
            try:
                response = await self._client.get(path, params=params)
            except httpx.HTTPError as exc:
                raise KrakenError(f"כשל תקשורת מול Kraken ({path}): {exc}") from exc
            finally:
                self._last_request = loop.time()
        if response.status_code != 200:
            raise KrakenError(f"Kraken החזירה קוד {response.status_code} עבור {path}")
        payload = response.json()
        if payload.get("error"):
            raise KrakenError(f"שגיאת Kraken עבור {path}: {payload['error']}")
        return payload["result"]

    async def asset_pairs(self) -> dict[str, PairInfo]:
        return parse_asset_pairs(await self._get("/AssetPairs"), self._default_fee_pct)

    async def tickers(self) -> dict[str, Ticker]:
        """כל הטיקרים בבקשה אחת (ללא פרמטר pair, Kraken מחזירה את כל הזוגות)."""
        return parse_tickers(await self._get("/Ticker"))

    async def ohlc(self, pair_id: str, interval_minutes: int = 5) -> list[Candle]:
        result = await self._get("/OHLC", {"pair": pair_id, "interval": interval_minutes})
        return parse_ohlc(result, pair_id)
