import { TemplateParams } from './app';

/** Derive a lower-case chain identifier from human-readable name. */
function chainId(p: TemplateParams): string {
  return p.name.toLowerCase().replace(/\s+/g, '-');
}

/** Derive the daemon binary name (e.g. "mychain" → "mychaind"). */
function binaryName(p: TemplateParams): string {
  return chainId(p).replace(/-/g, '') + 'd';
}

/** Go module path. */
function goModule(p: TemplateParams): string {
  return `github.com/${chainId(p)}/${chainId(p)}`;
}

/** Denom in lower-case. */
function denom(p: TemplateParams): string {
  return p.symbol.toLowerCase();
}

export function generateTxProto(p: TemplateParams, moduleName: string): string {
  const pkg = `${chainId(p)}.${moduleName}.v1`;
  const goPackage = `${goModule(p)}/x/${moduleName}/types`;

  return `syntax = "proto3";
package ${pkg};

option go_package = "${goPackage}";

import "amino/amino.proto";
import "cosmos/msg/v1/msg.proto";
import "cosmos_proto/cosmos.proto";
import "gogoproto/gogo.proto";
import "${chainId(p)}/${moduleName}/v1/genesis.proto";

service Msg {
  option (cosmos.msg.v1.service) = true;

  rpc UpdateParams(MsgUpdateParams) returns (MsgUpdateParamsResponse);
}

message MsgUpdateParams {
  option (cosmos.msg.v1.signer) = "authority";
  option (amino.name)           = "${chainId(p)}/${moduleName}/MsgUpdateParams";

  string authority = 1 [(cosmos_proto.scalar) = "cosmos.AddressString"];

  Params params = 2 [
    (gogoproto.nullable) = false,
    (amino.dont_omitempty) = true
  ];
}

message MsgUpdateParamsResponse {}
`;
}

export function generateQueryProto(p: TemplateParams, moduleName: string): string {
  const pkg = `${chainId(p)}.${moduleName}.v1`;
  const goPackage = `${goModule(p)}/x/${moduleName}/types`;

  return `syntax = "proto3";
package ${pkg};

option go_package = "${goPackage}";

import "gogoproto/gogo.proto";
import "google/api/annotations.proto";
import "cosmos/base/query/v1beta1/pagination.proto";
import "${chainId(p)}/${moduleName}/v1/genesis.proto";

service Query {

  rpc Params(QueryParamsRequest) returns (QueryParamsResponse) {
    option (google.api.http).get = "/${chainId(p)}/${moduleName}/v1/params";
  }
}

message QueryParamsRequest {}

message QueryParamsResponse {

  Params params = 1 [
    (gogoproto.nullable) = false
  ];
}
`;
}

export function generateGenesisProto(p: TemplateParams, moduleName: string): string {
  const pkg = `${chainId(p)}.${moduleName}.v1`;
  const goPackage = `${goModule(p)}/x/${moduleName}/types`;

  return `syntax = "proto3";
package ${pkg};

option go_package = "${goPackage}";

import "amino/amino.proto";
import "gogoproto/gogo.proto";

message GenesisState {

  Params params = 1 [
    (gogoproto.nullable) = false
  ];
}

message Params {
  option (amino.name) = "${chainId(p)}/${moduleName}/Params";

}
`;
}

export function generateBufYaml(p: TemplateParams): string {
  return `version: v1
name: buf.build/${chainId(p)}/${chainId(p)}

deps:
  - buf.build/cosmos/cosmos-sdk
  - buf.build/cosmos/cosmos-proto
  - buf.build/googleapis/googleapis
  - buf.build/cosmos/gogo-proto

lint:
  use:
    - DEFAULT
    - COMMENTS
    - UNARY_RPC
  except:
    - PACKAGE_VERSION_SUFFIX
    - SERVICE_SUFFIX
    - RPC_REQUEST_STANDARD_NAME
    - RPC_RESPONSE_STANDARD_NAME
    - RPC_REQUEST_RESPONSE_UNIQUE

breaking:
  use:
    - FILE
`;
}

export function generateBufGenYaml(p: TemplateParams): string {
  return `version: v1
managed:
  enabled: true
  go_package_prefix:
    default: ${goModule(p)}/api
    except:
      - buf.build/cosmos/cosmos-sdk
      - buf.build/cosmos/cosmos-proto
      - buf.build/cosmos/gogo-proto
      - buf.build/googleapis/googleapis

plugins:
  - name: gocosmos
    out: .
    opt: plugins=grpc,Mgoogle/protobuf/any.proto=github.com/cosmos/cosmos-sdk/codec/types
  - name: grpc-gateway
    out: .
    opt:
      - logtostderr=true
      - allow_colon_final_segments=true
`;
}

