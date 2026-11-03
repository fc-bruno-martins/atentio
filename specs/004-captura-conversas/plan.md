# Implementation Plan: Captura de mensagens e tela de Conversas

**Branch**: `004-captura-conversas` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

## Summary

O webhook da Evolution grava a mensagem no Postgres de forma idempotente e responde. A reconciliação
habilita a captura nos números existentes, busca nomes de grupos e expurga o que venceu.

## Constitution Check

| Princípio | Como o plano atende | Status |
|---|---|---|
| I, II | Tradução do payload em `infrastructure`; rota fina; `MessageService` só com ports | ✅ |
| III | Só o backend grava; workers seguem chamando a reconciliação | ✅ |
| IV | Conversa e mensagem têm empresa e dono; consultas filtram pelo dono; expurgo de 7 dias | ✅ |
| V, VI | Migração `0005`; testes por camada, isolamento incluso | ✅ |

## Decisões

1. **Gravação direta no webhook, sem fila** (ADR 0010): idempotente e simples nesta escala.
2. **Nome do grupo depois, pela reconciliação**: `fetchAllGroups` falhou com número real; usamos
   `findGroupInfos` por grupo, com limite por rodada, sem atrasar o webhook.
3. **Habilitação sem QR**: `message_events_enabled` no número; a reconciliação chama `webhook/set`.
4. **Mensagens seguem fora da Evolution**: `DATABASE_SAVE_*` continuam falsos.

Tabelas em [data-model.md](./data-model.md).
