---
name: naver
description: "Naver Blog login helper. Use when the user says /naver, asks to login to Naver, or needs a persisted Naver Blog session."
---

# Naver Login

Use this skill when the user asks for `/naver`, "네이버 로그인", or Naver session setup.

## Behavior

1. Prefer the local repo CLI when the current workspace is this repository. Otherwise use the GitHub package spec so Codex can run it from any local or remote workspace.
2. Collect required values:
   - `--userid` or `NAVER_USERID` / `NAVER_USERNAME`
   - `--userpw` or `NAVER_USERPW` / `NAVER_PASSWORD`
3. If either value is missing, ask the user for the missing value. Do not invent credentials.
4. Run one of these commands.

Local repo checkout:

```bash
npx naver-ai-blogger login --userid "<id>" --userpw "<password>"
```

Any workspace after GitHub publication:

```bash
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-ai-blogger login --userid "<id>" --userpw "<password>"
```

5. If Naver blocks automation, captcha appears, or 2FA is needed, rerun with:

```bash
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-ai-blogger login --userid "<id>" --userpw "<password>" --manual
```

6. Verify the saved session:

```bash
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-ai-blogger status
```

## Notes

- The CLI stores cookies at `~/.naver-ai-blogger/naver-session.json` by default.
- Never print the password back to the user.
- Explain that remote Codex can publish only when the remote environment has a valid session file or can complete login.
