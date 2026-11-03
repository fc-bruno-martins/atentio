# Feature Specification: Conexão de números de WhatsApp

**Feature Branch**: `003-conexao-numeros`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Conexão de números de WhatsApp (item 003 do backlog). Cada usuário conecta o próprio número por QR code, em modo somente leitura; o usuário vê só os próprios números e o admin da empresa vê os usuários e números conectados da própria empresa, sem acesso ao conteúdo das mensagens."

## Contexto

Item 003 do backlog. Decisões do usuário em `docs/prd.md`: Q1 (somente leitura), Q2 (perfis), Q3
(captura só a partir da conexão), Q12 (risco aceito) e Q13 (imagem oficial). Esta feature entrega a
conexão e o acompanhamento dos números. A captura de mensagens é a feature 004.

Atores: **usuário** e **admin da empresa**, que também pode conectar os próprios números. O
**administrador da plataforma** não participa desta feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conectar um número (Priority: P1)

A pessoa abre Números, pede para conectar, lê o QR code com o WhatsApp do celular e vê o número como
conectado.

**Why this priority**: sem número conectado, nenhuma função de espelhamento existe.

**Independent Test**: conectar um número real pelo QR code e vê-lo como conectado na lista.

**Acceptance Scenarios**:

1. **Given** uma pessoa com sessão ativa, **When** pede para conectar um número, **Then** vê um QR
   code e a orientação de como lê-lo no WhatsApp.
2. **Given** um QR code na tela, **When** ele é lido, **Then** a tela mostra o número conectado, sem
   precisar recarregar.
3. **Given** um QR code que expirou, **When** a pessoa continua na tela, **Then** vê um novo QR code
   ou a opção de gerar outro.
4. **Given** qualquer conexão de número, **When** a pessoa vai conectar, **Then** vê o aviso de
   que a conexão não é oficial e pode resultar em banimento, e de que o acesso é somente leitura.
5. **Given** um número conectado, **When** a plataforma opera, **Then** nada é enviado, nenhuma
   reação é feita e nenhuma mensagem é marcada como lida.

---

### User Story 2 - Acompanhar e desconectar os próprios números (Priority: P2)

A pessoa vê a situação de cada número seu, reconecta o que caiu e desconecta o que não quer mais
espelhar.

**Why this priority**: conexões caem, e quem depende do espelhamento precisa saber disso.

**Independent Test**: desconectar o aparelho pelo celular, ver o número como desconectado, reconectar
e depois desconectá-lo pela plataforma.

**Acceptance Scenarios**:

1. **Given** uma pessoa com números, **When** abre Números, **Then** vê só os próprios números, com
   a situação e o momento da última mudança.
2. **Given** um número conectado, **When** a conexão cai ou é encerrada no celular, **Then** a
   situação muda para desconectado em até 1 minuto.
3. **Given** um número desconectado, **When** a pessoa pede para reconectar, **Then** lê um novo QR
   code e o número volta a aparecer como conectado, sem duplicar.
4. **Given** um número conectado, **When** a pessoa confirma a desconexão, **Then** a conexão é
   encerrada e o número aparece como desconectado.

---

### User Story 3 - Admin acompanha os números da empresa (Priority: P3)

O admin da empresa vê quais usuários têm números conectados e pode desconectá-los, sem acesso a
conversas.

**Why this priority**: dá visibilidade à empresa, mas a conexão funciona sem isso.

**Independent Test**: com usuários em duas empresas, conferir que cada admin vê só os números da
própria empresa, e nenhum conteúdo de mensagem.

**Acceptance Scenarios**:

1. **Given** um admin de empresa, **When** abre a visão da empresa, **Then** vê os usuários e os
   números deles, com a situação de cada um.
2. **Given** duas empresas, **When** um admin informa o identificador de um número de outra empresa,
   **Then** recebe a resposta de registro inexistente.
3. **Given** um usuário comum, **When** tenta abrir a visão da empresa ou um número de outra pessoa,
   **Then** o acesso é negado na tela e na API.
4. **Given** um admin de empresa, **When** usa a visão da empresa, **Then** nenhuma conversa ou
   mensagem está disponível.
5. **Given** o administrador da plataforma, **When** usa a plataforma, **Then** nenhum número está
   disponível.
6. **Given** um número conectado de um usuário da empresa, **When** o admin confirma a desconexão,
   **Then** a conexão é encerrada, e o dono vê que o número foi desconectado pelo admin.
7. **Given** um admin de empresa, **When** tenta desconectar um número de outra empresa, **Then**
   recebe a resposta de registro inexistente.

---

### Edge Cases

- Número já conectado por outra conta da plataforma: a conexão é recusada com mensagem clara, sem
  revelar quem é o dono.
