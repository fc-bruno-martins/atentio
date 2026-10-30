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

## R2. Pacote Python único × um pacote por app
- **Decision**: um pacote `judite`, uma imagem, quatro comandos (api, workers, mcp, migrate).
- **Rationale**: a constitution permite que os apps compartilhem shared, domain e application;
  com um pacote só, isso é import direto, sem publicar libs internas. O isolamento entre apps é
  garantido por import-linter (contrato `independence`).
- **Alternatives**: uv workspace com 4 pacotes (mais build e versionamento sem ganho hoje).

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
