PY_SERVICES := backend workers mcp

.PHONY: up down ps logs check check-python check-frontend check-secrets create-platform-admin

up:
	docker compose up -d --build --wait

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
