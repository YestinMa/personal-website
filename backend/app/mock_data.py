from datetime import date, timedelta

from .schemas import (
    DrawdownPoint,
    EquityPoint,
    PositionItem,
    StrategyDashboardResponse,
    StrategyMetrics,
)


def build_mock_dashboard(strategy_id: str) -> StrategyDashboardResponse:
    start = date(2025, 1, 1)
    days = 120

    equity = []
    drawdown = []
    base = 1.0
    peak = 1.0

    for i in range(days):
        d = start + timedelta(days=i)
        daily_ret = 0.0012 if i % 7 not in (5, 6) else -0.0004
        base *= 1 + daily_ret
        peak = max(peak, base)
        dd = (base - peak) / peak
        equity.append(EquityPoint(date=d, value=round(base, 4)))
        drawdown.append(DrawdownPoint(date=d, value=round(dd, 4)))

    return StrategyDashboardResponse(
        strategy_id=strategy_id,
        strategy_name="Multi-Factor Rotation",
        benchmark="CSI 300",
        start_date=start,
        end_date=start + timedelta(days=days - 1),
        metrics=StrategyMetrics(
            total_return=0.163,
            annual_return=0.287,
            annual_volatility=0.142,
            sharpe=1.68,
            max_drawdown=-0.072,
        ),
        equity_curve=equity,
        drawdown_curve=drawdown,
        positions=[
            PositionItem(symbol="510300.SH", weight=0.33, side="long"),
            PositionItem(symbol="159915.SZ", weight=0.27, side="long"),
            PositionItem(symbol="512880.SH", weight=0.19, side="long"),
            PositionItem(symbol="GC00Y.CMX", weight=0.21, side="long"),
        ],
        meta={"data_source": "mock", "note": "Replace with real backtest/live data"},
    )
