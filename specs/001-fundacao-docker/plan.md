# Implementation Plan: Fundação da plataforma em Docker

**Branch**: `001-fundacao-docker` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-fundacao-docker/spec.md`

## Summary

Subir com `docker compose` os serviços próprios **frontend**, **backend**, **workers** e **mcp**,
mais **Evolution API v2.3.7** (imagem oficial), **PostgreSQL** e **Redis**. Os serviços
Python ficam em `apps/` (uv workspace, um Dockerfile por app) e compartilham o pacote
`judite_shared` (`apps/shared/`), organizado em camadas (kernel, domain, application, infrastructure)
com mediator próprio e fronteiras verificadas por import-linter. Um serviço `migrate` (one-shot) aplica as migrações Alembic antes de o backend
subir. O backend expõe `GET /api/status`, que consolida a saúde de cada componente por meio de
um query handler; o frontend React exibe essa página. Workers publicam heartbeat no Redis.

## Technical Context

**Language/Version**: Python 3.13 (imagem `python:3.13-slim`); TypeScript 6.0 / Node 22 no build
do frontend

**Primary Dependencies**: FastAPI 0.162, Uvicorn 0.54, SQLAlchemy 2.1 (async) + asyncpg 0.32,
Alembic 1.20, pydantic-settings 2.16, redis-py 8.1, httpx 0.28, mcp 2.3 (`MCPServer`, streamable
HTTP), structlog 26; React 19, Vite 8, nginx (servir o SPA e fazer proxy de `/api`)

**Storage**: PostgreSQL 17 (bancos `judite` e `evolution` no mesmo servidor); Redis 7 (heartbeat
dos workers e cache da Evolution API, com prefixos separados)

**Testing**: pytest 9 + pytest-asyncio (unitários sem I/O; integração com testcontainers contra
PostgreSQL e Redis reais); Vitest 5 + Testing Library no frontend

**Target Platform**: Linux containers; primeiro local (macOS com Docker Desktop), depois VPS

**Project Type**: aplicação web (frontend + backend) com serviços auxiliares (workers, mcp)

**Performance Goals**: plataforma saudável em ≤ 3 min com imagens baixadas (SC-001); status
reflete falha em ≤ 30 s (SC-003)

**Constraints**: só frontend, backend e mcp publicam portas; segredos só via ambiente; Evolution
API e Postgres apenas na rede interna

**Scale/Scope**: execução local primeiro (depois 1 VPS); 8 serviços (7 contínuos + `migrate`
one-shot); sem dados de negócio nesta feature

## Constitution Check

| Princípio | Como o plano atende | Status |
|---|---|---|
| I. Camadas, domínio no centro | `judite_shared` com `kernel`, `domain`, `application`, `infrastructure`; contratos `.importlinter` na raiz rodando em `make check` (CI adiado até a 009, constitution v1.2.0) | ✅ |
| II. Entrypoints finos via mediator | `GET /api/status` só despacha `GetPlatformStatus` ao mediator; handler em `application` (ADR 0002) | ✅ |
| III. Shared/domínio reutilizáveis, apps isolados | `judite_backend`, `judite_mcp`, `judite_workers` independentes (contrato `independence`); frontend só fala com backend via nginx `/api` | ✅ |
| IV. Isolamento por usuário | Sem dados de usuário nesta feature; status não expõe dados de WhatsApp | ✅ (N/A) |
| V. Repositories + Alembic | Checagem de banco e versão de schema via `DatabaseProbe` em `infrastructure`; migração inicial vazia com `upgrade`/`downgrade`; serviço `migrate` | ✅ |
| VI. Testes por camada | Unit: handler com fakes; integração: probes reais (Postgres/Redis via testcontainers) e migração up/down; contrato: `/api/status` (sucesso e erro) e `/health` de cada app; front: teste da página | ✅ |
| Segredos via ambiente | `.env.example` versionado, `.env` no `.gitignore`, `Settings` falha com nome da variável | ✅ |

Re-avaliação pós-design: uma exceção justificada em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-fundacao-docker/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── status.openapi.yaml
├── alinhamento.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
pyproject.toml                    # uv workspace, ruff, mypy, pytest
uv.lock
.importlinter                     # camadas + apps independentes
apps/
├── backend/
│   ├── pyproject.toml, Dockerfile, alembic.ini
│   ├── migrations/               # Alembic (usado pelo serviço migrate)
│   ├── src/judite_backend/       # FastAPI: main, routes, composition
│   └── tests/{contract,integration}/
├── workers/
│   ├── pyproject.toml, Dockerfile
│   ├── src/judite_workers/       # loop asyncio com heartbeat
│   └── tests/unit/
├── mcp/
│   ├── pyproject.toml, Dockerfile
│   ├── src/judite_mcp/           # MCPServer streamable HTTP + /health
│   └── tests/contract/
├── frontend/
│   ├── package.json, vite.config.ts, tsconfig.json, eslint.config.js
│   ├── Dockerfile, nginx.conf    # build Node 22 → nginx; proxy /api → backend
│   └── src/                      # App, api/status.ts, features/status/
└── shared/
    ├── pyproject.toml
    ├── src/judite_shared/
    │   ├── kernel/                   # config, logging, mediator
    │   ├── domain/platform/          # Component, ComponentStatus, PlatformStatus
    │   ├── application/platform/     # GetPlatformStatus + handler, ports
    │   └── infrastructure/           # db/, redis/, http/ (probes e heartbeat)
    └── tests/{unit,integration}/
infra/postgres/init/01-evolution-db.sh
docker-compose.yml
.env.example
Makefile                          # up, down, ps, logs, check
docs/adr/0001..0005
```

