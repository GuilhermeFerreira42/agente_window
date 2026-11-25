#!/bin/sh
# =============================================================================
# platform/scripts/e2e-u1.sh — runner LINUX da jornada U-1 (u1_configuracoes_unificadas)
#
# Mesmo contrato de e2e-c3b.sh: Chromium do ambiente, NSS/NSPR via
# LD_LIBRARY_PATH, e a spec spawna o próprio Vite na porta 5218 com pastas de
# dados descartáveis — o banco/provedores do dono nunca são tocados.
#
# USO: sh platform/scripts/e2e-u1.sh
# Equivalente Windows: platform/scripts/e2e-u1.ps1 (mesma porta, mesmas jornadas).
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
export PLAYWRIGHT_BASE_URL="http://127.0.0.1:5218"

cd "$project_root/platform/apps/workbench-v2"
../../node_modules/.bin/playwright test e2e/u1_configuracoes_unificadas.spec.ts --workers=1 --retries=0 "$@"
