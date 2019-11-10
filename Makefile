core-build:
	cd ./packages/core && \
	npm run build && \
	npm run type

core-dev: core-build
	cd ./packages/core && \
	npm run dev


core-test: core-build
	cd ./packages/core && \
	npm run check

eslint-build:
	cd ./packages/eslint && \
	npm run build

eslint-test: eslint-build
	cd ./packages/eslint && \
	npm run check && \
	npm test

test: core-test eslint-test
	