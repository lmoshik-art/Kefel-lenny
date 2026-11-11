"""בודק איכות: סינון זוגות חשודים או לא מתאימים למסחר.

הערה חשובה על זירה מרכזית: ב-Kraken אין חוזים חכמים, נזילות נעולה או
הרשאות mint, ולכן בדיקות "הונאה" של רשתות מבוזרות אינן רלוונטיות.
במקומן נבדקים הסיכונים שקיימים בזירה מרכזית:
- סטטוס הזוג (רק online, לא cancel_only / post_only / reduce_only)
- נפח מסחר מספק ב-24 שעות
- מרווח קנייה-מכירה סביר (מרווח רחב מעיד על נזילות דלה ומייקר כל עסקה)
- מספר עסקאות ב-24 שעות (שוק פעיל ולא מחיר מלאכותי)
- גיל הזוג (זוג חדש מאוד נתון לתנודות קיצוניות ולמניפולציות)
- עמידה במינימום ההזמנה של Kraken ביחס לגודל הפוזיציה המתוכנן
כל בדיקה מחזירה נימוק, והדוח המלא נשמר ביומן העסקאות.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from .scanner import Candidate


@dataclass
class ScreenReport:
    """תוצאת בדיקת האיכות של זוג."""

    passed: bool
    checks: list[dict] = field(default_factory=list)

    def add(self, name: str, ok: bool, detail: str) -> None:
        self.checks.append({"name": name, "ok": ok, "detail": detail})

    @property
    def failures(self) -> list[str]:
        return [f"{c['name']}: {c['detail']}" for c in self.checks if not c["ok"]]

    def to_dict(self) -> dict:
        return {"passed": self.passed, "checks": self.checks}


class Screener:
    def __init__(self, min_volume_24h: float, max_spread_pct: float, new_pair_wait_minutes: int,
                 min_trades_24h: int = 200):
        self._min_volume = min_volume_24h
        self._max_spread = max_spread_pct
        self._wait_minutes = new_pair_wait_minutes
        self._min_trades = min_trades_24h

    def screen(self, candidate: Candidate, planned_cost: float, now: datetime) -> ScreenReport:
        """הרצת כל הבדיקות על מועמד. planned_cost הוא גודל הפוזיציה המתוכנן במטבע הציטוט."""
        report = ScreenReport(passed=True)
        pair, ticker = candidate.pair, candidate.ticker

        ok = pair.status == "online"
        report.add("סטטוס זוג", ok, f"הסטטוס הוא {pair.status}")

        ok_vol = ticker.quote_volume_24h >= self._min_volume
        report.add("נפח 24 שעות", ok_vol,
                   f"{ticker.quote_volume_24h:,.0f} מול מינימום {self._min_volume:,.0f}")

        spread = ticker.spread_pct
        ok_spread = spread <= self._max_spread
        report.add("מרווח קנייה-מכירה", ok_spread, f"{spread:.2f}% מול מרבי {self._max_spread}%")

        ok_trades = ticker.trades_24h >= self._min_trades
        report.add("מספר עסקאות 24 שעות", ok_trades, f"{ticker.trades_24h} מול מינימום {self._min_trades}")

        if candidate.is_new_pair and candidate.first_seen is not None:
            age_min = (now - candidate.first_seen).total_seconds() / 60
            ok_age = age_min >= self._wait_minutes
            report.add("גיל זוג חדש", ok_age, f"{age_min:.0f} דקות מול המתנה של {self._wait_minutes} דקות")

        min_cost = max(pair.costmin, pair.ordermin * ticker.ask)
        ok_min = planned_cost >= min_cost
        report.add("מינימום הזמנה", ok_min, f"מתוכנן {planned_cost:.2f} מול מינימום {min_cost:.2f}")

        report.passed = all(c["ok"] for c in report.checks)
        return report
