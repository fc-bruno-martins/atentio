# Research — 003 Conexão de números

Sondagem feita em 2026-11-02 contra a Evolution API v2.3.7 local, com instância temporária já removida.

## Confirmado na sondagem

- **R1. Criação**: `POST /instance/create` responde 201 e já traz o QR em `qrcode.base64`, sem
  depender de webhook. Aceita `readMessages`, `readStatus`, `alwaysOnline`, `rejectCall`,
  `syncFullHistory` e `groupsIgnore`.
- **R2. Consulta do QR**: `GET /instance/connect/{nome}` devolve o QR atual. Assim a plataforma não
  precisa guardar o QR (FR-021).
- **R3. Webhook**: chega por POST com o cabeçalho configurado na instância. Eventos vistos:
  `connection.update`, `qrcode.updated`, `logout.instance` e `remove.instance`.
- **R4. Situação**: `GET /instance/connectionState/{nome}` e `GET /instance/fetchInstances`. Este
  último traz `connectionStatus`, `ownerJid` e `number`.
- **R5. Encerramento**: `DELETE /instance/logout/{nome}` e `DELETE /instance/delete/{nome}`.
- **R6. Mensagens**: as opções `DATABASE_SAVE_DATA_*` têm padrão falso quando ausentes. O Compose as
  declara falsas de forma explícita (FR-020).

## Confirmado com número real (2026-11-02)

- **R7. Telefone**: `ownerJid` veio como `<telefone>@s.whatsapp.net`, com 13 dígitos, e `phone_from_jid`
  o leu corretamente.
- **R8. Pareamento**: depois da leitura do QR, o WhatsApp fecha a conexão com `stream:error` 515 e a
  Evolution reconecta sozinha até `open`. É normal e não pode ser tratado como queda na US2.
- **R9. Conclusão**: o evento `connection.update` com `state: open` chegou ao backend e concluiu a
  tentativa, em cerca de 40 s depois da criação.

## Ainda não confirmado

O `statusReason` de quando a sessão é encerrada no celular, a ocorrência de quedas transitórias e a
ausência de efeitos no WhatsApp com mensagens reais trafegando. A validação é da T030.

## Decisões

- **D1. Uma instância por tentativa.** Alternativa rejeitada: reaproveitar a instância na reconexão,
  porque nada garante que a pessoa leia o QR com o mesmo telefone.
- **D2. Polling do QR a cada 3 s.** Alternativa rejeitada: WebSocket, desnecessário para uma tela de
  uso raro.
- **D3. Reconciliação pelo job dos workers chamando rota interna do backend** (ADR 0009).
  Alternativa rejeitada: dar aos workers acesso ao esquema, que é do backend (Princípio III).
- **D4. Sem biblioteca cliente da Evolution**: `httpx` direto, com só as operações permitidas.

## Desvios da construção

- **Uma tentativa pendente por pessoa**: a nova cancela a anterior, em vez de somar no limite.
- **Tolerância a quedas e `instance_removed`**: acrescentados depois do teste real, na migração `0004`.
- **`/company-numbers` lista números**: usuário sem número não aparece; a lista de pessoas é Usuários.
- Depois de passar da tolerância, a instância é removida e voltar exige novo QR.
