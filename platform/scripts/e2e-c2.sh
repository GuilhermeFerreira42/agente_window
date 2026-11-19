#!/bin/sh
# =============================================================================
# platform/scripts/e2e-c2.sh — runner LINUX da suíte C-2 (c2_centro)
#
# Mesmo contrato do e2e-c1.sh: Chromium do ambiente (CDN Playwright fora da
# lista de hosts), NSS/NSPR via LD_LIBRARY_PATH, e a spec spawna o próprio Vite
# na porta 5212 com AGENTE_WINDOW_DATA_DIR descartável.
#
# USO: sh platform/scripts/e2e-c2.sh
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
export PLAYWRIGHT_BASE_URL="http://127.0.0.1:5212"

cd "$project_root/platform/apps/workbench-v2"
../../node_modules/.bin/playwright test e2e/c2_centro.spec.ts "$@"
