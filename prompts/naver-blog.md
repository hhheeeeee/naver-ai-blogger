---
description: Write and publish a restaurant post to Naver Blog
argument-hint: BLOG_NAME= ADDRESS= IMAGES=
---

Use the installed `naver-blog` skill.

Publish a Naver Blog restaurant post with these arguments:

```text
$ARGUMENTS
```

If `BLOG_NAME`, `ADDRESS`, or `IMAGES` is missing, ask me for only the missing values.

Write polished Korean HTML content into `work/naver-blog-post.html`, then publish with:

```bash
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-ai-blogger blog \
  --blog-name "<restaurant name>" \
  --restaurant-address "<address>" \
  --images "<comma-separated image paths or glob>" \
  --content-file work/naver-blog-post.html
```

If login is missing or expired, use the `naver` skill first, then retry publishing.
