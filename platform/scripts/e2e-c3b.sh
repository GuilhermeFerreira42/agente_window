#!/bin/sh
# =============================================================================
# platform/scripts/e2e-c3b.sh — runner LINUX das jornadas C-3b (c3b_multimodal)
#
# Mesmo contrato de e2e-c3a.sh: Chromium do ambiente, NSS/NSPR via
# LD_LIBRARY_PATH, e a spec spawna o próprio Vite na porta 5216 com
# AGENTE_WINDOW_DATA_DIR descartável.
#
# USO: sh platform/scripts/e2e-c3b.sh
# Equivalente Windows: platform/scripts/e2e-c3b.ps1 (mesma porta, mesmas jornadas).
# =============================================================================
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
node_bin=$(readlink -f "$project_root/platform/.runtime")/node-v26.13.0-linux-x64/bin
PATH="$node_bin:$PATH"
export PATH

CHROMIUM="${PLAYWRIGHT_CHROMIUM_EXECUTABLE:-/tmp/chromium}"
if [ ! -x "$CHROMIUM" ]; then
  echo "RECUSADO: Chromium não encontrado em $CHROMIUM" >&2
  exit 2
fi
export PLAYWRIGHT_CHROMIUM_EXECUTABLE="$CHROMIUM"
export LD_LIBRARY_PATH="${LD_LIBRARY_PATH:-}:/tmp/al2023/lib"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
export PLAYWRIGHT_BASE_URL="http://127.0.0.1:5216"

cd "$project_root/platform/apps/workbench-v2"
../../node_modules/.bin/playwright test e2e/c3b_multimodal.spec.ts --workers=1 --retries=0 "$@"
