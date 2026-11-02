# Alinhamento — 001 Fundação da plataforma em Docker

Revisão do Tech Lead sobre `spec.md` (2026-10-30). Status possíveis: `aberta`, `respondida`,
`escalada ao usuário`.

| # | Pergunta | Resposta | Status |
|---|---|---|---|
| A1 | A página de status fica sem login até a feature 002? | Sim. Não expõe dados de usuário, e o acesso nesta fase é local (deploy público é a 009). Registrado em Assumptions. | respondida |
| A2 | O MCP precisa de alguma tool nesta feature? | Não. Só sobe com healthcheck; tools e OAuth são da 007 (FR-012). | respondida |
| A3 | A Evolution API pode ficar exposta para o operador usar o painel dela? | Não. Fica só na rede interna (FR-011); conexão de números será pela plataforma (003). Para debug local, o operador pode abrir a porta por override. | respondida |
| A4 | Prazo de 3 minutos (SC-001) inclui o download das imagens? | Não; conta com imagens já baixadas. | respondida |

Nenhuma pergunta aberta. Perguntas de produto Q14–Q18 (PRD) não afetam esta feature.

## Rodada 2 (2026-10-30) — replanejamento após rollback da construção

| # | Pergunta | Resposta | Status |
|---|---|---|---|
| A5 | Onde ficam os serviços próprios no repositório? | Usuário: **backend, frontend e mcp ficam no diretório `apps/`** (`apps/backend`, `apps/frontend`, `apps/mcp`). Substitui a estrutura `backend/` + `frontend/` do plan e afeta o ADR 0001 (pacote único). | respondida |
| A6 | Os **workers** também ficam em `apps/` (`apps/workers`) ou dentro de `apps/backend`? | Usuário: `apps/workers`. | respondida |
| A7 | O código compartilhado entre backend, mcp e workers (shared + domínio + application + infrastructure) fica num pacote próprio fora de `apps/` (ex.: `packages/core`, num uv workspace)? | Usuário: `apps/shared/` (confirmado). | respondida |
| A8 | Construção feita antes da aprovação foi revertida a pedido do usuário. A partir daqui, o código só começa com **aprovação explícita** do usuário sobre spec, plan e tasks? | Usuário: sim. | respondida |
| A9 | Achado da construção: heartbeat com TTL 30 s + polling de 10 s do front pode levar 40 s para mostrar falha, violando SC-003 (30 s). Proposta: heartbeat a cada 5 s, TTL 20 s. | Proposta do Tech Lead; entra no plan revisado. | respondida |
| A10 | `apps/shared/` passa a conter domain, application e infrastructure, mas a constitution dizia que `shared` não tem regra de negócio. Como conciliar? | Tech Lead + Arquiteto: o diretório `apps/shared/` é o pacote compartilhado; os utilitários técnicos viram a camada `kernel` dentro dele. Emenda v1.1.0 da constitution aprovada pelo usuário. | respondida |
| A11 | Política de testes (TEST_POLICY)? | Usuário: TDD recomendado, sem cobertura mínima; os testes por camada seguem obrigatórios. | respondida |
| A12 | `backend/` e `frontend/` da construção revertida: guardar ou apagar? | Usuário: apagar. A remoção foi bloqueada pela permissão do Claude Code; execução manual pendente. | respondida |
| A13 | CI exigido pela constitution, mas o repositório não tem remote. Corrigir como? | Usuário: rodar tudo localmente primeiro. CI adiado até a feature 009; constitution v1.2.0 aprovada pelo usuário. | respondida |
| A14 | Portas 8080 e 8000 ocupadas na máquina local. | Tech Lead + Arquiteto: padrões 8180, 8100 e 8101, publicados em `127.0.0.1`. | respondida |
