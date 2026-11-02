# Data Model — 001 Fundação da plataforma em Docker

Sem tabelas de negócio. A migração inicial (`0001_baseline`) só estabelece a tabela
`alembic_version`, controlada pelo Alembic.

## Entidades de domínio (sem persistência)

### Component (enum)
`backend`, `database`, `queue`, `evolution_api`, `workers`, `mcp`.

### ComponentStatus (value object)
| Campo | Tipo | Regra |
|---|---|---|
| component | Component | obrigatório |
| available | bool | obrigatório |
| detail | str \| None | só quando `available = false`; mensagem curta, sem segredos |

### PlatformStatus (value object)
| Campo | Tipo | Regra |
|---|---|---|
| components | list[ComponentStatus] | um por Component, na ordem do enum |
| schema_version | str \| None | revisão Alembic aplicada; `None` se o banco estiver indisponível |
| checked_at | datetime (UTC) | momento da consulta |
| healthy | bool (derivado) | `true` se todos os componentes estão disponíveis |

## Chaves Redis
| Chave | Valor | TTL |
|---|---|---|
| `judite:workers:heartbeat` | ISO-8601 do último sinal | `WORKER_HEARTBEAT_TTL_SECONDS` (20 s) |
