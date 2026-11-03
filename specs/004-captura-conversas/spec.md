# Feature Specification: Captura de mensagens e tela de Conversas

**Feature Branch**: `004-captura-conversas`

**Created**: 2026-11-02

**Status**: Aprovada pelo usuário ("Implemente tudo", opção C)

**Input**: "Como faço para ver os grupos e conversas para configurar prompts e análises a partir de uma data, do dia ou de algumas mensagens selecionadas?"

## Contexto

Primeira fatia do pedido. Cobre os itens 004 do backlog, a nova tela de Conversas e o expurgo mínimo
exigido pela constitution (Princípio IV). Seleção de mensagens, prompts e análises ficam na fatia
seguinte. Mídia em texto continua na 006, e o ajuste do prazo pelo admin na 005.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capturar mensagens (Priority: P1)

Mensagens enviadas e recebidas em grupos e directs ficam guardadas a partir do início da captura.

**Independent Test**: enviar e receber mensagens no número conectado e vê-las guardadas sem duplicar.

**Acceptance Scenarios**:

1. **Given** um número conectado, **When** chega ou sai uma mensagem, **Then** ela é guardada.
2. **Given** uma mensagem repetida, **When** o evento chega de novo, **Then** ela não duplica.
3. **Given** uma mensagem de mídia, **When** é capturada, **Then** ficam o tipo e a legenda, sem o arquivo.
4. **Given** um número desconectado, **When** chega um evento, **Then** nada é guardado.

### User Story 2 - Ver conversas (Priority: P2)

A pessoa abre Conversas, vê grupos e directs dos próprios números e lê as mensagens, filtrando por
período ou por um dia.

**Independent Test**: abrir uma conversa capturada e filtrar por data.

**Acceptance Scenarios**:

1. **Given** conversas capturadas, **When** a pessoa abre Conversas, **Then** vê as próprias, da mais recente para a mais antiga, identificando grupos e directs.
2. **Given** uma conversa, **When** informa um período, **Then** vê só as mensagens dele.
3. **Given** outra pessoa da empresa, um admin ou o administrador da plataforma, **When** tenta acessar a conversa, **Then** recebe registro inexistente ou acesso negado.

### Edge Cases

- Status e canais não são capturados.
- Nome do grupo indisponível: a conversa aparece como "Grupo sem nome" até ser obtido.
- Evento fora do formato esperado é ignorado, sem falhar a entrega dos demais.

## Requirements *(mandatory)*

- **FR-001**: O sistema MUST guardar mensagens enviadas e recebidas, de grupos e directs, de números conectados.
- **FR-002**: Mensagens MUST ser guardadas uma única vez por número.
- **FR-003**: Para mídia, MUST guardar só o tipo e a legenda.
- **FR-004**: Status e canais MUST NOT ser capturados.
- **FR-005**: A plataforma continua somente leitura no WhatsApp.
- **FR-006**: Números já conectados MUST passar a capturar sem novo QR code.
- **FR-007**: Mensagens MUST ser expurgadas depois de 7 dias, e conversas vazias removidas com elas.
- **FR-008**: Cada pessoa MUST ver só as próprias conversas e mensagens.
- **FR-009**: Admin da empresa e administrador da plataforma MUST NOT ver conversas de outras pessoas.
- **FR-010**: A tela MUST filtrar mensagens por período e por dia.
- **FR-011**: O menu MUST ganhar Conversas para usuário e admin da empresa.

## Success Criteria *(mandatory)*

- **SC-001**: Uma mensagem aparece em Conversas em até 30 segundos.
- **SC-002**: Nenhum teste de isolamento alcança conversa de outra pessoa ou empresa.
- **SC-003**: Nenhuma mensagem permanece depois do prazo de retenção mais 1 minuto.

## Assumptions

- A captura começa quando esta feature entra no ar; o que chegou antes não é recuperado (Q3).
- Prazo fixo de 7 dias por variável de ambiente até a feature 005.