export function generateDockerfile(p: TemplateParams): string {
  const bin = binaryName(p);

  return `# ─── Builder ──────────────────────────────────────────────────────────────────
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache make git gcc musl-dev linux-headers

WORKDIR /src

# Cache dependency downloads
COPY go.mod go.sum ./
RUN go mod download

# Build
COPY . .
RUN LDFLAGS="-X main.Version=$(git describe --tags --always 2>/dev/null || echo dev) \\
             -X main.Commit=$(git log -1 --format='%H' 2>/dev/null || echo unknown)" && \\
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \\
    go build -ldflags "$LDFLAGS" -trimpath \\
    -o /usr/local/bin/${bin} ./cmd/${bin}

# ─── Runtime ──────────────────────────────────────────────────────────────────
FROM alpine:3.18

RUN apk add --no-cache ca-certificates curl jq && \\
    addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /usr/local/bin/${bin} /usr/local/bin/${bin}

USER appuser

EXPOSE 26656 26657 1317 9090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD curl -f http://localhost:26657/status || exit 1

ENTRYPOINT ["${bin}"]
CMD ["start"]
`;
}

export function generateDockerCompose(p: TemplateParams): string {
  const id = chainId(p);
  const bin = binaryName(p);

  return `version: "3.9"

services:
  # ── Blockchain Node ──────────────────────────────────────────────────────────
  ${id}-node:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ${id}-node
    restart: unless-stopped
    ports:
      - "26656:26656"   # P2P
      - "26657:26657"   # RPC
      - "1317:1317"     # REST / LCD
      - "9090:9090"     # gRPC
    volumes:
      - node-data:/home/appuser/.${bin}
    networks:
      - ${id}-net
    environment:
      - CHAIN_ID=${id}

  # ── Block Explorer (ping.pub compatible) ─────────────────────────────────────
  explorer:
    image: ghcr.io/ping-pub/explorer:latest
    container_name: ${id}-explorer
    restart: unless-stopped
    ports:
      - "8080:8080"
    depends_on:
      - ${id}-node
    networks:
      - ${id}-net
    environment:
      - API_URL=http://${id}-node:1317
      - RPC_URL=http://${id}-node:26657

volumes:
  node-data:

networks:
  ${id}-net:
    driver: bridge
`;
}

export function generateGithubCI(p: TemplateParams): string {
  const bin = binaryName(p);

  return `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  # ── Build ────────────────────────────────────────────────────────────────────
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        go-version: ["1.21", "1.22"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: \${{ matrix.go-version }}
      - name: Build
        run: make build

  # ── Test ─────────────────────────────────────────────────────────────────────
  test:
    runs-on: ubuntu-latest
    needs: build
    strategy:
      matrix:
        go-version: ["1.21", "1.22"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: \${{ matrix.go-version }}
      - name: Run tests
        run: make test
      - name: Upload coverage
        if: matrix.go-version == '1.22'
        uses: codecov/codecov-action@v4
        with:
          files: coverage.out

  # ── Lint ─────────────────────────────────────────────────────────────────────
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.22"
      - name: golangci-lint
        uses: golangci/golangci-lint-action@v4
        with:
          version: v1.56
          args: --timeout 5m

  # ── Proto Check ──────────────────────────────────────────────────────────────
  proto-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bufbuild/buf-setup-action@v1
        with:
          version: "1.28.1"
      - name: Buf lint
        run: buf lint proto
      - name: Buf breaking
        run: buf breaking proto --against '.git#branch=main'
`;
}

