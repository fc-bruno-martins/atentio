# Atentio Frontend

Next.js com Feature-Driven Architecture (ADR 0008). Rode `make check` na raiz para validar.

```bash
npm ci
npm run dev
```

## Origem do Design System

Os tokens de `src/app/globals.css`, os componentes de `src/components/ui`, `src/components/brand` e
`src/lib/utils.ts` vieram do Design System do projeto `labs-feattech` (FR-027). `AppShell` foi
adaptado do `Sidebar` e do `Header` dele, sem as dependências de negócio daquele projeto.

São cópias, sem vínculo de versão: atualizações do DS original precisam ser trazidas manualmente.
