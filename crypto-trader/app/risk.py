"""קביעת גודל פוזיציה ומגבלות קשיחות.

גודל פוזיציה:
    סיכון לעסקה = הון נוכחי * RISK_PER_TRADE_PCT
    גודל פוזיציה = סיכון לעסקה / STOP_LOSS_PCT
    ואז נחתך לפי התקרות: MAX_POSITION_PCT מההון, והמזומן הפנוי בפועל.

מגבלות קשיחות (עצירת חירום):
    הפסד יומי: אם ההון יורד מתחת ל-(הון בתחילת היום) * (1 - MAX_DAILY_LOSS_PCT)
    המערכת נעצרת, כל הפוזיציות נסגרות, ואין חידוש אוטומטי.
    החידוש אפשרי רק בלחיצה מפורשת בלוח המחוונים.
"""
from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class SizingResult:
    """תוצאת חישוב גודל הפוזיציה, עם פירוט כל המגבלות שהופעלו."""

    cost: float                 # הסכום להשקעה במטבע הציטוט (0 אם אסור)
    risk_amount: float          # הסכום המסוכן בפועל עד הסטופ-לוס
    limited_by: str             # איזו מגבלה קבעה את הגודל
    notes: list[str]


class RiskManager:
    def __init__(self, max_daily_loss_pct: float, max_position_pct: float,
                 risk_per_trade_pct: float, max_open_positions: int, stop_loss_pct: float):
        self.max_daily_loss_pct = max_daily_loss_pct
        self.max_position_pct = max_position_pct
        self.risk_per_trade_pct = risk_per_trade_pct
        self.max_open_positions = max_open_positions
        self.stop_loss_pct = stop_loss_pct

    def position_size(self, equity: float, cash: float) -> SizingResult:
        """חישוב גודל הפוזיציה במטבע הציטוט."""
        notes = []
        if equity <= 0 or cash <= 0:
            return SizingResult(0.0, 0.0, "אין הון פנוי", ["ההון או המזומן אינם חיוביים"])

        risk_amount = equity * self.risk_per_trade_pct / 100
        by_risk = risk_amount / (self.stop_loss_pct / 100)
        notes.append(f"לפי סיכון {self.risk_per_trade_pct}% מהון {equity:.2f}: {by_risk:.2f}")

        cap_position = equity * self.max_position_pct / 100
        notes.append(f"תקרת פוזיציה {self.max_position_pct}%: {cap_position:.2f}")
        notes.append(f"מזומן פנוי: {cash:.2f}")

        cost, limited_by = by_risk, "סיכון לעסקה"
        if cap_position < cost:
            cost, limited_by = cap_position, "גודל פוזיציה מרבי"
        if cash < cost:
            cost, limited_by = cash, "מזומן פנוי"
        # עיגול כלפי מטה לאגורות, כדי שהסכום לעולם לא יחרוג מהתקרה בגלל עיגול
        cost = math.floor(cost * 100) / 100
        actual_risk = cost * self.stop_loss_pct / 100
        return SizingResult(cost, round(actual_risk, 2), limited_by, notes)

    def daily_loss_limit(self, day_start_equity: float) -> float:
        """ההון שמתחתיו מופעלת עצירת החירום."""
        return day_start_equity * (1 - self.max_daily_loss_pct / 100)

    def daily_loss_breached(self, equity: float, day_start_equity: float) -> bool:
        return equity <= self.daily_loss_limit(day_start_equity)

    def can_open_more(self, open_positions: int) -> bool:
        return open_positions < self.max_open_positions

    def within_position_limit(self, cost: float, equity: float) -> bool:
        """בדיקה כפולה לפני כל ביצוע: הסכום לא חורג מתקרת הפוזיציה (סובלנות של אגורה)."""
        return cost <= equity * self.max_position_pct / 100 + 0.01
