import re
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from backend.app.config import settings


def get_async_database_url(url: str) -> str:
    """
    Normalizes PostgreSQL and SQLite database URLs for async SQLAlchemy + asyncpg.
    Converts postgresql:// to postgresql+asyncpg:// and adjusts SSL query params for asyncpg compatibility.
    """
    if url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url[len("postgresql://"):]
    elif url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url[len("postgres://"):]

    if "asyncpg" in url:
        # asyncpg expects 'ssl=require' rather than 'sslmode=require'
        url = url.replace("sslmode=", "ssl=")
        # asyncpg does not support channel_binding query param
        url = re.sub(r"([?&])channel_binding=[^&]*(&|$)", r"\1", url)
        url = url.rstrip("&").rstrip("?")
    return url


engine = create_async_engine(
    get_async_database_url(settings.DATABASE_URL),
    echo=False,
    future=True,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
