from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.services.model_service import ModelService
from app.core.security import require_roles, get_current_user

router = APIRouter()


@router.post("/train/{server_id}")
async def train_server(server_id: int, background_tasks: BackgroundTasks, config: dict, session: AsyncSession = Depends(get_session), user=Depends(require_roles("ADMIN"))):
    svc = ModelService(session)
    # run training in background
    background_tasks.add_task(svc.train, server_id, config)
    return {"detail": "training started in background"}


@router.post("/predict/{server_id}")
async def predict(server_id: int, payload: dict, session: AsyncSession = Depends(get_session), user=Depends(get_current_user)):
    svc = ModelService(session)
    try:
        res = await svc.predict(server_id, payload)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return res
