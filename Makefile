core-build:
	@echo "🕹  $@"
	cd ./packages/core && \
	npm run build && \
	npm run type
	@echo "☘️  $@"

core-dev: core-build
	@echo "🕹  $@"
	cd ./packages/core && \
	npm run dev
	@echo "☘️  $@"


core-test: core-build
	@echo "🕹  $@"
	cd ./packages/core && \
	npm run check
	@echo "☘️  $@"

eslint-build:
	@echo "🕹  $@"
	cd ./packages/eslint && \
	npm run build
	@echo "☘️  $@"

eslint-test: eslint-build
	@echo "🕹  $@"
	cd ./packages/eslint && \
	npm run check && \
	npm test
	@echo "☘️  $@"

test: core-test eslint-test
	