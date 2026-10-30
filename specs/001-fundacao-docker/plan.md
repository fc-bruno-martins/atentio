# Implementation Plan: Fundação da plataforma em Docker

**Branch**: `001-fundacao-docker` | **Date**: 2026-10-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-fundacao-docker/spec.md`

## Summary

Subir com `docker compose` os serviços próprios **frontend**, **backend**, **workers** e **mcp**,
mais **Evolution API v2.3.7** (imagem oficial), **PostgreSQL** e **Redis**. Os três serviços
Python saem da mesma imagem e do mesmo pacote `judite`, organizado em camadas (domain,
application, infrastructure, apps) com mediator próprio e regra de dependência verificada por
import-linter. Um serviço `migrate` (one-shot) aplica as migrações Alembic antes de o backend
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

**Target Platform**: Linux containers (VPS); desenvolvimento em macOS com Docker Desktop

**Project Type**: aplicação web (frontend + backend) com serviços auxiliares (workers, mcp)

**Performance Goals**: plataforma saudável em ≤ 3 min com imagens baixadas (SC-001); status
reflete falha em ≤ 30 s (SC-003)

**Constraints**: só frontend, backend e mcp publicam portas; segredos só via ambiente; Evolution
API e Postgres apenas na rede interna

**Scale/Scope**: 1 VPS, 7 containers; sem dados de negócio nesta feature

## Constitution Check

| Princípio | Como o plano atende | Status |
|---|---|---|
| I. Camadas, domínio no centro | Pacote `judite` com `domain`, `application`, `infrastructure`, `shared`, `apps`; contratos `.importlinter` (layers + independence) rodando em `make check` | ✅ |
| II. Entrypoints finos via mediator | `GET /api/status` só despacha `GetPlatformStatus` ao mediator; handler em `application` (ADR 0002) | ✅ |
| III. Shared/domínio reutilizáveis, apps isolados | `apps/api`, `apps/mcp`, `apps/workers` independentes (contrato `independence`); frontend só fala com backend via nginx `/api` | ✅ |
| IV. Isolamento por usuário | Sem dados de usuário nesta feature; status não expõe dados de WhatsApp | ✅ (N/A) |
| V. Repositories + Alembic | Checagem de banco e versão de schema via `DatabaseProbe` em `infrastructure`; migração inicial vazia com `upgrade`/`downgrade`; serviço `migrate` | ✅ |
| VI. Testes por camada | Unit: handler com fakes; integração: probes reais (Postgres/Redis via testcontainers) e migração up/down; contrato: `/api/status` e `/health` de cada app; front: teste da página | ✅ |
| Segredos via ambiente | `.env.example` versionado, `.env` no `.gitignore`, `Settings` falha com nome da variável | ✅ |

Re-avaliação pós-design: sem violações. Nada em Complexity Tracking.

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
backend/                          # pacote Python único (imagem usada por api, workers, mcp, migrate)
├── pyproject.toml                # deps, ruff, mypy, pytest
├── .importlinter                 # regras de camada
├── Dockerfile
├── alembic.ini
├── migrations/                   # Alembic (env.py + versions/)
├── src/judite/
│   ├── shared/                   # config (Settings), logging, mediator, erros base
│   ├── domain/
│   │   └── platform/             # ComponentStatus, PlatformStatus, Component (enum)
│   ├── application/
│   │   └── platform/             # GetPlatformStatus (query), handler, ports (HealthProbe)
│   ├── infrastructure/
│   │   ├── db/                   # engine/sessão SQLAlchemy, DatabaseProbe
│   │   ├── redis/                # cliente, RedisProbe, WorkerHeartbeat (store + probe)
│   │   └── http/                 # HttpProbe (Evolution API, mcp)
│   └── apps/
│       ├── api/                  # FastAPI: main, rotas /health e /api/status, composição
│       ├── workers/              # loop asyncio com heartbeat; /health via arquivo de vida
│       └── mcp/                  # MCPServer streamable HTTP + /health
└── tests/
    ├── unit/
    ├── integration/
    └── contract/

frontend/
├── package.json, vite.config.ts, tsconfig*.json, eslint.config.js
├── Dockerfile                    # build Node 22 → nginx
├── nginx.conf                    # SPA + proxy /api → backend
└── src/
    ├── main.tsx, App.tsx
    ├── api/status.ts             # cliente de /api/status
    └── features/status/          # StatusPage + teste

infra/
└── postgres/init/01-evolution-db.sh   # cria banco `evolution` na primeira subida

docker-compose.yml
.env.example
Makefile                          # up, down, logs, check, test
docs/adr/0001..0004
```

**Structure Decision**: opção web application (backend/ + frontend/). Os serviços `api`,
`workers`, `mcp` e `migrate` são entrypoints do mesmo pacote `judite` e da mesma imagem, com
comandos diferentes no Compose (ADR 0001). Isso realiza a constitution (apps compartilham shared e
domain) sem publicar bibliotecas internas.

## Decisões de design

1. **Mediator próprio** (`shared/mediator.py`, ~40 linhas): `Mediator.send(request)` resolve o
   handler pelo tipo do request. Sem dependência externa (ADR 0002).
2. **Handler = use case** (ADR 0002): cada comando/consulta tem um handler em `application`, que é
   o próprio caso de uso; não há camada "usecase" separada chamada pelo handler. Pode ser revisto
   se o usuário preferir handlers finos que delegam a use cases.
3. **Status via ports**: `HealthProbe` (port) com `component` e `check() -> ComponentStatus`.
   Implementações: `DatabaseProbe` (SELECT 1 + `alembic_version`), `RedisProbe` (PING),
   `HttpProbe` (Evolution `GET /`, mcp `GET /health`), `WorkerHeartbeatProbe` (chave Redis com
   TTL). Probes rodam em paralelo com timeout de 2 s cada; falha de um não derruba o status.
4. **Heartbeat dos workers**: a cada `WORKER_HEARTBEAT_INTERVAL_SECONDS` (padrão 10) grava
   `judite:workers:heartbeat` com TTL `WORKER_HEARTBEAT_TTL_SECONDS` (padrão 30). O probe considera
   indisponível se a chave expirou (FR-007, SC-003). Biblioteca de filas fica para a feature 004.
5. **Migrações**: serviço `migrate` (`alembic upgrade head`), e o `api` usa
   `depends_on: migrate: condition: service_completed_successfully` (FR-009, US3).
6. **Rede**: Compose com rede padrão interna. Portas publicadas: frontend (`FRONTEND_PORT`, 8080),
   backend (`BACKEND_PORT`, 8000, para debug/MCP), mcp (`MCP_PORT`, 8001). Postgres, Redis e
   Evolution sem `ports` (FR-011).
7. **Frontend**: nginx serve o build e faz proxy de `/api/` para `api:8000` (mesma origem, sem
   CORS). Página de status com polling a cada 10 s.
8. **Configuração**: `pydantic-settings` com campos obrigatórios sem default; a mensagem de erro
   lista as variáveis ausentes (FR-005). Compose usa `${VAR:?mensagem}` para segredos.

## Complexity Tracking

Sem violações da constitution.
