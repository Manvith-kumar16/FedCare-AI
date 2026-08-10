"""
FedCare AI Hospital Node - Servers Proxy Endpoints
"""
import urllib.request
import urllib.error
import json
from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import Optional
from app.core import settings
from app.api.deps import get_current_hospital_user

router = APIRouter(prefix="/servers", tags=["Servers Proxy"])

@router.get("/")
async def get_servers(
    current_user: dict = Depends(get_current_hospital_user),
    authorization: Optional[str] = Header(None)
):
    """List servers via central coordinator proxy."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization token required")
    url = f"{settings.CENTRAL_API_URL}/api/v1/servers/"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", authorization)
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            return json.loads(res_data)
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail="Failed to fetch servers from coordinator")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{server_id:int}")
async def get_server_detail(
    server_id: int,
    current_user: dict = Depends(get_current_hospital_user),
    authorization: Optional[str] = Header(None)
):
    """Get server detail via central coordinator proxy."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization token required")
    url = f"{settings.CENTRAL_API_URL}/api/v1/servers/{server_id}"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", authorization)
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            return json.loads(res_data)
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=e.code, detail="Failed to fetch server detail from coordinator")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/join")
async def join_server(
    data: dict,
    current_user: dict = Depends(get_current_hospital_user),
    authorization: Optional[str] = Header(None)
):
    """Join a server via central coordinator proxy."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization token required")
    url = f"{settings.CENTRAL_API_URL}/api/v1/servers/members/join"
    
    # Force hospital_id from JWT payload to prevent tampering
    payload_data = dict(data)
    payload_data["hospital_id"] = current_user["hospital_id"]
    
    body = json.dumps(payload_data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "Authorization": authorization},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = response.read().decode("utf-8")
            return json.loads(res_data)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
            detail = err_json.get("detail", "Failed to join server")
        except Exception:
            detail = "Failed to join server"
        raise HTTPException(status_code=e.code, detail=detail)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
