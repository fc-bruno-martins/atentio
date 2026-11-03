# Tasks: Conexão de números de WhatsApp

**Input**: `specs/003-conexao-numeros/`. Testes obrigatórios por camada (constitution VI); TDD
recomendado. Evolution API com dublê nos testes automáticos.

## Phase 1: Setup

- [x] T001 Adicionar `EVOLUTION_WEBHOOK_SECRET`, `INTERNAL_API_TOKEN` e `BACKEND_URL` dos workers em `.env.example` e `docker-compose.yml`, e declarar `DATABASE_SAVE_DATA_*` falsos na `evolution-api` (FR-020)
- [x] T002 [P] Adicionar as configurações novas em `apps/backend/app/core/config.py` e `apps/workers/app/core/config.py`, com teste de variável ausente

## Phase 2: Foundational

- [x] T003 [P] Testes unitários de `WhatsAppNumber` e `ConnectionAttempt` (transições, estados finais, `confirmed` com 2 minutos, normalização do telefone) em `apps/backend/tests/unit/domain/test_number.py` (FR-008)
- [x] T004 Implementar entidades, erros e ports `NumberRepository`, `AttemptRepository` e `WhatsAppGateway` em `apps/backend/app/domain/number.py` e `apps/backend/app/domain/ports.py` (FR-007, FR-008)
- [x] T005 Criar models e migração `0003_numbers` com `UNIQUE (owner_user_id, phone)` e `UNIQUE (phone) WHERE status = 'connected'`, com teste de upgrade, downgrade e upgrade, em `apps/backend/app/models/numbers.py` e `apps/backend/migrations/versions/` (FR-005)
- [x] T006 Implementar repositories com filtro por dono e por empresa e testes em Postgres real em `apps/backend/app/repositories/numbers.py` e `apps/backend/tests/integration/test_number_repositories.py` (FR-014, FR-016)
- [x] T007 Implementar `EvolutionGateway` e testes com servidor HTTP dublê, incluindo teste que barra rotas de envio, chat e leitura de mensagens, em `apps/backend/app/infrastructure/evolution.py` e `apps/backend/tests/unit/test_evolution_gateway.py` (FR-007, SC-004)
- [x] T008 Implementar `require_company_member` em `apps/backend/app/api/v1/dependencies.py`, recusando administrador da plataforma, e classificar as rotas novas em `apps/backend/tests/contract/test_access_control.py` (FR-017)

## Phase 3: US1 — Conectar um número (P1) 🎯 MVP

**Independent Test**: conectar um número pelo QR e vê-lo conectado.

- [x] T009 [P] [US1] Testes unitários de `NumberService`: iniciar, limite de 2 com conectados e pendentes, QR só de quem iniciou, cancelar, Evolution indisponível em `apps/backend/tests/unit/services/test_numbers.py` (FR-001, FR-002, FR-021)
- [x] T010 [P] [US1] Testes unitários de `NumberSyncService`: conexão confirmada, telefone lido da instância, reconexão na mesma linha, número em uso sem revelar o dono, limite reavaliado em `apps/backend/tests/unit/services/test_number_sync.py` (FR-002, FR-005, FR-010)
- [x] T011 [US1] Implementar `NumberService` em `apps/backend/app/services/numbers.py` (FR-001, FR-002, FR-006, FR-021)
- [x] T012 [US1] Implementar `NumberSyncService.handle_event` em `apps/backend/app/services/number_sync.py` (FR-002, FR-005, FR-010)
- [x] T013 [US1] Testes de contrato e endpoints `/numbers` e `/numbers/connections`, com `Cache-Control: no-store`, em `apps/backend/app/api/v1/endpoints/numbers.py` e `apps/backend/tests/contract/test_numbers.py` (FR-001, FR-002, FR-014, FR-021)
- [x] T014 [US1] Testes de contrato e endpoint do webhook com segredo em tempo constante, recusa sem segredo e evento desconhecido ignorado, em `apps/backend/app/api/v1/endpoints/internal.py` e `apps/backend/tests/contract/test_internal.py` (FR-009)
- [x] T015 [P] [US1] Testes de frontend do fluxo de conexão: aviso, QR, renovação, sucesso, limite e recusa, em `apps/frontend/src/features/numbers/` (FR-003, FR-004)
- [x] T016 [US1] Implementar `features/numbers`, a tela `app/(private)/numeros` com polling de 3 s e o item Números no menu em `apps/frontend/src/features/shared/` (FR-001, FR-003, FR-004, FR-019)

