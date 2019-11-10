core-build:
	cd ./packages/core && \
	npm run build

core-dev: core-build
	cd ./packages/core && \
	npm run dev
