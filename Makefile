.DEFAULT_GOAL := help

NODE_BIN=node_modules/.bin
YARN=$(NODE_BIN)/yarn
TRUNK=$(NODE_BIN)/trunk
NPX=$(NODE_BIN)/npx

# Get the root directory of the project
ROOT_DIR:=$(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

help:
	@ printf "\033[1m%s\033[0m %s\n\n" "Usage:" "make <TARGET...>"
	@ echo "Make one or more targets as defined in the Makefile."
	@ printf "\n\033[1m%s\033[0m \n\n" "Available targets:"
	@ cat Makefile | \
		grep -E '^.PHONY: ([a-z-]+)  #' | \
		sed -E 's/.+ ([a-z-]+) [# ]+ (.*)/  \x1b[34m\1\x1b[0m\t\2/' | \
		column -t -s $$'\t'

.PHONY: env  # Allow direnv to load the .envrc file
env:
	direnv allow .

.PHONY: install  # Install the package.json dependencies with Yarn
install: env
	$(YARN) install

.PHONY: _debug-eslint-config  # Debug the ESLint configuration
_debug-eslint-config: install
	$(NPX) eslint --debug eslint.config.mjs

.PHONY: fmt  # Run the Trunk code formatter
fmt: install
	$(TRUNK) fmt

.PHONY: check  # Run the Trunk code checker
check: install
	$(TRUNK) check
