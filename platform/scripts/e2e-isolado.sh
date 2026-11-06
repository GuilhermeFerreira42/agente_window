#!/bin/sh
# ============================================================================
# platform/scripts/e2e-isolado.sh — roda E2E SEM tocar no estado do app real.
#
# POR QUE EXISTE (defeito medido, D167):
#   Os specs E2E rodam contra o MESMO servidor do app (`baseURL 127.0.0.1:5174`)
#   e gravavam em `~/.agente_window/agente_window.db`, que é o banco do produto.
#   Medido antes deste script: rodei `e2e/diff_sem_travar.spec.ts` com 2 sessões
#   no banco e saí com 3 — a nova, "DIFF-TRAVA reclick", apontando para
#   `/tmp/diff-travar-ws`, pasta que o spec cria e APAGA no fim.
#   Efeito no app do usuário, reproduzido: árvore vazia (0 nós), `400
#   invalid_workspace: ENOENT ... /tmp/diff-travar-ws` e o agente recusando com
#   "A pasta de trabalho da sessão não está acessível. Escolha a pasta de novo."
#   Ou seja: um teste antigo deixava o produto quebrado para quem abrisse depois.
#
# O QUE FAZ:
#   Sobe o Vite com `AGENTE_WINDOW_DATA_DIR` apontando para uma pasta descartável
#   em /tmp, roda os specs pedidos e apaga a pasta ao final. Não encosta em
#   `~/.agente_window`.
#
# USO:
#   sh platform/scripts/e2e-isolado.sh e2e/sessao_14d_commit_input.spec.ts
#   sh platform/scripts/e2e-isolado.sh              # suíte inteira (pesada)
# ============================================================================
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
node_bin=$(readlink -f "$project_root/platform/.runtime")/node-v26.13.0-linux-x64/bin
PATH="$node_bin:$PATH"
export PATH

pasta=$(mktemp -d /tmp/agente-window-e2e.XXXXXX)
porta=${E2E_PORT:-5199}
export AGENTE_WINDOW_DATA_DIR="$pasta"
export TMPDIR=${TMPDIR:-/tmp}

limpar() {
  if [ -n "${vite_pid:-}" ]; then kill "$vite_pid" 2>/dev/null || true; fi
  rm -rf "$pasta"
  echo "[e2e-isolado] estado descartável apagado: $pasta"
}
trap limpar EXIT INT TERM

echo "[e2e-isolado] pasta de dados do teste: $pasta"
echo "[e2e-isolado] o banco real (~/.agente_window) NÃO será tocado."

cd "$project_root/platform/apps/workbench-v2"
AGENTE_WINDOW_DATA_DIR="$pasta" ../../node_modules/.bin/vite --host 127.0.0.1 --port "$porta" --strictPort \
  > /tmp/e2e-isolado-vite.log 2>&1 &
vite_pid=$!

# espera o servidor responder (máx. 60 s)
i=0
while [ "$i" -lt 60 ]; do
  if ../../node_modules/.bin/vite --version >/dev/null 2>&1 && curl -s -o /dev/null "http://127.0.0.1:$porta/"; then break; fi
  i=$((i + 1))
  sleep 1
done
if [ "$i" -ge 60 ]; then
  echo "[e2e-isolado] o servidor não subiu; log em /tmp/e2e-isolado-vite.log" >&2
  exit 1
fi

PLAYWRIGHT_BASE_URL="http://127.0.0.1:$porta" \
PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}" \
  ../../node_modules/.bin/playwright test "$@"
