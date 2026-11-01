import asyncio
from sqlalchemy import select
from backend.app.database import engine, Base, AsyncSessionLocal
from backend.app.models import Admin
from backend.app.core.security import hash_password
from backend.app.config import settings


async def init_db():
    print("Connecting to database and creating tables if not present...")
    # Ensure storage paths exist before initializing sqlite or local files
    settings.uploads_path
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables initialized successfully.")

    # Seed Admin User if not exists
    async with AsyncSessionLocal() as session:
        query = select(Admin).where(Admin.email == settings.ADMIN_EMAIL)
        result = await session.execute(query)
        admin = result.scalar_one_or_none()

        if not admin:
            print(f"Seeding primary admin user: {settings.ADMIN_EMAIL}")
            admin = Admin(
                email=settings.ADMIN_EMAIL,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
            )
            session.add(admin)
            await session.commit()
            print("Primary admin seeded successfully with Argon2id.")
        else:
            print(f"Admin user {settings.ADMIN_EMAIL} already exists.")


if __name__ == "__main__":
    asyncio.run(init_db())
