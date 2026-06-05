#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
prompt_dir="${CODEX_HOME:-$HOME/.codex}/prompts"

mkdir -p "$prompt_dir"
cp "$repo_root/prompts/naver.md" "$prompt_dir/naver.md"
cp "$repo_root/prompts/naver-blog.md" "$prompt_dir/naver-blog.md"

printf 'Installed prompts:\n'
printf '  %s\n' "$prompt_dir/naver.md"
printf '  %s\n' "$prompt_dir/naver-blog.md"
printf '\nRestart Codex, then invoke /prompts:naver or /prompts:naver-blog.\n'
