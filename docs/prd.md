# PRD — Judite

> **Status:** visão do usuário + respostas de 2026-10-30. O P.O transforma este documento em
> backlog (`docs/backlog.md`) e specs. Só é requisito o que está escrito aqui ou nas specs.

## Visão

Plataforma **web corporativa** que se conecta à **Evolution API** (rodando neste repositório) para
**espelhar números de WhatsApp** dos usuários, sem perder nada, e expor esses dados ao **Claude**
via **servidor MCP**, para que o usuário identifique pontos de atenção ou de ação que deixou passar.

## Decisões do usuário (2026-10-30)

| # | Tema | Decisão |
|---|---|---|
| Q1 | Escrita | **Somente leitura** no MVP (não envia, não reage, não marca como lida). |
| Q2 | Usuários | Solução **corporativa web** (sem app macOS). Front web com **perfis de acesso**: o **admin** vê todos os usuários e números conectados; cada **usuário** vê só os próprios números. |
| Q3 | Histórico | Captura **a partir da conexão**; sem importar histórico anterior. |
| Q4 | Retenção | Mensagens guardadas por **7 dias**, prazo **configurável** em parâmetros do sistema administrados pelo admin. |
| Q5 | Mídia | Áudio **transcrito via OpenAI**; imagens **lidas e convertidas em texto**; o arquivo original é **descartado** depois da extração. |
| Q6 | Agente | Sem app desktop. Funciona como **assistente 100% agêntico** conectado às conversas. Pode usar **mem0** (ou similar) para resumir contextos. |
| Q7 | Gatilho | **Sob demanda, via MCP**: o usuário pergunta e o agente percorre grupos e mensagens dinamicamente. |
| Q8 | LLM | Via **OpenRouter**. O admin configura **por usuário**: modelo, effort/parâmetros e **prompt personalizado** além do padrão. |
| Q9 | MCP | O Claude acessa **só os dados das mensagens** (do próprio usuário). Exemplos: "tem alguma mensagem que eu não respondi hoje?", "resumo da conversa com Fulano", "resumo do grupo X". |
| Q10 | Cliente | Claude **Desktop, celular e web**, instalado como **conector MCP remoto**, com autenticação confirmada **dentro da plataforma**. |
| Q11 | Infra | Tudo em **Docker** numa **VPS**. Serviços: **frontend, backend, workers, mcp** (+ Evolution API e dependências). |
| Q12 | Riscos | Usuário **aceita** o risco da conexão não oficial (banimento) e o armazenamento de mensagens de terceiros. |
| Q13 | Evolution API | Usar a **imagem oficial** via Docker, sem fork. |

## Perguntas em aberto

Escaladas ao usuário em 2026-10-30; nenhuma bloqueia a feature 001 (fundação em Docker).

- **Q14. Agente interno × Claude:** quando o Claude pergunta via MCP, quem raciocina? (a) o MCP só
  entrega dados (listar conversas, buscar mensagens) e o próprio Claude analisa; (b) o MCP tem uma
  tool "perguntar" que aciona o **agente interno** (OpenRouter, modelo e prompt configurados pelo
  admin); (c) ambos. A configuração de modelo por usuário (Q8) sugere (b) ou (c).
- **Q15. Corporativo = uma empresa ou várias?** Uma única organização com vários usuários, ou
  multi-empresa (vários clientes isolados, cada um com seus admins)?
- **Q16. Login na plataforma web:** e-mail e senha próprios, ou SSO corporativo (Google Workspace,
  Microsoft Entra)? Quem cria os usuários: o admin convida, ou há cadastro aberto?
- **Q17. Domínio e TLS na VPS:** já existe domínio? O conector MCP remoto do Claude exige HTTPS
  público.
- **Q18. Retenção dos derivados:** transcrições, textos de imagem e memórias/resumos (mem0) também
  expiram em 7 dias, junto com as mensagens?
