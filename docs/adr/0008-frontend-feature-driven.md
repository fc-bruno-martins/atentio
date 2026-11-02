# 0008 — Frontend em Feature-Driven Architecture

- **Status**: aceito (2026-11-02)
- **Contexto**: o usuário escolheu a arquitetura orientada a features descrita em
  [Feature-Driven Architecture with Next.js](https://dev.to/rufatalv/feature-driven-architecture-with-nextjs-a-better-way-to-structure-your-application-1lph).
- **Decisão**: organizar `apps/frontend/src` por assunto de negócio:

  ```text
  src/
  ├── app/            # rotas e layouts do Next; páginas finas
  ├── components/     # UI genérica (ui/, layout/ e Logo), vinda do DS
  ├── features/
  │   ├── <feature>/
  │   │   ├── components/, hooks/, services/, types/   # só as necessárias
  │   │   └── index.ts   # API pública da feature
  │   └── shared/     # código de negócio usado por mais de uma feature
  ├── lib/            # utilitários e cliente HTTP
  ├── types/          # tipos globais
  └── proxy.ts
  ```

- **Regras**:
  1. Fora de uma feature, importar só de `@/features/<feature>` (o `index.ts`), nunca de arquivos
     internos. Verificado por ESLint.
  2. Dentro da feature, usar imports relativos.
  3. `components/` e `lib/` não importam `features/`.
  4. Páginas em `app/` só compõem features, sem regra de tela ou chamada direta à API.
  5. Testes ficam ao lado do código testado.
- **Adaptações do artigo**:
  - Só as subpastas necessárias, seguindo o "start minimal" do ADR 0007.
  - O `index.ts` exporta nomes explícitos, em vez de `export *`, e não expõe código que só roda no
    servidor, para não misturar código de servidor e de cliente.
  - Sem `next-auth`: a autenticação é a do backend (feature 002).
- **Consequências**: mais coesão e dependências explícitas, ao custo de manter os `index.ts`.
