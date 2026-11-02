# Data Model — 002 Login e administração

Migração `0002_identity`, com `upgrade` e `downgrade`. Todas as tabelas têm `created_at` e
`updated_at`. IDs são UUID.

## companies
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | PK |
| name | text | obrigatório, 2–120 caracteres |
| is_active | bool | padrão `true` |

## users
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | PK |
| company_id | uuid \| null | FK companies; `null` só para `platform_admin` (CHECK) |
| email | citext | único em toda a plataforma |
| name | text | obrigatório, 2–120 caracteres |
| password_hash | text | Argon2id |
| role | enum | `platform_admin`, `company_admin`, `user` |
| is_active | bool | padrão `true` |

## invitations
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK companies |
| email | citext | índice único parcial enquanto pendente |
| role | enum | `company_admin` ou `user` |
| token_hash | text | SHA-256, único |
| expires_at | timestamptz | criação + 7 dias |
| status | enum | `pending`, `accepted`, `cancelled` |
| invited_by | uuid | FK users |
| last_send_failed_at | timestamptz \| null | falha no último envio |

Expirado é derivado de `expires_at`, não é um status gravado.

## sessions
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users, indexado |
| token_hash | text | SHA-256, único |
| expires_at | timestamptz | último uso + 12 horas |
| revoked_at | timestamptz \| null | encerramento |

## password_resets
| Campo | Tipo | Regra |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK users |
| token_hash | text | SHA-256, único |
| expires_at | timestamptz | criação + 1 hora |
| used_at | timestamptz \| null | uso único |

## Regras de domínio

- `User`: só `platform_admin` existe sem empresa; conta inativa não entra.
- `Company`: desativar não apaga dados.
- `Invitation`: aceitável só se pendente, dentro do prazo e com empresa ativa.
- Último admin: uma empresa mantém ao menos um `company_admin` ativo.

## Chaves Redis

| Chave | Valor | TTL |
|---|---|---|
| `judite:auth:failures:<sha256 do e-mail>` | contador | 15 min |
| `judite:workers:heartbeat` | último sinal | 20 s (contrato com workers) |
