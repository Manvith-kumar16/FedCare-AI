from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.repositories.disease_server import ServerMemberRepository
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


@router.post("/servers/{server_id}/join")
async def join_server(server_id: int, session: AsyncSession = Depends(get_session), user=Depends(get_current_user)):
    # Only hospital users can request join
    if user.role != 'HOSPITAL':
        raise HTTPException(status_code=403, detail="Only hospitals can request to join")
    # create ServerMember pending
    repo = ServerMemberRepository(session)
    # check existing
    members = await repo.list_for_server(server_id)
    if any(m.hospital_id == user.id for m in members):
        raise HTTPException(status_code=400, detail="Already requested or member")
    from app.models.server_member import ServerMember
    obj = ServerMember(server_id=server_id, hospital_id=user.id, status='pending')
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return {"detail": "join request created", "member_id": obj.id}


@router.post("/servers/{server_id}/approve")
async def approve_server(server_id: int, hospital_id: int, session: AsyncSession = Depends(get_session), user=Depends(require_roles("ADMIN"))):
    # Admin approves a hospital into server
    repo = ServerMemberRepository(session)
    members = await repo.list_for_server(server_id)
    target = next((m for m in members if m.hospital_id == hospital_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Join request not found")
    # update status
    from sqlalchemy import update
    q = update(target.__class__).where(target.__class__.id == target.id).values(status='approved')
    await session.execute(q)
    await session.commit()
    return {"detail": "hospital approved"}
