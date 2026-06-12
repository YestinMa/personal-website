from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .mock_data import build_mock_dashboard
from .schemas import StrategyDashboardResponse

app = FastAPI(title="Strategy Dashboard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/v1/strategies/{strategy_id}/dashboard", response_model=StrategyDashboardResponse)
def get_strategy_dashboard(
    strategy_id: str,
    start_date: str | None = Query(default=None, description="Reserved: filter start date (YYYY-MM-DD)"),
    end_date: str | None = Query(default=None, description="Reserved: filter end date (YYYY-MM-DD)"),
) -> StrategyDashboardResponse:
    _ = start_date, end_date
    return build_mock_dashboard(strategy_id)


@app.get("/api/v1/strategies/{strategy_id}/signals")
def get_strategy_signals(
    strategy_id: str,
    limit: int = Query(default=20, ge=1, le=500, description="Reserved: max signal records"),
) -> dict:
    _ = strategy_id, limit
    return {
        "signals": [],
        "meta": {
            "status": "reserved",
            "message": "Signal endpoint is reserved for future strategy integration.",
        },
    }