export function generateValidatorScript(p: TemplateParams): string {
  const id = chainId(p);
  const bin = binaryName(p);
  const d = denom(p);
  const supply = p.supply.replace(/[^0-9]/g, '') || '1000000000';

  return `#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# init-validator.sh — Bootstrap a single-validator devnet for ${p.name}
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

CHAIN_ID="${id}"
MONIKER="\${1:-my-validator}"
BINARY="${bin}"
DENOM="${d}"
KEYRING_BACKEND="test"
MIN_STAKE="${p.minStake}"
HOME_DIR="\${HOME}/.${bin}"

echo "════════════════════════════════════════════════════════════════"
echo "  ${p.name}  —  Validator Initialisation"
echo "════════════════════════════════════════════════════════════════"

# ── 1. Reset & init ──────────────────────────────────────────────────────────
echo "🔧  Initialising node '\${MONIKER}' on chain '\${CHAIN_ID}'..."
\${BINARY} init "\${MONIKER}" --chain-id "\${CHAIN_ID}" --home "\${HOME_DIR}" 2>/dev/null

# ── 2. Create operator key ───────────────────────────────────────────────────
echo "🔑  Creating validator key..."
\${BINARY} keys add validator \\
  --keyring-backend "\${KEYRING_BACKEND}" \\
  --home "\${HOME_DIR}" 2>/dev/null

VALIDATOR_ADDR=$(\${BINARY} keys show validator -a \\
  --keyring-backend "\${KEYRING_BACKEND}" \\
  --home "\${HOME_DIR}")

echo "    Address: \${VALIDATOR_ADDR}"

# ── 3. Fund genesis account ─────────────────────────────────────────────────
echo "💰  Adding genesis account with ${supply}${d}..."
\${BINARY} genesis add-genesis-account "\${VALIDATOR_ADDR}" "${supply}\${DENOM}" \\
  --home "\${HOME_DIR}" \\
  --keyring-backend "\${KEYRING_BACKEND}"

# ── 4. Generate gentx ───────────────────────────────────────────────────────
echo "📝  Creating gentx (self-delegation: \${MIN_STAKE}\${DENOM})..."
\${BINARY} genesis gentx validator "\${MIN_STAKE}\${DENOM}" \\
  --chain-id "\${CHAIN_ID}" \\
  --moniker "\${MONIKER}" \\
  --commission-rate "0.10" \\
  --commission-max-rate "0.20" \\
  --commission-max-change-rate "0.01" \\
  --min-self-delegation "1" \\
  --keyring-backend "\${KEYRING_BACKEND}" \\
  --home "\${HOME_DIR}"

# ── 5. Collect gentxs ───────────────────────────────────────────────────────
echo "📦  Collecting genesis transactions..."
\${BINARY} genesis collect-gentxs --home "\${HOME_DIR}"

# ── 6. Validate genesis ─────────────────────────────────────────────────────
echo "✅  Validating genesis file..."
\${BINARY} genesis validate-genesis --home "\${HOME_DIR}"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅  Validator initialised successfully!"
echo "  Run '\${BINARY} start --home \${HOME_DIR}' to launch the node."
echo "════════════════════════════════════════════════════════════════"
`;
}

export function generateDeployScript(p: TemplateParams): string {
  const id = chainId(p);
  const bin = binaryName(p);

  return `#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# deploy.sh — Build and deploy ${p.name}
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

CHAIN_ID="${id}"
BINARY="${bin}"

echo "════════════════════════════════════════════════════════════════"
echo "  ${p.name}  —  Deployment"
echo "════════════════════════════════════════════════════════════════"

# ── 1. Build ─────────────────────────────────────────────────────────────────
echo "📦  Building \${BINARY}..."
make build

if [ ! -f "./build/\${BINARY}" ]; then
  echo "❌  Build failed — binary not found."
  exit 1
fi

echo "    Binary: ./build/\${BINARY}"
echo "    Version: $(./build/\${BINARY} version 2>/dev/null || echo unknown)"

# ── 2. Docker image ─────────────────────────────────────────────────────────
echo "🐳  Building Docker image..."
docker build -t "\${CHAIN_ID}:latest" .

# ── 3. Start services ───────────────────────────────────────────────────────
echo "🚀  Starting services with Docker Compose..."
docker compose up -d

# ── 4. Health check ──────────────────────────────────────────────────────────
echo "⏳  Waiting for node to become healthy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:26657/status > /dev/null 2>&1; then
    echo "✅  Node is healthy!"
    break
  fi
  if [ "\$i" -eq 30 ]; then
    echo "⚠️   Node did not become healthy within 30 seconds."
    echo "    Check logs: docker compose logs -f"
    exit 1
  fi
  sleep 1
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅  Deployment complete"
echo ""
echo "  Endpoints:"
echo "    RPC   → http://localhost:26657"
echo "    REST  → http://localhost:1317"
echo "    gRPC  → localhost:9090"
echo "    P2P   → localhost:26656"
echo "════════════════════════════════════════════════════════════════"
`;
}

