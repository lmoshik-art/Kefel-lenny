"""בדיקות מקצה לקצה של לולאת המסחר עם לקוח Kraken מדומה.

הלקוח המדומה מחזיר נתונים שנבנו במבנה של Kraken. אין כאן נתוני שוק אמיתיים.
"""
from __future__ import annotations

import asyncio
from dataclasses import replace
from datetime import timedelta

from app.bot import TradingBot
from app.kraken import KrakenError
from tests.conftest import NOW, make_candles, make_pair, make_ticker


class FakeClient:
    """לקוח מדומה: הבדיקה שולטת במחירים, בנרות ובשגיאות."""

    def __init__(self):
        self.pairs = {"XABCZUSD": make_pair()}
        self.ticker_data = {"XABCZUSD": make_ticker(last=1.1, open_today=1.0, ask=1.1, bid=1.098, vwap=1.0)}
        self.candles = make_candles(last_volume=5000)
        self.fail = False

    async def asset_pairs(self):
        if self.fail:
            raise KrakenError("מדומה")
        return self.pairs

    async def tickers(self):
        if self.fail:
            raise KrakenError("מדומה")
        return self.ticker_data

    async def ohlc(self, pair_id, interval_minutes=5):
        return self.candles

    async def close(self):
        pass


class Clock:
    def __init__(self, start=NOW):
        self.now = start

    def __call__(self):
        return self.now

    def advance(self, **kw):
        self.now += timedelta(**kw)


def run(coro):
    return asyncio.run(coro)


def make_bot(settings, journal, client=None, clock=None):
    return TradingBot(settings, journal, client or FakeClient(), clock=clock or Clock())


def test_cycle_opens_position_on_spike_and_records_reason(settings, journal):
    client, clock = FakeClient(), Clock()
    bot = make_bot(settings, journal, client, clock)
    run(bot.run_cycle())
    trades = journal.open_trades()
    assert len(trades) == 1
    t = trades[0]
    assert abs(t.cost - 50.0) < 0.01          # 50% מהון 100 (תקרת הפוזיציה)
    assert "קפיצת נפח" in t.entry_reason and "גודל לפי" in t.entry_reason
    assert abs(bot.cash - 50.0) < 0.01
    assert journal.recent_trades()[0]["screen_report"]["passed"]
    assert bot.last_candidates[0]["opened"]


def test_take_profit_closes_and_updates_balance(settings, journal):
    client, clock = FakeClient(), Clock()
    bot = make_bot(settings, journal, client, clock)
    run(bot.run_cycle()); run(bot.run_cycle())
    trade = journal.open_trades()[0]
    client.ticker_data = {"XABCZUSD": make_ticker(ask=trade.take_profit * 1.01, bid=trade.take_profit * 1.005,
                                              last=trade.take_profit, vwap=1.0)}
    client.candles = make_candles(last_volume=1000)   # ללא קפיצת נפח: לא תיפתח פוזיציה חדשה
    run(bot.run_cycle())
    assert journal.open_trades() == []
    closed = journal.recent_trades()[0]
    assert closed["status"] == "closed" and closed["pnl"] > 0 and "יעד רווח" in closed["exit_reason"]
    assert abs(bot.cash - (50.0 + closed["proceeds"])) < 0.01
    assert journal.stats()["closed_trades"] == 1


def test_stop_loss_and_time_exit(settings, journal):
    client, clock = FakeClient(), Clock()
    bot = make_bot(settings, journal, client, clock)
    run(bot.run_cycle()); run(bot.run_cycle())
    trade = journal.open_trades()[0]
    client.ticker_data = {"XABCZUSD": make_ticker(ask=trade.stop_loss, bid=trade.stop_loss * 0.999, last=trade.stop_loss, vwap=2.0)}
    run(bot.run_cycle())
    assert "סטופ-לוס" in journal.recent_trades()[0]["exit_reason"]

    client.ticker_data = {"XABCZUSD": make_ticker(last=1.1, open_today=1.0, ask=1.1, bid=1.098, vwap=1.0)}
    client.candles = make_candles(last_volume=5000)
    run(bot.run_cycle())
    assert len(journal.open_trades()) == 1
    clock.advance(minutes=121)
    client.candles = make_candles(last_volume=1000)
    run(bot.run_cycle())
    assert "פקיעת זמן" in journal.recent_trades()[0]["exit_reason"]


