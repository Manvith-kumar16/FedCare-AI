from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.fl.server import controller as fl_controller
from app.core.security import require_roles, get_current_user

router = APIRouter()


class FLStartRequest(BaseModel):
    server_id: int
    rounds: int = 3
    strategy: str = "FedAvg"
    min_fit_clients: int = 1
    min_available_clients: int = 1
    host: str = "0.0.0.0"
    port: int = 8080


@router.post("/fl/start")
async def start_fl(req: FLStartRequest, user=Depends(require_roles("ADMIN"))):
    try:
        ok = fl_controller.start(host=req.host, port=req.port, rounds=req.rounds, strategy_name=req.strategy, min_fit_clients=req.min_fit_clients, min_available_clients=req.min_available_clients)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"started": ok, "address": f"{req.host}:{req.port}"}


@router.get("/fl/status")
async def fl_status(user=Depends(get_current_user)):
    return {"running": fl_controller.is_running()}
