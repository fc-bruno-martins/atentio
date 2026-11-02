# Feature Specification: Login e administração da plataforma

**Feature Branch**: `002-login-administracao`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "Vamos construir agora o frontend com login e menus para administração,
com o Design System do labs-feattech. Verifique se a arquitetura segue Clean Architecture com DDD e
SOLID e, se não seguir, implemente esses padrões, mesmo alterando a estrutura."

## Contexto

Item 002 do backlog. Decisões do usuário registradas em `docs/prd.md` (Q15, Q16a, Q16b, menus) e nos
ADRs 0006 e 0007. Esta feature também migra o código da 001 para a estrutura aprovada, mantendo todo
o comportamento já validado.

Atores: **administrador da plataforma**, **admin da empresa** e **usuário**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar e navegar conforme o perfil (Priority: P1)

Uma pessoa com conta informa e-mail e senha, entra na plataforma e vê apenas os menus do seu perfil.
Ela pode sair quando quiser.

**Why this priority**: é a porta de entrada de toda a plataforma.

**Independent Test**: com um administrador da plataforma criado por comando, entrar, ver os menus
do perfil, sair e confirmar que as áreas privadas deixam de abrir.

**Acceptance Scenarios**:

1. **Given** uma conta ativa, **When** a pessoa informa as credenciais corretas, **Then** entra e vê
   os menus do seu perfil.
2. **Given** credenciais incorretas ou e-mail inexistente, **When** tenta entrar, **Then** vê a mesma
   mensagem genérica nos dois casos.
3. **Given** uma pessoa sem sessão, **When** abre uma área privada, **Then** é levada ao login.
4. **Given** uma sessão ativa, **When** a pessoa sai, **Then** a sessão deixa de valer imediatamente.
5. **Given** um usuário comum, **When** abre o endereço de uma tela de outro perfil, **Then** o acesso
   é negado, tanto na tela quanto na API.
6. **Given** 5 tentativas erradas seguidas para um e-mail, **When** tenta de novo em 15 minutos,
   **Then** o acesso é bloqueado temporariamente.

---

### User Story 2 - Administrar empresas e ver o status da plataforma (Priority: P2)

O administrador da plataforma cadastra empresas, convida o primeiro admin de cada uma, ativa ou
desativa empresas e acompanha o status da plataforma.

**Why this priority**: sem empresas não há como cadastrar nenhum outro usuário.

**Independent Test**: criar uma empresa com o e-mail do primeiro admin, conferir o convite na caixa
de e-mail local e aceitá-lo.

**Acceptance Scenarios**:

1. **Given** o administrador da plataforma, **When** cria uma empresa com nome e e-mail do primeiro
   admin, **Then** a empresa aparece na lista e o convite é enviado.
2. **Given** uma empresa ativa, **When** ela é desativada, **Then** seus usuários perdem as sessões
   e não conseguem entrar até a reativação.
3. **Given** o administrador da plataforma, **When** abre Status, **Then** vê os 6 componentes como
   na feature 001.
4. **Given** um admin de empresa ou usuário, **When** tenta acessar Empresas ou Status, **Then** o
   acesso é negado.
5. **Given** o administrador da plataforma, **When** usa qualquer tela, **Then** nenhuma conversa ou
   mensagem de WhatsApp está disponível.

---

### User Story 3 - Administrar os usuários da empresa (Priority: P3)

O admin da empresa convida pessoas, define o perfil delas, reenvia convites e ativa ou desativa
usuários. Convidados definem nome e senha pelo link recebido.

**Why this priority**: permite que cada empresa se organize sozinha.

**Independent Test**: como admin de uma empresa, convidar um usuário, aceitar o convite e confirmar
que admins de outra empresa não enxergam essa pessoa.

**Acceptance Scenarios**:

1. **Given** um admin de empresa, **When** convida um e-mail, **Then** o convite pendente aparece na
   lista e é enviado por e-mail.
2. **Given** um convite válido, **When** a pessoa define nome e senha, **Then** a conta é criada na
   empresa e no perfil do convite, e ela já entra na plataforma.
