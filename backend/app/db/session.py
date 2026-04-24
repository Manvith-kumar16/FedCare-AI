"""Database session management - Async SQLAlchemy"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core import settings

engine_args = {
    "echo": settings.DEBUG,
    "pool_pre_ping": True,
}

# Add pooling only for PostgreSQL
if settings.DATABASE_URL.startswith("postgresql"):
    engine_args.update({
        "pool_size": 20,
        "max_overflow": 10,
    })

engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_args
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
