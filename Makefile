# All targets run inside Docker. Nothing needs to be installed on the host
# except Docker itself.

.DEFAULT_GOAL := help

COMPOSE := docker compose

.PHONY: help serve build bundle-update shell lint

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-16s %s\n", $$1, $$2}'

serve: ## Build site/gems.json and serve the page at http://localhost:8000/ (PORT=... to change)
	$(COMPOSE) up --build app

build: ## Build site/gems.json from the gems in the Gemfile
	$(COMPOSE) run --rm --build app bundle exec ruby build.rb

bundle-update: ## Update Gemfile.lock to the latest gems
	$(COMPOSE) run --rm --build app bundle lock --update

shell: ## Open a shell in the development container
	$(COMPOSE) run --rm --build app bash

lint: ## Lint .github/workflows/*.yml with actionlint
	$(COMPOSE) run --rm actionlint -color
