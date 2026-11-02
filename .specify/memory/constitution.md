# Judite Constitution

## Core Principles

### I. Arquitetura em Camadas com Domínio no Centro

O código Python compartilhado fica no pacote `judite_shared` (diretório `apps/shared/`), nas camadas
`kernel` (utilitários técnicos), `domain`, `application` (handlers) e `infrastructure`
(repositories e integrações). Os entrypoints ficam em `apps/`. Regras:

- `domain` (entidades, value objects, regras e erros de negócio) MUST NOT importar FastAPI,
  SQLAlchemy, Alembic, clientes HTTP, SDK de MCP ou qualquer framework de infraestrutura.
- As dependências MUST apontar para dentro: apps → application → domain; `infrastructure`
  implementa interfaces (ports) declaradas em `domain`/`application`.
- Use cases dependem de ports de repository, nunca de implementações concretas; implementações
  são injetadas na composição de cada app.
- A direção de dependência MUST ser verificada automaticamente (import-linter) no pipeline local
  (`make check`). O CI é adiado até o repositório ter remote e MUST ser criado até a feature 009
  (deploy).

Racional: o domínio é compartilhado entre backend, MCP e workers; só é reutilizável se não
carregar acoplamento com a infraestrutura de nenhum deles.

### II. Entrypoints Finos via Mediator

Rotas FastAPI, tools MCP e consumidores dos workers MUST apenas: validar e traduzir a entrada,
despachar um comando/consulta ao mediator e traduzir o resultado para a saída do canal.

- Entrypoints MUST NOT conter regra de negócio nem acessar repositories diretamente.
- Cada comando/consulta MUST ter exatamente um handler registrado no mediator.
- O mesmo comando MUST poder ser disparado por qualquer app sem duplicação de lógica.
- A relação handler ↔ use case é definida no ADR 0002.

Racional: um caminho único por caso de uso deixa o comportamento igual em todos os canais e
testável sem subir HTTP.

### III. Shared e Domínio Reutilizáveis entre Apps

O sistema é dividido em quatro serviços próprios, em `apps/frontend`, `apps/backend`,
`apps/workers` e `apps/mcp`, mais a Evolution API e as dependências de infraestrutura.

- `backend`, `workers` e `mcp` são pacotes Python próprios (uv workspace) e MAY importar qualquer
  camada de `judite_shared`; `judite_shared` MUST NOT importar apps.
- Apps MUST NOT importar uns aos outros; o que for comum MUST ser promovido para uma camada
  compartilhada.
- A camada `kernel` contém apenas utilitários técnicos transversais (config, logging, erros base,
  mediator) e MUST NOT conter regra de negócio.
- O frontend fala apenas com o backend, via HTTP; MUST NOT acessar banco, Evolution API ou MCP.

Racional: reuso real sem acoplar processos que são implantados e escalados de forma independente.

### IV. Isolamento de Dados por Usuário (NON-NEGOTIABLE)

- Todo dado de WhatsApp (números, conversas, mensagens, derivados de mídia, memórias) MUST
  pertencer a um usuário dono, e toda consulta MUST ser filtrada pelo dono no use case ou no
  repository, nunca só na interface.
- Usuário comum MUST ver apenas os próprios números e dados; o admin vê usuários e números
  conectados. Qualquer acesso do admin ao conteúdo de mensagens de outro usuário exige requisito
  explícito na spec.
- O MCP MUST expor apenas dados do usuário autenticado no conector.
- Toda feature que lê dados de WhatsApp MUST ter teste que prove que um usuário não acessa dados
  de outro.
- Mensagens e derivados MUST ser expurgados ao fim do prazo de retenção configurado pelo admin;
  arquivos de mídia originais MUST ser descartados após a extração de texto.

Racional: a plataforma guarda conversas privadas de terceiros; vazamento entre usuários é o pior
defeito possível.

### V. Persistência via Repositories e Migrações Alembic

