# Tasks: Fundação da plataforma em Docker

**Input**: `specs/001-fundacao-docker/` (plan.md, spec.md, research.md, data-model.md,
contracts/status.openapi.yaml, quickstart.md)

**Tests**: obrigatórios pela constitution (Princípio VI). Ficam dentro de cada história e são
escritos antes da implementação correspondente.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [ ] T001 Criar `backend/pyproject.toml` (deps fixadas do plan, ruff, mypy strict, pytest com marcadores `unit`/`integration`/`contract`) e `backend/src/judite/__init__.py` com subpacotes `shared`, `domain`, `application`, `infrastructure`, `apps`
- [ ] T002 [P] Criar `backend/.importlinter` com contrato `layers` (apps → infrastructure → application → domain; shared na base) e contrato `independence` entre `judite.apps.api`, `judite.apps.workers`, `judite.apps.mcp`
- [ ] T003 [P] Criar `frontend/` (Vite 8 + React 19 + TypeScript ~6.0, ESLint com typescript-eslint, Vitest + Testing Library + jsdom) com `package.json`, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`
- [ ] T004 [P] Criar `.env.example` com todas as variáveis documentadas e marcadas OBRIGATÓRIA/opcional, e ampliar `.gitignore` (`.env`, `node_modules`, `dist`, `.venv`, caches)
- [ ] T005 Criar `Makefile` com alvos `up`, `down`, `ps`, `logs`, `check` (backend: ruff, mypy, lint-imports, pytest; frontend: eslint, tsc, vitest, build)

## Phase 2: Foundational

- [ ] T006 [P] Teste unitário de `Settings` falhando com o nome das variáveis ausentes em `backend/tests/unit/shared/test_config.py`
- [ ] T007 [P] Teste unitário do mediator (despacho por tipo, erro sem handler, erro em registro duplicado) em `backend/tests/unit/shared/test_mediator.py`
- [ ] T008 Implementar `Settings` (pydantic-settings, campos obrigatórios sem default) e mensagem de erro com variáveis ausentes em `backend/src/judite/shared/config.py`
- [ ] T009 [P] Implementar `Mediator`, `Request`, `Handler` em `backend/src/judite/shared/mediator.py`
- [ ] T010 [P] Implementar logging estruturado (structlog, JSON) em `backend/src/judite/shared/logging.py`

**Checkpoint**: fundação pronta; `make check` do backend passa.

## Phase 3: User Story 1 — Subir a plataforma inteira com um comando (P1) 🎯 MVP

**Goal**: `make up` sobe frontend, api, workers, mcp, migrate, Evolution API, Postgres e Redis
saudáveis.

**Independent Test**: `make up` + `make ps` com todos `healthy`.

- [ ] T011 [P] [US1] Teste de contrato de `GET /health` do api (200, `{"status":"ok"}`) em `backend/tests/contract/test_api_health.py`
- [ ] T012 [P] [US1] Teste de contrato de `GET /health` do mcp em `backend/tests/contract/test_mcp_health.py`
- [ ] T013 [P] [US1] Teste unitário do ciclo do worker (toca arquivo de vida e chama publicador de heartbeat) em `backend/tests/unit/apps/test_worker_loop.py`
- [ ] T014 [US1] Implementar app FastAPI com `/health` e composição (Settings, logging, mediator) em `backend/src/judite/apps/api/main.py`
- [ ] T015 [P] [US1] Implementar servidor MCP (`MCPServer`, streamable HTTP em `/mcp`, `custom_route` `/health`) em `backend/src/judite/apps/mcp/main.py`
- [ ] T016 [P] [US1] Implementar `RedisWorkerHeartbeat` (grava `judite:workers:heartbeat` com TTL `WORKER_HEARTBEAT_TTL_SECONDS`) em `backend/src/judite/infrastructure/redis/heartbeat.py`
- [ ] T017 [US1] Implementar loop do worker (heartbeat a cada `WORKER_HEARTBEAT_INTERVAL_SECONDS`, arquivo `/tmp/worker-alive`, desligamento limpo em SIGTERM) e healthcheck em `backend/src/judite/apps/workers/main.py`
- [ ] T018 [US1] Criar `backend/Dockerfile` (python:3.13-slim, uv, usuário não-root) usado por api, workers, mcp e migrate
- [ ] T019 [P] [US1] Criar `frontend/Dockerfile` (build Node 22 → nginx) e `frontend/nginx.conf` (SPA + proxy `/api/` → `api:8000`, `/health`)
- [ ] T020 [P] [US1] Criar `infra/postgres/init/01-evolution-db.sh` que cria o banco `evolution` na primeira inicialização
- [ ] T021 [US1] Criar `docker-compose.yml` com postgres, redis, evolution-api (v2.3.7), migrate, api, workers, mcp, frontend; healthchecks em todos; `depends_on` com condições; volumes nomeados; só frontend/api/mcp com `ports`; segredos com `${VAR:?}`
- [ ] T022 [US1] Validar US1 pelo quickstart (`make up`, `make ps` todos `healthy`, variável obrigatória ausente falha com nome dela, `make down`)

**Checkpoint**: plataforma sobe inteira; MVP da feature.

## Phase 4: User Story 2 — Ver o estado da plataforma no navegador (P2)

**Goal**: `GET /api/status` e página de status no frontend.

**Independent Test**: abrir `http://localhost:8080`, ver 6 componentes; parar workers e ver
"indisponível" em até 30 s.

