# ADR 0010: Captura gravada diretamente pelo webhook

**Status**: aceito (2026-11-02)

## Contexto

O backlog previa webhook → fila → worker → banco, mas só o backend pode gravar no esquema (Princípio
III), e o worker precisaria chamar o backend de qualquer forma.

## Decisão

O webhook grava de forma idempotente na própria requisição. Se falhar, responde erro e a Evolution API
pode reenviar. Não há fila nesta etapa.

## Consequências

- Menos partes móveis. A latência do webhook passa a depender do Postgres.
- Se a escala exigir, uma fila entra antes da gravação sem mudar o contrato dos dados.
