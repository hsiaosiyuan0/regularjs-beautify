core-build:
	cd ./packages/core && \
	npm run build && \
	npm run type

core-dev: core-build
	cd ./packages/core && \
	npm run dev
