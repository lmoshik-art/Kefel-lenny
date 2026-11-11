"""טעינת ההגדרות מקובץ הסביבה (.env).

כל ערך מספרי נבדק בטעינה. ערך חסר מקבל ברירת מחדל שמרנית,
וערך לא חוקי עוצר את ההפעלה עם הודעה ברורה בעברית.
סודות (מפתחות API) נקראים מהסביבה בלבד ולעולם אינם נכתבים לקוד או ליומן.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# תיקיית הפרויקט: התיקייה שמעל תיקיית app
PROJECT_DIR = Path(__file__).resolve().parent.parent


class ConfigError(Exception):
    """שגיאת הגדרות: ערך חסר או לא חוקי בקובץ הסביבה."""


def _float(name: str, default: float, low: float | None = None, high: float | None = None) -> float:
    """קריאת ערך מספרי מהסביבה עם בדיקת טווח."""
    raw = os.getenv(name, "").strip()
    if raw == "":
        value = default
    else:
        try:
            value = float(raw)
        except ValueError as exc:
            raise ConfigError(f"הערך של {name} אינו מספר: '{raw}'") from exc
    if low is not None and value < low:
        raise ConfigError(f"הערך של {name} קטן מהמינימום המותר ({low}): {value}")
    if high is not None and value > high:
        raise ConfigError(f"הערך של {name} גדול מהמקסימום המותר ({high}): {value}")
    return value


def _int(name: str, default: int, low: int | None = None, high: int | None = None) -> int:
    return int(_float(name, default, low, high))


@dataclass(frozen=True)
class Settings:
    """כל ההגדרות של המערכת, לאחר בדיקה."""

    mode: str
    quote_currency: str
    kraken_api_key: str
    kraken_api_secret: str

    start_balance: float
    max_daily_loss_pct: float
    max_position_pct: float
    risk_per_trade_pct: float
    max_open_positions: int

    stop_loss_pct: float
    take_profit_pct: float
    max_hold_minutes: int
    volume_spike_ratio: float
    min_price_change_pct: float

    min_volume_24h: float
    max_spread_pct: float
    new_pair_wait_minutes: int
    ohlc_candidates: int

    sim_slippage_pct: float
    default_taker_fee_pct: float

    scan_interval_seconds: int
    host: str
    port: int
    db_path: Path

    @property
    def is_simulation(self) -> bool:
        return self.mode == "simulation"


def load_settings(env_file: Path | None = None) -> Settings:
    """טעינת ההגדרות. אם לא נמסר קובץ, נטען הקובץ .env מתיקיית הפרויקט."""
    load_dotenv(env_file or PROJECT_DIR / ".env", override=False)

    mode = os.getenv("MODE", "simulation").strip().lower()
    if mode not in ("simulation", "live"):
        raise ConfigError(f"MODE חייב להיות simulation או live, התקבל: '{mode}'")

    db_raw = os.getenv("DB_PATH", "data/trader.db").strip()
    db_path = Path(db_raw)
    if not db_path.is_absolute():
        db_path = PROJECT_DIR / db_path

    settings = Settings(
        mode=mode,
        quote_currency=os.getenv("QUOTE_CURRENCY", "USD").strip().upper(),
        kraken_api_key=os.getenv("KRAKEN_API_KEY", "").strip(),
        kraken_api_secret=os.getenv("KRAKEN_API_SECRET", "").strip(),
        start_balance=_float("START_BALANCE", 100, low=1),
        max_daily_loss_pct=_float("MAX_DAILY_LOSS_PCT", 10, low=0.1, high=100),
        max_position_pct=_float("MAX_POSITION_PCT", 20, low=0.1, high=100),
        risk_per_trade_pct=_float("RISK_PER_TRADE_PCT", 2, low=0.01, high=100),
        max_open_positions=_int("MAX_OPEN_POSITIONS", 3, low=1, high=50),
        stop_loss_pct=_float("STOP_LOSS_PCT", 3, low=0.1, high=90),
        take_profit_pct=_float("TAKE_PROFIT_PCT", 6, low=0.1, high=1000),
        max_hold_minutes=_int("MAX_HOLD_MINUTES", 120, low=1),
        volume_spike_ratio=_float("VOLUME_SPIKE_RATIO", 3, low=1),
        min_price_change_pct=_float("MIN_PRICE_CHANGE_PCT", 1, low=0, high=1000),
        min_volume_24h=_float("MIN_VOLUME_24H", 200000, low=0),
        max_spread_pct=_float("MAX_SPREAD_PCT", 0.8, low=0.01, high=50),
        new_pair_wait_minutes=_int("NEW_PAIR_WAIT_MINUTES", 30, low=0),
        ohlc_candidates=_int("OHLC_CANDIDATES", 12, low=1, high=50),
        sim_slippage_pct=_float("SIM_SLIPPAGE_PCT", 0.1, low=0, high=10),
        default_taker_fee_pct=_float("DEFAULT_TAKER_FEE_PCT", 0.4, low=0, high=10),
        scan_interval_seconds=_int("SCAN_INTERVAL_SECONDS", 60, low=10),
        host=os.getenv("HOST", "127.0.0.1").strip(),
        port=_int("PORT", 8000, low=1, high=65535),
        db_path=db_path,
    )

    if settings.risk_per_trade_pct > settings.max_position_pct:
        raise ConfigError(
            "RISK_PER_TRADE_PCT לא יכול להיות גדול מ-MAX_POSITION_PCT "
            f"({settings.risk_per_trade_pct} מול {settings.max_position_pct})"
        )
    return settings
