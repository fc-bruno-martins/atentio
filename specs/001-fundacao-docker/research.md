# Research — 001 Fundação da plataforma em Docker

Versões conferidas em PyPI, npm e Docker Hub em 2026-10-30.

## R1. Evolution API
- **Decision**: imagem `evoapicloud/evolution-api:v2.3.7` (última estável).
- **Rationale**: a tag `latest` aponta para `2.4.0-rc1` (release candidate); produção exige tag
  fixa e estável. Variáveis confirmadas na imagem: `SERVER_URL`, `SERVER_PORT` (8080),
  `AUTHENTICATION_API_KEY`, `DATABASE_PROVIDER=postgresql`, `DATABASE_CONNECTION_URI`,
  `DATABASE_CONNECTION_CLIENT_NAME`, `CACHE_REDIS_ENABLED`, `CACHE_REDIS_URI`,
  `CACHE_REDIS_PREFIX_KEY`, `CACHE_LOCAL_ENABLED`, `TELEMETRY_ENABLED`. A imagem roda as migrações
  Prisma na subida e tem `wget` para o healthcheck.
- **Alternatives**: `2.4.0-rc2` (instável); `atendai/evolution-api` (namespace antigo).

## R2. Organização dos pacotes Python
- **Decision**: uv workspace com `judite_shared` e um pacote por app (ADR 0005).
- **Rationale**: decisão do usuário por `apps/`, com a biblioteca em `apps/shared/`. O workspace mantém um único lock e
  imports diretos, sem publicar libs internas. O isolamento é verificado por import-linter.
- **Alternatives**: pacote único (ADR 0001, substituído).

## R3. SDK MCP
- **Decision**: `mcp==2.3.*`, `MCPServer` com `streamable_http_app()` e `custom_route("/health")`.
- **Rationale**: o conector remoto do Claude usa Streamable HTTP. Na 2.x, `FastMCP` foi renomeado
  para `MCPServer` (`mcp.server.mcpserver`). O construtor já aceita `auth_server_provider` e
  `token_verifier`, que serão usados na feature 007.
- **Alternatives**: `mcp<2` (API antiga, em fim de vida).

## R4. Workers
- **Decision**: processo asyncio com heartbeat no Redis; escolha da biblioteca de filas adiada
  para a feature 004.
- **Rationale**: nesta feature o worker não processa jobs; escolher a lib agora seria abstração
  especulativa.

## R5. TypeScript
- **Decision**: TypeScript `~6.0` (6.0.3).
- **Rationale**: `typescript-eslint` 8.72 exige `typescript <6.1`; o TS 7.0 ainda não é suportado.

## R6. Testes de integração
- **Decision**: `testcontainers` (PostgreSQL 17, Redis 7) nos testes `integration`, pulados com
  aviso quando não há Docker.
- **Rationale**: a constitution exige banco real; testcontainers dispensa ambiente pré-configurado.

## R7. Healthcheck dos workers
- **Decision**: o loop do worker toca um arquivo `/tmp/worker-alive` a cada ciclo; o healthcheck
  do container verifica se o arquivo tem menos de 30 s.
- **Rationale**: o worker não tem porta HTTP; o Compose precisa de um sinal local, independente do
  Redis (o status da plataforma usa o heartbeat do Redis).

## R8. Varredura de segredos
- **Decision**: `zricethezav/gitleaks:v8.30.1` via container no `make check` (SC-005).
- **Rationale**: não exige instalação local e fixa a versão.

## R9. Aprendizados da construção revertida
- Alembic: definir `path_separator = os` no `alembic.ini` (sem isso há DeprecationWarning).
- Testcontainers: importar de `testcontainers.community.postgres` e `.redis`.
- Alembic assíncrono usa `asyncio.run`: em teste async, chamar via `asyncio.to_thread`.
- `import-linter` exige `include_external_packages = True` para proibir pacotes externos.
- Frontend: declarar `/// <reference types="vite/client" />` para importar CSS no TypeScript.
- jsdom 30 depende de undici 8, que não roda no Node 20: fixado em `^29.1`.
- nginx responde 504 em `/api/` com o backend parado; o frontend trata como falha de consulta.
