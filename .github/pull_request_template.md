## Summary

- 

## Checks

- [ ] `npm run sync:plugin`
- [ ] `npm run check`
- [ ] `npm test`
- [ ] `npm run scan:secrets`
- [ ] `npm run validate:plugin`
- [ ] `npm pack --dry-run`

## Safety

- [ ] No Naver credentials, cookie values, session JSON, or `NAVER_SESSION_BASE64` values are committed.
- [ ] Changes that affect `skills/`, `prompts/`, or `.codex-plugin/` were synced to `plugins/naver-ai-blogger/`.
- [ ] Publishing behavior was tested with a dry-run or a private post when relevant.
