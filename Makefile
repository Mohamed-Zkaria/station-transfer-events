.PHONY: run test test-e2e build lint

run:
	npm run start:dev

test:
	npm test

test-e2e:
	npm run test:e2e

build:
	npm run build

lint:
	npm run lint
