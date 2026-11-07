# Backlog — Atentio

Ordem por dependência e valor. Cada item vira uma feature `specs/NNN-nome/`.

| # | Feature | Valor | Depende de | Perguntas pendentes |
|---|---|---|---|---|
| 001 | **Fundação da plataforma em Docker** — frontend, backend, workers, mcp, Evolution API, PostgreSQL e Redis sobem com um comando, com healthchecks, esqueleto em camadas e migrações | Base de tudo | — | — |
| 002 | **Autenticação e perfis** — login na plataforma web, empresas isoladas, perfis admin e usuário | Acesso corporativo | 001 | — |
| 003 | **Conexão de números** — até 2 números conectados por pessoa, via QR code (Evolution API); admin da empresa vê e desconecta números | Espelhamento começa | 002 | — |
| 004 | **Captura e Conversas** — grupos e directs, enviadas e recebidas (webhook → banco, ADR 0010), tela com filtro por período e expurgo de 7 dias | "Não perder nada" | 003 | — |
| 004b | **Análises** — selecionar período ou mensagens, escolher prompt e ver o resultado na plataforma, com a mesma base disponível ao Claude via MCP (opção C, resolve Q14) | Análise sob demanda | 004, 008 | Quem cria prompts |
| 005 | **Retenção configurável** — parâmetros do sistema pelo admin (padrão 7 dias) e expurgo automático | Privacidade e custo | 004 | Q18 |
| 006 | **Mídia em texto** — transcrição de áudio e leitura de imagem via OpenAI, com descarte do original | Agente entende mídia | 004 | Q18 |
| 007 | **MCP remoto autenticado** — feito localmente com token pessoal e tools de leitura (Claude Code e Desktop); falta OAuth e HTTPS para web e celular | Perguntar ao Claude | 002, 004 | Q17 |
| 008 | **Agente interno** — OpenRouter com modelo, effort e prompt por usuário (admin); memória/resumo (mem0 ou similar) | Respostas agênticas | 007 | Q14 |
| 009 | **Deploy na VPS** — proxy reverso com TLS, domínio, backups e CI (obrigatório pela constitution; requer remote) | Produção | 001 | Q17 |
| 010 | **Minha Atividade** — board pessoal de tarefas criadas a pedido da pessoa, com canal, conversa, contexto e acompanhamento | Nada fica sem dono | 004b, 008 | Tarefa sobrevive ao expurgo? |
