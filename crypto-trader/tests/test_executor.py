"""בדיקות הביצוע המדומה: סליפג', עמלות ומינימום הזמנה."""
import pytest

from app.executor import ExecutionError, LiveExecutor, SimulatedExecutor
from tests.conftest import make_pair, make_ticker


def test_buy_fills_above_ask_with_fee():
    ex = SimulatedExecutor(slippage_pct=0.1)
    fill = ex.buy(make_pair(), make_ticker(ask=1.0, bid=0.998), cost=50.0)
    assert abs(fill.price - 1.001) < 1e-12           # ask ועוד 0.1%
    assert fill.gross + fill.fee <= 50.0 + 1e-9       # הסכום הכולל אינו עולה על התקציב
    assert abs(fill.fee - fill.gross * 0.004) < 1e-9
    assert fill.slippage_pct > 0 and fill.simulated


def test_sell_fills_below_bid():
    ex = SimulatedExecutor(slippage_pct=0.1)
    fill = ex.sell(make_pair(), make_ticker(ask=1.0, bid=0.998), qty=40.0)
    assert abs(fill.price - 0.998 * 0.999) < 1e-12
    assert abs(fill.gross - 40 * fill.price) < 1e-9


def test_round_trip_loses_spread_fees_and_slippage():
    ex = SimulatedExecutor(slippage_pct=0.1)
    pair, ticker = make_pair(), make_ticker(ask=1.0, bid=0.998)
    buy = ex.buy(pair, ticker, cost=50.0)
    sell = ex.sell(pair, ticker, qty=buy.qty)
    assert (sell.gross - sell.fee) < (buy.gross + buy.fee)


def test_buy_below_minimum_is_rejected():
    ex = SimulatedExecutor(slippage_pct=0.0)
    with pytest.raises(ExecutionError):
        ex.buy(make_pair(ordermin=100), make_ticker(ask=1.0), cost=5.0)
    with pytest.raises(ExecutionError):
        ex.buy(make_pair(costmin=10), make_ticker(ask=1.0), cost=5.0)


def test_live_executor_is_blocked():
    ex = LiveExecutor("key", "secret")
    with pytest.raises(ExecutionError):
        ex.buy(make_pair(), make_ticker(), 10.0)
