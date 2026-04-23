import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.user import User
from app.core.security import verify_password

async def test():
    email = "aj@gmail.com"
    password = "123456"
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"User {email} not found!")
            # Check all users
            r = await session.execute(select(User.email))
            print(f"All users: {[u[0] for u in r.fetchall()]}")
            return
            
        is_valid = verify_password(password, user.password_hash)
        print(f"User {email} found. Password valid: {is_valid}")

if __name__ == "__main__":
    asyncio.run(test())
