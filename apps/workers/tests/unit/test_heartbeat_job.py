import asyncio
from pathlib import Path

import pytest

from app.jobs.heartbeat import HeartbeatJob

pytestmark = pytest.mark.unit


class FakeHeartbeat:
    def __init__(self, fail: bool = False) -> None:
        self.beats = 0
        self.fail = fail

    async def beat(self) -> None:
        if self.fail:
            raise ConnectionError("redis fora")
        self.beats += 1


async def test_ciclo_publica_heartbeat_e_toca_arquivo_de_vida(tmp_path: Path) -> None:
    heartbeat = FakeHeartbeat()
    alive = tmp_path / "alive"

    await HeartbeatJob(heartbeat, alive_file=alive, interval_seconds=10).run_once()

    assert heartbeat.beats == 1
    assert alive.exists()


async def test_falha_no_heartbeat_nao_derruba_o_worker(tmp_path: Path) -> None:
    alive = tmp_path / "alive"

    await HeartbeatJob(FakeHeartbeat(fail=True), alive_file=alive, interval_seconds=10).run_once()

    assert alive.exists()


async def test_run_para_quando_o_evento_de_parada_e_sinalizado(tmp_path: Path) -> None:
    heartbeat = FakeHeartbeat()
    loop = HeartbeatJob(heartbeat, alive_file=tmp_path / "alive", interval_seconds=0.01)
    stop = asyncio.Event()

    task = asyncio.create_task(loop.run(stop))
    await asyncio.sleep(0.05)
    stop.set()
    await asyncio.wait_for(task, timeout=1)

    assert heartbeat.beats >= 2
