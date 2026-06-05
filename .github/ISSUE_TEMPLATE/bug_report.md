---
name: Bug report
about: Report a problem with login, drafting, doctor checks, or Naver Blog publishing.
title: "[Bug] "
labels: bug
assignees: ""
---

## What happened?

Describe the problem and what you expected to happen.

## Command

Paste the command shape, but remove credentials, cookie values, and session payloads.

```bash

```

## Output

Paste relevant output. Do not include:

- Naver password
- `NAVER_SESSION_JSON`
- `NAVER_SESSION_BASE64`
- cookie values such as `NID_AUT` or `NID_SES`
- private photos or unpublished post text

```text

```

## Environment

- OS:
- Node version:
- Codex surface: CLI / Desktop / Remote
- Package source: local clone / `github:hhheeeeee/naver-ai-blogger`

## Preflight

If this is a publishing issue, run `doctor` and paste the redacted JSON:

```bash
npx naver-ai-blogger doctor \
  --blog-name "..." \
  --restaurant-address "..." \
  --images "..." \
  --content-file work/naver-blog-post.html
```
