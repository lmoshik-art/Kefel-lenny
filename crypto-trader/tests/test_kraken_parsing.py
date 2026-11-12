"""בדיקות פענוח תשובות Kraken מנתוני דוגמה במבנה הרשמי."""
import json
from pathlib import Path

from app.kraken import normalize_asset, parse_asset_pairs, parse_ohlc, parse_tickers

FIX = Path(__file__).parent / "fixtures"


def load(name):
    return json.loads((FIX / name).read_text(encoding="utf-8"))["result"]


def test_parse_asset_pairs_normalizes_assets_and_fees():
    pairs = parse_asset_pairs(load("asset_pairs_sample.json"), default_fee_pct=0.4)
    btc = pairs["XXBTZUSD"]
    assert btc.base == "XBT" and btc.quote == "USD"
    assert btc.taker_fee_pct == 0.4 and btc.ordermin == 0.00005 and btc.costmin == 0.5
    assert pairs["USDTZUSD"].taker_fee_pct == 0.2
    assert pairs["ABCUSD"].status == "cancel_only"
    assert normalize_asset("ZEUR") == "EUR" and normalize_asset("SOL") == "SOL"


def test_parse_tickers_computes_spread_volume_and_change():
    t = parse_tickers(load("ticker_sample.json"))["XXBTZUSD"]
    assert t.ask == 60000.0 and t.bid == 59990.0
    assert abs(t.spread_pct - 10 / 60000 * 100) < 1e-9
    assert t.quote_volume_24h == 1200.0 * 59000.0
    assert abs(t.change_today_pct - (59995 - 58500) / 58500 * 100) < 1e-9
    assert t.trades_24h == 30000


def test_parse_tickers_skips_broken_rows():
    result = {"GOOD": load("ticker_sample.json")["XXBTZUSD"], "BAD": {"a": []}}
    assert list(parse_tickers(result)) == ["GOOD"]


def test_parse_ohlc_reads_candles_in_order():
    candles = parse_ohlc(load("ohlc_sample.json"), "XXBTZUSD")
    assert len(candles) == 3
    assert candles[0].open == 59000.0 and candles[1].count == 55
    assert abs(candles[1].quote_volume - 3.1 * 59100.0) < 1e-6
