"""כללי כניסה ויציאה.

כניסה (מומנטום על קפיצת נפח):
    1. הסורק איתר קפיצת נפח (יחס נפח מעל VOLUME_SPIKE_RATIO).
    2. הנר הסגור האחרון עלה: סגירה גבוהה מפתיחה וגבוהה מסגירת הנר הקודם.
    3. המחיר האחרון מעל ממוצע 24 השעות המשוקלל (VWAP): הקונים שולטים.
יציאה:
    סטופ-לוס, יעד רווח, או פקיעת זמן ההחזקה המרבי.
סטופ נגרר:
    אחרי שהמחיר (bid) עלה TRAILING_START_PCT מעל הכניסה, הסטופ נשמר TRAILING_STOP_PCT
    מתחת למחיר הגבוה ביותר שנרשם מאז הכניסה. הסטופ רק עולה, לעולם לא יורד.
    ברגע ההפעלה הוא כבר מעל מחיר הכניסה, ולכן עסקה שהגיעה לסף לא תסתיים בהפסד.
    יעד הרווח ופקיעת הזמן ממשיכים לפעול כרגיל.

הערה גלויה: זו אסטרטגיה בסיסית ומתועדת לצורך סימולציה ולמידה.
אין בה הבטחה לרווח, והסימולציה נועדה בדיוק כדי לבחון אותה לפני כל סיכון כספי.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from .journal import OpenTrade
from .kraken import Ticker
from .scanner import Candidate


@dataclass
class EntryDecision:
    enter: bool
    reason: str


@dataclass
class ExitDecision:
    exit: bool
    reason: str


@dataclass
class StopUpdate:
    """תוצאת עדכון הסטופ הנגרר לפוזיציה פתוחה."""

    stop_loss: float
    highest_price: float
    trailing: bool
    moved: bool           # True אם הסטופ הועלה בסבב זה


class Strategy:
    def __init__(self, stop_loss_pct: float, take_profit_pct: float, max_hold_minutes: int,
                 trailing_start_pct: float = 0.0, trailing_stop_pct: float = 0.0):
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct
        self.max_hold = timedelta(minutes=max_hold_minutes)
        self.trailing_start_pct = trailing_start_pct
        self.trailing_stop_pct = trailing_stop_pct

    @property
    def trailing_enabled(self) -> bool:
        return self.trailing_stop_pct > 0

    def update_stop(self, trade: OpenTrade, ticker: Ticker) -> StopUpdate:
        """חישוב הסטופ הנגרר לפי מחיר ה-bid הנוכחי. הסטופ לעולם אינו יורד."""
        highest = max(trade.highest_price or trade.entry_price, ticker.bid)
        if not self.trailing_enabled:
            return StopUpdate(trade.stop_loss, highest, trade.trailing, False)
        activation = trade.entry_price * (1 + self.trailing_start_pct / 100)
        if highest < activation:
            return StopUpdate(trade.stop_loss, highest, trade.trailing, False)
        candidate = highest * (1 - self.trailing_stop_pct / 100)
        if candidate > trade.stop_loss:
            return StopUpdate(candidate, highest, True, True)
        return StopUpdate(trade.stop_loss, highest, trade.trailing, False)

    def should_enter(self, c: Candidate) -> EntryDecision:
        if c.last_candle is None or c.prev_candle is None:
            return EntryDecision(False, "אין נרות סגורים לבדיקה")
        last, prev = c.last_candle, c.prev_candle
        if last.close <= last.open:
            return EntryDecision(False, "הנר האחרון ירד: אין מומנטום קנייה")
        if last.close <= prev.close:
            return EntryDecision(False, "הסגירה האחרונה אינה גבוהה מהסגירה הקודמת")
        if c.ticker.last <= c.ticker.vwap_24h:
            return EntryDecision(False, "המחיר מתחת לממוצע המשוקלל של 24 שעות")
        reason = "; ".join(c.reasons + [
            f"נר עולה {last.open:.6g} -> {last.close:.6g}",
            f"מחיר {c.ticker.last:.6g} מעל VWAP {c.ticker.vwap_24h:.6g}",
        ])
        return EntryDecision(True, reason)

    def levels(self, entry_price: float) -> tuple[float, float]:
        """מחירי הסטופ-לוס ויעד הרווח לפי מחיר הכניסה."""
        return (entry_price * (1 - self.stop_loss_pct / 100),
                entry_price * (1 + self.take_profit_pct / 100))

    def should_exit(self, trade: OpenTrade, ticker: Ticker, now: datetime) -> ExitDecision:
        bid = ticker.bid
        if bid <= trade.stop_loss:
            kind = "סטופ נגרר (נעילת רווח)" if trade.trailing else "סטופ-לוס"
            return ExitDecision(True, f"{kind}: מחיר {bid:.6g} מתחת ל-{trade.stop_loss:.6g}")
        if bid >= trade.take_profit:
            return ExitDecision(True, f"יעד רווח: מחיר {bid:.6g} מעל {trade.take_profit:.6g}")
        if now - trade.entry_time >= self.max_hold:
            return ExitDecision(True, f"פקיעת זמן החזקה ({self.max_hold.total_seconds() / 60:.0f} דקות)")
        return ExitDecision(False, "")
