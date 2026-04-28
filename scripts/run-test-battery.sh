#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "[1/3] Backend unit tests"
bash scripts/run-backend-unit-tests.sh

echo "[2/3] Frontend typecheck"
bash scripts/run-frontend-typecheck.sh

echo "[3/3] End-to-end regression"
bash scripts/run-regression-tests.sh