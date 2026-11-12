"""בדיקות הסטופ הנגרר: הפעלה בסף, עלייה בלבד, יציאה ברווח, כיבוי, ושדרוג בסיס נתונים ישן."""
from __future__ import annotations

import sqlite3
from dataclasses import replace
from datetime import timedelta

from app.journal import Journal
from tests.conftest import NOW, make_candles, make_ticker
from tests.test_bot import Clock, FakeClient, make_bot, run


def _set_bid(client, bid):
    client.ticker_data["XABCZUSD"] = make_ticker(ask=bid * 1.002, bid=bid, last=bid, open_today=1.0, vwap=1.0)


def _open(settings, journal, client, clock):
    bot = make_bot(settings, journal, client, clock)
    run(bot.run_cycle())
    trade = journal.open_trades()[0]
    assert not trade.trailing and trade.highest_price == trade.entry_price
    return bot, trade


def test_trailing_activates_only_after_threshold(settings, journal):
    client, clock = FakeClient(), Clock()
    bot, trade = _open(settings, journal, client, clock)
    entry, original_stop = trade.entry_price, trade.stop_loss

    # עלייה של 2%: מתחת לסף ההפעלה (3%), הסטופ לא זז, השיא מתעדכן
    _set_bid(client, entry * 1.02)
    run(bot.run_cycle())
    t = journal.open_trades()[0]
    assert t.stop_loss == original_stop and not t.trailing
    assert abs(t.highest_price - entry * 1.02) < 1e-9

    # עלייה של 3.5%: הסטופ מופעל ונקבע 2% מתחת לשיא, כלומר מעל מחיר הכניסה
    _set_bid(client, entry * 1.035)
    run(bot.run_cycle())
    t = journal.open_trades()[0]
    assert t.trailing and abs(t.stop_loss - entry * 1.035 * 0.98) < 1e-9
    assert t.stop_loss > entry
    assert any("סטופ נגרר" in e["message"] and "הועלה" in e["message"] for e in journal.recent_events(10))


def test_trailing_stop_never_moves_down_and_exits_in_profit(settings, journal):
    client, clock = FakeClient(), Clock()
    bot, trade = _open(settings, journal, client, clock)
    entry = trade.entry_price

    _set_bid(client, entry * 1.05)       # שיא 5%: סטופ ב-3%
    run(bot.run_cycle())
    stop_at_peak = journal.open_trades()[0].stop_loss
    assert abs(stop_at_peak - entry * 1.05 * 0.98) < 1e-9

    _set_bid(client, entry * 1.04)       # נסיגה קלה: הסטופ נשאר במקומו
    run(bot.run_cycle())
    t = journal.open_trades()[0]
    assert t.stop_loss == stop_at_peak and abs(t.highest_price - entry * 1.05) < 1e-9

    _set_bid(client, entry * 1.02)       # נפילה מתחת לסטופ הנגרר: יציאה ברווח
    client.candles = make_candles(last_volume=1000)   # ללא קפיצת נפח: לא תיפתח פוזיציה חדשה
    cash_before = bot.cash
    run(bot.run_cycle())
    assert journal.open_trades() == []
    closed = journal.recent_trades(1)[0]
    assert closed["status"] == "closed" and closed["pnl"] > 0
    assert "סטופ נגרר" in closed["exit_reason"]
    assert bot.cash > cash_before


def test_take_profit_still_applies_with_trailing(settings, journal):
    client, clock = FakeClient(), Clock()
    bot, trade = _open(settings, journal, client, clock)
    _set_bid(client, trade.entry_price * 1.07)
    client.candles = make_candles(last_volume=1000)   # ללא קפיצת נפח: לא תיפתח פוזיציה חדשה
    run(bot.run_cycle())
    closed = journal.recent_trades(1)[0]
    assert closed["status"] == "closed" and "יעד רווח" in closed["exit_reason"]


def test_trailing_disabled_when_zero(settings, journal):
    settings = replace(settings, trailing_stop_pct=0.0)
    client, clock = FakeClient(), Clock()
    bot, trade = _open(settings, journal, client, clock)
    original_stop = trade.stop_loss
    _set_bid(client, trade.entry_price * 1.05)
    run(bot.run_cycle())
    t = journal.open_trades()[0]
    assert t.stop_loss == original_stop and not t.trailing


def test_old_database_is_migrated(tmp_path):
    """בסיס נתונים מגרסה קודמת (ללא עמודות הסטופ הנגרר) נפתח ומשודרג בלי לאבד את העסקאות."""
    db = tmp_path / "old.db"
    conn = sqlite3.connect(db)
    conn.executescript("""
        CREATE TABLE trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT, pair_id TEXT NOT NULL, pair_name TEXT NOT NULL,
            status TEXT NOT NULL, entry_time TEXT NOT NULL, entry_price REAL NOT NULL, qty REAL NOT NULL,
            cost REAL NOT NULL, entry_fee REAL NOT NULL, entry_slippage_pct REAL NOT NULL,
            stop_loss REAL NOT NULL, take_profit REAL NOT NULL, entry_reason TEXT NOT NULL,
            screen_report TEXT NOT NULL, exit_time TEXT, exit_price REAL, exit_fee REAL, proceeds REAL,
            pnl REAL, pnl_pct REAL, exit_reason TEXT);
        INSERT INTO trades (pair_id, pair_name, status, entry_time, entry_price, qty, cost, entry_fee,
            entry_slippage_pct, stop_loss, take_profit, entry_reason, screen_report)
            VALUES ('XABCZUSD', 'ABC/USD', 'open', '2026-11-11T12:00:00', 1.0, 10, 10, 0, 0, 0.97, 1.06, '', '{}');
    """)
    conn.commit(); conn.close()
    j = Journal(db)
    trades = j.open_trades()
    assert len(trades) == 1
    assert trades[0].highest_price == 1.0 and not trades[0].trailing
    j.close()
