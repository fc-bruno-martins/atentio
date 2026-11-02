# Backlog — Judite

Ordem por dependência e valor. Cada item vira uma feature `specs/NNN-nome/`.

| # | Feature | Valor | Depende de | Perguntas pendentes |
|---|---|---|---|---|
| 001 | **Fundação da plataforma em Docker** — frontend, backend, workers, mcp, Evolution API, PostgreSQL e Redis sobem com um comando, com healthchecks, esqueleto em camadas e migrações | Base de tudo | — | — |
| 002 | **Autenticação e perfis** — login na plataforma web, empresas isoladas, perfis admin e usuário | Acesso corporativo | 001 | — |
| 003 | **Conexão de números** — usuário conecta número via QR code (Evolution API); admin vê usuários e números | Espelhamento começa | 002 | — |
| 004 | **Captura de mensagens** — grupos e directs, enviadas e recebidas, a partir da conexão (webhook → fila → worker → banco) | "Não perder nada" | 003 | — |
| 005 | **Retenção configurável** — parâmetros do sistema pelo admin (padrão 7 dias) e expurgo automático | Privacidade e custo | 004 | Q18 |
| 006 | **Mídia em texto** — transcrição de áudio e leitura de imagem via OpenAI, com descarte do original | Agente entende mídia | 004 | Q18 |
| 007 | **MCP remoto autenticado** — conector para o Claude (Desktop, celular, web) com autenticação na plataforma e tools de leitura dos próprios dados | Perguntar ao Claude | 002, 004 | Q14, Q17 |
| 008 | **Agente interno** — OpenRouter com modelo, effort e prompt por usuário (admin); memória/resumo (mem0 ou similar) | Respostas agênticas | 007 | Q14 |
| 009 | **Deploy na VPS** — proxy reverso com TLS, domínio, backups e CI (obrigatório pela constitution; requer remote) | Produção | 001 | Q17 |
