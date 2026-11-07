# Feature Specification: Atentio multicanal

**Feature Branch**: `007-omnichannel`

**Created**: 2026-11-03

**Status**: Aprovada pelo usuário ("comece toda a implementação ominichannel")

**Input**: "converter esse projeto para que ele seja multi-canal. Whatsapp, Slack, Teams, Discord ou MCP para capturar tasks ou menções em outros sistemas. Por hora vamos conectar apenas com Whatsapp e Slack."

O produto passa a se chamar **Atentio** (`atentio.ai`).

## Escopo por fase

- **Fase 1 (esta)**: marca Atentio e modelo de dados por canal, com o WhatsApp funcionando igual.
- **Fase 2**: conexão e captura do Slack, com menções.
- **Depois**: Teams, Discord e MCP como fonte. Só o modelo fica pronto; não há código deles.

## Requirements

- **FR-001**: Todo texto visível MUST usar a marca Atentio, sem marca Featcode.
- **FR-002**: Conexões, conversas e mensagens MUST registrar o canal de origem.
- **FR-003**: Dados e conexões já existentes do WhatsApp MUST permanecer, sem novo QR code.
- **FR-004**: Um mesmo identificador externo só é único dentro do canal.
- **FR-005**: As telas de Números, Conversas e Análises MUST continuar funcionando.
- **FR-006**: A migração MUST ter `upgrade` e `downgrade` sem perda de dados.

## Assumptions

- "Tasks" fica em aberto: pode ser extraída de mensagens ou vir de sistemas externos. Pergunta ao usuário.
- Identificadores internos também passam a Atentio, a pedido do usuário em 2026-11-03.
- As cores do Design System continuam; identidade visual própria é decisão futura.

## Organização por canal (2026-11-03)

- **FR-007**: O menu MUST organizar por canais, sem termos exclusivos do WhatsApp: Canais, Canais da empresa e Conversas.
- **FR-008**: Canais MUST mostrar cada canal, sua disponibilidade e suas contas conectadas.
- **FR-009**: Conversas MUST ser uma caixa única, com filtro por canal e por conta, identificando o canal de cada conversa.
- **FR-010**: A API MUST usar termos genéricos: canal, conexão e conta. O fluxo de QR code fica sob o canal WhatsApp.
- **FR-011**: O MCP MUST permitir filtrar conversas por canal.
