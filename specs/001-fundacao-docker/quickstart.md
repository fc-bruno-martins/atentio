# Quickstart — Judite

Pré-requisito: Docker com Compose v2.

```bash
cp .env.example .env
# edite .env e preencha as variáveis marcadas como OBRIGATÓRIA (senhas e chaves)
make up            # = docker compose up -d --build --wait
make ps            # estado de cada serviço (todos "healthy")
open http://localhost:8180   # página de status
make down          # para tudo; dados persistem nos volumes
```

Validação dos cenários:

| Cenário | Como verificar |
|---|---|
| US1 | `make up` termina sem erro e `make ps` mostra todos `healthy` |
| US1.3 | apagar `POSTGRES_PASSWORD` do `.env` → `make up` falha citando a variável |
| US2 | `http://localhost:8180` mostra os 6 componentes disponíveis |
| US2.2 | `docker compose stop workers` → em até 30 s "workers" fica indisponível |
| US3 | `curl localhost:8100/api/status` mostra `schema_version`; `make down && make up` mantém |

Qualidade (testes, lint, type-check, build): `make check`.
