# Feature Specification: Análises, agente interno e retenção configurável

**Feature Branch**: `005-analises`

**Created**: 2026-11-02

**Status**: Aprovada pelo usuário ("Construa tudo"), com padrões a revisar

**Input**: "configurar prompts e análises a partir de uma data, do dia ou de algumas mensagens selecionadas"

Cobre os itens 004b, 008 (sem memória) e 005 do backlog. O número da pasta não coincide com o item 005.

## User Stories

- **US1 (P1)**: a pessoa escolhe uma conversa, define período ou seleciona mensagens, usa um prompt salvo ou escrito na hora e vê o resultado.
- **US2 (P2)**: a pessoa mantém os próprios prompts e consulta o histórico de análises.
- **US3 (P3)**: o admin da empresa define modelo, temperatura e prompt adicional por usuário, e o prazo de retenção da empresa.

## Requirements

- **FR-001**: Analisar MUST aceitar período ou mensagens selecionadas de uma conversa da própria pessoa.
- **FR-002**: Cada análise MUST usar no máximo 500 mensagens.
- **FR-003**: Pessoas MUST criar, listar e excluir os próprios prompts.
- **FR-004**: O conteúdo das conversas MUST ser tratado como dado, nunca como instrução ao modelo.
- **FR-005**: Falha do provedor MUST ficar registrada e aparecer de forma clara, sem detalhes internos.
- **FR-006**: Sem provedor configurado, a tela MUST informar isso, sem enviar dados.
- **FR-007**: O admin da empresa MUST configurar modelo, temperatura e prompt adicional só de usuários da própria empresa, sem ver conversas nem análises.
- **FR-011**: A lista de modelos MUST vir do OpenRouter, só com modelos que geram texto, e mostrar o preço.
- **FR-012**: A pessoa MUST escolher o modelo na análise; a escolha vence o padrão definido pelo admin.
- **FR-008**: O admin da empresa MUST configurar o prazo de retenção, de 1 a 365 dias.
- **FR-009**: Mensagens e análises MUST ser expurgadas no prazo da empresa.
- **FR-010**: Prompts, análises e configurações seguem o isolamento por pessoa e empresa.

## Success Criteria

- **SC-001**: Com provedor configurado, uma análise de até 500 mensagens termina em até 2 minutos.
- **SC-002**: Nenhum teste de isolamento alcança prompt ou análise de outra pessoa.

## Assumptions (padrões a revisar pelo usuário)

- Cada pessoa cria os próprios prompts; a Q8 continua valendo para o admin.
- Análises expiram junto com as mensagens (Q18).
- Memória (mem0) fica de fora: o PRD a trata como opcional.
- Conteúdo enviado ao provedor configurado faz parte da decisão Q8.