- Mesmo número lido de novo pela própria pessoa: reutiliza o registro existente, sem duplicar.
- Serviço de WhatsApp indisponível: a tela mostra erro claro e os números mantêm a última situação
  conhecida, marcada como não confirmada quando a plataforma não consegue confirmá-la há mais de 2
  minutos.
- Limite de 2 números: só números conectados contam; os desconectados continuam na lista da pessoa.
- Pessoa fecha a tela sem ler o QR code: a tentativa expira e não deixa número na lista.
- Conta desativada ou empresa desativada: os números dela são desconectados.
- Conta reativada: os números continuam desconectados até a pessoa reconectar.

## Requirements *(mandatory)*

### Functional Requirements

**Conexão**

- **FR-001**: Pessoas com perfil usuário ou admin da empresa MUST poder conectar número por QR code.
- **FR-002**: Cada pessoa MUST poder ter até 2 números conectados ao mesmo tempo; números desconectados
  não contam, e a tentativa de conectar um terceiro MUST ser recusada com mensagem clara.
- **FR-021**: O QR code MUST ser visível só para quem iniciou a tentativa, nem mesmo para o admin da
  empresa, e MUST NOT ser guardado depois do fim da tentativa.
- **FR-003**: O QR code MUST ser renovado ou poder ser gerado de novo quando expirar.
- **FR-004**: A tela de conexão MUST avisar sobre o risco de banimento da conexão não oficial e sobre
  o acesso somente leitura.
- **FR-005**: Um mesmo número MUST estar conectado a uma única conta por vez na plataforma; número
  desconectado não impede outra conta de conectá-lo.
- **FR-006**: Tentativas sem leitura do QR code MUST expirar sem criar número na lista.

**Somente leitura**

- **FR-007**: A plataforma MUST NOT enviar mensagens, reagir, marcar como lida ou alterar qualquer
  dado no WhatsApp da pessoa.

**Situação**

- **FR-008**: O sistema MUST mostrar, para cada número, a situação (conectado ou desconectado) e o
  momento da última mudança; "aguardando leitura" aparece só na tela de conexão, conforme FR-006.
- **FR-009**: Mudanças de situação MUST aparecer na plataforma em até 1 minuto.
- **FR-010**: Pessoas MUST poder reconectar um número desconectado, mantendo o mesmo registro.

**Desconexão**

- **FR-011**: Pessoas MUST poder desconectar os próprios números, com confirmação.
- **FR-012**: O admin da empresa MUST poder desconectar, com confirmação, o número de um usuário da
  própria empresa; o sistema MUST registrar quem desconectou, e a tela do dono MUST mostrar que foi o
  admin.
- **FR-013**: Desativar uma conta ou uma empresa MUST desconectar os números envolvidos.

**Acesso e isolamento**

- **FR-014**: Cada pessoa MUST ver só os próprios números.
- **FR-015**: O admin da empresa MUST ver os usuários e números da própria empresa, sem conteúdo de
  mensagens.
- **FR-016**: Tentar alcançar número de outra pessoa sem permissão ou de outra empresa MUST se
  comportar como registro inexistente.
- **FR-017**: O administrador da plataforma MUST NOT ver números.
- **FR-018**: O admin da empresa MUST ver o telefone completo dos números da própria empresa.
- **FR-019**: O menu MUST ganhar Números para usuário e admin da empresa; a visão da empresa aparece
  só para o admin da empresa.

**Fronteira**

- **FR-020**: Esta feature MUST NOT guardar mensagens, contatos ou grupos; isso pertence à feature 004.
  A partir da feature 004, a captura é feita por ela; a Evolution API continua sem guardar mensagens.

### Key Entities

- **Número conectado**: telefone, conta dona, empresa, situação, momento da última mudança e quem
  desconectou.
- **Tentativa de conexão**: número em espera do QR code, com validade.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa conecta um número em menos de 2 minutos a partir da tela Números.
- **SC-002**: Quedas de conexão aparecem em até 1 minuto.
- **SC-003**: Nenhum teste de isolamento alcança número de outra pessoa ou de outra empresa.
- **SC-004**: Nenhuma ação da plataforma altera o WhatsApp da pessoa, verificado em número real.
- **SC-005**: Depois de desativar uma conta, seus números ficam desconectados em até 1 minuto.

## Assumptions

- O aviso de banimento é informativo: o risco já foi aceito pelo usuário do produto (Q12).
- Desconectar um número não apaga dados nesta feature, porque ainda não há dados de mensagens. O que
  acontece com as mensagens guardadas fica para a 004 e a 005.
- O número é identificado pelo próprio telefone, informado pelo WhatsApp na leitura do QR code.
- A plataforma usa a Evolution API do próprio ambiente, sem fork (Q13).
- O teste com número real é manual; os testes automatizados usam dublê (Constitution VI).
