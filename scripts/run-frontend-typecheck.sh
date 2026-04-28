#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_IMAGE="${NODE_IMAGE:-node:22-bookworm}"

cd "$ROOT_DIR"

docker run --rm \
  -v "$ROOT_DIR/frontend:/work" \
  -w /work \
  "$NODE_IMAGE" \
  bash -lc 'set -euo pipefail; npm install --package-lock=false >/dev/null 2>&1; npm run typecheck'