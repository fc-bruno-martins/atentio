# ADR 0009: Reconciliação de números por rota interna do backend

**Status**: aceito (2026-11-02)

## Contexto

Webhooks podem se perder, e a spec da 003 exige situação correta em até 1 minuto. A reconciliação
precisa rodar de forma periódica, mas só o backend é dono do esquema (Princípio III).

## Opções

1. Workers acessam o banco direto: viola a posse do esquema.
2. Laço periódico dentro do backend: mistura execução em segundo plano com a API.
3. Job dos workers chama rota interna do backend: mantém a regra no backend e o agendamento nos
   workers.

## Decisão

Opção 3. O job `reconcile_numbers` chama `POST /api/v1/internal/numbers/reconcile` a cada 30 s, com
`Authorization: Bearer ${INTERNAL_API_TOKEN}`.

## Consequências

- Workers passam a depender do backend em execução, sem importar código dele.
- Surge um segredo novo, obrigatório no ambiente.
- A feature 009 MUST garantir que `/api/v1/internal` não seja exposto pelo proxy público.
