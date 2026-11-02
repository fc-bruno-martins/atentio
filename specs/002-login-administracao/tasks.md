# Tasks: Login e administração da plataforma

**Input**: `specs/002-login-administracao/`. Testes obrigatórios por camada (constitution VI); TDD
recomendado. Cada tarefa cita os requisitos que cobre.

## Phase 1: Migração estrutural (sem funcionalidade nova)

**Checkpoint**: os cenários do quickstart da 001 passam na estrutura nova.

- [x] T001 Criar `apps/workers/` autônomo (`app/{core,domain,services,infrastructure,jobs}`, `main.py`, testes, `pyproject.toml`, `uv.lock`, `.importlinter`, Dockerfile com contexto na própria pasta), movendo loop, heartbeat e configuração própria (FR-029, FR-030, SC-007)
- [x] T002 Criar `apps/mcp/` autônomo (`app/{core,tools}`, `main.py`, testes, `pyproject.toml`, `uv.lock`, `.importlinter`, Dockerfile) (FR-029, FR-030, SC-007)
- [x] T003 Criar `apps/backend/` na estrutura do ADR 0007: `core/`, `domain/platform_status.py`, `domain/ports.py`, `services/platform_status.py` (sem mediator), `infrastructure/probes/`, `api/v1/endpoints/health.py` com `/health` e `/ready`, com teste de contrato de `/ready` em sucesso e em 503, migrações, testes e `.importlinter` (FR-029, FR-030, SC-007)
- [x] T004 Remover `apps/shared/`, `pyproject.toml`, `uv.lock`, `conftest.py` e `.importlinter` da raiz; ajustar `docker-compose.yml` e `Makefile` (`check` por serviço) (FR-029, FR-031)
- [x] T005 Substituir `apps/frontend/` por Next 16 + Tailwind 4 em `output: standalone`, Dockerfile Node 22, porta 3000 mapeada para `FRONTEND_PORT`, estrutura do ADR 0008 e regra de ESLint que barra import interno entre features, com teste da própria regra (FR-027, FR-031, FR-033)
- [x] T006 Copiar do DS tokens (`globals.css`), `Logo`, `components/ui` usados, `lib/utils`, tema claro e escuro com `next-themes`; registrar a origem no README do frontend (FR-027)
- [x] T007 Mover a página de status para `features/platform-status` e validar: `make check` e cenários do quickstart da 001 (FR-031, SC-006, SC-007)

## Phase 2: Fundação de identidade

- [x] T008 [P] Testes unitários de `Company`, `User`, `Invitation`, `Session`, `PasswordReset` e erros de domínio em `apps/backend/tests/unit/domain/` (FR-008, FR-016, FR-019)
- [x] T009 Implementar entidades, erros e ports em `apps/backend/app/domain/` (FR-008, FR-016, FR-019)
- [x] T010 Criar models e migração `0002_identity` (extensão `citext`, CHECK de `company_id`, índice parcial de convite pendente), com teste de upgrade, downgrade e upgrade (FR-018, FR-026)
- [x] T011 [P] Implementar repositories com mappers e testes de integração em Postgres real, incluindo filtro obrigatório por `company_id` (FR-021, FR-026, SC-004)
- [x] T012 [P] Implementar adapters `Argon2Hasher`, `TokenGenerator` e `RedisLoginThrottle` com testes (FR-003, FR-025, FR-026)
- [x] T013 Implementar `SmtpEmailSender` e templates em português de convite e recuperação; adicionar Mailpit ao Compose, com healthcheck e só em `127.0.0.1`; adicionar `PUBLIC_APP_URL` (FR-028, FR-032)
- [x] T014 Implementar em `api/v1/dependencies.py` e `errors.py`: `Actor`, `get_current_actor`, `require_platform_admin`, `require_company_admin`, e tradução de erros; `get_db` faz o commit na saída (FR-006, FR-007)

## Phase 3: US1 — Entrar e navegar conforme o perfil (P1) 🎯 MVP

- [x] T015 [P] [US1] Testes unitários de `AuthService`: sucesso, falhas com mesmo erro, conta e empresa inativas, bloqueio, expiração deslizante e logout (FR-001, FR-002, FR-003, FR-004, FR-005)
- [x] T016 [US1] Implementar `AuthService` e `cli.py` (`create-platform-admin`), com `make create-platform-admin` e testes do comando em sucesso e erro (e-mail duplicado, senha curta); Redis fora não impede login e gera log de aviso (FR-001, FR-003, FR-004, FR-005, FR-010)
- [x] T017 [US1] Testes de contrato e endpoints `auth/login`, `auth/logout`, `GET /me` com sucesso e erro, incluindo cliente com Bearer (FR-001, FR-002, FR-005, FR-007)
- [x] T018 [US1] Teste que percorre todas as rotas privadas e exige 401 sem sessão e 403 com perfil incorreto (FR-006, SC-003)
- [x] T019 [P] [US1] Testes de frontend em `features/auth` e `features/shared`: login, erro genérico, redirecionamento e menus por perfil (FR-006, FR-009)
- [x] T020 [US1] Implementar rota `api/[...path]` com cookie `httpOnly`, removendo o token das respostas ao navegador, com teste, `proxy.ts`, `features/auth`, tela de login, layout privado, `Sidebar` e `Header` adaptados em `components/layout`, menu por perfil em `features/shared` (FR-001, FR-006, FR-009, FR-027, SC-001)
- [x] T021 [US1] Validar US1 pelo quickstart (SC-001, SC-003)

