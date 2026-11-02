from datetime import UTC, datetime

import pytest

from app.domain.platform_status import Component, ComponentStatus, PlatformStatus

pytestmark = pytest.mark.unit
NOW = datetime(2026, 10, 30, tzinfo=UTC)


def _all_up() -> tuple[ComponentStatus, ...]:
    return tuple(ComponentStatus.up(c) for c in Component)


def test_healthy_quando_todos_disponiveis() -> None:
    assert PlatformStatus(_all_up(), "0001", NOW).healthy


def test_nao_healthy_quando_um_indisponivel() -> None:
    components = list(_all_up())
    components[4] = ComponentStatus.down(Component.WORKERS, "sem heartbeat recente")

    assert not PlatformStatus(tuple(components), "0001", NOW).healthy


def test_detail_so_quando_indisponivel() -> None:
    with pytest.raises(ValueError, match="detail"):
        ComponentStatus(Component.MCP, available=True, detail="x")


def test_exige_um_item_por_componente_na_ordem_do_enum() -> None:
    with pytest.raises(ValueError, match="um item por Component"):
        PlatformStatus(tuple(reversed(_all_up())), None, NOW)
