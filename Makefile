PY_SERVICES := backend workers mcp
# Variáveis obrigatórias do .env que o `make env` preenche com valores aleatórios.
GENERATED_SECRETS := POSTGRES_PASSWORD EVOLUTION_API_KEY EVOLUTION_WEBHOOK_SECRET INTERNAL_API_TOKEN
# `make up SEED=0` sobe sem gravar a demonstração.
SEED ?= 1

.PHONY: help up env seed reset down ps logs check check-python check-frontend check-secrets create-platform-admin

help:
	@echo "make up       cria o .env se faltar, sobe tudo, aguarda e grava a demonstração"
	@echo "make seed     regrava a demonstração (conversas fictícias de WhatsApp e Slack)"
	@echo "make reset    apaga os volumes e sobe do zero"
	@echo "make down     para tudo; os dados ficam nos volumes"
	@echo "make ps | logs | check | create-platform-admin EMAIL=... NAME=..."

up: env
	docker compose up -d --build --wait
	@if [ "$(SEED)" != "0" ]; then $(MAKE) --no-print-directory seed; fi
	@echo ""
	@echo "Plataforma: http://localhost:$$(grep -E '^FRONTEND_PORT=' .env | cut -d= -f2 | grep . || echo 8180)"
	@echo "E-mails:    http://localhost:$$(grep -E '^MAILPIT_PORT=' .env | cut -d= -f2 | grep . || echo 8125)"

# Cria o .env a partir do .env.example e gera os segredos obrigatórios que estiverem vazios.
# Não altera valores já preenchidos.
env:
	@test -f .env || { cp .env.example .env; echo "Criado .env a partir do .env.example"; }
	@for name in $(GENERATED_SECRETS); do \
		if grep -qE "^$$name=$$" .env; then \
			value=$$(openssl rand -hex 24); \
			awk -v n="$$name" -v v="$$value" 'BEGIN { FS = OFS = "=" } $$1 == n && $$2 == "" { $$2 = v } { print }' .env > .env.tmp && mv .env.tmp .env; \
			echo "Gerado $$name no .env"; \
		fi; \
	done

seed:
	docker compose exec -T -e DEMO_EMAIL -e DEMO_PASSWORD backend python -m app.cli seed-demo

reset:
	docker compose down -v
	$(MAKE) --no-print-directory up

down:
	docker compose down

ps:
	docker compose ps

logs:
	docker compose logs -f

create-platform-admin:
	docker compose exec backend python -m app.cli create-platform-admin --email "$(EMAIL)" --name "$(NAME)"

check: check-python check-frontend check-secrets

check-python:
	@set -e; for service in $(PY_SERVICES); do \
		echo "== $$service"; \
		cd apps/$$service; \
		uv sync --locked; \
		uv run ruff check .; \
		uv run ruff format --check .; \
		uv run mypy; \
		uv run lint-imports; \
		uv run pytest -q; \
		cd ../..; \
	done

check-frontend:
	cd apps/frontend && pnpm install --frozen-lockfile && pnpm check

check-secrets:
	docker run --rm -v "$(CURDIR):/repo" zricethezav/gitleaks:v8.30.1 detect --source /repo --no-banner --redact
