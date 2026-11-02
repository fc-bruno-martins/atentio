# Tasks: Fundação da plataforma em Docker

**Input**: `specs/001-fundacao-docker/` (plan.md, spec.md, research.md, data-model.md,
contracts/status.openapi.yaml, quickstart.md)

**Tests**: obrigatórios pela constitution (Princípio VI). Ficam dentro de cada história. TDD é
recomendado, sem cobertura mínima (constitution v1.1.0).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

- [x] T001 Criar `pyproject.toml` na raiz (uv workspace com `apps/shared`, `apps/backend`, `apps/workers`, `apps/mcp`; ruff, mypy strict, pytest com marcadores `unit`/`integration`/`contract`) e o `pyproject.toml` de cada membro, com deps fixadas do plan e subpacotes `kernel`, `domain`, `application`, `infrastructure` em `apps/shared/src/judite_shared/`
- [x] T002 [P] Criar `.importlinter` na raiz com contrato `layers` (`judite_shared`: infrastructure → application → domain → kernel), contrato `independence` entre `judite_backend`, `judite_workers`, `judite_mcp`, proibição de `judite_shared` importar apps, e proibição de frameworks em `domain`/`application`
- [x] T003 [P] Criar `apps/frontend/` (Vite 8 + React 19 + TypeScript ~6.0, ESLint com typescript-eslint, Vitest + Testing Library + jsdom) com `package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`
- [x] T004 [P] Criar `.env.example` com todas as variáveis documentadas e marcadas OBRIGATÓRIA/opcional (incluindo `BIND_ADDRESS=127.0.0.1`, `FRONTEND_PORT=8180`, `BACKEND_PORT=8100`, `MCP_PORT=8101`), e ampliar `.gitignore` (`.env`, `node_modules`, `dist`, `.venv`, caches)
- [x] T005 Criar `Makefile` com alvos `up`, `down`, `ps`, `logs`, `check` (Python em `apps/shared`, `apps/backend`, `apps/workers`, `apps/mcp`: ruff, mypy, lint-imports, pytest; `apps/frontend`: eslint, tsc, vitest, build; repositório: gitleaks v8.30.1 via container)

## Phase 2: Foundational

- [x] T006 [P] Teste unitário de `Settings` falhando com o nome das variáveis ausentes em `apps/shared/tests/unit/kernel/test_config.py`
- [x] T007 [P] Teste unitário do mediator (despacho por tipo, erro sem handler, erro em registro duplicado) em `apps/shared/tests/unit/kernel/test_mediator.py`
- [x] T008 Implementar `Settings` (pydantic-settings, campos obrigatórios sem default) e mensagem de erro com variáveis ausentes em `apps/shared/src/judite_shared/kernel/config.py`
- [x] T009 [P] Implementar `Mediator`, `Request`, `Handler` em `apps/shared/src/judite_shared/kernel/mediator.py`
- [x] T010 [P] Implementar logging estruturado (structlog, JSON) em `apps/shared/src/judite_shared/kernel/logging.py`

**Checkpoint**: fundação pronta; a parte Python do `make check` passa.

## Phase 3: User Story 1 — Subir a plataforma inteira com um comando (P1) 🎯 MVP

**Goal**: `make up` sobe frontend, backend, workers, mcp, Evolution API, Postgres e Redis saudáveis
(`migrate` entra na US3).

**Independent Test**: `make up` + `make ps` com todos `healthy`.

- [x] T011 [P] [US1] Teste de contrato de `GET /health` do backend (200, `{"status":"ok"}`) em `apps/backend/tests/contract/test_api_health.py`
- [x] T012 [P] [US1] Teste de contrato de `GET /health` do mcp em `apps/mcp/tests/contract/test_mcp_health.py`
- [x] T013 [P] [US1] Teste unitário do ciclo do worker (toca arquivo de vida e chama publicador de heartbeat) em `apps/workers/tests/unit/test_worker_loop.py`
- [x] T014 [US1] Implementar app FastAPI com `/health` e composição (Settings, logging, mediator) em `apps/backend/src/judite_backend/main.py`
- [x] T015 [P] [US1] Implementar servidor MCP (`MCPServer`, streamable HTTP em `/mcp`, `custom_route` `/health`) em `apps/mcp/src/judite_mcp/main.py`
- [x] T016 [P] [US1] Declarar a port `WorkerHeartbeatPublisher` em `apps/shared/src/judite_shared/application/platform/ports.py` (sem depender dos tipos de status) e implementar `RedisWorkerHeartbeat` (grava `judite:workers:heartbeat` com TTL `WORKER_HEARTBEAT_TTL_SECONDS`) em `apps/shared/src/judite_shared/infrastructure/redis/heartbeat.py`
- [x] T017 [US1] Implementar loop do worker (heartbeat a cada `WORKER_HEARTBEAT_INTERVAL_SECONDS`, arquivo `/tmp/worker-alive`, desligamento limpo em SIGTERM) e healthcheck em `apps/workers/src/judite_workers/main.py`
- [x] T018 [US1] Criar `apps/backend/Dockerfile`, `apps/workers/Dockerfile` e `apps/mcp/Dockerfile` (python:3.13-slim, uv, usuário não-root, contexto de build na raiz, instalando só o membro do workspace)
- [x] T019 [P] [US1] Criar `apps/frontend/Dockerfile` (build Node 22 → nginx) e `apps/frontend/nginx.conf` (SPA + proxy `/api/` → `backend:8000`, `/health`)
- [x] T020 [P] [US1] Criar `infra/postgres/init/01-evolution-db.sh` que cria o banco `evolution` na primeira inicialização
- [x] T021 [US1] Criar `docker-compose.yml` com postgres, redis, evolution-api (v2.3.7), backend, workers, mcp, frontend; healthchecks em todos; `depends_on` com condições; volumes nomeados; só frontend/backend/mcp com `ports`, publicadas em `${BIND_ADDRESS:-127.0.0.1}`; segredos com `${VAR:?}`
- [x] T022 [US1] Validar US1 pelo quickstart (`make up`, `make ps` todos `healthy`, medir o tempo até todos saudáveis ≤ 3 min com imagens baixadas (SC-001), variável obrigatória ausente falha com nome dela, `make down`)

