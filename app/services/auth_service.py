from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.user import UserRepository
from app.utils.hash import hash_password, verify_password
from app.utils.jwt import create_access_token, create_refresh_token, decode_token
from app.models.user import User


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.users = UserRepository(session)

    async def register(self, name: str, email: str, password: str, role: str) -> User:
        hashed = hash_password(password)
        user = await self.users.create(name=name, email=email, password_hash=hashed, role=role)
        return user

    async def authenticate(self, email: str, password: str) -> User | None:
        user = await self.users.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        return user

    def create_tokens(self, user: User) -> dict:
        access = create_access_token(str(user.id))
        refresh = create_refresh_token(str(user.id))
        return {"access_token": access, "refresh_token": refresh}

    def refresh(self, token: str) -> dict:
        payload = decode_token(token)
        sub = payload.get("sub")
        access = create_access_token(sub)
        refresh = create_refresh_token(sub)
        return {"access_token": access, "refresh_token": refresh}
