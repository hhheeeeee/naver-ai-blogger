# Naver AI Blogger

Codex에서 네이버 블로그 식당 후기를 작성하고 발행하기 위한 MVP 플러그인 겸 CLI입니다.

## 무엇을 하나요?

- `naver` skill: 네이버 로그인 후 쿠키 세션을 저장합니다.
- `naver-blog` skill: 식당 이름, 주소, 사진을 바탕으로 Codex가 글을 쓰고 CLI가 네이버 블로그에 발행합니다.
- `naver-ai-blogger` CLI: 네이버 로그인, 세션 확인, 이미지 업로드, SmartEditor 문서 발행을 실행합니다.

네이버 자동화 방식은 [viruagent-cli](https://github.com/greekr4/viruagent-cli)의 Naver provider 구현을 참고했습니다. 핵심 흐름은 Playwright 로그인으로 쿠키를 저장한 뒤, `blog.naver.com`과 `platform.editor.naver.com` 엔드포인트를 사용해 SmartEditor 토큰, 이미지 업로드 세션, `RabbitWrite.naver` 발행을 처리하는 방식입니다.

## 설치

```bash
git clone https://github.com/hhheeeeee/naver-ai-blogger.git
cd naver-ai-blogger
npm install
```

Codex 플러그인으로 사용하려면 이 repo를 marketplace로 추가합니다.

```bash
codex plugin marketplace add hhheeeeee/naver-ai-blogger
codex plugin add naver-ai-blogger@naver-ai-blogger-marketplace
```

Codex 앱에서는 marketplace 추가 후 `/plugins`에서 `Naver AI Blogger`를 설치/활성화해도 됩니다.

공개 배포 전에는 repo가 public인지 확인하세요. private repo이면 GitHub 인증이 없는 Codex CLI/remote 환경에서는 marketplace clone과 `npm exec --package github:...` 실행이 실패합니다.

```bash
scripts/verify-public-install.sh
```

## CLI 사용

이 repo를 clone한 상태에서는 `npx naver-ai-blogger ...`를 쓰면 됩니다.

아무 workspace에서나 GitHub의 최신 코드를 바로 실행하려면 아래 형태를 쓰세요.

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

필수값을 빼먹으면 CLI가 어떤 값이 필요한지 에러로 알려줍니다. 환경변수로도 넣을 수 있습니다.

```bash
export NAVER_USERID="<naver-id>"
export NAVER_USERPW="<naver-password>"
npx naver-ai-blogger login
```

캡차나 2FA가 나오면 수동 모드를 사용합니다.

```bash
npx naver-ai-blogger login --manual
```

`--manual`은 아이디/비밀번호 인자를 요구하지 않습니다. 열린 브라우저에서 직접 로그인과 캡차/2FA를 완료하면 쿠키 세션만 저장합니다. 캡차를 우회하기 위한 랜덤 딜레이나 스텔스 입력은 지원하지 않습니다.

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

`--images`는 필수입니다. 쉼표로 여러 파일을 넘기거나 `./photos/*.jpg` 같은 단순 glob을 사용할 수 있습니다. glob 결과는 파일명 기준 자연 정렬이 적용되므로 `01-외관.jpg`, `02-입구.jpg`처럼 숫자 prefix를 붙이면 사진 배치 순서를 안정적으로 맞출 수 있습니다. 파일을 찾지 못하면 네이버 API 호출 전에 중단합니다.

`--content-file`을 넘기지 않으면 CLI가 짧은 기본 후기 HTML을 사용합니다. Codex가 사진과 사용자 메모를 바탕으로 글을 쓰는 흐름에서는 `work/naver-blog-post.html` 같은 HTML 파일을 먼저 만든 뒤 `--content-file`로 넘기는 방식을 권장합니다.

Codex가 글을 쓰기 전에 입력값과 사진 목록을 정리한 초안 프롬프트 파일을 만들 수도 있습니다.

```bash
npx naver-ai-blogger draft-prompt \
  --blog-name "식당 이름" \
  --restaurant-address "서울시 ..." \
  --images "./photos/*.jpg" \
  --notes "대표 메뉴, 가격, 주차, 분위기 메모" \
  --output work/naver-blog-draft-prompt.md
```

그다음 Codex에게 `work/naver-blog-draft-prompt.md`를 읽고 `work/naver-blog-post.html`을 만들라고 요청한 뒤, 아래 발행 명령에 `--content-file work/naver-blog-post.html`을 넘기면 됩니다.

발행 전에 로컬/원격 입력 상태를 점검하려면 `doctor`를 사용하세요. 네이버 API를 호출하지 않고 필수값, 이미지, 콘텐츠 파일, 세션 쿠키를 확인합니다.

```bash
npx naver-ai-blogger doctor \
  --blog-name "식당 이름" \
  --restaurant-address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html
```

네이버 API 호출 없이 입력과 발행 payload만 확인하려면 `--dry-run`을 붙입니다.

```bash
npx naver-blog \
  --blog-name "식당 이름" \
  --restaurant-address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html \
  --dry-run
```

GitHub에서 바로 실행할 때:

```bash
npm exec --yes --package github:hhheeeeee/naver-ai-blogger -- naver-blog \
  --blog-name "식당 이름" \
  --restaurant-address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html
```

기본 세션 파일은 `~/.naver-ai-blogger/naver-session.json`입니다. 다른 경로를 쓰려면 `--session <path>`를 붙이세요.

원격 Codex처럼 세션 파일을 두기 어려운 환경에서는 secret/env로 세션을 넣을 수 있습니다.

```bash
npx naver-ai-blogger export-session --format shell
```

값만 필요하면 base64 형식으로 출력합니다.

```bash
npx naver-ai-blogger export-session --format base64
```

직접 환경변수를 만들 수도 있습니다.

```bash
export NAVER_SESSION_JSON="$(cat ~/.naver-ai-blogger/naver-session.json)"
```

줄바꿈/따옴표 처리가 불편하면 base64를 사용하세요.

```bash
export NAVER_SESSION_BASE64="$(base64 -i ~/.naver-ai-blogger/naver-session.json)"
```

Linux 환경에서 `base64 -i`가 지원되지 않으면 Node로 만들 수 있습니다.

```bash
export NAVER_SESSION_BASE64="$(node -e "process.stdout.write(require('fs').readFileSync(process.argv[1]).toString('base64'))" ~/.naver-ai-blogger/naver-session.json)"
```

## Codex에서 쓰는 법

Codex에서 아래처럼 요청합니다.

```text
/naver --userid <id> --userpw <password>
```

또는:

```text
/naver-blog 블로그이름: 식당 이름
주소: 서울시 ...
사진: ./photos/*.jpg
태그: 맛집,점심
```

현재 Codex 플러그인은 임의의 새 slash command 실행기를 직접 등록하기보다 skill을 설치해 Codex가 해당 workflow를 따르게 하는 구조입니다. 따라서 실제 실행은 skill 지침에 따라 `npx naver-ai-blogger ...` CLI로 수행됩니다.

## 글쓰기 프롬프트 커스터마이즈

기본 맛집 후기 작성 프롬프트는 [prompts/restaurant-review.md](prompts/restaurant-review.md)에 있습니다. 기본값은 네이버 맛집 인플루언서 톤, 2,000~3,000자 내외, 사진과 글이 번갈아 나오는 구성, 제목 후보 10개, 해시태그 25개, 한 줄 총평을 기준으로 합니다.

본문 HTML에 `<p>[외관 사진]</p>`, `<p>[대표 메뉴 사진]</p>`처럼 독립 문단으로 사진 위치를 넣으면, 발행 시 업로드된 사진이 해당 위치에 순서대로 들어갑니다. 사진 위치 표기가 없으면 기존 호환성을 위해 업로드 이미지가 본문 앞쪽에 들어갑니다.

사용자가 프롬프트를 수정하고 싶으면 아래 파일을 만들면 됩니다.

```bash
mkdir -p work
cp prompts/restaurant-review.md work/naver-blog-prompt.md
```

CLI로 기본 프롬프트를 복사할 수도 있습니다.

```bash
npx naver-ai-blogger init-prompt
```

그다음 원하는 스타일로 수정하세요.

```bash
mkdir -p work
$EDITOR work/naver-blog-prompt.md
```

`naver-blog` skill은 사용자 요청에 직접 포함된 프롬프트를 최우선으로 보고, 그다음 `work/naver-blog-prompt.md`, 마지막으로 기본 `prompts/restaurant-review.md`를 사용합니다.

## 원격 Codex에서의 주의점

원격 Codex에서도 발행은 가능합니다. 다만 다음 두 가지가 필요합니다.

- 사진 파일이 원격 Codex workspace 안에 있어야 합니다.
- 네이버 세션 파일이 원격 환경에 있거나, `NAVER_SESSION_JSON` / `NAVER_SESSION_BASE64` secret이 설정되어 있어야 합니다.

브라우저 로그인이나 2FA가 원격에서 어렵다면 로컬에서 로그인 후 세션 파일을 안전한 secret으로 전달하세요. 파일로 전달한 경우에는 `--session`으로 지정하면 됩니다.

## 개발

```bash
npm run sync:plugin
npm run check
npm test
npm run validate:plugin
node bin/naver-ai-blogger.js --help
```

`skills/`, `prompts/`, `.codex-plugin/`을 수정했다면 `npm run sync:plugin`으로 `plugins/naver-ai-blogger/` marketplace wrapper를 갱신하세요. `npm run validate:plugin`은 root copy와 wrapper copy가 어긋나면 실패합니다.

실제 계정으로 smoke test를 할 때는 먼저 세션을 준비한 뒤 기본 dry-run을 실행하세요.

```bash
scripts/live-smoke.sh \
  --blog-name "식당 이름" \
  --address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html
```

dry-run에서도 세션까지 함께 점검하려면 `NAVER_SMOKE_DOCTOR=1`을 붙입니다.

```bash
NAVER_SMOKE_DOCTOR=1 scripts/live-smoke.sh \
  --blog-name "식당 이름" \
  --address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html
```

비공개 글로 실제 발행까지 확인하려면 `NAVER_LIVE_PUBLISH=1`을 설정합니다.
이 모드에서는 발행 전에 `doctor` preflight가 먼저 실행됩니다.

```bash
NAVER_LIVE_PUBLISH=1 scripts/live-smoke.sh \
  --blog-name "식당 이름" \
  --address "서울시 ..." \
  --images "./photos/*.jpg" \
  --content-file work/naver-blog-post.html
```

## Slash command처럼 쓰고 싶을 때

Codex의 권장 재사용 단위는 skills입니다. 그래도 CLI/IDE에서 `/naver`, `/naver-blog`와 비슷한 입력 경험이 필요하면 prompt 템플릿을 설치할 수 있습니다.

```bash
./scripts/install-prompts.sh
```

Codex를 재시작한 뒤 `/prompts:naver`, `/prompts:naver-blog`를 사용하세요. Codex 문서상 custom prompts는 deprecated라 장기적으로는 skills를 기본 사용 경로로 유지하는 것이 좋습니다.