export function generateGoMod(p: TemplateParams): string {
  const mod = goModule(p);
  const hasIBC = p.features.includes('ibc');
  const hasWasm = p.features.includes('smartContracts');

  let deps = `\tgithub.com/cosmos/cosmos-sdk v0.50.6
\tcosmossdk.io/api v0.7.4
\tcosmossdk.io/core v0.12.0
\tcosmossdk.io/depinject v1.0.0-alpha.4
\tcosmossdk.io/log v1.3.1
\tcosmossdk.io/math v1.3.0
\tcosmossdk.io/store v1.1.0
\tcosmossdk.io/x/evidence v0.1.0
\tcosmossdk.io/x/feegrant v0.1.0
\tcosmossdk.io/x/upgrade v0.1.1
\tgithub.com/cometbft/cometbft v0.38.7
\tgithub.com/cosmos/cosmos-proto v1.0.0-beta.5
\tgithub.com/cosmos/gogoproto v1.4.12
\tgithub.com/grpc-ecosystem/grpc-gateway v1.16.0
\tgithub.com/spf13/cobra v1.8.0
\tgoogle.golang.org/grpc v1.63.2
\tgoogle.golang.org/protobuf v1.33.0`;

  if (hasIBC) {
    deps += `\n\tgithub.com/cosmos/ibc-go/v8 v8.2.0`;
  }

  if (hasWasm) {
    deps += `\n\tgithub.com/CosmWasm/wasmd v0.50.0`;
  }

  return `module ${mod}

go 1.21

require (
${deps}
)
`;
}

export function generateMakefile(p: TemplateParams): string {
  const bin = binaryName(p);
  const id = chainId(p);

  return `#!/usr/bin/make -f

BINARY_NAME  := ${bin}
VERSION      := $(shell git describe --tags --always 2>/dev/null || echo "v0.1.0")
COMMIT       := $(shell git log -1 --format='%H' 2>/dev/null || echo "unknown")
BUILD_DIR    := ./build
DOCKER_TAG   := ${id}:$(VERSION)

LDFLAGS := -X main.Version=$(VERSION) \\
           -X main.Commit=$(COMMIT) \\
           -X github.com/cosmos/cosmos-sdk/version.Name=${p.name} \\
           -X github.com/cosmos/cosmos-sdk/version.AppName=$(BINARY_NAME) \\
           -X github.com/cosmos/cosmos-sdk/version.Version=$(VERSION) \\
           -X github.com/cosmos/cosmos-sdk/version.Commit=$(COMMIT)

BUILD_FLAGS := -ldflags "$(LDFLAGS)" -trimpath

.DEFAULT_GOAL := install

.PHONY: all install build clean test lint proto-gen docker-build init

all: lint test build

# ── Install ────────────────────────────────────────────────────────────────────
install: go.sum
\tgo install $(BUILD_FLAGS) ./cmd/$(BINARY_NAME)

# ── Build ──────────────────────────────────────────────────────────────────────
build: go.sum
\t@mkdir -p $(BUILD_DIR)
\tgo build $(BUILD_FLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) ./cmd/$(BINARY_NAME)
\t@echo "✅  Binary: $(BUILD_DIR)/$(BINARY_NAME)"

# ── Clean ──────────────────────────────────────────────────────────────────────
clean:
\trm -rf $(BUILD_DIR)

# ── Test ───────────────────────────────────────────────────────────────────────
test:
\tgo test ./... -race -coverprofile=coverage.out -covermode=atomic
\t@echo "✅  Tests passed"

# ── Lint ───────────────────────────────────────────────────────────────────────
lint:
\t@command -v golangci-lint >/dev/null 2>&1 || { echo "Install golangci-lint first"; exit 1; }
\tgolangci-lint run --timeout 5m

# ── Protobuf Generation ───────────────────────────────────────────────────────
proto-gen:
\t@echo "🔄  Generating protobuf code..."
\tbuf generate proto
\t@echo "✅  Proto generation complete"

proto-lint:
\tbuf lint proto

proto-format:
\tbuf format -w proto

# ── Docker ─────────────────────────────────────────────────────────────────────
docker-build:
\tdocker build -t $(DOCKER_TAG) .
\t@echo "✅  Docker image: $(DOCKER_TAG)"

# ── Init (local devnet) ───────────────────────────────────────────────────────
init:
\t./scripts/init-validator.sh

# ── Dependencies ───────────────────────────────────────────────────────────────
go.sum: go.mod
\tgo mod verify
\tgo mod tidy
`;
}

