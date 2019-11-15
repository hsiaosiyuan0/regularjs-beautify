default: build

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

eslint-build: core-build
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

dozen-build: core-build
	@echo "🕹  $@"
	cd ./packages/dozen && \
	npm run build
	@echo "☘️  $@"

dozen-test: dozen-build
	@echo "🕹  $@"
	cd ./packages/dozen && \
	npm test
	@echo "☘️  $@"

build: core-build eslint-build dozen-build

test: core-test eslint-test
	