# Feature Specification: Fundação da plataforma em Docker

**Feature Branch**: `001-fundacao-docker`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "Vamos subir a estrutura em docker, planeje e construa. Vai rodar no
docker, vamos colocar isso em uma VPS, todos os serviços na verdade. Divida em frontend, backend,
workers, mcp. Evolution API: pode apenas subir (imagem oficial)."

## Contexto

Primeira feature do backlog (`docs/backlog.md`, item 001). Entrega a base executável sobre a qual
as features 002–009 (autenticação, conexão de números, captura, retenção, mídia, MCP, agente,
deploy) serão construídas. Não entrega funcionalidade de negócio de WhatsApp: entrega a
plataforma de pé, observável e pronta para evoluir.

Ator principal: **operador** da plataforma (quem instala e mantém a Judite numa máquina ou VPS).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Subir a plataforma inteira com um comando (Priority: P1)

O operador clona o repositório, copia o arquivo de configuração de exemplo, preenche os segredos
e sobe todos os serviços da plataforma (frontend, backend, workers, mcp, Evolution API e
dependências) com um único comando. Em poucos minutos todos os serviços estão saudáveis.

**Why this priority**: sem isso nenhuma outra feature pode ser desenvolvida, testada ou implantada
na VPS.

**Independent Test**: numa máquina limpa com Docker, seguir o guia de início rápido e verificar
que todos os serviços aparecem como saudáveis.

**Acceptance Scenarios**:

1. **Given** uma máquina com Docker e o arquivo de configuração preenchido, **When** o operador
   executa o comando de subida, **Then** os serviços frontend, backend, workers, mcp, Evolution
   API, banco de dados e fila sobem e ficam saudáveis.
2. **Given** a plataforma em execução, **When** o operador consulta o estado dos serviços,
   **Then** cada serviço informa se está saudável.
3. **Given** um segredo obrigatório ausente na configuração, **When** o operador sobe a
   plataforma, **Then** o serviço afetado não inicia e informa claramente qual variável falta.
4. **Given** a plataforma em execução, **When** o operador executa o comando de parada, **Then**
   todos os serviços param sem perda dos dados persistidos.

---

### User Story 2 - Ver o estado da plataforma no navegador (Priority: P2)

O operador abre a plataforma web no navegador e vê uma página de status com cada componente
(backend, banco de dados, fila, Evolution API, workers, mcp) marcado como disponível ou
indisponível.

**Why this priority**: prova que o caminho completo navegador → frontend → backend → componentes
funciona (fatia vertical) e dá ao operador diagnóstico imediato.

**Independent Test**: com a plataforma de pé, abrir o endereço do frontend e conferir que todos os
componentes aparecem como disponíveis; parar um componente e conferir que ele passa a aparecer
como indisponível.

**Acceptance Scenarios**:

1. **Given** todos os serviços saudáveis, **When** o operador abre a página de status, **Then**
   todos os componentes aparecem como disponíveis.
2. **Given** um componente parado (por exemplo, os workers), **When** o operador atualiza a
   página de status, **Then** apenas esse componente aparece como indisponível e os demais
   continuam disponíveis.
3. **Given** o backend indisponível, **When** o operador abre a plataforma web, **Then** a página
   informa que não foi possível consultar o estado, sem quebrar.

---

### User Story 3 - Dados persistentes e esquema atualizado automaticamente (Priority: P3)

Os dados da plataforma sobrevivem a reinícios, e ao subir uma nova versão o esquema do banco é
atualizado automaticamente antes de o backend aceitar requisições.

**Why this priority**: necessário antes de qualquer feature que grave dados (002 em diante), mas
não bloqueia US1 e US2.

**Independent Test**: subir a plataforma, conferir a versão do esquema aplicada, reiniciar todos
os serviços e conferir que dados e versão do esquema permanecem.

**Acceptance Scenarios**:

1. **Given** um banco vazio, **When** a plataforma sobe pela primeira vez, **Then** o esquema é
   criado na versão mais recente antes de o backend ficar saudável.
2. **Given** a plataforma com dados, **When** todos os serviços são reiniciados, **Then** os
   dados continuam presentes.