## Phase 4: US2 — Acompanhar e desconectar (P2)

**Independent Test**: desconectar pelo celular, ver a queda, reconectar e desconectar pela plataforma.

- [x] T017 [P] [US2] Testes unitários de desconexão pelo dono e de `NumberSyncService.reconcile`: expira tentativas, confirma situação, tolera queda passageira, remove instâncias, não altera com Evolution fora, idempotente, em `apps/backend/tests/unit/services/test_number_sync.py` (FR-006, FR-009, FR-011)
- [x] T018 [US2] Implementar desconexão e reconciliação em `apps/backend/app/services/numbers.py` e `apps/backend/app/services/number_sync.py` (FR-006, FR-009, FR-011)
- [x] T019 [US2] Testes de contrato e endpoints `POST /numbers/{id}/disconnect` e `POST /internal/numbers/reconcile` em `apps/backend/app/api/v1/endpoints/` (FR-009, FR-011)
- [x] T020 [P] [US2] Testes e implementação do job `reconcile_numbers` a cada 30 s, com port e `backend_client`, sem derrubar o loop em falha, em `apps/workers/app/jobs/` e `apps/workers/app/infrastructure/` (FR-009, ADR 0009)
- [x] T021 [US2] Mostrar situação, momento, não confirmado e motivo, com reconectar e desconectar com confirmação, em `apps/frontend/src/features/numbers/`, com testes (FR-008, FR-010, FR-011)

## Phase 5: US3 — Admin acompanha os números (P3)

**Independent Test**: com duas empresas, cada admin vê e desconecta só os números da própria.

- [x] T022 [P] [US3] Testes unitários de listagem e desconexão pelo admin, com registro de quem desconectou, em `apps/backend/tests/unit/services/test_numbers.py` (FR-012, FR-015)
- [x] T023 [US3] Implementar `CompanyNumberService` em `apps/backend/app/services/numbers.py` (FR-012, FR-015, FR-018)
- [x] T024 [US3] Marcar números como desconectados e cancelar tentativas pendentes ao desativar conta ou empresa em `apps/backend/app/services/users.py` e `apps/backend/app/services/companies.py`, com testes de reativação (FR-013, SC-005)
- [x] T025 [US3] Testes de contrato e endpoints `/company-numbers` em `apps/backend/app/api/v1/endpoints/company_numbers.py` (FR-012, FR-015, FR-018)
- [x] T026 [US3] Testes de isolamento entre pessoas e empresas em todas as rotas de número, leitura e escrita respondendo 404, em `apps/backend/tests/contract/test_number_isolation.py` (FR-016, SC-003)
- [x] T027 [US3] Implementar `features/company-numbers`, a tela `app/(private)/numeros-da-empresa` e o item de menu só para admin da empresa, com testes (FR-015, FR-019)

## Phase 6: Polish

- [x] T028 Atualizar `README.md`, `CLAUDE.md`, `docs/backlog.md` e mudar o ADR 0009 para aceito
- [x] T029 Rodar `make check`, reconstruir os serviços e validar com dublê os passos do quickstart que não exigem número real
- [ ] T030 Validar com o usuário o quickstart com número real, registrando em `research.md` o formato de `ownerJid` e o `statusReason` observados, e ajustar o que divergir (SC-001, SC-002, SC-004, SC-005)

## Dependencies

- Setup → Foundational → US1 → US2 → US3 → Polish.
- US2 depende de US1 para existir número. T024 depende da reconciliação da US2 para encerrar a
  instância, por isso a desativação fica depois dela.
- Dentro de cada história: testes → services → endpoints → frontend.
- T030 exige número real e o usuário, e é o único bloqueio externo.

## Implementation Strategy

Entregar a US1 primeiro e validar com número real antes de seguir, porque ela confirma os pontos
não verificados na sondagem. Paralelizáveis: tarefas marcadas com `[P]`.
