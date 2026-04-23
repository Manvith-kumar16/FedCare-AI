import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select
from app.core.security import verify_password

async def check():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.email == 'admin@fedcare.ai'))
        user = res.scalar_one_or_none()
        if not user:
            print("Admin user not found!")
            return
        
        print(f"User: {user.email}")
        print(f"Stored Hash: {user.password_hash}")
        
        is_valid = verify_password("admin123", user.password_hash)
        print(f"Verify 'admin123': {is_valid}")

if __name__ == "__main__":
    asyncio.run(check())
