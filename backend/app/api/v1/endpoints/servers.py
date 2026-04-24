"""Disease Server endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List, Optional
from app.db import get_db
from app.models import DiseaseServer, ServerMember, Hospital, Dataset, MemberStatus, TrainingLog, Prediction
from app.models.disease_server import ServerStatus, InputType, ModelType, FLAlgorithm
from app.schemas.server import (
    ServerCreate, ServerUpdate, ServerResponse, 
    ServerMemberResponse, MemberJoin, MemberUpdate
)

router = APIRouter(prefix="/servers", tags=["Disease Servers"])

def check_admin(x_user_role: Optional[str] = Header(None)):
    """Simple demo RBAC check."""
    if not x_user_role or x_user_role.upper() != "ADMIN":
         raise HTTPException(status_code=403, detail="Administrative privileges required for this action")


@router.get("/", response_model=List[ServerResponse])
async def list_servers(
    db: AsyncSession = Depends(get_db),
    x_hospital_id: Optional[str] = Header(None)
):
    """Get all disease servers with their member/dataset counts."""
    result = await db.execute(select(DiseaseServer).order_by(DiseaseServer.created_at.desc()))
    servers = result.scalars().all()

    response = []
    for server in servers:
        # Get member count
        member_result = await db.execute(
            select(func.count(ServerMember.id)).where(ServerMember.server_id == server.id)
        )
        member_count = member_result.scalar() or 0

        # Get dataset count
        ds_result = await db.execute(
            select(func.count(Dataset.id)).where(Dataset.server_id == server.id)
        )
        dataset_count = ds_result.scalar() or 0

        # Check if requester is a member
        is_member = False
        member_status = None
        if x_hospital_id:
            m_res = await db.execute(
                select(ServerMember).where(
                    ServerMember.server_id == server.id,
                    ServerMember.hospital_id == int(x_hospital_id)
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
            input_type=server.input_type.value if server.input_type else "tabular",
            model_type=server.model_type.value if server.model_type else "xgboost",
            fl_algorithm=server.fl_algorithm.value if server.fl_algorithm else "FedAvg",
            status=server.status.value if server.status else "ACTIVE",
            num_rounds=server.num_rounds,
            current_round=server.current_round,
            global_accuracy=server.global_accuracy,
            target_column=server.target_column,
            feature_columns=server.feature_columns,
            created_at=server.created_at,
            member_count=member_count,
            dataset_count=dataset_count,
            is_member=is_member,
            member_status=member_status
        )
        response.append(resp)

    return response


@router.get("/{server_id}", response_model=ServerResponse)
async def get_server(
    server_id: int, 
    db: AsyncSession = Depends(get_db),
    x_hospital_id: Optional[str] = Header(None)
):
    """Get a specific disease server."""
    result = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    member_result = await db.execute(
        select(func.count(ServerMember.id)).where(ServerMember.server_id == server.id)
    )
    member_count = member_result.scalar() or 0

    ds_result = await db.execute(
        select(func.count(Dataset.id)).where(Dataset.server_id == server.id)
    )
    dataset_count = ds_result.scalar() or 0

    # Check membership
    is_member = False
    member_status = None
    if x_hospital_id:
        m_res = await db.execute(
            select(ServerMember).where(
                ServerMember.server_id == server.id,
                ServerMember.hospital_id == int(x_hospital_id)
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
        dataset_count=dataset_count,
        is_member=is_member,
        member_status=member_status
    )


@router.post("/", response_model=ServerResponse, status_code=201)
async def create_server(
    data: ServerCreate, 
    db: AsyncSession = Depends(get_db),
    _ = Depends(check_admin)
):
    """Create a new disease server."""
    server = DiseaseServer(
        name=data.name,
        disease_type=data.disease_type,
        description=data.description,
        input_type=InputType(data.input_type),
        model_type=ModelType(data.model_type),
        fl_algorithm=FLAlgorithm(data.fl_algorithm),
        status=ServerStatus.ACTIVE,
        created_by=1,  # Admin
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
async def update_server(server_id: int, data: ServerUpdate, db: AsyncSession = Depends(get_db)):
    """Update a disease server."""
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
    )


@router.get("/{server_id}/members", response_model=List[ServerMemberResponse])
async def get_server_members(
    server_id: int, 
    db: AsyncSession = Depends(get_db),
    x_user_role: Optional[str] = Header(None),
    x_hospital_id: Optional[str] = Header(None)
):
    """Get all members of a disease server with their latest accuracy."""
    result = await db.execute(
        select(ServerMember).where(ServerMember.server_id == server_id)
    )
    members = result.scalars().all()

    is_admin = x_user_role and x_user_role.upper() == "ADMIN"
    
    response = []
    for member in members:
        hosp_result = await db.execute(select(Hospital).where(Hospital.id == member.hospital_id))
        hospital = hosp_result.scalar_one_or_none()

        # Isolation: Only show real names to Admins, or to the hospital themselves
        display_name = "Secure Partner Node"
        if is_admin or (x_hospital_id and str(member.hospital_id) == str(x_hospital_id)):
            display_name = hospital.name if hospital else f"Hospital {member.hospital_id}"
        else:
            display_name = f"Secure Node {member.hospital_id}"

        # Get latest accuracy from training logs for this hospital and server
        log_result = await db.execute(
            select(TrainingLog.local_accuracy)
            .where(
                TrainingLog.server_id == server_id,
                TrainingLog.hospital_id == member.hospital_id,
                TrainingLog.log_type == "local"
            )
            .order_by(TrainingLog.round_number.desc())
            .limit(1)
        )
        last_accuracy = log_result.scalar() or 0.0

        response.append(ServerMemberResponse(
            id=member.id,
            server_id=member.server_id,
            hospital_id=member.hospital_id,
            hospital_name=display_name,
            status=member.status.value,
            last_accuracy=last_accuracy,
            created_at=member.created_at,
        ))

    return response


@router.post("/join", response_model=ServerMemberResponse)
async def join_server(data: MemberJoin, db: AsyncSession = Depends(get_db)):
    """Request to join a disease server."""
    # 1. Validate and update hospital name
    if not data.hospital_name or not data.hospital_name.strip():
        raise HTTPException(status_code=400, detail="Hospital name is required")

    h_result = await db.execute(select(Hospital).where(Hospital.id == data.hospital_id))
    hospital = h_result.scalar_one_or_none()
    
    if hospital:
        hospital.name = data.hospital_name.strip()
        await db.commit() # Commit name update immediately
        await db.refresh(hospital)

    # 2. Check if already a member
    result = await db.execute(
        select(ServerMember).where(
            ServerMember.server_id == data.server_id,
            ServerMember.hospital_id == data.hospital_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return ServerMemberResponse(
            id=existing.id,
            server_id=existing.server_id,
            hospital_id=existing.hospital_id,
            hospital_name=hospital.name if hospital else None,
            status=existing.status.value,
            last_accuracy=0.0,
            created_at=existing.created_at
        )

    member = ServerMember(
        server_id=data.server_id,
        hospital_id=data.hospital_id,
        status=MemberStatus.APPROVED
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    return ServerMemberResponse(
        id=member.id,
        server_id=member.server_id,
        hospital_id=member.hospital_id,
        hospital_name=hospital.name if hospital else None,
        status=member.status.value,
        last_accuracy=0.0,
        created_at=member.created_at
    )


@router.patch("/members/{member_id}", response_model=ServerMemberResponse)
async def update_member_status(member_id: int, data: MemberUpdate, db: AsyncSession = Depends(get_db)):
    """Approve or reject a hospital's join request."""
    result = await db.execute(select(ServerMember).where(ServerMember.id == member_id))
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Membership record not found")

    try:
        new_status = MemberStatus(data.status.upper())
        member.status = new_status
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {data.status}")

    await db.commit()
    await db.refresh(member)

    h_result = await db.execute(select(Hospital).where(Hospital.id == member.hospital_id))
    hospital = h_result.scalar_one_or_none()

    return ServerMemberResponse(
        id=member.id,
        server_id=member.server_id,
        hospital_id=member.hospital_id,
        hospital_name=hospital.name if hospital else None,
        status=member.status.value,
        created_at=member.created_at
    )


@router.delete("/{server_id}")
async def delete_server(
    server_id: int, 
    db: AsyncSession = Depends(get_db),
    _ = Depends(check_admin)
):
    """Delete a disease server."""
    result = await db.execute(select(DiseaseServer).where(DiseaseServer.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Clean up associated records before deleting server
    await db.execute(delete(TrainingLog).where(TrainingLog.server_id == server_id))
    await db.execute(delete(Prediction).where(Prediction.server_id == server_id))
    await db.execute(delete(ServerMember).where(ServerMember.server_id == server_id))
    await db.execute(delete(Dataset).where(Dataset.server_id == server_id))
    await db.delete(server)
    await db.commit()

    return {"message": "Server deleted successfully"}
