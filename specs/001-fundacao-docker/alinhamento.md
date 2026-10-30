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
