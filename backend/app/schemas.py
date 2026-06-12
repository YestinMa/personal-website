from datetime import date
from typing import Dict, List, Optional

from pydantic import BaseModel


class EquityPoint(BaseModel):
    date: date
    value: float


class DrawdownPoint(BaseModel):
    date: date
    value: float


class StrategyMetrics(BaseModel):
    total_return: float
    annual_return: float
    annual_volatility: float
    sharpe: float
    max_drawdown: float


class PositionItem(BaseModel):
    symbol: str
    weight: float
    side: str


class StrategyDashboardResponse(BaseModel):
    strategy_id: str
    strategy_name: str
    benchmark: str
    start_date: date
    end_date: date
    metrics: StrategyMetrics
    equity_curve: List[EquityPoint]
    drawdown_curve: List[DrawdownPoint]
    positions: List[PositionItem]
    meta: Optional[Dict[str, str]] = None
