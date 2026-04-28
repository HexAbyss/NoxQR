#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLAYWRIGHT_IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.53.0-noble}"
FRONTEND_URL="${NOX_E2E_FRONTEND_URL:-http://127.0.0.1:3080}"
BACKEND_URL="${NOX_E2E_BACKEND_URL:-http://127.0.0.1:3081}"
KEEP_STACK="${NOX_E2E_KEEP_STACK:-0}"

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempts="${3:-30}"
  local attempt

  for ((attempt = 1; attempt <= attempts; attempt += 1)); do
    if curl --fail --silent --show-error "$url" >/dev/null 2>&1; then
      return 0
    fi

    if [[ "$attempt" -eq "$attempts" ]]; then
      echo "Timed out waiting for ${label} at ${url}" >&2
      curl --fail --silent --show-error "$url" >/dev/null
    fi

    sleep 1
  done
}

cleanup() {
  if [[ "$KEEP_STACK" == "1" ]]; then
    return
  fi

  docker compose down --remove-orphans >/dev/null 2>&1 || true
}

cd "$ROOT_DIR"

trap cleanup EXIT

docker compose up -d --build frontend backend

wait_for_url "$BACKEND_URL/health" "backend health endpoint"
wait_for_url "$FRONTEND_URL" "frontend root page"

docker run --rm \
  --network host \
  -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
  -e NOX_E2E_FRONTEND_URL="$FRONTEND_URL" \
  -e NOX_E2E_BACKEND_URL="$BACKEND_URL" \
  -v "$ROOT_DIR:/work" \
  -w /work \
  "$PLAYWRIGHT_IMAGE" \
  bash -lc '
    set -euo pipefail
    mkdir -p /tmp/nox-e2e
    npm init -y --prefix /tmp/nox-e2e >/dev/null 2>&1
    npm install --prefix /tmp/nox-e2e @playwright/test@1.53.0 >/dev/null 2>&1

    if [[ -e /work/node_modules ]]; then
      echo "Expected /work/node_modules to be absent during regression run" >&2
      exit 1
    fi

    cleanup() {
      if [[ -L /work/node_modules ]] && [[ "$(readlink /work/node_modules)" == "/tmp/nox-e2e/node_modules" ]]; then
        rm /work/node_modules
      fi
    }

    trap cleanup EXIT
    ln -s /tmp/nox-e2e/node_modules /work/node_modules

    cd /work
    /tmp/nox-e2e/node_modules/.bin/playwright test tests/e2e/regression.spec.mjs --reporter=line
  '