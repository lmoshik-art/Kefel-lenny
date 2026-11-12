"""בדיקות קביעת גודל פוזיציה ומגבלות קשיחות."""
from app.risk import RiskManager


def rm(**kw):
    base = dict(max_daily_loss_pct=50, max_position_pct=50, risk_per_trade_pct=2,
                max_open_positions=3, stop_loss_pct=3)
    base.update(kw)
    return RiskManager(**base)


def test_size_by_risk_per_trade():
    # הון 100, סיכון 2% = 2, סטופ 3% -> פוזיציה 66.67, נחתכת לתקרה 50% = 50
    r = rm().position_size(equity=100, cash=100)
    assert r.cost == 50.0 and r.limited_by == "גודל פוזיציה מרבי"
    assert r.risk_amount == 1.5


def test_size_limited_by_risk_when_cap_is_wide():
    r = rm(max_position_pct=100).position_size(equity=100, cash=100)
    assert r.cost == 66.66 and r.limited_by == "סיכון לעסקה"   # עיגול כלפי מטה לאגורות


def test_size_limited_by_cash():
    r = rm().position_size(equity=100, cash=20)
    assert r.cost == 20.0 and r.limited_by == "מזומן פנוי"


def test_size_zero_without_cash():
    assert rm().position_size(equity=100, cash=0).cost == 0


def test_daily_loss_breach():
    r = rm()
    assert r.daily_loss_limit(100) == 50
    assert not r.daily_loss_breached(50.01, 100)
    assert r.daily_loss_breached(50, 100)
    assert r.daily_loss_breached(10, 100)


def test_open_positions_and_position_limit():
    r = rm()
    assert r.can_open_more(2) and not r.can_open_more(3)
    assert r.within_position_limit(50, 100) and not r.within_position_limit(50.02, 100)
