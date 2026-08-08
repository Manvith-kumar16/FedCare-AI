"""Disease Server endpoints (central coordinator)"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, and_
from typing import List, Optional
import logging
from app.db import get_db
from app.models.user import User
from app.models.disease_server import DiseaseServer, ServerStatus, InputType, ModelType, FLAlgorithm
from app.models.server_member import ServerMember, MemberStatus
from app.models.hospital import Hospital
from app.schemas.server import (
    ServerCreate, ServerUpdate, ServerResponse, 
    ServerMemberResponse, MemberJoin, MemberUpdate
)
from app.api.deps import get_current_user, get_current_active_admin, get_current_hospital

logger = logging.getLogger("fedcare-central")
router = APIRouter(prefix="/servers", tags=["Disease Servers"])


@router.get("/", response_model=List[ServerResponse])
async def list_servers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all disease servers. If the caller is a hospital, returns membership status.
    """
    # Check if caller is a hospital to compute membership details
    hospital = None
    if current_user.role.value == "HOSPITAL":
        h_res = await db.execute(select(Hospital).where(Hospital.user_id == current_user.id))
        hospital = h_res.scalar_one_or_none()

    result = await db.execute(select(DiseaseServer).order_by(DiseaseServer.created_at.desc()))
    servers = result.scalars().all()

    response = []
    for server in servers:
        # Get member count
        member_result = await db.execute(
            select(func.count(ServerMember.id)).where(ServerMember.server_id == server.id)
        )
        member_count = member_result.scalar() or 0

        # Check membership status
        is_member = False
        member_status = None
        if hospital:
            m_res = await db.execute(
                select(ServerMember).where(
                    and_(
                        ServerMember.server_id == server.id,
                        ServerMember.hospital_id == hospital.id
                    )
                )
            )
            member = m_res.scalar_one_or_none()
            if member:
                is_member = True
                member_status = member.status.value

        resp = ServerResponse(
            id=server.id,
            name=server.name,
            disease_type=server.disease_type,
            description=server.description,
            input_type=server.input_type.value,
            model_type=server.model_type.value,
            fl_algorithm=server.fl_algorithm.value,
            status=server.status.value,
            num_rounds=server.num_rounds,
            current_round=server.current_round,
            global_accuracy=server.global_accuracy,
            target_column=server.target_column,
            feature_columns=server.feature_columns,
            created_at=server.created_at,
            member_count=member_count,
            dataset_count=0,  # Dataset files are kept locally, we mask this field
            is_member=is_member,
            member_status=member_status
        )
        response.append(resp)

    return response


