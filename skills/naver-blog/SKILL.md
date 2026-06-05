---
name: naver-blog
description: "Publish a restaurant review to Naver Blog from a restaurant name, address, and uploaded photos. Use when the user says /naver-blog."
---

# Naver Blog Publishing

Use this skill when the user says `/naver-blog`, asks to publish a Naver Blog post, or provides a restaurant name, address, and photos.

## Inputs

Required:

- `blog-name`: restaurant name or blog post subject.
- `restaurant-address`: restaurant address.
- `images`: local image paths available in the current Codex workspace.

Optional:

- `title`
- `tags`
- `category`
- `private`
- extra notes about menu, price, parking, waiting, reservation, or atmosphere.

If required values are missing, ask for only the missing values. For photos, accept uploaded files, paths, or a folder/glob such as `./photos/*.jpg`.

## Writing Workflow

1. Inspect image filenames and any user notes.
2. Write polished Korean HTML content for a Naver Blog restaurant review.
3. Keep the tone natural, specific, and useful. Avoid claiming facts that are not visible in the photos or provided by the user.
4. Save the generated HTML under `work/naver-blog-post.html`.
5. Prefer the local repo CLI when the current workspace is this repository. Otherwise use the GitHub package spec.
6. Publish with one of these commands.

Local repo checkout:

```bash
npx naver-ai-blogger blog \
  --blog-name "<restaurant name>" \
  --restaurant-address "<address>" \
  --images "<comma-separated image paths>" \
  --content-file work/naver-blog-post.html \
  --tags "<comma-separated tags>"
```

Any workspace after GitHub publication:

```bash
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-blog \
  --blog-name "<restaurant name>" \
  --restaurant-address "<address>" \
  --images "<comma-separated image paths>" \
  --content-file work/naver-blog-post.html \
  --tags "<comma-separated tags>"
```

7. If the session is missing or expired, use the `naver` skill to login first, then retry publishing.

## Remote Codex Notes

- Remote Codex must run in an environment that has the uploaded image files and a valid Naver session.
- The CLI requires `--images`; if the image glob matches no files, fix the path before retrying.
- If browser login is impossible in the remote environment, ask the user to provide a session through `NAVER_SESSION_JSON` or `NAVER_SESSION_BASE64`, or provide a session file and pass `--session`.
- After publishing, return the final Naver Blog URL and any image upload errors.
