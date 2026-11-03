# Data Model — 003 Conexão de números

Migrações `0003_numbers` e `0004_number_reconciliation`, com `upgrade` e `downgrade`.

## whatsapp_numbers

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | PK |
| company_id | uuid | FK `companies`; obrigatório |
| owner_user_id | uuid | FK `users`; obrigatório |
| phone | text | E.164 sem `+`, vindo do WhatsApp |
| status | text | `connected` ou `disconnected` |
| status_changed_at | timestamptz | última mudança |
| instance_name | text, nulo | instância ativa na Evolution; nulo quando já removida |
| disconnect_reason | text, nulo | `owner`, `company_admin`, `phone`, `account_deactivated`, `company_deactivated` |
| disconnected_by | uuid, nulo | FK `users` |
| last_confirmed_at | timestamptz, nulo | última confirmação da situação |
| down_since | timestamptz, nulo | primeira verificação em que a conexão estava fora |

Índices: `UNIQUE (owner_user_id, phone)`; `UNIQUE (phone) WHERE status = 'connected'` (FR-005); `(company_id)`.

## connection_attempts

| Campo | Tipo | Regras |
|---|---|---|
| id | uuid | PK |
| company_id, user_id | uuid | FK; obrigatórios |
| instance_name | text | único; gerado pela plataforma, sem dado pessoal |
| status | text | `pending`, `connected`, `rejected`, `expired`, `cancelled` |
| failure | text, nulo | `number_in_use`, `limit_reached` |
| number_id | uuid, nulo | FK `whatsapp_numbers`, quando conectada |
| expires_at | timestamptz | criação + 5 minutos |
| instance_removed | boolean | instância de tentativa encerrada já removida da Evolution API |

## Regras

- `pending` → `connected` | `rejected` | `expired` | `cancelled`. Estados finais não mudam.
- Limite (FR-002): até 2 números conectados, com a linha da pessoa travada, reavaliado na leitura do
  QR. Cada pessoa tem só uma tentativa pendente: a nova cancela a anterior, para um QR abandonado não
  consumir o limite.
- Reconexão: telefone já registrado para a pessoa atualiza a mesma linha (FR-010).
- Queda: o número só é desconectado se seguir fora em duas verificações seguidas (25 s de tolerância),
  ou de imediato se a sessão foi encerrada (código 401). Quedas passageiras não exigem novo QR code.
- Desativação: marca os números como desconectados na mesma transação; a remoção da instância fica
  com a reconciliação.
