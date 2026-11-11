#!/bin/sh
# ============================================================================
# gate-unit.sh — GATE CANONICO da suite unitaria (Vitest), Fatia 15.
#
# Por que este script existe (2026-11-06):
#   Uma medicao anterior deu "22 falhas em 19 arquivos" e o numero foi para o
#   painel como se fosse do produto. Nao era. Duas variaveis de ambiente do
#   proprio harness estavam erradas e fabricavam 4 falhas:
#
#   1. TMPDIR=/home/user/.cache/tmp
#      O filtro de ruido do ExplorerFsWatcher (server/fs/watcher.ts) casa com
#      QUALQUER caminho que contenha o segmento `.cache`. Com as fixtures do
#      teste criadas dentro de .cache, todo evento era descartado na emissao e
#      o teste esperava 2 s por um fs.changed que nunca viria. O produto estava
#      certo; o TMPDIR e que estava dentro de uma pasta de ruido.
#
#   2. AGENTE_WINDOW_TEST_HOME nao definido
#      session-persistence/index.test.ts deriva o workspace com
#      join(process.env.AGENTE_WINDOW_TEST_HOME, ...) e estoura
#      "The path argument must be of type string. Received undefined".
#      Outros dois arquivos da mesma pasta se AUTO-PULAM sem esta variavel
#      (agirContext/database) — ou seja, sem ela o gate tambem conta menos
#      testes. Isto ja estava documentado no repo (docs/arquivo_morto/investigacao_memoria_fatias_m
#      e docs/06) e mesmo assim se perdeu no meio da rodada.
#
# Uso:
#   sh platform/scripts/gate-unit.sh              # suite completa
#   sh platform/scripts/gate-unit.sh <arquivos>   # alvos especificos
#
# Saida: resumo legivel + relatorio JSON em $GATE_OUT_DIR.
# ============================================================================
set -u

RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
APP="$RAIZ/platform/apps/workbench-v2"
NR="$RAIZ/platform/.runtime/node-v26.13.0-linux-x64/bin"
VITEST="$RAIZ/platform/node_modules/.bin/vitest"

# --- ambiente canonico (a correcao mora aqui) -------------------------------
GATE_OUT_DIR="${GATE_OUT_DIR:-$(mktemp -d)}"
TMPDIR_BOM="${TMPDIR_BOM:-$RAIZ/../tmp-testes}"
mkdir -p "$TMPDIR_BOM" "$GATE_OUT_DIR"
export TMPDIR="$TMPDIR_BOM"
export AGENTE_WINDOW_TEST_HOME="$TMPDIR_BOM/home-teste"
mkdir -p "$AGENTE_WINDOW_TEST_HOME"

# HOME isolado: sem isto o gate le o estado real do usuario. Medido em 2026-11-06:
# existia um ~/.agente_window/skills/commit de uma execucao anterior e as rotas de
# personalizacoes respondiam com ele, quebrando 3 testes que esperam visao limpa.
# Com HOME isolado: 30/30 no arquivo. Isolar o HOME e' o que a documentacao de
# teste do proprio repo ja mandava fazer (docs/arquivo_morto/investigacao_memoria_fatias_m/06).
export HOME="$TMPDIR_BOM/home-isolado"
mkdir -p "$HOME"
export PATH="$NR:$PATH"

# Guarda-corpo: se o TMPDIR cair dentro de uma pasta de ruido do watcher, o
# gate mente de novo. Melhor recusar do que medir errado.
case "$TMPDIR" in
  */.cache/*|*/.cache|*/node_modules/*|*/.git/*)
    echo "RECUSADO: TMPDIR=$TMPDIR cai no filtro de ruido do explorer-fs-watcher." >&2
    echo "          Use um diretorio fora de node_modules/.git/.cache/." >&2
    exit 2 ;;
esac

[ -x "$VITEST" ] || { echo "RECUSADO: vitest ausente em $VITEST (rode restaurar-ambiente.sh)." >&2; exit 2; }
[ -d "$NR" ] || { echo "RECUSADO: runtime Node ausente em $NR (rode restaurar-ambiente.sh)." >&2; exit 2; }

# --- execucao ---------------------------------------------------------------
cd "$APP" || exit 2
REL="${GATE_OUT_DIR}/gate-unit.json"
if [ "$#" -gt 0 ]; then
  "$VITEST" run "$@" --reporter=json --outputFile="$REL"
else
  "$VITEST" run --reporter=json --outputFile="$REL"
fi
EXIT=$?

# --- resumo -----------------------------------------------------------------
if [ -f "$REL" ]; then
  PATH="$NR:$PATH" node - "$REL" "$EXIT" <<'JS'
const fs = require('node:fs')
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const exit = process.argv[3]
const porArquivo = new Map()
for (const s of d.testResults ?? []) {
  const n = (s.assertionResults ?? []).filter((a) => a.status === 'failed').length
  if (n) porArquivo.set(s.name.split('/workbench-v2/')[1] ?? s.name, n)
}
console.log('')
console.log('=== GATE UNITARIO (ambiente canonico) ===')
console.log(`testes   : ${d.numTotalTests}`)
console.log(`aprovados: ${d.numPassedTests}`)
console.log(`falhas   : ${d.numFailedTests}`)
console.log(`pulados  : ${d.numPendingTests}`)
console.log(`arquivos : ${d.numTotalTestSuites} (com falha: ${d.numFailedTestSuites})`)
console.log(`exit     : ${exit}`)
if (porArquivo.size) {
  console.log('--- falhas por arquivo ---')
  for (const [k, v] of [...porArquivo].sort((a, b) => b[1] - a[1])) console.log(`  ${v}  ${k}`)
}
JS
else
  echo "Sem relatorio JSON — a execucao nao chegou ao fim." >&2
fi

exit "$EXIT"
