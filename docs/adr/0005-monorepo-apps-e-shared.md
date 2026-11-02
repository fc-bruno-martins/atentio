# 0005 — Monorepo com `apps/` e `apps/shared/`

- **Status**: substituído pelo ADR 0007 (2026-11-02)
- **Contexto**: o usuário definiu `apps/backend`, `apps/frontend`, `apps/mcp` e `apps/workers`, com
  o código comum em `shared`.
- **Opções**: (a) pacote único, imagem única (ADR 0001); (b) uv workspace com um pacote por app e
  um pacote compartilhado.
- **Decisão**: (b). `pyproject.toml` na raiz declara o workspace (membros `apps/shared`, `apps/backend`,
  `apps/workers`, `apps/mcp`) com um único `uv.lock`. Pacotes: `judite_shared`, `judite_backend`,
  `judite_workers`, `judite_mcp`. Cada app tem Dockerfile próprio, com contexto de build na raiz.
  As migrações Alembic ficam em `apps/backend`; o serviço `migrate` usa a imagem do backend.
- **Consequências**: cada imagem leva só as dependências do seu app. Dependências de infraestrutura
  ficam em `judite_shared`, portanto chegam a todos os apps Python; extras podem separar isso se
  pesar. Fronteiras verificadas por import-linter com múltiplos pacotes raiz.
