# Tasks: Captura de mensagens e Conversas

- [x] T001 Criar `MESSAGE_RETENTION_DAYS`, migração `0005_messages`, models e entidades em `apps/backend/app/` (FR-001, FR-002)
- [x] T002 Traduzir o payload em `apps/backend/app/infrastructure/evolution_messages.py`, com testes de texto, mídia, grupo, LID, status e formato inválido (FR-003, FR-004)
- [x] T003 Implementar repositories com testes em Postgres real (FR-002, FR-007, FR-008)
- [x] T004 [US1] Implementar `MessageService.capture` e o evento no webhook, com testes (FR-001, FR-002, US1/AC4)
- [x] T005 [US1] Estender o gateway e a reconciliação: `webhook/set`, nome de grupo e expurgo, com testes (FR-005, FR-006, FR-007)
- [x] T006 [US2] Implementar endpoints `/conversations`, com contrato e isolamento (FR-008, FR-009, FR-010)
- [x] T007 [US2] Implementar `features/conversations`, a tela `conversas` e o menu, com testes (FR-010, FR-011)
- [x] T008 Registrar o ADR 0010, atualizar `docs/backlog.md` e `CLAUDE.md`, rodar `make check`
- [ ] T009 Validar com número real (SC-001)
