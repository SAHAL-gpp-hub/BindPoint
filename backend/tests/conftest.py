import pytest
from backend.app.database import engine


@pytest.fixture(autouse=True)
async def cleanup_db_connections():
    """Ensures connection pool is cleanly closed between test event loops."""
    yield
    await engine.dispose()
