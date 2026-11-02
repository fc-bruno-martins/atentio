# 0007 — Serviços autônomos com Clean Architecture simplificada

- **Status**: aceito (2026-11-02), substitui os ADRs 0002 e 0005
- **Contexto**: o usuário escolheu o padrão de [jmcmeen/python-backend](https://github.com/jmcmeen/python-backend)
  com adaptação para Clean Architecture, DDD e SOLID, mantendo a estrutura simples. Também decidiu
  abandonar `apps/shared`: backend, MCP e workers terão arquitetura própria, pois os repositórios
  podem ser separados.
- **Decisão**: cada serviço Python é autônomo (sem uv workspace), com pyproject, `uv.lock`, testes e
  Dockerfile próprios, e pacote `app/`. O mediator sai. Estrutura do backend:

  ```text
  apps/backend/
  ├── app/
  │   ├── api/v1/          # endpoints/ e dependencies.py
  │   ├── core/            # config, database, logging, middleware, security
  │   ├── domain/          # entidades, regras e ports (sem frameworks)
  │   ├── infrastructure/  # adapters que não são persistência (e-mail, hash, probes)
  │   ├── models/          # ORM
  │   ├── repositories/    # implementam os ports; convertem ORM ↔ domínio
  │   ├── schemas/         # contratos HTTP
  │   ├── services/        # casos de uso (só domain e ports)
  │   ├── utils/
  │   └── main.py
  ├── migrations/
  ├── tests/{unit,integration}/
  └── pyproject.toml, uv.lock, alembic.ini, Dockerfile
  ```

  `workers` e `mcp` seguem a mesma forma, só com as pastas necessárias. A camada de entrada é
  `app/jobs/` nos workers e `app/tools/` no mcp.
- **Consequências**: fronteiras verificadas por import-linter em cada serviço. Tipos e regras podem
  se repetir entre serviços, e isso é aceito. O `make check` percorre cada serviço. Como MCP e workers
  obtêm dados será decidido nas features 004 e 007, respeitando o backend como dono do esquema.
