# Judite

Plataforma web que espelha números de WhatsApp via Evolution API e expõe os dados ao Claude por um
servidor MCP. Visão e decisões: `docs/prd.md`. Backlog: `docs/backlog.md`.

## Rodar localmente

Pré-requisito: Docker com Compose v2.

```bash
cp .env.example .env   # preencha as variáveis OBRIGATÓRIAS
make up                # constrói e sobe tudo, aguardando os serviços ficarem saudáveis
make create-platform-admin EMAIL=voce@empresa.com NAME="Seu Nome"   # pede a senha
```

| Serviço | Endereço |
|---|---|
| Plataforma | http://localhost:8180 |
| E-mails locais (Mailpit) | http://localhost:8125 |
| Backend | http://localhost:8100/health |
| MCP | http://localhost:8101/mcp |

Postgres, Redis e Evolution API ficam só na rede interna. As portas são configuráveis no `.env`.

Outros comandos: `make ps`, `make logs` e `make down` (os dados persistem nos volumes).

## Desenvolvimento

Pré-requisitos: [uv](https://docs.astral.sh/uv/), Node 20.19+ e pnpm.

`make check` percorre cada serviço e roda lint, type-check, regras de arquitetura, testes, build e
varredura de segredos.

```text
apps/
├── backend/    # FastAPI, domínio de identidade e migrações Alembic
├── frontend/   # Next.js em Feature-Driven Architecture
├── mcp/        # servidor MCP remoto
└── workers/    # processo em segundo plano
```

Cada serviço é autônomo. Os padrões estão no `CLAUDE.md` e em `docs/adr/`.
