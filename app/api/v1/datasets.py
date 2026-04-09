from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.services.dataset_service import DatasetService
from app.core.security import get_current_user, require_roles

router = APIRouter()


@router.post("/datasets/upload")
async def upload_dataset(server_id: int, hospital_id: int, file: UploadFile = File(...), session: AsyncSession = Depends(get_session), user=Depends(get_current_user)):
    # hospitals can only upload for their own hospital
    if user.role != 'HOSPITAL' or user.id != hospital_id:
        raise HTTPException(status_code=403, detail="Not allowed to upload for this hospital")

    svc = DatasetService(session)
    try:
        result = await svc.upload_file(server_id, hospital_id, file, file.content_type)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result
