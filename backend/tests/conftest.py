import pytest
from backend.app.database import engine
from backend.app.core.limiter import limiter


@pytest.fixture(autouse=True)
async def cleanup_db_connections():
    """Ensures connection pool is cleanly closed and rate limiter is fresh between test event loops."""
    limiter.reset()
    yield
    await engine.dispose()
