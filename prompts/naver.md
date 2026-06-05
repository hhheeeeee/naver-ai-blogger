---
description: Login to Naver and persist a Naver Blog session
argument-hint: USERID= USERPW=
---

Use the installed `naver` skill.

Login to Naver with these arguments:

```text
$ARGUMENTS
```

If `USERID` or `USERPW` is missing, ask me for only the missing value. Do not print the password back to me.

Run the Naver AI Blogger CLI using the GitHub package spec if the local package is not available:

```bash
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-ai-blogger login --userid "<id>" --userpw "<password>"
```

Then verify:

```bash
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-ai-blogger status
```
