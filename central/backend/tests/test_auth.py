import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_register_hospital(async_client: AsyncClient):
    """Test registering a new hospital."""
    register_data = {
        "name": "Test User",
        "email": "hospital@test.com",
        "password": "strongpassword123",
        "role": "HOSPITAL",
        "hospital_name": "General Hospital",
        "location": "New York"
    }
    response = await async_client.post("/api/v1/auth/register", json=register_data)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "hospital@test.com"
    assert data["role"] == "HOSPITAL"

@pytest.mark.asyncio
async def test_login_hospital(async_client: AsyncClient):
    """Test logging in as the registered hospital."""
    # Register first
    register_data = {
        "name": "Test User",
        "email": "hospital@test.com",
        "password": "strongpassword123",
        "role": "HOSPITAL",
        "hospital_name": "General Hospital",
        "location": "New York"
    }
    await async_client.post("/api/v1/auth/register", json=register_data)

    # Login
    login_data = {
        "email": "hospital@test.com",
        "password": "strongpassword123"
    }
    response = await async_client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
