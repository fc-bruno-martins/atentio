# ADR 0011: Conexões por canal, com o WhatsApp como visão

**Status**: aceito (2026-11-03)

## Contexto

O produto passa a ser multicanal, com a marca Atentio. O WhatsApp já tem dados reais e uma conexão ativa.

## Decisão

O banco passa a ter `channel_connections`, com `channel` e `external_account`, e conversas com `channel`
e `external_ref`. No código, `WhatsAppNumber` continua sendo a visão do canal WhatsApp, sobre a mesma
tabela. Cada canal novo terá adapter e repository próprios.

Identificadores internos passaram a Atentio em 2026-11-03: projeto Docker, volumes, banco, papel do
Postgres, chaves do Redis, cookie e cabeçalho do webhook.

## Consequências

- Rotas e telas de Números não mudam, e o risco da migração cai.
