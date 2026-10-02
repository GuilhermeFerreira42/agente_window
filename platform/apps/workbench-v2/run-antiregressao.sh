#!/usr/bin/env bash
# FATIA-05 — anti-regressão §9 do docs/24 (12 suítes), em série, com reseed da fixture antes de cada uma.
# 11_interactive_v2 e 14b_smoke rodam contra 5174 (repo); as demais contra a fixture 5175.
cd "$(dirname "$0")"
reseed() {
  # não apagar a raiz observada pelo Vite 5175 — só o conteúdo (watcher quebra se o diretório some)
  mkdir -p /tmp/explorer-fs-fixture && find /tmp/explorer-fs-fixture -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  R=/tmp/explorer-fs-fixture/e2e-fixture-root
  mkdir -p "$R/pasta/sub" "$R/outra"
  printf 'SEED-VAL-FS-12 explorer 4.4\n' > "$R/seed.txt"; echo alpha > "$R/pasta/alpha.txt"; echo beta > "$R/pasta/beta.txt"
  echo deep > "$R/pasta/sub/deep.txt"; echo renomear-eu > "$R/renomeavel.txt"; echo omega > "$R/outra/omega.txt"
}
run() { # $1 spec  $2 base
  reseed; rm -rf test-results
  r=$(PLAYWRIGHT_BASE_URL="$2" timeout 900 npx playwright test "e2e/$1" --reporter=line 2>&1 | grep -E "^\s+[0-9]+ (passed|failed|flaky|skipped)" | tr '\n' ' ')
  echo "$1: $r"
}
F=http://127.0.0.1:5175; M=http://127.0.0.1:5174
[ -n "$ONLY_FAILED" ] || run sessao_11_terminal_pty_real "$F"
run sessao_11_terminal_interactive_v2 "$M"
[ -n "$ONLY_FAILED" ] || run sessao_12_explorer.spec "$F"
run sessao_12_explorer_fs_backend "$F"
[ -n "$ONLY_FAILED" ] || run sessao_13_search.spec "$F"
[ -n "$ONLY_FAILED" ] || run sessao_13_search_backend "$F"
run sessao_14_editor_anexo "$F"
run sessao_14b_git_changes "$F"
[ -n "$ONLY_FAILED" ] || run sessao_14b_git_backend "$F"
run sessao_14b_git_smoke "$M"
run sessao_14c_diff_minimal "$F"
run sessao_14d_commit_input "$F"
run sessao_15_activity_bar "$F"
run sessao_15_drag_drop_views "$F"
