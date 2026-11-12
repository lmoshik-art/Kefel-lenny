"""בדיקות הסורק (זוגות חדשים, קפיצות נפח) ובודק האיכות."""
from datetime import timedelta

from app.scanner import Scanner, volume_spike_ratio
from app.screener import Screener
from tests.conftest import NOW, make_candles, make_pair, make_ticker


def test_volume_spike_ratio_ignores_open_candle():
    candles = make_candles(n=30, base_volume=1000, last_volume=5000)
    ratio = volume_spike_ratio(candles)
    assert ratio is not None and abs(ratio - 5.0) < 1e-9
    assert volume_spike_ratio(candles[:4]) is None


def test_first_run_registers_without_marking_new(journal):
    sc = Scanner(journal, "USD", 200000, 1.0)
    pairs = {"A": make_pair("A"), "B": make_pair("B")}
    assert sc.register_pairs(pairs, NOW) == []
    pairs["C"] = make_pair("C")
    new = sc.register_pairs(pairs, NOW + timedelta(minutes=5))
    assert [p.pair_id for p in new] == ["C"]
    assert journal.known_pairs()["C"].is_new and not journal.known_pairs()["A"].is_new


def test_tradable_filters_quote_status_and_stablecoins(journal):
    sc = Scanner(journal, "USD", 200000, 1.0)
    pairs = {
        "ok": make_pair("ok"),
        "eur": make_pair("eur"), "off": make_pair("off", status="cancel_only"),
        "stable": make_pair("stable"),
    }
    pairs["eur"].quote = "EUR"
    pairs["stable"].base = "USDT"
    assert list(sc.tradable(pairs)) == ["ok"]


def test_find_candidates_filters_and_ranks(journal):
    sc = Scanner(journal, "USD", 200000, 1.0)
    pairs = {"hot": make_pair("hot"), "flat": make_pair("flat"), "thin": make_pair("thin")}
    sc.register_pairs(pairs, NOW)
    tickers = {
        "hot": make_ticker("hot", last=1.10, open_today=1.0),
        "flat": make_ticker("flat", last=1.0, open_today=1.0),
        "thin": make_ticker("thin", last=1.2, open_today=1.0, volume=10, vwap=1.0),
    }
    cands = sc.find_candidates(pairs, tickers, limit=10)
    assert [c.pair.pair_id for c in cands] == ["hot"]
    assert any("שינוי יומי" in r for r in cands[0].reasons)


def test_apply_candles_marks_spike(journal):
    sc = Scanner(journal, "USD", 200000, 1.0)
    c = next(iter(sc.find_candidates({"p": make_pair("p")}, {"p": make_ticker("p", last=1.1)}, 5)))
    assert Scanner.apply_candles(c, make_candles(last_volume=5000), min_ratio=3.0)
    assert c.last_candle is not None and c.volume_spike_ratio == 5.0
    c2 = next(iter(sc.find_candidates({"p": make_pair("p")}, {"p": make_ticker("p", last=1.1)}, 5)))
    assert not Scanner.apply_candles(c2, make_candles(last_volume=2000), min_ratio=3.0)


def _candidate(journal, **ticker_kw):
    sc = Scanner(journal, "USD", 200000, 1.0)
    pair = make_pair("p")
    return sc.find_candidates({"p": pair}, {"p": make_ticker("p", last=1.1, **ticker_kw)}, 5)[0]


def test_screener_passes_good_pair(journal):
    report = Screener(200000, 0.8, 30).screen(_candidate(journal), planned_cost=50, now=NOW)
    assert report.passed and report.failures == []


def test_screener_rejects_wide_spread_and_small_order(journal):
    c = _candidate(journal, ask=1.0, bid=0.98)
    report = Screener(200000, 0.8, 30).screen(c, planned_cost=50, now=NOW)
    assert not report.passed and any("מרווח" in f for f in report.failures)
    c = _candidate(journal)
    c.pair.costmin = 100
    report = Screener(200000, 0.8, 30).screen(c, planned_cost=50, now=NOW)
    assert any("מינימום הזמנה" in f for f in report.failures)


def test_screener_waits_on_new_pair(journal):
    c = _candidate(journal)
    c.is_new_pair, c.first_seen = True, NOW - timedelta(minutes=10)
    report = Screener(200000, 0.8, 30).screen(c, planned_cost=50, now=NOW)
    assert any("גיל זוג חדש" in f for f in report.failures)
    c.first_seen = NOW - timedelta(minutes=45)
    assert Screener(200000, 0.8, 30).screen(c, planned_cost=50, now=NOW).passed
