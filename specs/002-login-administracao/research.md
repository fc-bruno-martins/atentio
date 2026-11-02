# Research — 002 Login e administração

Versões conferidas em 2026-11-02.

- **R1. Sessão opaca × JWT**: sessão no banco, porque a spec exige revogação imediata (FR-013, FR-020).
  JWT exigiria lista de revogação, e o ganho de não consultar o banco é irrelevante nesta escala.
- **R2. Argon2id** (`argon2-cffi` 25): recomendação atual para senhas.
- **R3. E-mail**: `aiosmtplib` 5 atrás do port `EmailSender`; Mailpit `v1.33` no ambiente local.
- **R4. Next 16.4**: suporta Node ≥ 20.9. Nas versões novas, o `middleware.ts` pode se chamar
  `proxy.ts`; a tarefa confere isso na instalação.
- **R5. DS**: `labs-feattech` usa Tailwind 4, Radix e `class-variance-authority`. Lucide e zod têm
  majors novos em relação ao projeto de origem; a tarefa confere os componentes copiados.
- **R6. Fontes**: Inter Tight e Geist Mono via `next/font/google`, como no DS. A fonte é baixada no
  build e fica embutida; a aplicação não depende do Google em execução.
- **R7. Serviços autônomos**: cada um tem `uv.lock` próprio e contexto de Docker na própria pasta.
- **Herdado da 001**: `apps/frontend` pinava jsdom 29 por compatibilidade com Node 20; manter.

## Desvios e aprendizados da construção

- `react-hook-form` e `zod` não foram usados: formulários simples com validação no backend bastam.
- Workers não têm `services/`: o único caso é o job de heartbeat (só as pastas necessárias, ADR 0007).
- FastAPI 0.162: `get_db` usa `Depends(..., scope="function")`. Sem isso, o commit pode ocorrer depois
  de a resposta sair, e a chamada seguinte não enxerga a sessão.
- `session_scope` é gerenciador de contexto: `async for` sobre gerador não propaga a exceção do
  endpoint, deixando o rollback pendente e a conexão aberta. Os testes detectaram isso.
- Next 16 usa `src/proxy.ts`, com função `proxy`.
- Mailpit local na porta 8125, porque a 8025 está em uso na máquina de desenvolvimento.
- O `email-validator` recusa domínios reservados como `.test`.
