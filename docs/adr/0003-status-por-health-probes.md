# 0003 — Status da plataforma por health probes

- **Status**: aceito (2026-10-30)
- **Contexto**: FR-006/FR-007 pedem status por componente, inclusive dos workers, que não têm
  porta HTTP.
- **Decisão**: port `HealthProbe` em `application`; implementações em `infrastructure`
  (Postgres, Redis, HTTP, heartbeat). O handler `GetPlatformStatus` executa todos em paralelo com
  timeout de 2 s. Workers gravam heartbeat no Redis com TTL de 30 s.
- **Consequências**: adicionar componente = novo probe registrado na composição. O status depende
  do Redis para enxergar os workers: com o Redis fora, os workers também aparecem indisponíveis.
