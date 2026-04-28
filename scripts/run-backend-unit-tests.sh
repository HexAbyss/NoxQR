#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUST_IMAGE="${RUST_IMAGE:-rust:1.88-bookworm}"

cd "$ROOT_DIR"

docker run --rm \
  -v "$ROOT_DIR/backend:/work" \
  -w /work \
  "$RUST_IMAGE" \
  bash -lc 'set -euo pipefail; export PATH="/usr/local/cargo/bin:$PATH"; cargo test'