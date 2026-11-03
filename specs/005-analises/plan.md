# Implementation Plan: Análises

**Spec**: [spec.md](./spec.md)

Port `AnalysisModel`, adapter OpenRouter em `infrastructure/`, `AnalysisService` síncrono com timeout de
120 s. Tabelas na migração `0006`: `analysis_prompts`, `analyses`, `user_ai_settings`, `company_settings`.
`analyses.conversation_id` usa `ON DELETE SET NULL`. O expurgo calcula o prazo por empresa em SQL.
Constitution: I e II com port e rotas finas; IV com dono em toda consulta; V com a migração; VI com
testes por camada. Variáveis `OPENROUTER_API_KEY` e `OPENROUTER_DEFAULT_MODEL` são opcionais: sem as
duas, nada é enviado.