3. **Given** uma atualização de esquema que falha, **When** a plataforma sobe, **Then** o backend
   não fica saudável e o erro aparece no log.

---

### Edge Cases

- Porta já em uso na máquina: a subida falha com mensagem de conflito de porta; as portas são
  configuráveis.
- Banco ou fila ainda inicializando: os serviços dependentes aguardam em vez de falhar
  definitivamente.
- Um único serviço reinicia: os demais continuam funcionando, e o status reflete a
  indisponibilidade temporária.
- Evolution API sem nenhum número conectado: é considerada disponível; conectar números é escopo
  da feature 003.
- Painel administrativo e API da Evolution API não ficam expostos publicamente; só os serviços da
  plataforma os acessam.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A plataforma MUST ser composta pelos serviços próprios frontend, backend, workers e
  mcp, mais Evolution API, banco de dados e fila, todos em containers.
- **FR-002**: O operador MUST conseguir subir e parar todos os serviços com um único comando cada.
- **FR-003**: Todo serviço MUST expor um healthcheck usado pelo orquestrador de containers.
- **FR-004**: Toda configuração e todos os segredos MUST vir de variáveis de ambiente; o
  repositório MUST conter um arquivo de exemplo com todas as variáveis documentadas e sem
  segredos reais.
- **FR-005**: Um serviço sem variável obrigatória MUST falhar na inicialização com mensagem que
  identifica a variável ausente.
- **FR-006**: O backend MUST oferecer uma consulta de status que informa, para cada componente
  (backend, banco, fila, Evolution API, workers, mcp), se está disponível.
- **FR-007**: Os workers MUST sinalizar periodicamente que estão vivos, e o status MUST
  considerá-los indisponíveis se o sinal não chegar dentro de um prazo configurável.
- **FR-008**: O frontend MUST exibir a página de status consumindo apenas o backend.
- **FR-009**: O esquema do banco MUST ser atualizado automaticamente na subida, antes de o backend
  ficar saudável; a versão aplicada MUST ser consultável no status.
- **FR-010**: Dados do banco, da fila e da Evolution API MUST persistir entre reinícios.
- **FR-011**: A Evolution API e o banco MUST NOT ser acessíveis de fora da rede interna da
  plataforma; apenas frontend, backend e mcp expõem portas, configuráveis.
- **FR-012**: O mcp MUST subir como serviço remoto acessível por HTTP, com healthcheck; as tools
  de dados e a autenticação do conector são escopo da feature 007.
- **FR-013**: O repositório MUST oferecer um comando único para rodar testes, lint, type-check e
  build de todos os serviços próprios.
- **FR-014**: A estrutura de código dos serviços Python MUST seguir as camadas da constitution
  (domain, application, infrastructure, apps), com a regra de dependência verificada
  automaticamente.

### Key Entities

- **Componente**: parte da plataforma cujo estado é monitorado (nome, disponível ou não, detalhe
  do erro quando indisponível).
- **Status da plataforma**: visão consolidada dos componentes num momento, com a versão do esquema
  do banco aplicada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Numa máquina com Docker e as imagens já baixadas, a plataforma fica totalmente
  saudável em até 3 minutos após o comando de subida.
- **SC-002**: Um operador sem conhecimento prévio do projeto sobe a plataforma seguindo apenas o
  guia de início rápido, sem passos adicionais.
- **SC-003**: Quando um componente fica indisponível, a página de status reflete isso em até 30
  segundos.
- **SC-004**: 100% dos dados persistidos continuam presentes após reiniciar todos os serviços.
- **SC-005**: Nenhum segredo real está versionado no repositório.

## Assumptions

- O operador tem Docker com Compose instalado; a mesma definição serve para máquina local e VPS.
- Domínio, HTTPS e proxy reverso ficam para a feature 009 (deploy); nesta feature o acesso é por
  portas locais.
- A página de status não exige login nesta feature, porque não expõe dados de usuários; ela passa
  a ser protegida quando a autenticação existir (feature 002).
- A Evolution API usa a imagem oficial sem fork, com banco e cache próprios ou compartilhados,
  conforme decisão do Arquiteto.
- Não há dados de negócio nesta feature; o esquema inicial contém apenas o controle de versão.
