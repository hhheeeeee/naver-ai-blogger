# CLI 설명 보류

CLI를 직접 사용하는 흐름은 현재 사용자-facing 문서에서 제외했습니다. 아래 내용은 나중에 CLI 사용 경로를 다시 열 때 참고하기 위한 보류 메모입니다.

## 보류한 README 내용

### CLI 사용

이 repo를 clone한 상태에서는 `npx naver-ai-blogger ...`를 쓸 수 있습니다.

GitHub의 최신 코드를 바로 실행하는 형태:

```bash
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-ai-blogger --help
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver --help
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-blog --help
```

로그인:

```bash
npx naver-ai-blogger login --userid "<naver-id>" --userpw "<naver-password>"
npx naver --userid "<naver-id>" --userpw "<naver-password>"
```

환경변수 로그인:

```bash
export NAVER_USERID="<naver-id>"
export NAVER_USERPW="<naver-password>"
npx naver-ai-blogger login
```

수동 로그인:

```bash
npx naver-ai-blogger login --manual
```

세션 확인:

```bash
npx naver-ai-blogger status
```

글 발행:

```bash
npx naver-ai-blogger blog \
  --blog-name "식당 이름" \
  --restaurant-address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html \
  --tags "맛집,방문후기"
```

초안 프롬프트 생성:

```bash
npx naver-ai-blogger draft-prompt \
  --blog-name "식당 이름" \
  --restaurant-address "서울시 ..." \
  --images "./photos/*.jpg" \
  --notes "대표 메뉴, 가격, 주차, 분위기 메모" \
  --output work/naver-blog-draft-prompt.md
```

발행 전 점검:

```bash
npx naver-ai-blogger doctor \
  --blog-name "식당 이름" \
  --restaurant-address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html
```

드라이런:

```bash
npx naver-blog \
  --blog-name "식당 이름" \
  --restaurant-address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html \
  --dry-run
```

GitHub에서 바로 실행:

```bash
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-blog \
  --blog-name "식당 이름" \
  --restaurant-address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html
```

세션 export:

```bash
npx naver-ai-blogger export-session --format shell
npx naver-ai-blogger export-session --format base64
```

직접 환경변수 생성:

```bash
export NAVER_SESSION_JSON="$(cat ~/.naver-ai-blogger/naver-session.json)"
export NAVER_SESSION_BASE64="$(base64 -i ~/.naver-ai-blogger/naver-session.json)"
export NAVER_SESSION_BASE64="$(node -e "process.stdout.write(require('fs').readFileSync(process.argv[1]).toString('base64'))" ~/.naver-ai-blogger/naver-session.json)"
```

기본 프롬프트 복사:

```bash
npx naver-ai-blogger init-prompt
```

## 보류한 skill/prompt 실행 예시

### `naver` skill

```bash
npx naver-ai-blogger login --userid "<id>" --userpw "<password>"
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver --userid "<id>" --userpw "<password>"
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver --userid "<id>" --userpw "<password>" --manual
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-ai-blogger status
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-ai-blogger export-session --format shell
```

### `naver-blog` skill

```bash
npx naver-ai-blogger draft-prompt \
  --blog-name "<restaurant name>" \
  --restaurant-address "<address>" \
  --images "<comma-separated image paths>" \
  --notes "<user notes>" \
  --output work/naver-blog-draft-prompt.md

npx naver-ai-blogger doctor \
  --blog-name "<restaurant name>" \
  --restaurant-address "<address>" \
  --images "<comma-separated image paths>" \
  --content-file work/naver-blog-post.html

npx naver-ai-blogger blog \
  --blog-name "<restaurant name>" \
  --restaurant-address "<address>" \
  --images "<comma-separated image paths>" \
  --content-file work/naver-blog-post.html \
  --tags "<comma-separated tags>"

npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-blog \
  --blog-name "<restaurant name>" \
  --restaurant-address "<address>" \
  --images "<comma-separated image paths>" \
  --content-file work/naver-blog-post.html \
  --tags "<comma-separated tags>"
```

## 재검토할 때

- CLI를 공개 사용 경로로 둘지, 내부 구현 경로로만 둘지 결정합니다.
- README에 되살릴 경우 설치, 로그인, 발행, 세션 export 섹션을 다시 분리합니다.
- skill 문서에는 사용자가 볼 필요 없는 긴 명령 예시 대신 Codex workflow만 남기는 쪽을 우선합니다.
