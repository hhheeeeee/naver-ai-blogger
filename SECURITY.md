# Security Policy

This project automates a browser login session and Naver Blog publishing. Treat Naver credentials and saved sessions as secrets.

## Secrets

- Do not commit Naver IDs, passwords, cookie sessions, or generated `NAVER_SESSION_BASE64` values.
- The default session file is `~/.naver-ai-blogger/naver-session.json`.
- Workspace scratch output should stay under `work/`, which is ignored by git.
- Prefer `NAVER_SESSION_BASE64` for remote Codex secrets instead of pasting raw JSON into logs or chat.

## Captcha And 2FA

This project does not bypass captcha, 2FA, or anti-abuse controls. If Naver asks for extra verification, complete manual login in the browser and store only the resulting session.

## Public Publishing

Before making this repository public, run:

```bash
npm run check
npm test
npm run scan:secrets
npm run validate:plugin
scripts/verify-public-install.sh
```

`scripts/verify-public-install.sh` should pass only after the GitHub repository is publicly cloneable.

## Reporting

If you find a security issue, rotate any exposed Naver password/session immediately. Then open a private report with the maintainer instead of posting credentials, cookies, or session payloads in a public issue.
