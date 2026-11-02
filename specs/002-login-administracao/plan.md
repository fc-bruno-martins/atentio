# Implementation Plan: Login e administração da plataforma

**Branch**: `002-login-administracao` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

## Summary

Primeiro, migrar o código da 001 para serviços autônomos (ADR 0007) e o frontend para Next.js com o
DS do `labs-feattech` (ADR 0006), mantendo o comportamento. Depois, entregar em fatias verticais:
login e menus, empresas, usuários da empresa e conta. A autenticação usa sessões guardadas no banco,
revogáveis na hora. O backend aceita `Authorization: Bearer`; o Next guarda o token em cookie
`httpOnly` e encaminha as chamadas.

## Technical Context

**Language/Version**: Python 3.13; TypeScript ~6.0; Node 22 nas imagens

**Primary Dependencies**: backend: FastAPI, SQLAlchemy 2.1 async, Alembic, argon2-cffi 25, aiosmtplib
5, email-validator 2. Frontend: Next 16.4, Tailwind 4.3, Radix, class-variance-authority, lucide-react,
next-themes, TanStack Query 5, react-hook-form + zod

**Storage**: PostgreSQL 17 (tabelas novas em [data-model.md](./data-model.md)); Redis mantido

**Testing**: pytest (unit, integration, contract) por serviço; Vitest + Testing Library

**Target Platform**: Docker local; VPS na feature 009

**Project Type**: aplicação web com serviços auxiliares

**Performance Goals**: login em < 30 s de ponta a ponta (SC-001)

**Constraints**: serviços autônomos; isolamento por empresa; só `127.0.0.1` por padrão

**Scale/Scope**: 3 perfis, 5 tabelas, 18 rotas e 8 telas

## Constitution Check

| Princípio | Como o plano atende | Status |
|---|---|---|
| I. Clean, DDD, SOLID | `domain` puro, services só com ports, repositories convertem ORM ↔ domínio; import-linter por serviço | ✅ |
| II. Entrypoints finos | Endpoints só validam, chamam service e traduzem erros; commit em `get_db` | ✅ |
| III. Serviços autônomos | Cada serviço com pyproject, lock, testes e Dockerfile; sem workspace; frontend só fala com backend | ✅ |
| IV. Isolamento | `company_id` vem da sessão e é filtro obrigatório nos repositories de empresa; testes dedicados | ✅ |
| V. Repositories + Alembic | Migração `0002` com upgrade e downgrade | ✅ |
| VI. Testes por camada | Unit com fakes, integração com Postgres real, contrato com sucesso e erro por endpoint; testes do frontend ao lado do código | ✅ |

Exceção herdada: `/health` e `/ready` respondem sem service (ver Complexity Tracking).

## Project Structure

```text
apps/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── endpoints/    # auth, account, companies, users, invitations, platform, health
│   │   │   ├── dependencies.py
│   │   │   └── errors.py     # erros de domínio → HTTP
│   │   ├── core/             # config, database, logging, middleware, security
│   │   ├── domain/           # company, user, invitation, session, password_reset,
│   │   │                     # platform_status, errors, ports
│   │   ├── models/           # ORM: company, user, invitation, session, password_reset
│   │   ├── repositories/     # implementam os ports
│   │   ├── infrastructure/   # adapters: email SMTP, hasher, probes
│   │   ├── schemas/          # contratos HTTP
│   │   ├── services/         # auth, account, company, user_admin, invitation, platform_status
│   │   ├── cli.py            # create-platform-admin
│   │   └── main.py
│   ├── migrations/, tests/{unit,integration,contract}/
│   └── pyproject.toml, uv.lock, alembic.ini, .importlinter, Dockerfile
├── workers/
│   ├── app/{core,domain,services,infrastructure,jobs}/ + main.py
│   └── tests/, pyproject.toml, uv.lock, .importlinter, Dockerfile
├── mcp/
│   ├── app/{core,tools}/ + main.py
│   └── tests/, pyproject.toml, uv.lock, .importlinter, Dockerfile
└── frontend/
    └── src/
        ├── app/
        │   ├── (public)/     # login, esqueci-senha, redefinir-senha, convite
        │   ├── (private)/    # empresas, status, usuarios, perfil
        │   └── api/[...path]/ # encaminha ao backend com o token do cookie
        ├── components/{ui,layout}/  # vindos do DS
        ├── features/         # ADR 0008; cada uma com index.ts público
        │   ├── auth/         # login, logout, recuperação, sessão atual
        │   ├── invitations/  # aceite do convite
        │   ├── companies/
        │   ├── users/        # usuários e convites da empresa
        │   ├── account/
        │   ├── platform-status/
        │   └── shared/       # menu por perfil
        ├── lib/              # cliente HTTP, utils
        ├── types/
        └── proxy.ts          # bloqueio de rotas (nome conforme a versão do Next)
```

