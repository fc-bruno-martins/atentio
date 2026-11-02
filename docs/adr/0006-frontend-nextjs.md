# 0006 — Frontend em Next.js

- **Status**: aceito (2026-11-02), substitui o ADR 0004
- **Contexto**: o usuário pediu o Design System do `labs-feattech`, que usa Next.js e Tailwind 4, e
  escolheu Next para o frontend. Um app desktop futuro continua possível.
- **Opções**: (a) Next.js; (b) manter React + Vite + nginx.
- **Decisão**: (a), em `apps/frontend`. A migração acontece na feature 002, junto com o DS.
- **Regras para não fechar a porta do desktop**:
  1. Regras de negócio e permissões ficam no backend, nunca no frontend.
  2. A autenticação do backend não fica presa ao navegador e aceita outros clientes.
  3. Componentes visuais não dependem de recursos do Next; estes ficam em rotas e middleware.
- **Consequências**: o container do frontend passa a rodar Node, e não mais nginx estático. Um app
  desktop abriria a plataforma da VPS (Electron ou Tauri). Empacotar a interface dentro do app
  exigiria exportação estática, com limitações.
