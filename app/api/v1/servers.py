from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.services.disease_service import DiseaseService
from app.schemas.disease_server import DiseaseServerCreate, DiseaseServerRead
from app.core.security import require_roles, get_current_user

router = APIRouter()


@router.post("/servers/create", response_model=DiseaseServerRead, status_code=201)
async def create_server(payload: DiseaseServerCreate, session: AsyncSession = Depends(get_session), user=Depends(require_roles("ADMIN"))):
    svc = DiseaseService(session)
    server = await svc.create_server(created_by=user.id, data=payload.dict())
    return server


@router.get("/servers", response_model=list[DiseaseServerRead])
async def list_servers(session: AsyncSession = Depends(get_session), user=Depends(get_current_user)):
    svc = DiseaseService(session)
    return await svc.list_servers()


@router.get("/servers/{server_id}", response_model=DiseaseServerRead)
async def get_server(server_id: int, session: AsyncSession = Depends(get_session), user=Depends(get_current_user)):
    svc = DiseaseService(session)
    server = await svc.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


@router.patch("/servers/{server_id}/status", response_model=DiseaseServerRead)
async def update_status(server_id: int, payload: dict, session: AsyncSession = Depends(get_session), user=Depends(require_roles("ADMIN"))):
    if "status" not in payload:
        raise HTTPException(status_code=400, detail="status field required")
    svc = DiseaseService(session)
    server = await svc.update_status(server_id, payload["status"])
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server
