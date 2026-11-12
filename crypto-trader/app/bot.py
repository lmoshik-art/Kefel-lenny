"""לולאת המסחר: מחברת את הסורק, הבודק, ניהול הסיכון, המבצע והיומן.

סבב אחד (כל SCAN_INTERVAL_SECONDS):
    1. רענון רשימת הזוגות (אחת ל-10 דקות) ורישום זוגות חדשים.
    2. משיכת כל הטיקרים בבקשה אחת.
    3. ניהול פוזיציות פתוחות: סטופ-לוס, יעד רווח, פקיעת זמן.
    4. חישוב ההון, רישום לעקומת ההון, ובדיקת מגבלת ההפסד היומי.
    5. אם מותר לפתוח: בחירת מועמדים, משיכת נרות, בדיקת איכות, קביעת גודל, ביצוע.

מצב המערכת (מזומן, עצירת חירום, הון בתחילת היום) נשמר ביומן ושורד הפעלה מחדש.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta

from .config import Settings
from .executor import ExecutionError, Executor, LiveExecutor, SimulatedExecutor
from .journal import Journal, OpenTrade
from .kraken import KrakenError, KrakenPublicClient, PairInfo, Ticker
from .risk import RiskManager
from .scanner import Candidate, Scanner
from .screener import Screener
from .strategy import Strategy

log = logging.getLogger("bot")

PAIRS_REFRESH = timedelta(minutes=10)
EMPTY_COUNTERS = {
    "since": None,            # תחילת הספירה
    "cycles": 0,              # סבבי סריקה שהושלמו
    "candidates": 0,          # מועמדים שנמשכו עבורם נרות
    "spikes": 0,              # מועמדים שעברו את סף קפיצת הנפח
    "screened_out": 0,        # נפסלו בבדיקת האיכות
    "no_entry": 0,            # עברו סינון אך האסטרטגיה לא אישרה כניסה
    "entries": 0,             # פוזיציות שנפתחו
    "exits": 0,               # פוזיציות שנסגרו
    "reject_reasons": {},     # שם הבדיקה שנכשלה -> מספר פעמים
}
MAX_CONSECUTIVE_ERRORS = 10


class TradingBot:
    def __init__(self, settings: Settings, journal: Journal, client: KrakenPublicClient,
                 executor: Executor | None = None, clock=None):
        self.s = settings
        self.journal = journal
        self.client = client
        self.clock = clock or datetime.now
        self.executor: Executor = executor or (
            SimulatedExecutor(settings.sim_slippage_pct) if settings.is_simulation
            else LiveExecutor(settings.kraken_api_key, settings.kraken_api_secret))
        self.scanner = Scanner(journal, settings.quote_currency, settings.min_volume_24h,
                               settings.min_price_change_pct)
        self.screener = Screener(settings.min_volume_24h, settings.max_spread_pct,
                                 settings.new_pair_wait_minutes)
        self.risk = RiskManager(settings.max_daily_loss_pct, settings.max_position_pct,
                                settings.risk_per_trade_pct, settings.max_open_positions,
                                settings.stop_loss_pct)
        self.strategy = Strategy(settings.stop_loss_pct, settings.take_profit_pct,
                                 settings.max_hold_minutes)

        # מצב שנטען מהיומן
        self.cash: float = journal.get_state("cash", settings.start_balance)
        self.halted: bool = journal.get_state("halted", False)
        self.halt_reason: str = journal.get_state("halt_reason", "")
        self.paused: bool = False
        self.day_key: str = journal.get_state("day_key", "")
        self.day_start_equity: float = journal.get_state("day_start_equity", self.cash)
        # מונים מצטברים: כמה סבבים, כמה מועמדים נבדקו, כמה אותות נפח, כמה נפסלו ומדוע, כמה כניסות ויציאות
        self.counters: dict = {**EMPTY_COUNTERS, **journal.get_counters()}
        self.counters["reject_reasons"] = dict(self.counters.get("reject_reasons") or {})

        # מצב זמני לתצוגה
        self.pairs: dict[str, PairInfo] = {}
        self.tickers: dict[str, Ticker] = {}
        self.last_candidates: list[dict] = []
        self.last_cycle: datetime | None = None
        self.last_error: str = ""
        self.consecutive_errors = 0
        # הנימוק האחרון לאי-כניסה לכל זוג, כדי שלא לרשום ביומן את אותו נימוק בכל סבב
        self._last_rejection: dict[str, str] = {}
        self._pairs_refreshed: datetime | None = None
        self._running = False

    # ---------- עזר ----------
    def _save(self) -> None:
        self.journal.set_state("cash", self.cash)
        self.journal.set_state("halted", self.halted)
        self.journal.set_state("halt_reason", self.halt_reason)
        self.journal.set_state("day_key", self.day_key)
        self.journal.set_state("day_start_equity", self.day_start_equity)
        self.journal.set_counters(self.counters)

    def _count(self, key: str, n: int = 1) -> None:
        self.counters[key] = self.counters.get(key, 0) + n

    def _event(self, message: str, level: str = "info") -> None:
        log.log(logging.WARNING if level in ("warning", "error") else logging.INFO, message)
        self.journal.log_event(message, level, self.clock())

    def _reject(self, pair_id: str, key: str, message: str) -> None:
        """רישום אי-כניסה ביומן רק אם סוג הנימוק לזוג זה השתנה מאז הסבב הקודם.

        key הוא סוג הנימוק (למשל שמות הבדיקות שנכשלו), בלי המספרים שמשתנים בכל סבב,
        כדי שאותה פסילה לא תוצף ביומן רק משום שהמינימום או המרווח זזו מעט.
        """
        if self._last_rejection.get(pair_id) != key:
            self._last_rejection[pair_id] = key
            self._event(message)

    def equity(self, tickers: dict[str, Ticker] | None = None) -> float:
        """ההון: מזומן ועוד שווי הפוזיציות הפתוחות לפי מחיר ה-bid הנוכחי."""
        tickers = tickers if tickers is not None else self.tickers
        value = self.cash
        for t in self.journal.open_trades():
            ticker = tickers.get(t.pair_id)
            value += t.qty * (ticker.bid if ticker else t.entry_price)
        return value

    def _roll_day(self, now: datetime) -> None:
        """בתחילת יום חדש נרשם ההון הפותח שממנו נמדד ההפסד היומי."""
        key = now.strftime("%Y-%m-%d")
        if key != self.day_key:
            self.day_key = key
            self.day_start_equity = self.equity()
            self._save()
            self._event(f"יום מסחר חדש {key}: הון פותח {self.day_start_equity:.2f} {self.s.quote_currency}")

    def halt(self, reason: str) -> None:
        """עצירת חירום: אין פתיחות חדשות, הפוזיציות נסגרות, החידוש ידני בלבד."""
        self.halted = True
        self.halt_reason = reason
        self._save()
        self._event(f"עצירת חירום: {reason}", "error")

    def resume(self) -> None:
        """חידוש ידני לאחר עצירת חירום. מאפס את מדידת היום להון הנוכחי."""
        self.halted = False
        self.halt_reason = ""
        self.day_start_equity = self.equity()
        self._save()
        self._event("המערכת חודשה ידנית. ההון הפותח למדידת ההפסד היומי עודכן.", "warning")

    # ---------- פוזיציות ----------
    def _close_position(self, trade: OpenTrade, ticker: Ticker, reason: str) -> None:
        pair = self.pairs.get(trade.pair_id)
        if pair is None:
            self._event(f"לא ניתן לסגור {trade.pair_name}: הזוג אינו ברשימה", "warning")
            return
        try:
            fill = self.executor.sell(pair, ticker, trade.qty)
        except ExecutionError as exc:
            self._event(f"כשל במכירת {trade.pair_name}: {exc}", "error")
            return
        proceeds = fill.gross - fill.fee
        now = self.clock()
        result = self.journal.close_trade(trade.id, now, fill.price, fill.fee, proceeds, reason)
        self.cash += proceeds
        self._count("exits")
        self._save()
        self.journal.record_balance(now, self.cash, self.equity(), f"סגירת {trade.pair_name}")
        self._event(
            f"יציאה {trade.pair_name}: מחיר {fill.price:.6g}, רווח/הפסד {result['pnl']:+.2f} "
            f"({result['pnl_pct']:+.2f}%). נימוק: {reason}",
            "info" if result["pnl"] >= 0 else "warning")

    def manage_positions(self, now: datetime) -> None:
        for trade in self.journal.open_trades():
            ticker = self.tickers.get(trade.pair_id)
            if ticker is None:
                continue
            decision = self.strategy.should_exit(trade, ticker, now)
            if decision.exit:
                self._close_position(trade, ticker, decision.reason)

    def close_all(self, reason: str) -> None:
        for trade in self.journal.open_trades():
            ticker = self.tickers.get(trade.pair_id)
            if ticker is not None:
                self._close_position(trade, ticker, reason)

    def try_open(self, candidate: Candidate, now: datetime) -> bool:
        """ניסיון פתיחת פוזיציה למועמד שעבר את בדיקת הנפח. מחזיר True אם נפתחה."""
        open_count = len(self.journal.open_trades())
        if not self.risk.can_open_more(open_count):
            return False
        if any(t.pair_id == candidate.pair.pair_id for t in self.journal.open_trades()):
            return False

        equity = self.equity()
        sizing = self.risk.position_size(equity, self.cash)
        if sizing.cost <= 0:
            return False

        report = self.screener.screen(candidate, sizing.cost, now)
        if not report.passed:
            self._count("screened_out")
            for check in report.checks:
                if not check["ok"]:
                    reasons = self.counters["reject_reasons"]
                    reasons[check["name"]] = reasons.get(check["name"], 0) + 1
            failed_names = ",".join(c["name"] for c in report.checks if not c["ok"])
            self._reject(candidate.pair.pair_id, "נפסל:" + failed_names,
                         f"נפסל {candidate.pair.wsname}: " + "; ".join(report.failures))
            return False

        decision = self.strategy.should_enter(candidate)
        if not decision.enter:
            self._count("no_entry")
            self._reject(candidate.pair.pair_id, "ללא כניסה:" + decision.reason,
                         f"ללא כניסה {candidate.pair.wsname}: {decision.reason}")
            return False

        # בדיקה כפולה של המגבלה הקשיחה לפני הביצוע
        if not self.risk.within_position_limit(sizing.cost, equity):
            self.halt(f"ניסיון לחרוג מגודל פוזיציה מרבי ({sizing.cost:.2f} מול הון {equity:.2f})")
            return False

        try:
            fill = self.executor.buy(candidate.pair, candidate.ticker, sizing.cost)
        except ExecutionError as exc:
            self._event(f"כשל בקניית {candidate.pair.wsname}: {exc}", "warning")
            return False

        total_cost = fill.gross + fill.fee
        stop_loss, take_profit = self.strategy.levels(fill.price)
        entry_reason = (f"{decision.reason}; גודל לפי {sizing.limited_by} "
                        f"({sizing.cost:.2f}, סיכון {sizing.risk_amount:.2f})")
        self.journal.open_trade(candidate.pair.pair_id, candidate.pair.wsname, now, fill.price,
                                fill.qty, total_cost, fill.fee, fill.slippage_pct, stop_loss,
                                take_profit, entry_reason, report.to_dict())
        self.cash -= total_cost
        self._count("entries")
        self._last_rejection.pop(candidate.pair.pair_id, None)
        self._save()
        self._event(f"כניסה {candidate.pair.wsname}: {fill.qty:.6g} במחיר {fill.price:.6g}, "
                    f"עלות {total_cost:.2f}, סטופ {stop_loss:.6g}, יעד {take_profit:.6g}")
        return True

    # ---------- סבב ----------
    async def refresh_pairs(self, now: datetime) -> None:
        if self._pairs_refreshed is None or now - self._pairs_refreshed >= PAIRS_REFRESH:
            self.pairs = await self.client.asset_pairs()
            self._pairs_refreshed = now
            self.scanner.register_pairs(self.pairs, now)

    async def run_cycle(self) -> None:
        now = self.clock()
        await self.refresh_pairs(now)
        self.tickers = await self.client.tickers()
        self._roll_day(now)

        self.manage_positions(now)
        equity = self.equity()
        self.journal.record_balance(now, self.cash, equity)

        if not self.halted and self.risk.daily_loss_breached(equity, self.day_start_equity):
            self.halt(f"הפסד יומי מרבי: הון {equity:.2f} מתחת לגבול "
                      f"{self.risk.daily_loss_limit(self.day_start_equity):.2f}")
            self.close_all("עצירת חירום: הפסד יומי מרבי")

        if self.halted or self.paused:
            self.last_candidates = []
            return

        candidates = self.scanner.find_candidates(self.pairs, self.tickers, self.s.ohlc_candidates)
        if not self.counters.get("since"):
            self.counters["since"] = now.isoformat(timespec="seconds")
        self._count("cycles")
        summary = []
        for c in candidates:
            try:
                candles = await self.client.ohlc(c.pair.pair_id, 5)
            except KrakenError as exc:
                self._event(f"כשל במשיכת נרות {c.pair.wsname}: {exc}", "warning")
                continue
            spike = self.scanner.apply_candles(c, candles, self.s.volume_spike_ratio)
            self._count("candidates")
            if spike:
                self._count("spikes")
            opened = self.try_open(c, now) if spike else False
            summary.append({
                "pair": c.pair.wsname, "last": c.ticker.last,
                "change_pct": round(c.ticker.change_today_pct, 2),
                "volume_24h": round(c.ticker.quote_volume_24h),
                "spike_ratio": round(c.volume_spike_ratio, 2) if c.volume_spike_ratio is not None else None,
                "is_new": c.is_new_pair, "spike": spike, "opened": opened,
            })
        self.last_candidates = summary
        self.journal.set_counters(self.counters)

    async def run_forever(self) -> None:
        self._running = True
        self._event(f"המערכת הופעלה במצב {self.s.mode}. מזומן {self.cash:.2f} {self.s.quote_currency}")
        while self._running:
            try:
                await self.run_cycle()
                self.last_cycle = self.clock()
                self.last_error = ""
                self.consecutive_errors = 0
            except KrakenError as exc:
                self.consecutive_errors += 1
                self.last_error = str(exc)
                self._event(f"שגיאת נתונים ({self.consecutive_errors}): {exc}", "warning")
                if self.consecutive_errors >= MAX_CONSECUTIVE_ERRORS and not self.paused:
                    self.paused = True
                    self._event("המערכת הושהתה אוטומטית אחרי כשלי נתונים חוזרים. המשיכו ידנית.", "error")
            except Exception as exc:  # שגיאה לא צפויה: נרשמת, המערכת ממשיכה ללא קריסה
                self.last_error = str(exc)
                log.exception("שגיאה לא צפויה בסבב")
                self._event(f"שגיאה לא צפויה: {exc}", "error")
            await asyncio.sleep(self.s.scan_interval_seconds)

    def stop(self) -> None:
        self._running = False

    # ---------- מצב לתצוגה ----------
    def snapshot(self) -> dict:
        now = self.clock()
        equity = self.equity()
        open_trades = []
        for t in self.journal.open_trades():
            ticker = self.tickers.get(t.pair_id)
            bid = ticker.bid if ticker else t.entry_price
            value = t.qty * bid
            open_trades.append({
                "id": t.id, "pair": t.pair_name, "entry_time": t.entry_time.isoformat(timespec="seconds"),
                "entry_price": t.entry_price, "qty": t.qty, "cost": t.cost, "current": bid,
                "value": value, "pnl": value - t.cost, "pnl_pct": (value - t.cost) / t.cost * 100 if t.cost else 0,
                "stop_loss": t.stop_loss, "take_profit": t.take_profit, "entry_reason": t.entry_reason,
            })
        daily_pnl = equity - self.day_start_equity
        return {
            "mode": self.s.mode, "quote": self.s.quote_currency, "now": now.isoformat(timespec="seconds"),
            "halted": self.halted, "halt_reason": self.halt_reason, "paused": self.paused,
            "cash": self.cash, "equity": equity, "start_balance": self.s.start_balance,
            "day_start_equity": self.day_start_equity, "daily_pnl": daily_pnl,
            "daily_pnl_pct": daily_pnl / self.day_start_equity * 100 if self.day_start_equity else 0,
            "daily_loss_limit": self.risk.daily_loss_limit(self.day_start_equity),
            "limits": {"max_daily_loss_pct": self.s.max_daily_loss_pct,
                       "max_position_pct": self.s.max_position_pct,
                       "risk_per_trade_pct": self.s.risk_per_trade_pct,
                       "max_open_positions": self.s.max_open_positions,
                       "stop_loss_pct": self.s.stop_loss_pct, "take_profit_pct": self.s.take_profit_pct},
            "open_trades": open_trades, "candidates": self.last_candidates,
            "recent_trades": self.journal.recent_trades(30), "stats": self.journal.stats(),
            "counters": self.counters, "daily_pnl": self.journal.daily_pnl(60),
            "events": self.journal.recent_events(60), "balance_history": self.journal.balance_history(300),
            "last_cycle": self.last_cycle.isoformat(timespec="seconds") if self.last_cycle else None,
            "last_error": self.last_error, "tradable_pairs": len(self.scanner.tradable(self.pairs)),
        }