def test_daily_loss_halts_and_closes_everything(settings, journal):
    client, clock = FakeClient(), Clock()
    client.pairs["P2"] = make_pair("P2")
    client.ticker_data["P2"] = make_ticker("P2", last=1.1, open_today=1.0, ask=1.1, bid=1.098, vwap=1.0)
    bot = make_bot(settings, journal, client, clock)
    run(bot.run_cycle())
    assert len(journal.open_trades()) == 2      # 50 ועוד 25 (תקרת 50% מההון הנוכחי)
    # קריסת מחיר בשני הזוגות: ההון יורד הרבה מתחת לגבול 50
    crash = dict(ask=0.011, bid=0.01, last=0.01, vwap=1.0)
    client.ticker_data = {"XABCZUSD": make_ticker(**crash), "P2": make_ticker("P2", **crash)}
    run(bot.run_cycle())
    assert bot.halted and "הפסד יומי" in bot.halt_reason
    assert journal.open_trades() == []
    assert journal.get_state("halted") is True
    # גם אחרי עוד סבב עם הזדמנות טובה, לא נפתח דבר
    good = dict(last=1.1, open_today=1.0, ask=1.1, bid=1.098, vwap=1.0)
    client.ticker_data = {"XABCZUSD": make_ticker(**good), "P2": make_ticker("P2", **good)}
    run(bot.run_cycle())
    assert journal.open_trades() == [] and bot.last_candidates == []
    bot.resume()
    assert not bot.halted and bot.day_start_equity == bot.equity()


def test_state_survives_restart(settings, journal):
    client = FakeClient()
    bot = make_bot(settings, journal, client)
    run(bot.run_cycle()); run(bot.run_cycle())
    cash_before = bot.cash
    bot2 = TradingBot(settings, journal, client, clock=Clock())
    assert bot2.cash == cash_before and len(bot2.journal.open_trades()) == 1


def test_max_open_positions_and_no_duplicate(settings, journal):
    client = FakeClient()
    for i in range(5):
        pid = f"P{i}"
        client.pairs[pid] = make_pair(pid)
        client.ticker_data[pid] = make_ticker(pid, last=1.1, open_today=1.0, ask=1.1, bid=1.098, vwap=1.0)
    # תקרת פוזיציה 20% כדי ששלוש פוזיציות ייכנסו בהון של 100
    small = replace(settings, max_position_pct=20.0)
    bot = make_bot(small, journal, client)
    run(bot.run_cycle())
    assert len(journal.open_trades()) == small.max_open_positions
    run(bot.run_cycle())
    assert len(journal.open_trades()) == small.max_open_positions
    assert len({t.pair_id for t in journal.open_trades()}) == small.max_open_positions


def test_repeated_data_errors_pause_bot(settings, journal):
    client = FakeClient()
    client.fail = True
    bot = make_bot(settings, journal, client)

    async def drive():
        bot.s = settings.__class__(**{**settings.__dict__, "scan_interval_seconds": 10})
        task = asyncio.create_task(bot.run_forever())
        for _ in range(12):
            await asyncio.sleep(0)
        bot.stop(); task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    # מריצים את הלולאה עם sleep מדומה כדי שלא להמתין באמת
    import app.bot as bot_module
    real_sleep = bot_module.asyncio.sleep

    async def fast_sleep(_):
        await real_sleep(0)

    bot_module.asyncio.sleep = fast_sleep
    try:
        run(drive())
    finally:
        bot_module.asyncio.sleep = real_sleep
    assert bot.paused and bot.consecutive_errors >= 10


def test_snapshot_has_dashboard_fields(settings, journal):
    bot = make_bot(settings, journal)
    run(bot.run_cycle())
    s = bot.snapshot()
    for key in ("equity", "cash", "daily_pnl", "halted", "open_trades", "candidates", "recent_trades",
                "events", "balance_history", "limits", "stats"):
        assert key in s
    assert s["daily_loss_limit"] == 50.0
