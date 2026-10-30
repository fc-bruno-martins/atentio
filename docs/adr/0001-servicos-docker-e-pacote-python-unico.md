# 0001 — Serviços em Docker Compose e pacote Python único

- **Status**: aceito (2026-10-30)
- **Contexto**: o usuário decidiu rodar tudo em Docker numa VPS, dividido em frontend, backend,
  workers e mcp, com Evolution API pela imagem oficial. A constitution permite que os apps
  compartilhem shared, domain e application.
- **Opções**: (a) um pacote Python e uma imagem com quatro comandos; (b) uv workspace com um
  pacote por app; (c) repositórios separados.
- **Decisão**: (a). `backend/` contém o pacote `judite`; o Compose define `api`, `workers`, `mcp` e
  `migrate` a partir da mesma imagem. Frontend em imagem própria (nginx). Evolution API
  `v2.3.7`, PostgreSQL 17 e Redis 7 completam a stack.
- **Consequências**: reuso por import direto e um único lock de dependências. O isolamento entre
  apps depende de import-linter. Se um app precisar de dependências pesadas próprias, avaliar
  extras do pyproject ou migrar para (b).