**Checkpoint**: plataforma sobe inteira; MVP da feature.

## Phase 4: User Story 2 — Ver o estado da plataforma no navegador (P2)

**Goal**: `GET /api/status` e página de status no frontend.

**Independent Test**: abrir `http://localhost:8180`, ver 6 componentes; parar workers e ver
"indisponível" em até 30 s.

- [x] T023 [P] [US2] Teste unitário de `PlatformStatus` (`healthy` derivado; `detail` só quando `available = false`; um item por Component na ordem do enum) em `apps/shared/tests/unit/domain/test_platform_status.py`
- [x] T024 [P] [US2] Teste unitário do handler `GetPlatformStatus` com probes falsos (todos ok; um falha; um estoura timeout de 2 s; exceção vira indisponível sem vazar segredo) em `apps/shared/tests/unit/application/test_get_platform_status.py`
- [x] T025 [P] [US2] Teste de contrato de `GET /api/status` contra `contracts/status.openapi.yaml` com mediator falso, cobrindo sucesso e erro (handler falha → 500 sem detalhes internos), em `apps/backend/tests/contract/test_api_status.py`
- [x] T026 [P] [US2] Testes de integração dos probes reais (Postgres e Redis via testcontainers; heartbeat presente/expirado; HttpProbe com servidor local) em `apps/shared/tests/integration/test_probes.py`
- [x] T027 [P] [US2] Implementar `Component`, `ComponentStatus`, `PlatformStatus` em `apps/shared/src/judite_shared/domain/platform/status.py`
- [x] T028 [US2] Implementar ports `HealthProbe` e `SchemaVersionReader` e `GetPlatformStatus` + handler (paralelo, timeout 2 s) em `apps/shared/src/judite_shared/application/platform/`
- [x] T029 [P] [US2] Implementar `DatabaseProbe` (SELECT 1 + versão em `alembic_version`) em `apps/shared/src/judite_shared/infrastructure/db/probe.py`
- [x] T030 [P] [US2] Implementar `RedisProbe` e `WorkerHeartbeatProbe` em `apps/shared/src/judite_shared/infrastructure/redis/probes.py`
- [x] T031 [P] [US2] Implementar `HttpProbe` (Evolution `GET /`, mcp `GET /health`) em `apps/shared/src/judite_shared/infrastructure/http/probe.py`
- [x] T032 [US2] Registrar probes e handler na composição e expor `GET /api/status` em `apps/backend/src/judite_backend/`
- [x] T033 [P] [US2] Teste da `StatusPage` (lista componentes; marca indisponível; mensagem quando a API falha) em `apps/frontend/src/features/status/StatusPage.test.tsx`
- [x] T034 [US2] Implementar cliente `apps/frontend/src/api/status.ts` e `apps/frontend/src/features/status/StatusPage.tsx` com polling a cada 10 s, e usar em `apps/frontend/src/App.tsx`
- [x] T035 [US2] Validar US2 pelo quickstart (página com 6 disponíveis; `docker compose stop workers` → indisponível em ≤ 30 s)

## Phase 5: User Story 3 — Dados persistentes e esquema automático (P3)

**Goal**: migrações Alembic aplicadas pelo serviço `migrate` antes do backend; dados persistem.

**Independent Test**: `schema_version` aparece no status e permanece após `make down && make up`.

- [x] T036 [P] [US3] Teste de integração da migração (upgrade head → downgrade base → upgrade head) em Postgres real em `apps/backend/tests/integration/test_migrations.py`
- [x] T037 [US3] Configurar Alembic async (`apps/backend/alembic.ini`, `apps/backend/migrations/env.py` lendo `DATABASE_URL` do Settings) e migração `0001_baseline` com `upgrade`/`downgrade` em `apps/backend/migrations/versions/`
- [x] T038 [US3] Adicionar o serviço `migrate` (imagem do backend, `alembic upgrade head`) ao Compose e `depends_on: service_completed_successfully` no `docker-compose.yml`
- [x] T039 [US3] Validar US3 pelo quickstart (`schema_version` = `0001`; migração com falha impede o backend de ficar saudável e aparece no log; dado de teste no Postgres, chave no Redis e instância na Evolution API persistem após `make down && make up`)

## Phase 6: Polish

- [x] T040 [P] Atualizar `CLAUDE.md` e criar `README.md` com comandos (`make up/check`) e estrutura
- [x] T041 Rodar `make check` completo (ruff, mypy, lint-imports, pytest unit+contract+integration, eslint, tsc, vitest, build) e corrigir

## Dependencies & Execution Order

- Setup (T001–T005) → Foundational (T006–T010) → US1 (T011–T022) → US2 e US3.
- US2 depende de US1 (backend, compose). US3 depende de US1 (compose); US2 usa `schema_version`,
  mas trata `None`, então US2 e US3 podem andar em paralelo.
- `backend/` e `frontend/` na raiz são restos da construção revertida: removê-los antes de T001.
- Dentro de cada história: testes → domínio → application → infrastructure → apps → validação.
