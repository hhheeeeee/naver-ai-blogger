# Go-Live Checklist

Use this checklist before announcing the plugin or asking other Codex users to install it.

## Repository

- [ ] Make `hhheeeeee/naver-ai-blogger` public on GitHub.
- [ ] Confirm anonymous Git access works:

```bash
git ls-remote https://github.com/hhheeeeee/naver-ai-blogger.git HEAD
```

- [ ] Confirm public install works:

```bash
scripts/verify-public-install.sh
```

## Local Checks

```bash
npm run sync:plugin
npm run check
npm test
npm run validate:plugin
npm pack --dry-run
```

## Codex Plugin Install

```bash
codex plugin marketplace add hhheeeeee/naver-ai-blogger
codex plugin add naver-ai-blogger@naver-ai-blogger-marketplace
codex plugin list
```

Expected result: `naver-ai-blogger@naver-ai-blogger-marketplace` is installed and enabled.

## Naver Session

1. Login locally:

```bash
npx naver-ai-blogger login --manual
```

2. Verify the session:

```bash
npx naver-ai-blogger status
```

3. Export for remote Codex:

```bash
npx naver-ai-blogger export-session --format base64
```

4. Store the output as the remote secret `NAVER_SESSION_BASE64`.

## Blog Publish Smoke Test

1. Prepare real photos in the workspace, preferably named in order:

```text
01-outside.jpg
02-menu.jpg
03-main.jpg
```

2. Create the draft prompt:

```bash
npx naver-ai-blogger draft-prompt \
  --blog-name "식당 이름" \
  --restaurant-address "서울시 ..." \
  --images "./photos/*.jpg" \
  --notes "대표 메뉴, 가격, 주차, 분위기 메모"
```

3. Ask Codex to read `work/naver-blog-draft-prompt.md` and write `work/naver-blog-post.html`.

4. Run preflight:

```bash
npx naver-ai-blogger doctor \
  --blog-name "식당 이름" \
  --restaurant-address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html
```

5. Run dry-run smoke:

```bash
NAVER_SMOKE_DOCTOR=1 scripts/live-smoke.sh \
  --blog-name "식당 이름" \
  --address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html
```

6. Publish privately:

```bash
NAVER_LIVE_PUBLISH=1 scripts/live-smoke.sh \
  --blog-name "식당 이름" \
  --address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html
```

7. Open the returned Naver Blog URL and verify:

- [ ] The post is private.
- [ ] Images are interleaved with text instead of grouped at the top.
- [ ] The title, tags, and restaurant details are correct.
- [ ] No credentials, cookie values, or local filesystem-only notes appear in the post.
