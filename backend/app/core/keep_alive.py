import asyncio
import logging
import httpx

logger = logging.getLogger("bindpoint.keep_alive")


async def start_keep_alive(target_url: str, interval_seconds: int = 240):
    """
    Ultra-lightweight self-ping keep-alive task.
    Pings the public /health endpoint every `interval_seconds` (default: 4 minutes = 240s)
    to prevent free cloud instances (like Render) from sleeping due to inactivity.

    Consumes virtually 0 CPU (<0.001%) and 0 disk I/O.
    """
    clean_url = target_url.rstrip("/")
    health_endpoint = f"{clean_url}/health"
    logger.info(f"Keep-alive runner initiated for: {health_endpoint} (interval: {interval_seconds}s)")

    # Initial grace period before first ping
    await asyncio.sleep(min(30, interval_seconds))

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        while True:
            try:
                res = await client.get(health_endpoint)
                if res.status_code == 200:
                    logger.debug(f"Keep-alive ping successful: HTTP {res.status_code}")
                else:
                    logger.warning(f"Keep-alive ping returned unexpected status: HTTP {res.status_code}")
            except Exception as e:
                logger.warning(f"Keep-alive ping failed: {e}")

            # Sleep for the configured interval (4 minutes)
            await asyncio.sleep(interval_seconds)
