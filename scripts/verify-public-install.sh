#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-hhheeeeee/naver-ai-blogger}"
REF="${REF:-main}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SANDBOX="${ROOT}/work/public-install-check"

rm -rf "${SANDBOX}"
mkdir -p "${SANDBOX}/home" "${SANDBOX}/npm-cache"

echo "Checking anonymous Git access for ${REPO}@${REF}..."
HOME="${SANDBOX}/home" git ls-remote "https://github.com/${REPO}.git" HEAD >/dev/null

echo "Checking Codex marketplace install..."
HOME="${SANDBOX}/home" codex plugin marketplace add "${REPO}" --ref "${REF}" >/dev/null
HOME="${SANDBOX}/home" codex plugin add naver-ai-blogger@naver-ai-blogger-marketplace >/dev/null
HOME="${SANDBOX}/home" codex plugin list

echo "Checking npm GitHub package execution..."
HOME="${SANDBOX}/home" npm_config_cache="${SANDBOX}/npm-cache" \
  npm exec --yes --package "github:${REPO}#${REF}" -- naver-blog --help >/dev/null

echo "Public install verification passed."
