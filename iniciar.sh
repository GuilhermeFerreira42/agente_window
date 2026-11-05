#!/bin/sh
set -eu
project_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
platform_root="$project_root/platform"
node_version=$(sed -n 's/.*"nodeVersion": "\([0-9][0-9.]*\)".*/\1/p' "$platform_root/runtime.json")
case "$node_version" in ''|*[!0-9.]*) echo 'Versao de Node invalida.' >&2; exit 1;; esac
case "$(uname -s)" in Linux) system=linux;; Darwin) system=darwin;; *) echo 'Use iniciar.cmd no Windows.' >&2; exit 1;; esac
case "$(uname -m)" in x86_64|amd64) architecture=x64;; aarch64|arm64) architecture=arm64;; *) echo 'Arquitetura nao suportada.' >&2; exit 1;; esac
distribution="node-v$node_version-$system-$architecture"
runtime_root="$platform_root/.runtime"
node_executable="$runtime_root/$distribution/bin/node"
if [ ! -x "$node_executable" ] || [ "$("$node_executable" --version)" != "v$node_version" ]; then
  mkdir -p "$runtime_root"
  archive="$distribution.tar.xz"
  base_url="https://nodejs.org/dist/v$node_version"
  printf '[ambiente] Preparando Node %s para este projeto...\n' "$node_version"
  curl --fail --location --proto '=https' --tlsv1.2 "$base_url/$archive" -o "$runtime_root/$archive"
  curl --fail --location --proto '=https' --tlsv1.2 "$base_url/SHASUMS256.txt" -o "$runtime_root/SHASUMS256.txt"
  expected=$(awk -v name="$archive" '$2 == name {print $1}' "$runtime_root/SHASUMS256.txt")
  if command -v sha256sum >/dev/null 2>&1; then actual=$(sha256sum "$runtime_root/$archive" | awk '{print $1}'); else actual=$(shasum -a 256 "$runtime_root/$archive" | awk '{print $1}'); fi
  [ -n "$expected" ] && [ "$expected" = "$actual" ] || { echo 'A integridade do Node nao confere.' >&2; exit 1; }
  tar -xJf "$runtime_root/$archive" -C "$runtime_root"
fi
if [ "$#" -eq 0 ]; then set -- dev; fi
exec "$node_executable" "$platform_root/scripts/project.mjs" "$@"