## Phase 4: US2 — Empresas e status (P2)

- [x] T022 [P] [US2] Testes unitários de `CompanyService`: criar com convite, renomear, desativar encerrando sessões, reativar, e-mail em uso e falha no envio (FR-011, FR-012, FR-013)
- [x] T023 [US2] Implementar `CompanyService` e `InvitationService.create` (FR-011, FR-012, FR-013, FR-016)
- [x] T024 [US2] Testes de contrato e endpoints `/companies` e `/platform/status` com sucesso e erro (FR-011, FR-012, FR-031)
- [x] T025 [P] [US2] Teste que confirma que o administrador da plataforma não tem rota de conversas nem dados de empresa além do cadastro (FR-014)
- [x] T026 [US2] Implementar `features/companies` e a tela Empresas (lista, criar, renomear, ativar/desativar, aviso de falha no envio) e a tela Status de `features/platform-status` com polling de 10 s, com testes (FR-011, FR-012, FR-027, FR-031)
- [x] T027 [US2] Validar US2 pelo quickstart (SC-002, SC-005, SC-006)

## Phase 5: US3 — Usuários da empresa (P3)

- [x] T028 [P] [US3] Testes unitários de `InvitationService` (aceitar, expirado, usado, cancelado, empresa inativa, reenvio invalida link anterior, duplicidade) e `UserAdminService` (perfil, ativar, desativar, último admin, com trava da empresa contra concorrência testada em Postgres real) (FR-015, FR-016, FR-017, FR-018, FR-019, FR-020)
- [x] T029 [US3] Implementar `InvitationService` completo e `UserAdminService` (FR-015, FR-016, FR-017, FR-018, FR-019, FR-020)
- [x] T030 [US3] Testes de contrato e endpoints `/users`, `/company-invitations`, `/invitations/lookup` e `/invitations/accept` com sucesso e erro (FR-015, FR-016, FR-017)
- [x] T031 [US3] Testes de isolamento entre duas empresas em todas as rotas de empresa: leitura e escrita respondem 404 (FR-021, SC-004)
- [x] T032 [US3] Implementar `features/users` e `features/invitations`, com telas e testes (FR-015, FR-017, FR-027)
- [x] T033 [US3] Validar US3 pelo quickstart (SC-004, SC-005)

## Phase 6: US4 — Própria conta (P4)

- [x] T034 [P] [US4] Testes unitários de `AccountService` e `PasswordRecoveryService`: nome, troca de senha, sessões encerradas, resposta igual com envio em segundo plano, link expirado e usado (FR-022, FR-023, FR-024, FR-025)
- [x] T035 [US4] Implementar os services de conta e recuperação (FR-022, FR-023, FR-024)
- [x] T036 [US4] Testes de contrato e endpoints `/me`, `/me/password`, `/auth/password-recovery`, `/auth/password-reset` (FR-022, FR-023, FR-024)
- [x] T037 [US4] Implementar `features/account` e as telas Meu perfil, Esqueci a senha e Redefinir senha em `features/auth`, com testes (FR-022, FR-024, FR-027)
- [x] T038 [US4] Validar US4 pelo quickstart (FR-023, FR-024)

## Phase 7: Polish

- [x] T039 Atualizar `README.md`, `CLAUDE.md`, `.env.example` e o quickstart (incluindo os caminhos novos do status da 001) (FR-032)
- [x] T040 Rodar `make check` completo e todos os quickstarts (SC-006, SC-007)

## Dependencies

- Phase 1 → Phase 2 → US1 → US2 → US3 → US4 → Polish.
- US3 depende de US2 para existir empresa pela interface; US4 depende só de US1.

## Phase 8: Convergence

- [x] T041 Contar os 15 minutos de bloqueio a partir da 5ª falha em `RedisLoginThrottle`, com teste em Redis real, per FR-003 (contradicts)
- [x] T042 Traduzir violação de unicidade em convites e aceites simultâneos para erros de negócio, sem responder 500, com teste em Postgres real, per FR-016 e FR-018 (partial)
- [x] T043 Criar `apps/frontend/README.md` registrando a origem do Design System, per T006 (partial)