**Structure Decision**: monorepo em `apps/`: quatro serviços mais a biblioteca `apps/shared/` (ADR 0005, A5–A7 do
alinhamento). O serviço `migrate` usa a imagem do backend com outro comando.

## Decisões de design

1. **Mediator próprio** (`kernel/mediator.py`, ~40 linhas): `Mediator.send(request)` resolve o
   handler pelo tipo do request. Sem dependência externa (ADR 0002).
2. **Handler = use case** (ADR 0002): cada comando/consulta tem um handler em `application`, que é
   o próprio caso de uso; não há camada "usecase" separada chamada pelo handler. Pode ser revisto
   se o usuário preferir handlers finos que delegam a use cases.
3. **Status via ports**: `HealthProbe` (port) com `component` e `check() -> ComponentStatus`.
   Implementações: `DatabaseProbe` (SELECT 1 + `alembic_version`), `RedisProbe` (PING),
   `HttpProbe` (Evolution `GET /`, mcp `GET /health`), `WorkerHeartbeatProbe` (chave Redis com
   TTL). Probes rodam em paralelo com timeout de 2 s cada; falha de um não derruba o status.
4. **Heartbeat dos workers**: a cada `WORKER_HEARTBEAT_INTERVAL_SECONDS` (padrão 5) grava
   `judite:workers:heartbeat` com TTL `WORKER_HEARTBEAT_TTL_SECONDS` (padrão 20). Com polling de 10 s no front, a falha
   aparece em ≤ 30 s. O probe considera indisponível se a chave expirou (FR-007, SC-003). Biblioteca de filas fica para a feature 004.
5. **Migrações**: serviço `migrate` (`alembic upgrade head`), e o `backend` usa
   `depends_on: migrate: condition: service_completed_successfully` (FR-009, US3).
6. **Rede**: Compose com rede padrão interna. Portas publicadas em `BIND_ADDRESS` (padrão
   `127.0.0.1`): frontend (`FRONTEND_PORT`, 8180), backend (`BACKEND_PORT`, 8100), mcp (`MCP_PORT`,
   8101). Os padrões evitam 8080 e 8000, já ocupadas na máquina de desenvolvimento. Postgres,
   Redis e Evolution sem `ports` (FR-011).
7. **Frontend**: nginx serve o build e faz proxy de `/api/` para `backend:8000` (mesma origem, sem
   CORS). Página de status com polling a cada 10 s.
8. **Configuração**: `pydantic-settings` com campos obrigatórios sem default; a mensagem de erro
   lista as variáveis ausentes (FR-005). Compose usa `${VAR:?mensagem}` para segredos.

## Complexity Tracking

| Violação | Por que é necessária | Alternativa mais simples rejeitada |
|---|---|---|
| `/health` responde direto, sem mediator (Princípio II) | É liveness técnica, sem regra de negócio nem dados; precisa responder mesmo se a composição falhar parcialmente | Handler no mediator: acrescenta indireção sem benefício |

`/health` só tem caminho de sucesso; por isso seus testes de contrato não têm caso de erro.
