"""מבצע: כניסות, יציאות וטיפול בסליפג'.

בסימולציה המילוי מחושב מהמחירים האמיתיים בשוק:
    קנייה:  במחיר ה-ask האמיתי, בתוספת סליפג' מדומה (SIM_SLIPPAGE_PCT)
    מכירה: במחיר ה-bid האמיתי, בניכוי סליפג' מדומה
    עמלה:  לפי טבלת העמלות של הזוג ב-Kraken (מדרגת לוקח ראשונה)
כך הסימולציה מגלמת את המרווח האמיתי, סליפג' ועמלות, ולא מחיר "אמצע" אופטימי.

הממשק Executor משותף לסימולציה ולמסחר אמיתי. LiveExecutor קיים כמחזיק מקום
ומסרב לפעול: מסחר אמיתי יתווסף רק בשלב הבא, לאחר אישור מפורש.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .kraken import PairInfo, Ticker


@dataclass
class Fill:
    """תוצאת ביצוע הזמנה."""

    price: float          # המחיר הממוצע שבו מולאה ההזמנה
    qty: float            # הכמות ביחידות הנכס
    gross: float          # שווי העסקה לפני עמלה (מחיר כפול כמות)
    fee: float            # העמלה במטבע הציטוט
    slippage_pct: float   # הסליפג' הכולל (מרווח ועוד סליפג' מדומה) באחוזים
    simulated: bool


class ExecutionError(Exception):
    """ההזמנה לא ניתנת לביצוע (למשל מתחת למינימום של הזירה)."""


class Executor(Protocol):
    def buy(self, pair: PairInfo, ticker: Ticker, cost: float) -> Fill: ...
    def sell(self, pair: PairInfo, ticker: Ticker, qty: float) -> Fill: ...


def _round_down(value: float, decimals: int) -> float:
    factor = 10 ** decimals
    return int(value * factor) / factor


class SimulatedExecutor:
    """ביצוע מדומה על מחירי שוק אמיתיים."""

    def __init__(self, slippage_pct: float):
        self._slippage_pct = slippage_pct

    def buy(self, pair: PairInfo, ticker: Ticker, cost: float) -> Fill:
        """קנייה בסכום cost (כולל עמלה) במטבע הציטוט."""
        if ticker.ask <= 0:
            raise ExecutionError(f"אין מחיר מכירה תקף עבור {pair.wsname}")
        price = ticker.ask * (1 + self._slippage_pct / 100)
        fee_rate = pair.taker_fee_pct / 100
        gross = cost / (1 + fee_rate)
        qty = _round_down(gross / price, pair.lot_decimals)
        if qty < pair.ordermin or qty <= 0:
            raise ExecutionError(
                f"הכמות {qty} קטנה ממינימום ההזמנה {pair.ordermin} עבור {pair.wsname}")
        gross = qty * price
        if gross < pair.costmin:
            raise ExecutionError(f"העלות {gross:.2f} קטנה מעלות המינימום {pair.costmin} עבור {pair.wsname}")
        fee = gross * fee_rate
        mid = (ticker.ask + ticker.bid) / 2
        slippage_total = (price - mid) / mid * 100 if mid > 0 else 0.0
        return Fill(price=price, qty=qty, gross=gross, fee=fee, slippage_pct=slippage_total, simulated=True)

    def sell(self, pair: PairInfo, ticker: Ticker, qty: float) -> Fill:
        """מכירת כמות qty של הנכס. המכירה מתבצעת תמיד במלואה (יציאה מהפוזיציה)."""
        if ticker.bid <= 0:
            raise ExecutionError(f"אין מחיר קנייה תקף עבור {pair.wsname}")
        price = ticker.bid * (1 - self._slippage_pct / 100)
        gross = qty * price
        fee = gross * pair.taker_fee_pct / 100
        mid = (ticker.ask + ticker.bid) / 2
        slippage_total = (mid - price) / mid * 100 if mid > 0 else 0.0
        return Fill(price=price, qty=qty, gross=gross, fee=fee, slippage_pct=slippage_total, simulated=True)


class LiveExecutor:
    """מחזיק מקום למסחר אמיתי. בגרסה זו חסום בכוונה."""

    def __init__(self, api_key: str, api_secret: str):
        # המפתחות אינם נשמרים ואינם נרשמים ביומן. מסחר אמיתי אינו ממומש בגרסה זו.
        del api_key, api_secret

    def buy(self, pair: PairInfo, ticker: Ticker, cost: float) -> Fill:
        raise ExecutionError("מסחר אמיתי אינו פעיל בגרסה זו. יש להפעיל במצב simulation.")

    def sell(self, pair: PairInfo, ticker: Ticker, qty: float) -> Fill:
        raise ExecutionError("מסחר אמיתי אינו פעיל בגרסה זו. יש להפעיל במצב simulation.")
