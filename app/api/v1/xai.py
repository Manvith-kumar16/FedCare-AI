from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.services.xai_service import XAIService
from app.core.security import get_current_user

router = APIRouter()


@router.get("/explain/{prediction_id}")
async def explain(prediction_id: int, session: AsyncSession = Depends(get_session), user=Depends(get_current_user)):
    svc = XAIService(session)
    try:
        res = await svc.explain(prediction_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return res
