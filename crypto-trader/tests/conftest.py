"""עזרי בדיקה משותפים: הגדרות, יומן בזיכרון ונתוני דוגמה.

נתוני הדוגמה אינם נתוני שוק אמיתיים. הם נבנו במבנה המדויק של תשובות Kraken
כדי לבדוק את הפענוח ואת הלוגיקה ללא גישה לרשת.
"""
from __future__ import annotations

from datetime import datetime

import pytest

from app.config import Settings
from app.journal import Journal
from app.kraken import Candle, PairInfo, Ticker


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        mode="simulation", quote_currency="USD", kraken_api_key="", kraken_api_secret="",
        start_balance=100.0, max_daily_loss_pct=50.0, max_position_pct=50.0, risk_per_trade_pct=2.0,
        max_open_positions=3, stop_loss_pct=3.0, take_profit_pct=6.0, max_hold_minutes=120,
        volume_spike_ratio=3.0, min_price_change_pct=1.0, min_volume_24h=200000.0, max_spread_pct=0.8,
        new_pair_wait_minutes=30, ohlc_candidates=12, sim_slippage_pct=0.1, default_taker_fee_pct=0.4,
        scan_interval_seconds=60, host="127.0.0.1", port=8000, db_path=tmp_path / "test.db",
    )


@pytest.fixture
def journal() -> Journal:
    j = Journal(":memory:")
    yield j
    j.close()


def make_pair(pair_id="XABCZUSD", status="online", ordermin=1.0, costmin=0.5, fee=0.4) -> PairInfo:
    return PairInfo(pair_id=pair_id, altname="ABCUSD", wsname="ABC/USD", base="ABC", quote="USD",
                    status=status, ordermin=ordermin, costmin=costmin, lot_decimals=8, pair_decimals=4,
                    taker_fee_pct=fee)


def make_ticker(pair_id="XABCZUSD", ask=1.0, bid=0.998, last=1.0, open_today=0.95, volume=500000,
                vwap=0.97, trades=1500) -> Ticker:
    return Ticker(pair_id=pair_id, ask=ask, bid=bid, last=last, open_today=open_today,
                  volume_24h=volume, vwap_24h=vwap, trades_24h=trades)


def make_candles(n=30, base_volume=1000.0, last_volume=5000.0, rising=True) -> list[Candle]:
    """n נרות בנפח קבוע, ואז נר סגור אחרון בנפח last_volume ונר נוכחי פתוח."""
    candles = []
    price = 0.95
    for i in range(n):
        candles.append(Candle(time=1700000000 + i * 300, open=price, high=price * 1.01, low=price * 0.99,
                              close=price, vwap=price, volume=base_volume, count=50))
    close = price * 1.02 if rising else price * 0.98
    candles.append(Candle(time=1700000000 + n * 300, open=price, high=max(price, close), low=min(price, close),
                          close=close, vwap=price, volume=last_volume, count=400))
    # הנר הנוכחי, שעדיין לא נסגר
    candles.append(Candle(time=1700000000 + (n + 1) * 300, open=close, high=close, low=close,
                          close=close, vwap=close, volume=10.0, count=2))
    return candles


NOW = datetime(2026, 11, 11, 12, 0, 0)
