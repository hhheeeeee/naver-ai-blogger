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

Use the writing prompt in this priority order:

1. Custom prompt included in my message.
2. `work/naver-blog-prompt.md` if it exists.
3. `prompts/restaurant-review.md` from the plugin/repo.

Write polished Korean HTML content into `work/naver-blog-post.html`, then publish through the installed Naver AI Blogger workflow.

If login is missing or expired, use the `naver` skill first, then retry publishing.
