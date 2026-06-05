#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/live-smoke.sh --blog-name "식당 이름" --address "주소" --images "./photos/*.jpg" [--content-file work/naver-blog-post.html]

Environment:
  NAVER_SESSION_JSON or NAVER_SESSION_BASE64  Recommended for remote smoke tests.
  NAVER_SMOKE_DOCTOR=1                       Run doctor preflight before dry-run.
  NAVER_LIVE_PUBLISH=1                       Actually publish a private Naver Blog post.

Default behavior is dry-run only. It validates inputs and prints the payload without calling Naver.
When NAVER_LIVE_PUBLISH=1 is set, this script runs doctor first and then publishes as private.
EOF
}

blog_name=""
address=""
images=""
content_file=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --blog-name)
      blog_name="${2:-}"
      shift 2
      ;;
    --address|--restaurant-address)
      address="${2:-}"
      shift 2
      ;;
    --images)
      images="${2:-}"
      shift 2
      ;;
    --content-file)
      content_file="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$blog_name" || -z "$address" || -z "$images" ]]; then
  usage >&2
  exit 2
fi

doctor_cmd=(node bin/naver-ai-blogger.js doctor
  --blog-name "$blog_name"
  --restaurant-address "$address"
  --images "$images"
)

cmd=(node bin/naver-blog.js
  --blog-name "$blog_name"
  --restaurant-address "$address"
  --images "$images"
)

if [[ -n "$content_file" ]]; then
  doctor_cmd+=(--content-file "$content_file")
  cmd+=(--content-file "$content_file")
fi

if [[ "${NAVER_LIVE_PUBLISH:-}" == "1" ]]; then
  "${doctor_cmd[@]}"
  cmd+=(--private)
else
  if [[ "${NAVER_SMOKE_DOCTOR:-}" == "1" ]]; then
    "${doctor_cmd[@]}"
  fi
  cmd+=(--dry-run)
fi

"${cmd[@]}"
