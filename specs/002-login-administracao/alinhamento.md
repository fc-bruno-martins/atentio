# Alinhamento — 002 Login e administração da plataforma

Revisão do Tech Lead sobre `spec.md` (2026-11-02). Status: `aberta`, `respondida`,
`escalada ao usuário`.

| # | Pergunta | Resposta | Status |
|---|---|---|---|
| B1 | Uma empresa ou várias? | Usuário: várias, isoladas. | respondida |
| B2 | Como entrar? | Usuário: e-mail e senha, com recuperação. | respondida |
| B3 | Quem cria empresas e usuários? | Usuário: administrador da plataforma cria empresas e o primeiro admin; admin da empresa convida. | respondida |
| B4 | Menus desta entrega? | Usuário: só o que já funciona. | respondida |
| B5 | O que fazer com o código da 001? | Usuário: não commitar; reestruturar direto. Sem ponto de restauração da 001. QA e GO/NO-GO cobrem 001 + 002. | respondida |
| B6 | Convite e recuperação exigem e-mail: qual serviço? | Tech Lead + Arquiteto: Mailpit local e SMTP por ambiente; provedor de produção na feature 009. | respondida |
| B7 | Como nasce o primeiro administrador da plataforma? | Tech Lead + Arquiteto: comando no servidor (FR-010), sem tela pública. | respondida |
| B8 | Prazos e regras de senha, sessão e convite | Usuário aprovou os padrões em Assumptions. | respondida |
| B9 | E-mail único em toda a plataforma é aceitável? | Usuário aprovou. | respondida |
| B10 | Arquitetura do frontend | Usuário: Feature-Driven Architecture do artigo indicado. ADR 0008 e constitution v2.2.0. | respondida |
