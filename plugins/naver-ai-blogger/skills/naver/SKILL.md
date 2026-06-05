---
name: naver
description: "Naver Blog login helper. Use when the user says /naver, asks to login to Naver, or needs a persisted Naver Blog session."
---

# Naver Login

Use this skill when the user asks for `/naver`, "네이버 로그인", or Naver session setup.

## Behavior

1. Collect required values:
   - `--userid` or `NAVER_USERID` / `NAVER_USERNAME`
   - `--userpw` or `NAVER_USERPW` / `NAVER_PASSWORD`
2. If either value is missing, ask the user for the missing value. Do not invent credentials.
3. Use the installed Naver AI Blogger workflow to log in and persist a reusable browser session.
4. If Naver blocks automation, captcha appears, or 2FA is needed, switch to manual login. The user completes login, captcha, or 2FA in the browser. Do not try to bypass captcha or anti-abuse checks with randomized delays or stealth input.
5. Verify that the saved session is usable before publishing.
6. When the user needs to publish from remote Codex, help them export the local session as a secret-friendly value and store it as `NAVER_SESSION_BASE64`.

## Notes

- Remote Codex can also use `NAVER_SESSION_JSON` or `NAVER_SESSION_BASE64` when a session file cannot be stored.
- Never print the password back to the user.
- Explain that remote Codex can publish only when the remote environment has a valid session file or can complete login.