- [ ] T023 [P] [US2] Teste unitário de `PlatformStatus` (`healthy` derivado; `detail` só quando `available = false`; um item por Component na ordem do enum) em `backend/tests/unit/domain/test_platform_status.py`
- [ ] T024 [P] [US2] Teste unitário do handler `GetPlatformStatus` com probes falsos (todos ok; um falha; um estoura timeout de 2 s; exceção vira indisponível sem vazar segredo) em `backend/tests/unit/application/test_get_platform_status.py`
- [ ] T025 [P] [US2] Teste de contrato de `GET /api/status` contra `contracts/status.openapi.yaml` com mediator falso em `backend/tests/contract/test_api_status.py`
- [ ] T026 [P] [US2] Testes de integração dos probes reais (Postgres e Redis via testcontainers; heartbeat presente/expirado; HttpProbe com servidor local) em `backend/tests/integration/test_probes.py`
- [ ] T027 [P] [US2] Implementar `Component`, `ComponentStatus`, `PlatformStatus` em `backend/src/judite/domain/platform/status.py`
- [ ] T028 [US2] Implementar port `HealthProbe` e `GetPlatformStatus` + handler (paralelo, timeout 2 s) em `backend/src/judite/application/platform/`
- [ ] T029 [P] [US2] Implementar `DatabaseProbe` (SELECT 1 + versão em `alembic_version`) em `backend/src/judite/infrastructure/db/probe.py`
- [ ] T030 [P] [US2] Implementar `RedisProbe` e `WorkerHeartbeatProbe` em `backend/src/judite/infrastructure/redis/probes.py`
- [ ] T031 [P] [US2] Implementar `HttpProbe` (Evolution `GET /`, mcp `GET /health`) em `backend/src/judite/infrastructure/http/probe.py`
- [ ] T032 [US2] Registrar probes e handler na composição e expor `GET /api/status` em `backend/src/judite/apps/api/`
- [ ] T033 [P] [US2] Teste da `StatusPage` (lista componentes; marca indisponível; mensagem quando a API falha) em `frontend/src/features/status/StatusPage.test.tsx`
- [ ] T034 [US2] Implementar cliente `frontend/src/api/status.ts` e `frontend/src/features/status/StatusPage.tsx` com polling a cada 10 s, e usar em `frontend/src/App.tsx`
- [ ] T035 [US2] Validar US2 pelo quickstart (página com 6 disponíveis; `docker compose stop workers` → indisponível em ≤ 30 s)

## Phase 5: User Story 3 — Dados persistentes e esquema automático (P3)

**Goal**: migrações Alembic aplicadas pelo serviço `migrate` antes do api; dados persistem.

**Independent Test**: `schema_version` aparece no status e permanece após `make down && make up`.

- [ ] T036 [P] [US3] Teste de integração da migração (upgrade head → downgrade base → upgrade head) em Postgres real em `backend/tests/integration/test_migrations.py`
- [ ] T037 [US3] Configurar Alembic async (`backend/alembic.ini`, `backend/migrations/env.py` lendo `DATABASE_URL` do Settings) e migração `0001_baseline` com `upgrade`/`downgrade` em `backend/migrations/versions/`
- [ ] T038 [US3] Ligar serviço `migrate` (`alembic upgrade head`) e `depends_on: service_completed_successfully` no `docker-compose.yml`
- [ ] T039 [US3] Validar US3 pelo quickstart (`schema_version` = `0001`; persiste após restart)

## Phase 6: Polish

- [ ] T040 [P] Atualizar `CLAUDE.md` e criar `README.md` com comandos (`make up/check`) e estrutura
- [ ] T041 Rodar `make check` completo (ruff, mypy, lint-imports, pytest unit+contract+integration, eslint, tsc, vitest, build) e corrigir

## Dependencies & Execution Order

- Setup (T001–T005) → Foundational (T006–T010) → US1 (T011–T022) → US2 e US3.
- US2 depende de US1 (api, compose). US3 depende de US1 (compose); US2 usa `schema_version`,
  mas trata `None`, então US2 e US3 podem andar em paralelo.
- Dentro de cada história: testes → domínio → application → infrastructure → apps → validação.