export function generateReadme(p: TemplateParams): string {
  const id = chainId(p);
  const bin = binaryName(p);
  const d = denom(p);
  const supply = p.supply.replace(/[^0-9]/g, '') || '1000000000';

  const featureList = p.features.map(f => `- ✅ **${f}**`).join('\n');

  return `# ${p.name}

> ${p.description || 'A sovereign blockchain built with the Cosmos SDK.'}

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/${id}/${id})
[![CI](https://github.com/${id}/${id}/actions/workflows/ci.yml/badge.svg)](https://github.com/${id}/${id}/actions/workflows/ci.yml)
[![Go Report Card](https://goreportcard.com/badge/github.com/${id}/${id})](https://goreportcard.com/report/github.com/${id}/${id})

---

## Overview

| Parameter           | Value |
|---------------------|-------|
| **Chain ID**        | \`${id}\` |
| **Symbol / Denom**  | \`${p.symbol}\` / \`${d}\` |
| **Consensus**       | ${p.consensus} |
| **Total Supply**    | ${Number(supply).toLocaleString()} ${d} |
| **Block Time**      | ~${p.blockTime}s |
| **Inflation**       | ${p.inflationRate}% |
| **Max Validators**  | ${p.maxValidators} |
| **Min Stake**       | ${Number(p.minStake).toLocaleString()} ${d} |
| **Unbonding Period**| ${p.unbondingDays} days |
| **SDK Version**     | Cosmos SDK v0.50.x |

## Features

${featureList}

## Prerequisites

- [Go](https://go.dev/dl/) ≥ 1.21
- [Buf](https://buf.build/) (for protobuf)
- [Docker](https://www.docker.com/) (optional)
- [golangci-lint](https://golangci-lint.run/) (optional, for linting)

## Quick Start

### Build & Install

\`\`\`bash
# Build the daemon binary
make build

# Or install into $GOPATH/bin
make install
\`\`\`

### Initialise a Local Devnet

\`\`\`bash
# One-command validator bootstrap
make init

# Or run the script directly
./scripts/init-validator.sh my-validator

# Start the node
${bin} start
\`\`\`

### Docker

\`\`\`bash
# Build the image
make docker-build

# Run with Docker Compose
docker compose up -d
\`\`\`

## Endpoints (default)

| Service | URL |
|---------|-----|
| P2P     | \`localhost:26656\` |
| RPC     | \`http://localhost:26657\` |
| REST    | \`http://localhost:1317\` |
| gRPC    | \`localhost:9090\` |
| Explorer| \`http://localhost:8080\` |

## Project Structure

\`\`\`
${id}/
├── app/                    # Application wiring (app.go)
├── cmd/${bin}/       # Daemon entry-point
├── config/                 # Genesis & node configuration
├── proto/                  # Protobuf definitions
│   └── ${id}/
├── scripts/                # Validator & deployment helpers
├── x/                      # Custom Cosmos SDK modules
├── buf.yaml                # Buf configuration
├── buf.gen.yaml            # Buf code generation
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Compose orchestration
├── Makefile                # Build system
└── go.mod
\`\`\`

## Development

### Run Tests

\`\`\`bash
make test
\`\`\`

### Lint

\`\`\`bash
make lint
\`\`\`

### Regenerate Protobuf

\`\`\`bash
make proto-gen
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'feat: add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

*Built with [Cosmos SDK](https://github.com/cosmos/cosmos-sdk) v0.50 and [CometBFT](https://github.com/cometbft/cometbft)*
`;
}

export function generateGitignore(p: TemplateParams): string {
  const bin = binaryName(p);

  return `# ── Build artefacts ───────────────────────────────────────────────────────────
build/
dist/
*.exe
*.dll
*.so
*.dylib
${bin}

# ── Go ───────────────────────────────────────────────────────────────────────
vendor/
coverage.out
*.test
*.prof

# ── Node / tools ─────────────────────────────────────────────────────────────
node_modules/

# ── IDE ──────────────────────────────────────────────────────────────────────
.idea/
.vscode/
*.swp
*.swo
*~

# ── Docker ───────────────────────────────────────────────────────────────────
node-data/

# ── OS ───────────────────────────────────────────────────────────────────────
.DS_Store
Thumbs.db

# ── Environment ──────────────────────────────────────────────────────────────
.env
.env.*
!.env.example

# ── Logs ─────────────────────────────────────────────────────────────────────
*.log
`;
}

export function generateDevcontainerJson(p: TemplateParams): string {
  return `{
  "name": "${p.name} Devcontainer",
  "image": "mcr.microsoft.com/devcontainers/go:1-1.21-bullseye",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "golang.go",
        "tamasfe.even-better-toml",
        "redhat.vscode-yaml"
      ]
    }
  },
  "postCreateCommand": "make install && chmod +x ./scripts/init-validator.sh && ./scripts/init-validator.sh my-validator",
  "forwardPorts": [1317, 9090, 26656, 26657],
  "portsAttributes": {
    "1317": { "label": "REST API", "onAutoForward": "notify" },
    "26657": { "label": "RPC", "onAutoForward": "notify" },
    "9090": { "label": "gRPC", "onAutoForward": "silent" },
    "26656": { "label": "P2P", "onAutoForward": "silent" }
  }
}
`;
}