3. **Given** um convite expirado, cancelado ou já usado, **When** o link é aberto, **Then** a pessoa
   vê que ele é inválido e pode pedir um novo ao admin.
4. **Given** duas empresas, **When** um admin lista ou altera usuários, **Then** só alcança os da
   própria empresa, mesmo informando o identificador de outra pessoa.
5. **Given** um usuário ativo, **When** é desativado, **Then** perde as sessões imediatamente.
6. **Given** o último admin ativo da empresa, **When** se tenta desativá-lo ou rebaixá-lo, **Then** a
   operação é recusada.

---

### User Story 4 - Cuidar da própria conta (Priority: P4)

Qualquer pessoa altera nome e senha e recupera o acesso por e-mail quando esquece a senha.

**Why this priority**: reduz a dependência do admin, mas a plataforma funciona sem isso de início.

**Independent Test**: pedir recuperação, definir nova senha pelo link e entrar com ela.

**Acceptance Scenarios**:

1. **Given** uma sessão ativa, **When** a pessoa altera o nome, **Then** o novo nome aparece.
2. **Given** a senha atual correta, **When** define uma nova, **Then** a senha muda e as outras
   sessões são encerradas.
3. **Given** a tela de recuperação, **When** informa um e-mail, existente ou não, **Then** vê a mesma
   mensagem, e só contas ativas recebem o link.
4. **Given** um link de recuperação válido, **When** define nova senha, **Then** todas as sessões são
   encerradas e o link deixa de valer.

---

### Edge Cases

- E-mail já usado por outra conta: o convite é recusado com mensagem clara. Cada e-mail pertence a
  uma única conta em toda a plataforma.
- Convite pendente para o mesmo e-mail: não duplica; o admin reenvia o existente, e o link anterior
  deixa de valer.
- Sessão expirada durante o uso: a próxima ação leva ao login.
- Falha no envio de e-mail: a empresa ou o convite continua registrado, e a tela avisa que é preciso
  reenviar.
- Backend indisponível: login e telas mostram erro claro, sem quebrar.
- Empresa desativada: convites pendentes dela não podem ser aceitos.
- Administrador da plataforma não pertence a nenhuma empresa.

## Requirements *(mandatory)*

### Functional Requirements

**Acesso**

- **FR-001**: Pessoas MUST entrar com e-mail e senha.
- **FR-002**: A mensagem de falha no login MUST ser igual para e-mail inexistente, senha errada,
  conta inativa e empresa inativa.
- **FR-003**: O sistema MUST bloquear o login por 15 minutos após 5 falhas seguidas para um e-mail.
- **FR-004**: Sessões MUST expirar após 12 horas sem uso e poder ser encerradas pelo servidor
  imediatamente.
- **FR-005**: Pessoas MUST poder sair, encerrando a sessão atual.
- **FR-006**: Áreas privadas MUST exigir sessão válida; a API MUST validar sessão e perfil em toda
  chamada privada, independentemente do frontend.
- **FR-007**: A autenticação da API MUST aceitar clientes que não sejam navegador.

**Perfis e menus**

- **FR-008**: O sistema MUST ter os perfis administrador da plataforma, admin da empresa e usuário.
- **FR-009**: O menu MUST mostrar apenas: Empresas e Status (administrador da plataforma); Usuários
  (admin da empresa); Meu perfil (todos).
- **FR-010**: O primeiro administrador da plataforma MUST ser criado por comando no servidor.

**Empresas**

- **FR-011**: O administrador da plataforma MUST poder criar, listar, renomear, ativar e desativar
  empresas.
- **FR-012**: Criar uma empresa MUST registrar o convite do primeiro admin dela.
- **FR-013**: Desativar uma empresa MUST encerrar as sessões dos seus usuários e impedir login e
  aceite de convites.
- **FR-014**: O administrador da plataforma MUST NOT ter acesso a conversas ou mensagens.

**Usuários da empresa**

