# Atentio Constitution

## Core Principles

### I. Clean Architecture, DDD e SOLID com Estrutura Simplificada

Cada serviço Python (`backend`, `workers`, `mcp`) tem o pacote `app/`, com as pastas de que precisa
entre `domain`, `services`, `repositories`, `infrastructure` (adapters que não são persistência),
`models`, `schemas`, `core`, `utils` e a camada de entrada (ADR 0007). Regras:

- `domain` (entidades, value objects, regras, erros de negócio e ports) MUST NOT importar FastAPI,
  SQLAlchemy, Alembic, clientes HTTP, SDK de MCP ou qualquer framework.
- `services` são os casos de uso: MUST depender de `domain` e de ports, e MUST NOT importar
  FastAPI, SQLAlchemy, `models`, `schemas` nem `repositories` concretos.
- `repositories` implementam os ports e convertem ORM ↔ domínio; models do ORM MUST NOT sair dessa
  camada.
- A direção de dependência MUST ser verificada automaticamente (import-linter) no pipeline local
  (`make check`). O CI é adiado até o repositório ter remote e MUST ser criado até a feature 009
  (deploy).

Racional: regras de negócio testáveis e independentes de framework, sem pastas além do necessário.

### II. Entrypoints Finos

Rotas FastAPI, tools MCP e jobs dos workers MUST apenas: validar e traduzir a entrada, chamar um
service e traduzir o resultado para a saída do canal.

- Entrypoints MUST NOT conter regra de negócio nem acessar repositories diretamente.
- Dependências são injetadas na composição de cada serviço (`Annotated[..., Depends()]` no FastAPI).
- O commit fica num único ponto, na fronteira da sessão; repositories só fazem `flush`.

Racional: um caminho claro por caso de uso, testável sem subir HTTP.

### III. Serviços Autônomos

O sistema é dividido em quatro serviços próprios, em `apps/frontend`, `apps/backend`,
`apps/workers` e `apps/mcp`, mais a Evolution API e as dependências de infraestrutura.

- Cada serviço MUST ser autônomo, com pacote, dependências, lock, testes e Dockerfile próprios, de
  modo que possa ser movido para outro repositório sem alterar código.
- Serviços MUST NOT importar código uns dos outros. Não existe biblioteca compartilhada.
- O frontend fala apenas com o backend, via HTTP; MUST NOT acessar banco, Evolution API ou MCP.
- Só o backend é dono do esquema do banco e das migrações.

Racional: autonomia para separar repositórios e implantar cada serviço de forma independente,
aceitando alguma duplicação de código.

### IV. Isolamento de Dados por Empresa e por Usuário (NON-NEGOTIABLE)

- Todo dado de negócio MUST pertencer a uma empresa, e toda consulta MUST ser filtrada pela empresa
  no service ou no repository. Nenhuma empresa acessa dados de outra.
- Todo dado de WhatsApp (números, conversas, mensagens, derivados de mídia, memórias) MUST
  pertencer a um usuário dono, e toda consulta MUST ser filtrada pelo dono no use case ou no
  repository, nunca só na interface.
- Usuário comum MUST ver apenas os próprios números e dados; o admin vê usuários e números
  conectados da própria empresa. Qualquer acesso do admin ao conteúdo de mensagens de outro usuário exige requisito
  explícito na spec.
- O MCP MUST expor apenas dados do usuário autenticado no conector.
- Toda feature que lê dados de WhatsApp MUST ter teste que prove que um usuário não acessa dados
  de outro, nem de outra empresa.
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

- `domain` e `services` MUST ter testes unitários sem banco, rede ou framework (ports
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
- **Frontend**: Next.js (React + TypeScript), servido por container próprio (ADR 0006), organizado
  em Feature-Driven Architecture: features só se acessam pelo `index.ts`, regra verificada por
  ESLint (ADR 0008).
- **Backend / MCP / Workers**: Python, com FastAPI no backend, services, repositories, SQLAlchemy
  e migrações Alembic; PostgreSQL como banco; Redis para filas e cache.
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

**Version**: 2.2.0 | **Ratified**: 2026-10-30 | **Last Amended**: 2026-11-02