**Structure Decision**: `infrastructure/` é o único acréscimo ao ADR 0007: guarda adapters que não são
acesso a dados (SMTP, hash, probes), para que `repositories/` continue só com persistência. A raiz
mantém `docker-compose.yml`, `Makefile`, `.env.example` e `infra/`; `pyproject.toml`, `uv.lock`,
`conftest.py` e `.importlinter` da raiz saem.

## Decisões de design

1. **Sessão opaca no banco**, não JWT: token aleatório de 256 bits, guardado como SHA-256. A revogação
   vale na chamada seguinte (FR-004, FR-013, FR-020, SC-005). A expiração desliza a cada uso.
2. **Fluxo do token**: login no backend devolve o token; a rota do Next grava em cookie `httpOnly`,
   `SameSite=Lax` e `Secure` fora do ambiente local. Clientes não navegador usam o Bearer (FR-007).
3. **Autorização no backend**: dependências `require_platform_admin` e `require_company_admin`; o
   `proxy.ts` e os menus só melhoram a experiência.
4. **Isolamento**: `Actor` (id, perfil, `company_id`) nasce da sessão. Repositories de usuário e convite
   exigem `company_id` em toda consulta. Outra empresa responde 404 (FR-021).
5. **Bloqueio de login**: contador no Redis por hash do e-mail, com TTL de 15 minutos (FR-003). Com o
   Redis fora, o login continua funcionando e registra aviso.
6. **Último admin**: alterações travam a linha da empresa (`SELECT ... FOR UPDATE`) na transação.
   **Senhas**: Argon2id. Conta inexistente também executa um hash, para reduzir diferença de tempo.
7. **E-mail**: port `EmailSender`. Convites são enviados dentro do service, de forma síncrona: a falha
   não desfaz a transação, fica em `last_send_failed_at` e a tela avisa e permite reenvio. A
   recuperação de senha envia em segundo plano, depois da resposta, para o tempo não revelar se o
   e-mail existe. Fila entra na feature 004.
8. **Status**: `GET /api/v1/platform/status` exige administrador da plataforma; `/health` e `/ready`
   continuam públicos para o Compose.
9. **Heartbeat**: a chave `judite:workers:heartbeat` passa a ser um contrato entre serviços,
   declarada em cada um, porque não há código compartilhado.
10. **Frontend**: Feature-Driven Architecture (ADR 0008), com `no-restricted-imports` no ESLint
    barrando import de arquivo interno de outra feature.
11. **DS**: copiar tokens, `components/ui` necessários, `Logo`, e adaptar `Sidebar` e `Header` sem as
    dependências de negócio do labs-feattech (inbox, stores específicos).

## Migração da 001

Feita primeiro e validada antes de qualquer funcionalidade nova. Todo `mediator` sai;
`GetPlatformStatusHandler` vira `PlatformStatusService`; `apps/shared` é removido; `routes.py` passa a
usar o enum do domínio, em vez de repetir a lista; cada app ganha sua própria configuração.

## Complexity Tracking

| Violação | Por que é necessária | Alternativa rejeitada |
|---|---|---|
| `/health` e `/ready` sem service (Princípio II) | Sinais técnicos de infraestrutura, sem regra de negócio | Service dedicado acrescenta indireção sem benefício |