- **FR-015**: O admin da empresa MUST poder listar usuários e convites, convidar, reenviar, cancelar
  convites, alterar o perfil entre admin e usuário, ativar e desativar usuários da própria empresa.
- **FR-016**: Convites MUST expirar em 7 dias, valer uma vez e ter o link anterior invalidado ao
  serem reenviados.
- **FR-017**: Aceitar um convite MUST criar a conta com nome e senha definidos pela pessoa, e abrir
  a sessão.
- **FR-018**: Cada e-mail MUST pertencer a uma única conta na plataforma.
- **FR-019**: O sistema MUST recusar desativar ou rebaixar o último admin ativo de uma empresa.
- **FR-020**: Desativar uma conta MUST encerrar suas sessões imediatamente.
- **FR-021**: Toda operação de empresa MUST ficar restrita à empresa da pessoa autenticada, e tentar
  alcançar dados de outra empresa MUST se comportar como registro inexistente.

**Conta**

- **FR-022**: Pessoas MUST poder alterar o próprio nome e a própria senha, informando a senha atual.
- **FR-023**: Alterar a senha MUST encerrar as demais sessões da pessoa.
- **FR-024**: Pessoas MUST poder recuperar o acesso por um link enviado por e-mail, válido por 1 hora
  e por um único uso, sem revelar se o e-mail existe.
- **FR-025**: Senhas MUST ter ao menos 12 caracteres e ser guardadas apenas como hash.
- **FR-026**: Tokens de sessão, convite e recuperação MUST ser guardados apenas como hash.

**Interface**

- **FR-027**: O frontend MUST usar o Design System do `labs-feattech`, com tema claro e escuro.
- **FR-028**: Os e-mails de convite e recuperação MUST ser em português e conter o link da ação.

**Estrutura e regressão**

- **FR-029**: Backend, workers e mcp MUST seguir a estrutura do ADR 0007, como serviços autônomos.
- **FR-030**: A regra de dependência entre camadas MUST ser verificada automaticamente em cada
  serviço.
- **FR-031**: Todo o comportamento da feature 001 MUST continuar válido; o status detalhado passa a
  ser restrito ao administrador da plataforma.
- **FR-032**: O ambiente local MUST incluir uma caixa de e-mail de teste, sem envio real.
- **FR-033**: O frontend MUST seguir a Feature-Driven Architecture do ADR 0008, com o acesso entre
  features verificado automaticamente.

### Key Entities

- **Empresa**: nome e situação (ativa ou inativa).
- **Conta**: nome, e-mail, perfil, situação e empresa (exceto administrador da plataforma).
- **Convite**: e-mail, perfil, empresa, validade, situação e quem convidou.
- **Sessão**: conta, validade e momento do encerramento.
- **Recuperação de senha**: conta, validade e uso.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa com conta ativa entra na plataforma em menos de 30 segundos.
- **SC-002**: Criar uma empresa e aceitar o convite do primeiro admin leva menos de 3 minutos.
- **SC-003**: 100% das rotas privadas recusam acesso sem sessão ou com perfil incorreto.
- **SC-004**: Nenhum teste de isolamento consegue ler ou alterar dados de outra empresa.
- **SC-005**: Uma conta desativada perde o acesso na chamada seguinte.
- **SC-006**: Todos os cenários do quickstart da feature 001 continuam passando.
- **SC-007**: Cada serviço Python pode ser construído e testado isoladamente, a partir da própria
  pasta.

## Assumptions

Valores propostos pelo Tech Lead e aprovados pelo usuário em 2026-11-02:

- Sessão de 12 horas sem uso, senha mínima de 12 caracteres, bloqueio após 5 falhas por 15 minutos,
  convite de 7 dias e recuperação de 1 hora.
- E-mail único em toda a plataforma: uma pessoa em duas empresas precisa de dois e-mails.
- Admin da empresa também pode ser dono de números de WhatsApp nas próximas features.
- Em produção, os e-mails usam um servidor SMTP configurado por ambiente (definido na feature 009).
- Não há autoatendimento de empresas, SSO, 2FA nem exclusão definitiva nesta feature.
