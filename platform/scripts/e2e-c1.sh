#!/bin/sh
# =============================================================================
# platform/scripts/e2e-c1.sh — testes INTEGRADOS da correção C-1 (B1/B2/B3/F4)
#
# Por que existe (15/11, revisão Codex):
#   A suíte exige servidor REAL + NAVEGADOR + backend controlado. Este script:
#     · aponta o Chromium disponível no ambiente (o CDN do Playwright está
#       fora da lista de hosts autorizados — o bundle não baixa);
#     · exporta LD_LIBRARY_PATH com as NSS/NSPR do ambiente;
#     · roda e2e/c1_correcoes.spec.ts, que spawna o Vite ele mesmo (receita da
#       m7_restart) com AGENTE_WINDOW_DATA_DIR descartável — o banco real do
#       usuário NUNCA é tocado.
#
# USO:
#   sh platform/scripts/e2e-c1.sh
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
# A spec spawna o Vite na 5211; os helpers (resetApp) seguem o mesmo base.
export PLAYWRIGHT_BASE_URL="http://127.0.0.1:5211"

cd "$project_root/platform/apps/workbench-v2"
../../node_modules/.bin/playwright test e2e/c1_correcoes.spec.ts "$@"
