"""Composição e ciclo de vida do processo dos workers."""

import asyncio
import signal
import sys
import time
from pathlib import Path

from redis.asyncio import Redis

from app.core.config import load_settings
from app.core.logging import configure_logging
from app.infrastructure.heartbeat import RedisHeartbeatPublisher
from app.jobs.heartbeat import HeartbeatJob


async def run() -> None:
    settings = load_settings()
    configure_logging(settings.log_level)
    redis = Redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)
    job = HeartbeatJob(
        RedisHeartbeatPublisher(redis, settings.worker_heartbeat_ttl_seconds),
        alive_file=Path(settings.worker_alive_file),
        interval_seconds=settings.worker_heartbeat_interval_seconds,
    )
    stop = asyncio.Event()
    for sig in (signal.SIGTERM, signal.SIGINT):
        asyncio.get_running_loop().add_signal_handler(sig, stop.set)
    try:
        await job.run(stop)
    finally:
        await redis.aclose()


def healthcheck(max_age_seconds: float = 30) -> int:
    """Usado pelo healthcheck do container: 0 se o arquivo de vida é recente."""
    path = Path(load_settings().worker_alive_file)
    if path.exists() and time.time() - path.stat().st_mtime < max_age_seconds:
        return 0
    return 1


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "healthcheck":
        sys.exit(healthcheck())
    asyncio.run(run())
