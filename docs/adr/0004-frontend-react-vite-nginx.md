# 0004 — Frontend React + Vite servido por nginx

- **Status**: aceito (2026-10-30)
- **Contexto**: o usuário trocou o app macOS por front web. A constitution manda o frontend falar
  só com o backend.
- **Decisão**: SPA React 19 + TypeScript 6.0 + Vite 8; build estático servido por nginx, que faz
  proxy de `/api/` para o backend (mesma origem, sem CORS). Testes com Vitest e Testing Library.
- **Alternativas**: Next.js (SSR desnecessário para painel autenticado); servir pelo FastAPI
  (acopla deploy do front ao backend).
- **Consequências**: a feature 009 coloca o proxy TLS na frente do nginx do frontend, do backend e
  do mcp.
