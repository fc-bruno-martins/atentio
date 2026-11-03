# Implementation Plan: Conexão de números de WhatsApp

**Branch**: `003-conexao-numeros` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

## Summary

A pessoa inicia uma tentativa, recebe o QR e a tela consulta o resultado. A Evolution API avisa a
conexão por webhook, e o backend lê o telefone, aplica as regras e registra o número. Um job dos
workers chama a reconciliação do backend a cada 30 s, cobrindo webhooks perdidos, tentativas
expiradas e remoção de instâncias. Nada é enviado ao WhatsApp.

## Technical Context

**Language/Version**: Python 3.13; TypeScript ~6.0

**Primary Dependencies**: as atuais; `httpx` passa a ser usado pelos workers. Sem dependência nova
no frontend

**Storage**: PostgreSQL (tabelas em [data-model.md](./data-model.md)); QR não é guardado

**Testing**: pytest por serviço, Vitest; Evolution API com dublê, número real só no quickstart

**Target Platform**: Docker local; VPS na feature 009

**Project Type**: aplicação web com serviços auxiliares

**Performance Goals**: mudança de situação em até 1 minuto; conexão em menos de 2 minutos

**Constraints**: somente leitura; isolamento por empresa e dono; Evolution sem porta publicada

**Scale/Scope**: 2 tabelas, 2 migrações, 9 rotas e 2 telas

## Constitution Check

| Princípio | Como o plano atende | Status |
|---|---|---|
| I. Clean, DDD, SOLID | `domain/number.py` puro; port `WhatsAppGateway`; adapter em `infrastructure/` | ✅ |
| II. Entrypoints finos | Rotas, webhook e job só traduzem e chamam service | ✅ |
| III. Serviços autônomos | Workers usam HTTP, sem importar código nem tocar no esquema (ADR 0009) | ✅ |
| IV. Isolamento | Consultas filtram por dono ou empresa; testes de isolamento em todas as rotas | ✅ |
| V. Repositories + Alembic | Migração `0003` com upgrade e downgrade | ✅ |
| VI. Testes por camada | Unit com fakes, integração em Postgres real, contrato com sucesso e erro | ✅ |

## Project Structure

```text
apps/backend/app/
├── api/v1/endpoints/   # numbers, company_numbers, internal
├── domain/             # number.py; ports: NumberRepository, AttemptRepository, WhatsAppGateway
├── infrastructure/     # evolution.py
├── models/             # numbers.py
├── repositories/       # numbers.py
├── schemas/            # numbers.py
└── services/           # numbers.py (dono e admin), number_sync.py (webhook e reconciliação)
apps/workers/app/
├── domain/ports.py     # NumberReconciler
├── infrastructure/     # backend_client.py
└── jobs/               # reconcile_numbers.py
apps/frontend/src/
├── app/(private)/      # numeros, numeros-da-empresa
└── features/           # numbers, company-numbers
```

## Decisões de design

1. **Somente leitura pelo desenho**: o port `WhatsAppGateway` só tem criar, consultar QR, consultar
   instância, encerrar e remover. Um teste barra rotas `/message`, `/chat` e semelhantes no adapter.
   Instâncias são criadas com `readMessages`, `readStatus`, `alwaysOnline` e `rejectCall` falsos.
2. **Webhook**: rota interna com segredo próprio (`EVOLUTION_WEBHOOK_SECRET`), comparado em tempo
   constante. Assina só os eventos de conexão. Mensagens ficam para a 004.
3. **Telefone lido de `fetchInstances`**, não do evento, para depender menos do formato do webhook.
4. **Conexão confirmada**: com a pessoa travada, reavalia limite e posse. Se recusar, encerra a
   instância e grava `failure`, sem revelar o dono.
5. **Reconciliação idempotente**: expira tentativas, confirma situações e remove instâncias de
   números desconectados. Se a Evolution estiver fora, não altera situações.
6. **Desativação sem chamada externa na transação**: `UserAdminService` e `CompanyService` só marcam
   os números. A reconciliação encerra a instância em até 30 s, atendendo SC-005.
   Quedas exigem duas verificações seguidas, para reinícios não forçarem novo QR, e instâncias que
   não puderam ser removidas ficam marcadas para a próxima rodada. Um número que passa da tolerância
   tem a instância removida, então voltar exige novo QR.
7. **`confirmed`**: falso se `last_confirmed_at` tiver mais de 2 minutos.
8. **QR só para quem iniciou**: rota filtra por `user_id`, resposta com `Cache-Control: no-store`, e
   o QR nunca entra em banco ou log.

## Complexity Tracking

Sem violações.
