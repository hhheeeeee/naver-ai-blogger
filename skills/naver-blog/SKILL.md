---
name: naver-blog
description: "Publish a restaurant review to Naver Blog from a restaurant name, address, and uploaded photos. Use when the user invokes $naver-blog."
---

# Naver Blog Publishing

Use this skill when the user invokes `$naver-blog`, asks to publish a Naver Blog post, or provides a restaurant name, address, and photos.

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
- custom writing prompt or prompt file path
- extra notes about menu, price, parking, waiting, reservation, or atmosphere.

If required values are missing, ask for only the missing values. For photos, accept uploaded files, paths, or a folder/glob such as `./photos/*.jpg`.

## Writing Workflow

1. Inspect image filenames and any user notes.
2. Load the writing prompt in this priority order:
   - User-provided custom prompt in the current request.
   - `work/naver-blog-prompt.md` if it exists.
   - Plugin default prompt at `prompts/restaurant-review.md`.
3. Write polished Korean HTML content for a Naver Blog restaurant review using the selected prompt.
4. Keep the tone natural, specific, and useful. Avoid claiming facts that are not visible in the photos or provided by the user.
5. Save the generated HTML under `work/naver-blog-post.html`.
6. If the inputs need to be normalized first, create a draft prompt file, then read that file and write the final HTML.
7. Before publishing, run a readiness check when session or input readiness is uncertain. It should confirm required values, images, content file, and session cookies without calling Naver.
8. If the user wants a preview or the session is not ready, run a dry-run style validation first.
9. Publish through the installed Naver AI Blogger workflow.
10. If the session is missing or expired, use the `naver` skill to login first, then retry publishing.

## Remote Codex Notes

- Remote Codex must run in an environment that has the uploaded image files and a valid Naver session.
- If browser login is impossible in the remote environment, ask the user to provide a session through `NAVER_SESSION_JSON` or `NAVER_SESSION_BASE64`, or provide a session file and pass `--session`.
- After publishing, return the final Naver Blog URL and any image upload errors.
