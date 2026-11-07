# PRD — Atentio

> **Status:** visão do usuário + respostas de 2026-10-30. O P.O transforma este documento em
> backlog (`docs/backlog.md`) e specs. Só é requisito o que está escrito aqui ou nas specs.

> O produto se chamava Judite até 2026-11-03. Agora é multicanal: WhatsApp e Slack primeiro.

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
| — | Frontend | **Next.js**, com o Design System do `labs-feattech` (decisão de 2026-11-02, ADR 0006). |
| Q15 | Empresas | **Várias empresas isoladas (multi-tenant)**: cada empresa tem seus admins e usuários, sem enxergar as outras (decisão de 2026-11-02). |
| Q16a | Login | **E-mail e senha**, com recuperação de senha (decisão de 2026-11-02). |
| Q16b | Cadastro | Três perfis: **administrador da plataforma** cria empresas e o primeiro admin de cada uma, sem acesso às conversas; **admin da empresa** convida os próprios usuários; **usuário** (decisão de 2026-11-02). |
| — | Menus da 002 | Só o que já funciona. **Administrador da plataforma:** Empresas e Status. **Admin da empresa:** Usuários (convites, ativar e desativar). **Todos:** Meu perfil e alteração de senha. Números, Parâmetros e Modelos de IA entram com suas features (decisão de 2026-11-02). |

| Q14 | Agente | **Ambos**: a plataforma analisa com o agente interno e o MCP entrega dados ao Claude (opção C, 2026-11-02). |
| — | Conversas | Cada pessoa vê os próprios grupos e conversas na plataforma, com filtro por data, e analisa períodos ou mensagens selecionadas (2026-11-02). |
| — | Minha Atividade | Board pessoal de tarefas com canal de origem, conversa, contexto e acompanhamento. O agente só cria tarefas quando a pessoa pede; não há criação automática (2026-11-03). |
| — | Posicionamento | A Atentio apoia times de Customer Success, principalmente gestores, a não perder o relacionamento com o cliente (2026-11-07). |
| — | Conectores de entrada e de saída | Entrada: WhatsApp (ativo), Slack, Teams, Discord e ClickUp (em breve). Saída: Notion, Jira, ClickUp e Azure DevOps, por chamada de ferramenta MCP, em simulação (mock) por decisão do usuário. WhatsApp de saída fica bloqueado (ADR 0009). Publicação só com aprovação humana (ADR 0012, constitution 2.3.0) (2026-11-07). |
| — | Agente publicador | Último agente do pipeline. Propõe resumo e pendências, espera a revisão humana (aprovar, editar ou descartar) e só então publica nos conectores de saída (2026-11-07). |

## Perguntas em aberto

Escaladas ao usuário em 2026-10-30; nenhuma bloqueia a feature 001 (fundação em Docker).

- **Q17. Domínio e TLS na VPS:** já existe domínio? O conector MCP remoto do Claude exige HTTPS
  público.
- **Q18. Retenção dos derivados:** transcrições, textos de imagem e memórias/resumos (mem0) também
  expiram em 7 dias, junto com as mensagens?
