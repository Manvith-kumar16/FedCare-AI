import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_list_servers_requires_auth(async_client: AsyncClient):
    """Test that unauthorized users cannot list servers."""
    response = await async_client.get("/api/v1/servers/")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_list_servers_as_hospital(async_client: AsyncClient):
    """Test that a logged in hospital can list servers."""
    # Register and login
    register_data = {
        "name": "Test User",
        "email": "hospital1@test.com",
        "password": "strongpassword123",
        "role": "HOSPITAL",
        "hospital_name": "General Hospital",
        "location": "New York"
    }
    await async_client.post("/api/v1/auth/register", json=register_data)
    
    login_data = {
        "email": "hospital1@test.com",
        "password": "strongpassword123"
    }
    login_res = await async_client.post("/api/v1/auth/login", json=login_data)
    token = login_res.json()["access_token"]
    
    # Fetch servers
    headers = {"Authorization": f"Bearer {token}"}
    response = await async_client.get("/api/v1/servers/", headers=headers)
    assert response.status_code == 200
    
    servers = response.json()
    assert isinstance(servers, list)