@router.get("/{server_id}", response_model=ServerResponse)
async def get_server(
    server_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific disease server details."""
    result = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    member_result = await db.execute(
        select(func.count(ServerMember.id)).where(ServerMember.server_id == server.id)
    )
    member_count = member_result.scalar() or 0

    # Check membership status
    hospital = None
    if current_user.role.value == "HOSPITAL":
        h_res = await db.execute(select(Hospital).where(Hospital.user_id == current_user.id))
        hospital = h_res.scalar_one_or_none()

    is_member = False
    member_status = None
    if hospital:
        m_res = await db.execute(
            select(ServerMember).where(
                and_(
                    ServerMember.server_id == server.id,
                    ServerMember.hospital_id == hospital.id
                )
            )
        )
        member = m_res.scalar_one_or_none()
        if member:
            is_member = True
            member_status = member.status.value

    return ServerResponse(
        id=server.id,
        name=server.name,
        disease_type=server.disease_type,
        description=server.description,
        input_type=server.input_type.value,
        model_type=server.model_type.value,
        fl_algorithm=server.fl_algorithm.value,
        status=server.status.value,
        num_rounds=server.num_rounds,
        current_round=server.current_round,
        global_accuracy=server.global_accuracy,
        target_column=server.target_column,
        feature_columns=server.feature_columns,
        created_at=server.created_at,
        member_count=member_count,
        dataset_count=0,
        is_member=is_member,
        member_status=member_status
    )


@router.post("/", response_model=ServerResponse, status_code=201)
async def create_server(
    data: ServerCreate, 
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    """Create a new disease server (Admin only)."""
    server = DiseaseServer(
        name=data.name,
        disease_type=data.disease_type,
        description=data.description,
        input_type=InputType(data.input_type),
        model_type=ModelType(data.model_type),
        fl_algorithm=FLAlgorithm(data.fl_algorithm),
        status=ServerStatus.ACTIVE,
        created_by=admin.id,
        num_rounds=data.num_rounds,
        target_column=data.target_column,
    )
    db.add(server)
    await db.commit()
    await db.refresh(server)

    return ServerResponse(
        id=server.id,
        name=server.name,
        disease_type=server.disease_type,
        description=server.description,
        input_type=server.input_type.value,
        model_type=server.model_type.value,
        fl_algorithm=server.fl_algorithm.value,
        status=server.status.value,
        num_rounds=server.num_rounds,
        current_round=server.current_round,
        global_accuracy=server.global_accuracy,
        target_column=server.target_column,
        created_at=server.created_at,
        member_count=0,
        dataset_count=0,
    )


@router.patch("/{server_id}", response_model=ServerResponse)
async def update_server(
    server_id: int, 
    data: ServerUpdate, 
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    """Update a disease server parameters (Admin only)."""
    result = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if data.name is not None:
        server.name = data.name
    if data.description is not None:
        server.description = data.description
    if data.status is not None:
        server.status = ServerStatus(data.status)
    if data.num_rounds is not None:
        server.num_rounds = data.num_rounds
    if data.fl_algorithm is not None:
        server.fl_algorithm = FLAlgorithm(data.fl_algorithm)

    await db.commit()
    await db.refresh(server)
    
    # Calculate counts
    member_result = await db.execute(
        select(func.count(ServerMember.id)).where(ServerMember.server_id == server.id)
    )
    member_count = member_result.scalar() or 0

    return ServerResponse(
        id=server.id,
        name=server.name,
        disease_type=server.disease_type,
        description=server.description,
        input_type=server.input_type.value,
        model_type=server.model_type.value,
        fl_algorithm=server.fl_algorithm.value,
        status=server.status.value,
        num_rounds=server.num_rounds,
        current_round=server.current_round,
        global_accuracy=server.global_accuracy,
        target_column=server.target_column,
        created_at=server.created_at,
        member_count=member_count,
        dataset_count=0,
    )


@router.delete("/{server_id}")
async def delete_server(
    server_id: int, 
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    """Delete a disease server and its memberships (Admin only)."""
    # Delete members
    await db.execute(delete(ServerMember).where(ServerMember.server_id == server_id))
    # Delete server
    await db.execute(delete(DiseaseServer).where(DiseaseServer.id == server_id))
    await db.commit()
    return {"message": f"Server {server_id} and all related memberships deleted successfully"}


# ─── Membership Operations ────────────────────────────────────────────────────

@router.get("/{server_id}/members", response_model=List[ServerMemberResponse])
async def list_members(
    server_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get members of a server (Admin or registered Hospital user)."""
    query = select(ServerMember).where(ServerMember.server_id == server_id)
    result = await db.execute(query)
    members = result.scalars().all()

    response = []
    for member in members:
        h_res = await db.execute(select(Hospital).where(Hospital.id == member.hospital_id))
        hosp = h_res.scalar_one_or_none()
        
        response.append(ServerMemberResponse(
            id=member.id,
            server_id=member.server_id,
            hospital_id=member.hospital_id,
            hospital_name=hosp.name if hosp else f"Hospital {member.hospital_id}",
            status=member.status.value,
            last_accuracy=member.last_accuracy,
            created_at=member.created_at
        ))

    return response


@router.post("/members/join", response_model=ServerMemberResponse)
async def join_server(
    data: MemberJoin, 
    db: AsyncSession = Depends(get_db),
    hospital: Hospital = Depends(get_current_hospital)
):
    """
    Hospital joins a disease server.
    We securely derive the joining hospital ID from the JWT.
    """
    # Check if membership already exists
    exists_res = await db.execute(
        select(ServerMember).where(
            and_(
                ServerMember.server_id == data.server_id,
                ServerMember.hospital_id == hospital.id
            )
        )
    )
    if exists_res.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="You are already a member or pending request exists for this server"
        )

    member = ServerMember(
        server_id=data.server_id,
        hospital_id=hospital.id,
        status=MemberStatus.PENDING
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    return ServerMemberResponse(
        id=member.id,
        server_id=member.server_id,
        hospital_id=member.hospital_id,
        hospital_name=hospital.name,
        status=member.status.value,
        last_accuracy=member.last_accuracy,
        created_at=member.created_at
    )


@router.patch("/members/{member_id}", response_model=ServerMemberResponse)
async def update_member_status(
    member_id: int, 
    data: MemberUpdate, 
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    """Update server membership status (Admin only - e.g., approve or reject requests)."""
    result = await db.execute(select(ServerMember).where(ServerMember.id == member_id))
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Membership record not found")

    member.status = MemberStatus(data.status)
    await db.commit()
    await db.refresh(member)

    h_res = await db.execute(select(Hospital).where(Hospital.id == member.hospital_id))
    hosp = h_res.scalar_one_or_none()

    return ServerMemberResponse(
        id=member.id,
        server_id=member.server_id,
        hospital_id=member.hospital_id,
        hospital_name=hosp.name if hosp else f"Hospital {member.hospital_id}",
        status=member.status.value,
        last_accuracy=member.last_accuracy,
        created_at=member.created_at
    )


@router.get("/hospitals/list", response_model=List[dict])
async def list_hospitals(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_active_admin)
):
    """
    Get all registered hospitals (Admin only).
    """
    result = await db.execute(select(Hospital).order_by(Hospital.created_at.desc()))
    hospitals = result.scalars().all()
    
    response = []
    for h in hospitals:
        # Get count of server memberships for this hospital
        mem_res = await db.execute(
            select(func.count(ServerMember.id)).where(
                and_(
                    ServerMember.hospital_id == h.id,
                    ServerMember.status == MemberStatus.APPROVED
                )
            )
        )
        membership_count = mem_res.scalar() or 0
        
        response.append({
            "id": h.id,
            "name": h.name,
            "location": h.location,
            "user_id": h.user_id,
            "membership_count": membership_count,
            "created_at": h.created_at.isoformat() if h.created_at else None
        })
    return response

