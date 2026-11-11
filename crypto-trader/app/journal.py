"""יומן עסקאות ומעקב יתרה, בבסיס נתונים מקומי (SQLite).

טבלאות:
trades          כל עסקה: כניסה, יציאה, רווח והפסד, הנימוק לכניסה וליציאה, דוח הסינון
balance_history היתרה וההון אחרי כל סגירה ובכל סבב (לעקומת ההון)
known_pairs     הזוגות שנראו, לצורך זיהוי זוגות חדשים
events          יומן אירועים קריא (לתצוגה בלוח המחוונים)
state           מצב המערכת שנשמר בין הפעלות: מזומן, עצירת חירום, הון בתחילת היום
"""
from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

_SCHEMA = """
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pair_id TEXT NOT NULL,
    pair_name TEXT NOT NULL,
    status TEXT NOT NULL,              -- open / closed
    entry_time TEXT NOT NULL,
    entry_price REAL NOT NULL,
    qty REAL NOT NULL,
    cost REAL NOT NULL,                -- הסכום ששולם כולל עמלה
    entry_fee REAL NOT NULL,
    entry_slippage_pct REAL NOT NULL,
    stop_loss REAL NOT NULL,
    take_profit REAL NOT NULL,
    entry_reason TEXT NOT NULL,
    screen_report TEXT NOT NULL,       -- JSON
    exit_time TEXT,
    exit_price REAL,
    exit_fee REAL,
    proceeds REAL,                     -- הסכום שהתקבל אחרי עמלה
    pnl REAL,
    pnl_pct REAL,
    exit_reason TEXT
);
CREATE TABLE IF NOT EXISTS balance_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT NOT NULL,
    cash REAL NOT NULL,
    equity REAL NOT NULL,
    note TEXT
);
CREATE TABLE IF NOT EXISTS known_pairs (
    pair_id TEXT PRIMARY KEY,
    pair_name TEXT NOT NULL,
    first_seen TEXT NOT NULL,
    is_new INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


@dataclass
class KnownPair:
    pair_id: str
    pair_name: str
    first_seen: datetime
    is_new: bool


@dataclass
class OpenTrade:
    """עסקה פתוחה כפי שנשמרה ביומן."""

    id: int
    pair_id: str
    pair_name: str
    entry_time: datetime
    entry_price: float
    qty: float
    cost: float
    stop_loss: float
    take_profit: float
    entry_reason: str


def _iso(dt: datetime) -> str:
    return dt.isoformat(timespec="seconds")


class Journal:
    def __init__(self, db_path: Path | str):
        if str(db_path) != ":memory:":
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    # ---------- מצב ----------
    def get_state(self, key: str, default: Any = None) -> Any:
        row = self._conn.execute("SELECT value FROM state WHERE key = ?", (key,)).fetchone()
        return json.loads(row["value"]) if row else default

    def set_state(self, key: str, value: Any) -> None:
        self._conn.execute("INSERT OR REPLACE INTO state (key, value) VALUES (?, ?)",
                           (key, json.dumps(value)))
        self._conn.commit()

    # ---------- אירועים ----------
    def log_event(self, message: str, level: str = "info", now: datetime | None = None) -> None:
        self._conn.execute("INSERT INTO events (time, level, message) VALUES (?, ?, ?)",
                           (_iso(now or datetime.now()), level, message))
        self._conn.commit()

    def recent_events(self, limit: int = 50) -> list[dict]:
        rows = self._conn.execute("SELECT time, level, message FROM events ORDER BY id DESC LIMIT ?",
                                  (limit,)).fetchall()
        return [dict(r) for r in rows]

    # ---------- זוגות מוכרים ----------
    def known_pairs(self) -> dict[str, KnownPair]:
        rows = self._conn.execute("SELECT * FROM known_pairs").fetchall()
        return {r["pair_id"]: KnownPair(r["pair_id"], r["pair_name"],
                                        datetime.fromisoformat(r["first_seen"]), bool(r["is_new"]))
                for r in rows}

    def add_known_pair(self, pair_id: str, pair_name: str, now: datetime, is_new: bool) -> None:
        self._conn.execute("INSERT OR IGNORE INTO known_pairs VALUES (?, ?, ?, ?)",
                           (pair_id, pair_name, _iso(now), int(is_new)))
        self._conn.commit()

    # ---------- עסקאות ----------
    def open_trade(self, pair_id: str, pair_name: str, now: datetime, entry_price: float, qty: float,
                   cost: float, entry_fee: float, slippage_pct: float, stop_loss: float,
                   take_profit: float, entry_reason: str, screen_report: dict) -> int:
        cur = self._conn.execute(
            """INSERT INTO trades (pair_id, pair_name, status, entry_time, entry_price, qty, cost,
               entry_fee, entry_slippage_pct, stop_loss, take_profit, entry_reason, screen_report)
               VALUES (?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (pair_id, pair_name, _iso(now), entry_price, qty, cost, entry_fee, slippage_pct,
             stop_loss, take_profit, entry_reason, json.dumps(screen_report, ensure_ascii=False)))
        self._conn.commit()
        return int(cur.lastrowid)

    def close_trade(self, trade_id: int, now: datetime, exit_price: float, exit_fee: float,
                    proceeds: float, exit_reason: str) -> dict:
        row = self._conn.execute("SELECT cost FROM trades WHERE id = ?", (trade_id,)).fetchone()
        if row is None:
            raise ValueError(f"עסקה {trade_id} לא נמצאה ביומן")
        cost = row["cost"]
        pnl = proceeds - cost
        pnl_pct = pnl / cost * 100 if cost else 0.0
        self._conn.execute(
            """UPDATE trades SET status='closed', exit_time=?, exit_price=?, exit_fee=?, proceeds=?,
               pnl=?, pnl_pct=?, exit_reason=? WHERE id=?""",
            (_iso(now), exit_price, exit_fee, proceeds, pnl, pnl_pct, exit_reason, trade_id))
        self._conn.commit()
        return {"pnl": pnl, "pnl_pct": pnl_pct}

    def open_trades(self) -> list[OpenTrade]:
        rows = self._conn.execute("SELECT * FROM trades WHERE status='open' ORDER BY id").fetchall()
        return [OpenTrade(r["id"], r["pair_id"], r["pair_name"], datetime.fromisoformat(r["entry_time"]),
                          r["entry_price"], r["qty"], r["cost"], r["stop_loss"], r["take_profit"],
                          r["entry_reason"]) for r in rows]

    def recent_trades(self, limit: int = 30) -> list[dict]:
        rows = self._conn.execute("SELECT * FROM trades ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["screen_report"] = json.loads(d["screen_report"])
            result.append(d)
        return result

    def stats(self) -> dict:
        """סטטיסטיקה מצטברת של העסקאות הסגורות."""
        row = self._conn.execute(
            """SELECT COUNT(*) AS n, COALESCE(SUM(pnl), 0) AS total_pnl,
               COALESCE(SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END), 0) AS wins
               FROM trades WHERE status='closed'""").fetchone()
        n = row["n"]
        return {"closed_trades": n, "total_pnl": row["total_pnl"],
                "win_rate_pct": (row["wins"] / n * 100) if n else 0.0}

    def pnl_since(self, since: datetime) -> float:
        row = self._conn.execute(
            "SELECT COALESCE(SUM(pnl), 0) AS p FROM trades WHERE status='closed' AND exit_time >= ?",
            (_iso(since),)).fetchone()
        return float(row["p"])

    # ---------- יתרה ----------
    def record_balance(self, now: datetime, cash: float, equity: float, note: str = "") -> None:
        self._conn.execute("INSERT INTO balance_history (time, cash, equity, note) VALUES (?, ?, ?, ?)",
                           (_iso(now), cash, equity, note))
        self._conn.commit()

    def balance_history(self, limit: int = 300) -> list[dict]:
        rows = self._conn.execute(
            "SELECT time, cash, equity FROM balance_history ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in reversed(rows)]
