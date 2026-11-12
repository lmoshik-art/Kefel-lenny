"""סורק: איתור זוגות מסחר חדשים וקפיצות בנפח.

הסורק עובד בשני שלבים כדי לחסוך בקשות ל-Kraken:
1. מתוך תשובת Ticker אחת (כל הזוגות) נבחרים מועמדים לפי נפח ומומנטום.
2. רק למועמדים המובילים נמשכים נרות (OHLC) ונבדקת קפיצת נפח:
   נפח הנר הסגור האחרון חלקי ממוצע הנרות שלפניו.

זוג חדש = זוג שמופיע ב-AssetPairs ולא הופיע בסבבים קודמים.
בהפעלה הראשונה כל הזוגות הקיימים נרשמים כמוכרים, כדי שלא ייחשבו חדשים.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime

from .journal import Journal
from .kraken import Candle, PairInfo, Ticker

log = logging.getLogger("scanner")

# נכסים שאינם מתאימים למסחר מומנטום: מטבעות יציבים, מטבעות פיאט, מניות מטוקנות
_EXCLUDED_BASES = {
    "USDT", "USDC", "DAI", "TUSD", "USDP", "PYUSD", "EURT", "EUR", "GBP", "CAD", "JPY",
    "AUD", "CHF", "USD", "USDG", "RLUSD", "USDQ", "EURQ", "EURR", "USDR", "FDUSD",
}


@dataclass
class Candidate:
    """מועמד לכניסה, עם הנתונים שנאספו עליו והנימוקים."""

    pair: PairInfo
    ticker: Ticker
    is_new_pair: bool
    first_seen: datetime | None
    volume_spike_ratio: float | None = None   # None עד שנמשכו נרות
    last_candle: Candle | None = None
    prev_candle: Candle | None = None
    reasons: list[str] = field(default_factory=list)

    @property
    def score(self) -> float:
        """ציון לדירוג מועמדים: נפח, מומנטום וקפיצת נפח."""
        spike = self.volume_spike_ratio or 1.0
        return self.ticker.change_today_pct * spike + (2.0 if self.is_new_pair else 0.0)


def volume_spike_ratio(candles: list[Candle], lookback: int = 24) -> float | None:
    """יחס הנפח של הנר הסגור האחרון לממוצע הנרות שלפניו.

    הנר האחרון ברשימה הוא הנר הנוכחי שעדיין לא נסגר, ולכן מתעלמים ממנו.
    מוחזר None אם אין מספיק נרות.
    """
    closed = candles[:-1]
    if len(closed) < 6:
        return None
    last = closed[-1]
    baseline = closed[-1 - lookback:-1] if len(closed) > lookback else closed[:-1]
    avg = sum(c.quote_volume for c in baseline) / len(baseline)
    if avg <= 0:
        return None
    return last.quote_volume / avg


class Scanner:
    """הסורק מחזיק את רשימת הזוגות המוכרים ומייצר מועמדים בכל סבב."""

    def __init__(self, journal: Journal, quote_currency: str, min_volume_24h: float,
                 min_price_change_pct: float):
        self._journal = journal
        self._quote = quote_currency
        self._min_volume = min_volume_24h
        self._min_change = min_price_change_pct

    def register_pairs(self, pairs: dict[str, PairInfo], now: datetime) -> list[PairInfo]:
        """רישום זוגות ביומן. מחזיר את הזוגות שנראו לראשונה (חדשים).

        אם היומן ריק (הפעלה ראשונה), כל הזוגות נרשמים ללא סימון "חדש".
        """
        known = self._journal.known_pairs()
        first_run = len(known) == 0
        new_pairs = []
        for pair_id, info in pairs.items():
            if pair_id not in known:
                self._journal.add_known_pair(pair_id, info.wsname, now, is_new=not first_run)
                if not first_run:
                    new_pairs.append(info)
                    log.info("זוג חדש אותר: %s", info.wsname)
        return new_pairs

    def tradable(self, pairs: dict[str, PairInfo]) -> dict[str, PairInfo]:
        """הזוגות שמולם המערכת סוחרת: מטבע הציטוט הנבחר, לא מטבע יציב, סטטוס מקוון."""
        return {
            pid: p for pid, p in pairs.items()
            if p.quote == self._quote and p.base not in _EXCLUDED_BASES
            and p.status == "online" and ".d" not in p.altname
        }

    def find_candidates(self, pairs: dict[str, PairInfo], tickers: dict[str, Ticker],
                        limit: int) -> list[Candidate]:
        """בחירת מועמדים מתוך הטיקרים, מדורגים לפי ציון. ללא בקשות רשת."""
        known = self._journal.known_pairs()
        candidates: list[Candidate] = []
        for pid, pair in self.tradable(pairs).items():
            ticker = tickers.get(pid)
            if ticker is None or ticker.ask <= 0 or ticker.bid <= 0:
                continue
            record = known.get(pid)
            is_new = bool(record and record.is_new)
            reasons = []
            if ticker.quote_volume_24h < self._min_volume and not is_new:
                continue
            if ticker.change_today_pct < self._min_change and not is_new:
                continue
            reasons.append(f"שינוי יומי {ticker.change_today_pct:+.1f}%")
            reasons.append(f"נפח 24 שעות {ticker.quote_volume_24h:,.0f} {self._quote}")
            if is_new:
                reasons.append("זוג חדש בזירה")
            candidates.append(Candidate(
                pair=pair, ticker=ticker, is_new_pair=is_new,
                first_seen=record.first_seen if record else None, reasons=reasons,
            ))
        candidates.sort(key=lambda c: c.score, reverse=True)
        return candidates[:limit]

    @staticmethod
    def apply_candles(candidate: Candidate, candles: list[Candle], min_ratio: float) -> bool:
        """עדכון מועמד בנתוני הנרות. מחזיר True אם אותרה קפיצת נפח."""
        ratio = volume_spike_ratio(candles)
        candidate.volume_spike_ratio = ratio
        if len(candles) >= 3:
            candidate.last_candle = candles[-2]
            candidate.prev_candle = candles[-3]
        if ratio is None:
            candidate.reasons.append("אין מספיק נרות לבדיקת נפח")
            return False
        candidate.reasons.append(f"יחס קפיצת נפח {ratio:.1f}")
        return ratio >= min_ratio