- Todo acesso a dados MUST passar por um repository; SQL/ORM fora de `infrastructure` é proibido.
- Toda mudança de schema MUST ser uma migração Alembic versionada no mesmo PR, com `upgrade` e
  `downgrade` implementados.
- O banco MUST NOT ser alterado manualmente fora de migrações.

Racional: schema reproduzível em qualquer ambiente e domínio isolado da persistência.

### VI. Testes por Camada (NON-NEGOTIABLE)

- `domain` e `application` MUST ter testes unitários sem banco, rede ou framework (ports
  substituídos por fakes).
- Repositories e migrações MUST ter testes de integração contra PostgreSQL real.
- Cada entrypoint (rota, tool MCP, consumidor) MUST ter teste de contrato cobrindo sucesso e erro.
- Integrações externas (Evolution API, OpenAI, OpenRouter) MUST ser testadas com dublês nos
  testes automatizados; chamadas reais só em testes manuais/smoke explícitos.
- Os testes de cada história MUST estar nas próprias tarefas da história, não numa fase final.
- TDD é recomendado, não obrigatório. Não há cobertura mínima; a suficiência dos testes é avaliada
  na revisão de cada PR.

Racional: a arquitetura em camadas só se paga se cada camada for verificável isoladamente.

## Stack e Restrições Técnicas

- **Execução**: todos os serviços em Docker (Compose), implantados numa VPS.
- **Frontend**: SPA web em React + TypeScript, servida por container próprio.
- **Backend / MCP / Workers**: Python + FastAPI, padrão mediator (handlers e use cases),
  repositories, SQLAlchemy e migrações Alembic; PostgreSQL como banco; Redis para filas e cache.
- **WhatsApp**: Evolution API pela imagem oficial, sem fork. Integração somente leitura no MVP.
- **IA**: transcrição e leitura de imagens via OpenAI; agente via OpenRouter, com modelo,
  parâmetros e prompt configuráveis por usuário pelo admin.
- **MCP**: servidor remoto para Claude Desktop, celular e web, com autenticação feita na
  plataforma. Exige HTTPS público em produção.
- **Segredos**: MUST NOT ser commitados; vêm de variáveis de ambiente (`.env` fora do git,
  `.env.example` versionado).
- **Configuração**: todo serviço MUST expor healthcheck e ler configuração só de ambiente.
- Escolhas de bibliotecas e versões são registradas em ADRs em `docs/adr/`.

## Fluxo de Desenvolvimento e Quality Gates

- Spec-Driven Development com GitHub Spec Kit: spec → alinhamento (sem perguntas abertas que
  afetem a feature) → checklist → plan → tasks → analyze → implement → converge.
- Uma branch e um PR por feature (ou por fase, em features grandes); nunca commit direto na
  `main`; commits em Conventional Commits.
- Um PR só é mergeável com testes, lint, type-check (Python e TypeScript) e build passando,
  `speckit-converge` retornando `Converged`, parecer do QA, revisão do Revisor de PR e GO do
  Tech Lead.
- Nenhum agente inventa requisito de negócio: gaps viram pergunta ao P.O e, se preciso, ao
  usuário.

## Governance

- Esta constitution prevalece sobre outras práticas do projeto. `plan.md` MUST passar no
  Constitution Check; violações exigem justificativa em "Complexity Tracking" ou ADR.
- Emendas são propostas pelo Tech Lead com o Arquiteto, aprovadas pelo usuário e feitas via PR.
- Versionamento semântico: MAJOR para remoção/redefinição incompatível de princípio; MINOR para
  princípio ou seção nova ou expansão material; PATCH para clarificações.
- O Revisor de PR e o Tech Lead verificam a conformidade em todo PR.
- Orientação operacional do dia a dia fica em `CLAUDE.md`.

**Version**: 1.2.0 | **Ratified**: 2026-10-30 | **Last Amended**: 2026-11-02
